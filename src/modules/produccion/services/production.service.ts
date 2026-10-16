import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MigrationScript } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ProdOrderCreateDto } from '../dtos/prod-order-create.dto';
import { ProdOrder } from '../entities/prod-order.entity';
import { ProdReceta } from '../entities/prod-receta.entity';
import { ProdRecetaComponente } from '../entities/prod-receta-componente.entity';
import { ProdLote } from '../entities/prod-lote.entity';
import { calculateTotalCosts } from './costs.util';
import { finalizeProductionOrder } from './finalize.util';
import { TransaccionContableService } from '../../contabilizacion/services/transaccion-contable.service';

@Injectable()
export class ProductionService {
  constructor(
    @InjectRepository(ProdOrder)
    private readonly orderRepo: Repository<ProdOrder>,
    @InjectRepository(ProdReceta)
    private readonly recipeRepo: Repository<ProdReceta>,
    @InjectRepository(ProdRecetaComponente)
    private readonly recipeComponentRepo: Repository<ProdRecetaComponente>,
    @InjectRepository(ProdLote)
    private readonly lotRepo: Repository<ProdLote>,
    private readonly costUtil: calculateTotalCosts,
    private readonly finalizeUtil: finalizeProductionOrder,
    private readonly transactionService: TransaccionContableService,
  ) {}

