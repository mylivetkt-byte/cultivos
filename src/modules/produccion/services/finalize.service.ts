/**
 * Finaliza una orden de producción y genera el asiento contable completo,
 * cálculo de costos, margen bruto y registro de inteligencia de mercado.
 * - Actualiza estado a 'Finalizada'
 * - Calcula costos reales (materiales, mano de obra, CIFCongelado)
 * - Obtiene precio de mercado referencial actualizado
 * - Calcula margen bruto y porcentual
 * - Genera movimiento contable vía TransaccionContableService
 * - Inserta análisis de rentabilidad
 * - Marca la orden como contabilizada
 */
async finalizeAndAccountProduction(orderId: number, tenantId: number) {
  return await this.orderRepo.manager.transaction(async transactionalEntityManager => {
    // 1️⃣ Cargar orden con todas las relaciones necesarias
    const order = await transactionalEntityManager.findOne(ProdOrder, {
      where: { id: orderId, id_tenant: tenantId },
      relations: [
        'receta',
        'receta.components', // component relations (if defined)
        'insumoOriginario',
        'loteProduced',   // PT_lote relation
        'movimientos',    // historial de movimientos
      ],
    });
    if (!order || order.idTenant !== tenantId) {
      throw new ConflictException('Orden no encontrada o no pertenece al tenant');
    }
    if (order.estado === 'Finalizada' || order.contabilizada === 1) {
      return { alreadyFinalized: true };
    }

    // 2️⃣ Validar que todas las materias primas fueron consumidas (FIFO)
    const consumoCheck = await transactionalEntityManager.find(
      ProdMovimientoInventario,
      {
        where: {
          idTenant: tenantId,
          referencia: `ORD-${orderId}`,
        },
        relations: ['lote'],
      }
    );
    const faltaStock = consumoCheck.some(m => m.lote.cantidad > 0);
    if (faltaStock) {
      throw new ConflictException('Algunas materias primas no fueron totalmente consumidas');
    }

    // 3️⃣ Calcular costos reales
    const costos = await this.costUtil.calculateRealCosts(orderId, tenantId);
    order.costoMateriales = costos.materiales;
    order.costoManObra   = costos.manoObra;
    order.costoCif       = costos.cif;
    order.costoTotal     = costos.total;

    // 4️⃣ Actualizar snapshot de CIF con detalle
    if (order.cifDetalle) {
      // Mantener referencia a criterio y componentes usados
      // (opcional, se guarda tal cual)
    }

    // 5️⃣ Registrar asiento contable (costo total como gasto)
    const asientoDto = {
      tenantId,
      tipo: 'Producción',
      numeroOrden: order.codigoOrden,
      fecha: order.fechaFinalizacion ?? new Date(),
      descripcion: `Costo de producción ${order.codigoOrden}`,
      valor: order.costoTotal,
      detalle: JSON.stringify({
        costoMateriales: order.costoMateriales,
        costoManObra: order.costoManObra,
        costoCif: order.costoCif,
        referencia: order.id,
      }),
    };
    await this.transactionService.create(asientoDto);

    // 6️⃣ Generar análisis de rentabilidad basado en precio mercado vigente
    const precioMercado = await transactionalEntityManager.findOne(
      ProdPrecioMercado,
      {
        where: {
          idTenant: tenantId,
          idInsumoProducto: order.idInsumoProducto,
          vigenteDesde: LessThanOrEqualTo(new Date()),
          vigenteHasta: MoreThanOrEqualTo(new Date()),
        },
        order: { vigenteDesde: 'DESC' },
      }
    );
    if (!precioMercado) {
      throw new InternalServerErrorException('No hay precio de mercado vigente para este insumo');
    }

    // 7️⃣ Calcular margen bruto
    const margenUnitario = precioMercado.precioUnitario - costos.unidad;
    const margenBrutoTotal = margenUnitario * order.cantidadOrdenada;
    const pctMargenBruto = (margenBrutoTotal / (precioMercado.precioUnitario * order.cantidadOrdenada)) * 100;

    // 8️⃣ Persistir análisis de rentabilidad
    const analisis = new ProdAnalisisRentabilidad();
    analisis.idTenant = tenantId;
    analisis.idOrden = orderId;
    analisis.idInsumoProducto = order.idInsumoProducto;
    analisis.cantidadProducida = order.cantidadOrdenada;
    analisis.unidadMedida = order.unidadMedida;
    analisis.costoTotalProduccion = order.costoTotal;
    analisis.costoUnitario = order.costoTotal / order.cantidadOrdenada;
    analisis.precioMercadoUnitario = precioMercado.precioUnitario;
    analisis.margenBrutoUnitario = margenUnitario;
    analisis.margenBrutoTotal = margenBrutoTotal;
    analisis.pctMargenBruto = pctMargenBruto;
    analisis.estadoRentabilidad = margenBrutoTotal > 0 ? 'Rentable' : 'Deficitario';
    analisis.analisisJson = JSON.stringify({
      costoBreakdown: {
        materiales: order.costoMateriales,
        manoObra: order.costoManObra,
        cif: order.costoCif,
      },
      referenciaMercado: precioMercado.idPrecioMercado,
    });
    analisis.fechaCalculo = new Date();
    await transactionalEntityManager.save(analisis);

    // 9️⃣ Marcar orden como contabilizada y finalizada
    order.contabilizada = 1;
    order.estado = 'Finalizada';
    order.fechaFinalizacion = new Date();
    await transactionalEntityManager.save(order);

    // 10️⃣ Actualizar consumo de insumos (si no se hizo previamente)
    // (Este paso es opcional si los consumos ya quedaron registrados en create)

    // 11️⃣ Retornar objeto consolidado
    return {
      idOrden: order.id,
      codigoOrden: order.codigoOrden,
      estado: order.estado,
      costoMateriales: order.costoMateriales,
      costoManObra: order.costoManObra,
      costoCif: order.costoCif,
      costoTotal: order.costoTotal,
      margenBrutoUnitario: margenUnitario,
      margenBrutoTotal: margenBrutoTotal,
      pctMargenBruto: pctMargenBruto,
      precioMercadoUnitario: precioMercado.precioUnitario,
      fechaCalculo: analisis.fechaCalculo,
    };
  });
}