  /**
   * Crea una orden de producción con snapshot de fórmula y snapshot de costos.
   * Implementa validación de inventario FIFO y registra movimiento de entrada/salida.
   * Multitenant: incluye id_tenant en todas las entidades.
   */
  async createProductionOrder(dto: ProdOrderCreateDto, tenantId: number) {
    return await this.orderRepo.manager.transaction(async transactionalEntityManager => {
      // 1️⃣ Validar existencia de receta y su versión activa
      const receta = await transactionalEntityManager.findOne(ProdReceta, {
        where: { id: dto.idReceta, id_tenant: tenantId },
        relations: ['recetaComponents'],
      });
      if (!receta || receta.estado !== 'Activa') {
        throw new ConflictException('Receta no encontrada o está inactiva');
      }

      // 2️⃣ Verificar existencia de insumos en bodega origen
      for (const component of receta.recetaComponents) {
        // Cada componente tiene su propia ID y versión via dto.componentDetails? adjust
        const lot = await transactionalEntityManager.findOne(ProdLote, {
          where: {
            id_tenant: tenantId,
            id_insumo: component.id_insumo,
            bodega: dto.idBodegaOrigen, // asocia lote a bodega origen
            estado: 'Disponible',
          },
          order: { fecha_creacion: 'ASC' }, // FIFO
        });
        if (!lot || lot.cantidad < dto.quantityPerComponent) {
          throw new ConflictException(`Insufficient stock for component ${component.id_insumo}`);
        }
      }

      // 3️⃣ Construir snapshot de fórmula (agrupa componentes y costos)
      const formulaSnapshot: any = {
        version: receta.version_actual,
        components: receta.recetaComponents.map(comp => ({
          id_insumo: comp.id_insumo,
          cantidad_por_unidad: comp.cantidad_por_unidad,
          unidad_medida: comp.unidad_medida,
          costo_estandar: comp.costo_estandar,
          factor_merma: comp.factor_merma,
        })),
      };

      // 4️⃣ Persistir orden de producción
      const order = new ProdOrder();
      order.idTenant = tenantId;
      order.codigoOrden = uuidv4(); // generar código único por tenant
      order.idReceta = dto.idReceta;
      order.versionReceta = dto.versionReceta;
      order.idInsumoProducto = dto.idInsumoProducto;
      order.cantidadOrdenada = dto.cantidadOrdenada;
      order.unidadMedida = dto.unidadMedida;
      order.idBodegaOrigen = dto.idBodegaOrigen;
      order.idBodegaDestino = dto.idBodegaDestino;
      order.idFinca = dto.idFinca;
      order.idCentroCosto = dto.idCentroCosto;
      order.fechaOrden = dto.fechaOrden;
      order.estado = 'Validada';
      order.formulaSnapshot = JSON.stringify(formulaSnapshot);
      order.idInsumoOriginario = dto.idInsumoOriginario;
      order.cantidadConsumida = 0;
      order.costoMateriales = 0;
      order.costoManObra = 0;
      order.costoCif = 0;
      order.baseCif = 0;
      order.cifDetalle = JSON.stringify({
        criterio: 'valor', // ej. "valor" o "porcentaje"
        componentes: dto.componentDetails, // opcional, extra informação
      });
      order.creadoPor = dto.creadoPor;
      order.qrPublicToken = uuidv4(); // token seguro para trazabilidad

      const savedOrder = await transactionalEntityManager.save(order);

      // 5️⃣ Actualizar stock (FIFO) y registrar movimiento de salida
      for (const component of receta.recetaComponents) {
        const lot = await transactionalEntityManager.findOne(ProdLote, {
          where: {
            id_tenant: tenantId,
            id_insumo: component.id_insumo,
            bodega: dto.idBodegaOrigen,
            estado: 'Disponible',
          },
          order: { fechaCreacion: 'ASC' },
        });
        const consumeQty = dto.quantityPerComponent * component.cantidad_por_unidad;
        lot.cantidad -= consumeQty;
        if (lot.cantidad <= 0) {
          lot.estado = 'Vencido'; // o 'Retirado'
        }
        await transactionalEntityManager.save(lot);

        // Registrar movimiento de salida (salinf)
        const movimiento = new ProdMovimientoInventario();
        movimiento.idTenant = tenantId;
        movimiento.idLote = lot.id;
        movimiento.tipoMovimiento = 'SALIDA';
        movimiento.cantidad = consumeQty;
        movimiento.unidadesMedida = component.unidad_medida;
        movimiento.idBodegaDestino = dto.idBodegaDestino;
        movimiento.referencia = `ORD-${savedOrder.id}`;
        movimiento.fechaMovimiento = new Date();
        await transactionalEntityManager.save(movimiento);
      }

      // 6️⃣ Generar movimiento de entrada de producto terminado (insumo completado)
      const PT_lote = new ProdLote();
      PT_lote.idTenant = tenantId;
      PT_lote.loteCode = uuidv4();
      PT_lote.idInsumo = order.idInsumoProducto;
      PT_lote.cantidad = dto.cantidadOrdenada;
      PT_lote.unidadMedida = dto.unidadMedida;
      PT_lote.fechaCreacion = new Date();
      PT_lote.fechaVencimiento = dto.fechaVencimiento ?? null;
      PT_lote.qrHash = order.qrPublicToken;
      PT_lote.idBodega = dto.idBodegaDestino;
      PT_lote.estado = 'Disponible';
      await transactionalEntityManager.save(PT_lote);

      // Registrar movimiento de entrada de insumo terminado
      const entradaMov = new ProdMovimientoInventario();
      entradaMov.idTenant = tenantId;
      entradaMov.idLote = PT_lote.id;
      entradaMov.tipoMovimiento = 'ENTRADA';
      entradaMov.cantidad = dto.cantidadOrdenada;
      entradaMov.unidadesMedida = dto.unidadMedida;
      entradaMov.idBodegaDestino = dto.idBodegaDestino;
      entradaMov.referencia = `ORD-${savedOrder.id}`;
      entradaMov.fechaMovimiento = new Date();
      await transactionalEntityManager.save(entradaMov);

      // 7️⃣ Devolver dto con datos críticos
      return {
        idOrden: savedOrder.id,
        codigoOrden: savedOrder.codigoOrden,
        estado: savedOrder.estado,
        formulaSnapshot: savedOrder.formulaSnapshot,
        costoMateriales: savedOrder.costoMateriales,
        costoManObra: savedOrder.costoManObra,
        costoCif: savedOrder.costoCif,
        qrPublicToken: savedOrder.qrPublicToken,
      };
    });
  }
}