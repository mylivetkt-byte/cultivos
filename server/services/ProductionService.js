/**
 * ProductionService.js
 * Servicio de Producción y Agroindustrialización Rediseñado
 * Multi-Tenant, contabilidad de costos, trazabilidad BPM, calidad e integración con taller
 */

import pool from '../db.js';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import { sendPdfReport } from './whatsappService.js';

export class ProductionService {
  // ==========================================
  // GESTIÓN DE FÓRMULAS
  // ==========================================

  static async getFormulas(id_tenant) {
    const [rows] = await pool.query(
      `SELECT f.*, i.nombre as nombre_producto, i.codigo as codigo_producto
       FROM formula_produccion f
       JOIN insumos i ON f.id_insumo_producto = i.id_insumo
       WHERE f.id_tenant = ?`,
      [id_tenant]
    );
    return rows;
  }

  static async getFormulaById(id_tenant, id_formula) {
    const [formulas] = await pool.query(
      `SELECT f.*, i.nombre as nombre_producto, i.codigo as codigo_producto
       FROM formula_produccion f
       JOIN insumos i ON f.id_insumo_producto = i.id_insumo
       WHERE f.id_formula = ? AND f.id_tenant = ?`,
      [id_formula, id_tenant]
    );

    if (formulas.length === 0) return null;
    const formula = formulas[0];

    const [insumos] = await pool.query(
      `SELECT fi.*, i.nombre, i.codigo
       FROM formula_insumos fi
       JOIN insumos i ON fi.id_insumo = i.id_insumo
       WHERE fi.id_formula = ?`,
      [id_formula]
    );

    const [maquinarias] = await pool.query(
      `SELECT fm.*, m.marca_modelo, m.placa
       FROM formula_maquinaria fm
       JOIN agroind_maquinaria_equipo m ON fm.id_maquina_taller = m.id_maq_agro
       WHERE fm.id_formula = ?`,
      [id_formula]
    );

    return {
      ...formula,
      insumos,
      maquinarias
    };
  }

  static async createFormula(dto) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const {
        id_tenant,
        codigo,
        nombre,
        descripcion,
        id_insumo_producto,
        rendimiento_esperado,
        unidad_medida,
        estado = 'Activa',
        insumos = [],
        maquinarias = []
      } = dto;

      const [resFormula] = await conn.query(
        `INSERT INTO formula_produccion (
          id_tenant, codigo, nombre, descripcion, id_insumo_producto,
          rendimiento_esperado, unidad_medida, estado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id_tenant, codigo, nombre, descripcion, id_insumo_producto, rendimiento_esperado, unidad_medida, estado]
      );

      const id_formula = resFormula.insertId;

      for (const ins of insumos) {
        await conn.query(
          `INSERT INTO formula_insumos (
            id_formula, id_insumo, cantidad_por_unidad, unidad_medida, factor_merma
          ) VALUES (?, ?, ?, ?, ?)`,
          [id_formula, ins.id_insumo, ins.cantidad_por_unidad, ins.unidad_medida || 'UN', ins.factor_merma || 0]
        );
      }

      for (const maq of maquinarias) {
        await conn.query(
          `INSERT INTO formula_maquinaria (
            id_formula, id_maquina_taller, tiempo_estandar_horas
          ) VALUES (?, ?, ?)`,
          [id_formula, maq.id_maquina_taller, maq.tiempo_estandar_horas]
        );
      }

      await conn.commit();
      return { success: true, id_formula };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  static async updateFormula(id_formula, dto) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const {
        id_tenant,
        codigo,
        nombre,
        descripcion,
        id_insumo_producto,
        rendimiento_esperado,
        unidad_medida,
        estado = 'Activa',
        insumos = [],
        maquinarias = []
      } = dto;

      await conn.query(
        `UPDATE formula_produccion SET
           codigo = ?,
           nombre = ?,
           descripcion = ?,
           id_insumo_producto = ?,
           rendimiento_esperado = ?,
           unidad_medida = ?,
           estado = ?
         WHERE id_formula = ? AND id_tenant = ?`,
        [codigo, nombre, descripcion, id_insumo_producto, rendimiento_esperado, unidad_medida, estado, id_formula, id_tenant]
      );

      await conn.query(`DELETE FROM formula_insumos WHERE id_formula = ?`, [id_formula]);
      await conn.query(`DELETE FROM formula_maquinaria WHERE id_formula = ?`, [id_formula]);

      for (const ins of insumos) {
        await conn.query(
          `INSERT INTO formula_insumos (
             id_formula, id_insumo, cantidad_por_unidad, unidad_medida, factor_merma
           ) VALUES (?, ?, ?, ?, ?)`,
          [id_formula, ins.id_insumo, ins.cantidad_por_unidad, ins.unidad_medida || 'UN', ins.factor_merma || 0]
        );
      }

      for (const maq of maquinarias) {
        await conn.query(
          `INSERT INTO formula_maquinaria (
             id_formula, id_maquina_taller, tiempo_estandar_horas
           ) VALUES (?, ?, ?)`,
          [id_formula, maq.id_maquina_taller, maq.tiempo_estandar_horas]
        );
      }

      await conn.commit();
      return { success: true };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  static async deleteFormula(id_tenant, id_formula) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      
      const [used] = await conn.query("SELECT COUNT(*) as cnt FROM orden_produccion WHERE id_formula = ?", [id_formula]);
      if (used[0].cnt > 0) {
        return { success: false, error: 'No se puede eliminar la fórmula porque ya ha sido utilizada en órdenes de producción.' };
      }

      await conn.query(`DELETE FROM formula_insumos WHERE id_formula = ?`, [id_formula]);
      await conn.query(`DELETE FROM formula_maquinaria WHERE id_formula = ?`, [id_formula]);
      await conn.query(`DELETE FROM formula_produccion WHERE id_formula = ? AND id_tenant = ?`, [id_formula, id_tenant]);

      await conn.commit();
      return { success: true };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  // ==========================================
  // CREACIÓN Y CIERRE DE ÓRDENES DE PRODUCCIÓN
  // ==========================================

  static generateShortagePdf(shortages, orderCode, productName, date) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      // Title
      doc.fontSize(20).text('ALERTA DE DESABASTECIMIENTO - AGROPACCIOLI', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Orden de Producción: ${orderCode}`);
      doc.text(`Producto a Producir: ${productName}`);
      doc.text(`Fecha de Solicitud: ${new Date(date).toLocaleDateString()}`);
      doc.moveDown();
      doc.text('Se han detectado los siguientes faltantes de materia prima e insumos en bodega:', { fontStyle: 'italic' });
      doc.moveDown();

      // Table Header
      doc.font('Helvetica-Bold');
      doc.text('Insumo / Materia Prima', 50, doc.y, { width: 250, continued: true });
      doc.text('Requerido', 300, doc.y, { width: 100, continued: true });
      doc.text('Disponible', 400, doc.y, { width: 100 });
      doc.font('Helvetica');
      doc.moveDown(0.5);

      // Table Rows
      for (const item of shortages) {
        doc.text(item.nombre, 50, doc.y, { width: 250, continued: true });
        doc.text(`${item.requerido} ${item.unidad_medida}`, 300, doc.y, { width: 100, continued: true });
        doc.text(`${item.disponible} ${item.unidad_medida}`, 400, doc.y, { width: 100 });
        doc.moveDown(0.5);
      }

      doc.moveDown();
      doc.text('Favor proceder con la compra o traslado de inventario inmediato para habilitar esta orden.');

      doc.end();
    });
  }

  static async createProductionOrder(dto) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const {
        id_tenant,
        id_formula,
        cantidad_ordenada,
        unidad_medida,
        fecha_orden,
        id_bodega_origen,
        id_bodega_destino,
        id_finca,
        creado_por,
        costo_energia = 0,
        costo_agua = 0,
        costo_impuestos = 0,
        insumos = [],      // [{ id_insumo, cantidad_consumida, unidad_medida, costo_unitario, lote_insumo_origen }]
        mano_obra = [],    // [{ id_empleado, horas_jornales, tarifa_por_hora }]
        maquinaria = [],   // [{ id_maquina_taller, horas_reales, costo_hora }]
        calidad = null,     // { cantidad_primera, cantidad_segunda, merma, checklist_bpm_json }
        finalizar = false
      } = dto;

      const codigoOrden = await this.generarCodigoOrden(id_tenant, conn);

      // 1. VALIDACIÓN DE STOCK FÍSICO Y ALERTA WHATSAPP
      const shortages = [];
      for (const ins of insumos) {
        const [stockRow] = await conn.query(
          `SELECT COALESCE(SUM(cantidad), 0) as disponible, i.nombre, i.unidad_medida
           FROM inv_lotes_existencia le
           JOIN insumos i ON le.id_insumo = i.id_insumo
           WHERE le.id_tenant = ? AND le.id_insumo = ? AND le.id_bodega = ? AND le.estado = 'Disponible'`,
          [id_tenant, ins.id_insumo, id_bodega_origen]
        );
        const disponible = parseFloat(stockRow[0]?.disponible || 0);
        if (disponible < parseFloat(ins.cantidad_consumida)) {
          shortages.push({
            id_insumo: ins.id_insumo,
            nombre: stockRow[0]?.nombre || 'Insumo',
            unidad_medida: stockRow[0]?.unidad_medida || 'UN',
            requerido: ins.cantidad_consumida,
            disponible
          });
        }
      }

      if (shortages.length > 0) {
        const [configRow] = await conn.query("SELECT whatsapp_alertas_telefono FROM prod_config_tenant WHERE id_tenant = ?", [id_tenant]);
        const alertPhone = configRow[0]?.whatsapp_alertas_telefono;
        if (alertPhone) {
          const [formulaRow] = await conn.query("SELECT i.nombre as prod_nombre FROM formula_produccion f JOIN insumos i ON f.id_insumo_producto = i.id_insumo WHERE f.id_formula = ?", [id_formula]);
          const prodName = formulaRow[0]?.prod_nombre || 'Producto';
          try {
            const pdfBuffer = await this.generateShortagePdf(shortages, codigoOrden, prodName, fecha_orden);
            await sendPdfReport(alertPhone, pdfBuffer, `Alerta_Desabastecimiento_${codigoOrden}.pdf`, `⚠️ Alerta de Faltantes para la orden ${codigoOrden}`);
          } catch (wsErr) {
            console.error('Error al enviar alerta de WhatsApp:', wsErr.message);
          }
        }
        await conn.rollback();
        return {
          success: false,
          code: 'STOCK_SHORTAGE',
          message: 'No hay suficiente stock de materias primas en la bodega seleccionada.',
          shortages
        };
      }

      // Calcular totales
      const costoMateriales = insumos.reduce((sum, item) => sum + (parseFloat(item.cantidad_consumida) * parseFloat(item.costo_unitario)), 0);
      const costoManoObra = mano_obra.reduce((sum, item) => sum + (parseFloat(item.horas_jornales) * parseFloat(item.tarifa_por_hora)), 0);
      const costoMaquinaria = maquinaria.reduce((sum, item) => sum + (parseFloat(item.horas_reales) * parseFloat(item.costo_hora)), 0);
      const costoCIF = costoMaquinaria + parseFloat(costo_energia || 0) + parseFloat(costo_agua || 0) + parseFloat(costo_impuestos || 0);
      const costoTotal = costoMateriales + costoManoObra + costoCIF;

      // Insertar Orden
      const [insertRes] = await conn.query(
        `INSERT INTO orden_produccion (
          id_tenant, codigo_orden, id_formula, cantidad_ordenada, unidad_medida,
          fecha_orden, id_bodega_origen, id_bodega_destino, id_finca,
          estado, costo_materiales, costo_mano_obra, costo_cif, costo_energia, costo_agua, costo_impuestos, costo_total, creado_por
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id_tenant, codigoOrden, id_formula, cantidad_ordenada, unidad_medida,
          fecha_orden || new Date(), id_bodega_origen, id_bodega_destino, id_finca,
          finalizar ? 'Finalizada' : 'En_Proceso',
          costoMateriales, costoManoObra, costoCIF, parseFloat(costo_energia || 0), parseFloat(costo_agua || 0), parseFloat(costo_impuestos || 0), costoTotal, creado_por
        ]
      );

      const id_orden = insertRes.insertId;

      // Insertar Insumos
      for (const ins of insumos) {
        await conn.query(
          `INSERT INTO orden_produccion_insumos (
            id_orden, id_insumo, cantidad_consumida, unidad_medida, costo_unitario, lote_insumo_origen
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [id_orden, ins.id_insumo, ins.cantidad_consumida, ins.unidad_medida, ins.costo_unitario, ins.lote_insumo_origen]
        );

        if (finalizar) {
          // Descontar inventario físico de inv_lotes_existencia
          await conn.query(
            `UPDATE inv_lotes_existencia
             SET cantidad = cantidad - ?
             WHERE id_tenant = ? AND id_insumo = ? AND lote = ? AND id_bodega = ?`,
            [ins.cantidad_consumida, id_tenant, ins.id_insumo, ins.lote_insumo_origen, id_bodega_origen]
          );
        }
      }

      // Insertar Mano de Obra
      for (const mo of mano_obra) {
        const subtotal = parseFloat(mo.horas_jornales) * parseFloat(mo.tarifa_por_hora);
        await conn.query(
          `INSERT INTO orden_produccion_mano_obra (
            id_orden, id_empleado, horas_jornales, tarifa_por_hora, subtotal
          ) VALUES (?, ?, ?, ?, ?)`,
          [id_orden, mo.id_empleado, mo.horas_jornales, mo.tarifa_por_hora, subtotal]
        );
      }

      // Insertar Maquinaria
      for (const maq of maquinaria) {
        const subtotal = parseFloat(maq.horas_reales) * parseFloat(maq.costo_hora);
        await conn.query(
          `INSERT INTO orden_produccion_maquinaria (
            id_orden, id_maquina_taller, horas_reales, costo_hora, subtotal
          ) VALUES (?, ?, ?, ?, ?)`,
          [id_orden, maq.id_maquina_taller, maq.horas_reales, maq.costo_hora, subtotal]
        );

        if (finalizar) {
          // Actualizar horómetro en el módulo de Taller
          await conn.query(
            `UPDATE agroind_maquinaria_equipo
             SET horometro_actual = IFNULL(horometro_actual, 0) + ?
             WHERE id_maq_agro = ?`,
            [maq.horas_reales, maq.id_maquina_taller]
          );
        }
      }

      // Calidad y Lote Final
      let loteGenerado = null;
      if (calidad) {
        const [formulaRow] = await conn.query('SELECT id_insumo_producto FROM formula_produccion WHERE id_formula = ?', [id_formula]);
        const id_insumo_producto = formulaRow[0]?.id_insumo_producto;

        loteGenerado = await this.generarCodigoLote(id_tenant, id_insumo_producto, conn);
        const expirationDate = this.calcularFechaVencimiento(fecha_orden);
        const qrHash = this.generarHashQR(loteGenerado, id_tenant);

        await conn.query(
          `INSERT INTO orden_produccion_calidad (
            id_orden, cantidad_primera, cantidad_segunda, merma, checklist_bpm_json, aprobado, aprobado_por, fecha_aprobacion
          ) VALUES (?, ?, ?, ?, ?, 1, ?, NOW())`,
          [id_orden, calidad.cantidad_primera, calidad.cantidad_segunda, calidad.merma, JSON.stringify(calidad.checklist_bpm_json), creado_por]
        );

        await conn.query(
          `UPDATE orden_produccion SET
            lote_generado = ?,
            fecha_vencimiento = ?,
            fecha_cierre = NOW()
           WHERE id_orden = ?`,
          [loteGenerado, expirationDate, id_orden]
        );

        if (finalizar) {
          // Ingresar producto terminado al inventario general
          const totalCantidad = parseFloat(calidad.cantidad_primera) + parseFloat(calidad.cantidad_segunda);
          const costoUnitarioPT = totalCantidad > 0 ? costoTotal / totalCantidad : 0;

          await conn.query(
            `INSERT INTO inv_lotes_existencia (
              id_tenant, id_insumo, id_bodega, lote, fecha_vencimiento, cantidad, costo_unitario, estado, creado_por
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Disponible', ?)`,
            [id_tenant, id_insumo_producto, id_bodega_destino, loteGenerado, expirationDate, totalCantidad, costoUnitarioPT, creado_por]
          );
        }

        if (finalizar) {
          // REGISTRO EN PLANILLAS DE NÓMINA (OPERATIVAS)
          if (mano_obra.length > 0) {
            const [plRow] = await conn.query(
              `SELECT id_planilla FROM rrhh_planillas_manuales 
               WHERE id_tenant = ? AND id_finca = ? AND estado = 'Abierta' LIMIT 1`,
              [id_tenant, id_finca]
            );
            let idPlanilla;
            if (plRow.length > 0) {
              idPlanilla = plRow[0].id_planilla;
            } else {
              const [resPl] = await conn.query(
                `INSERT INTO rrhh_planillas_manuales (id_tenant, id_finca, tipo_planilla, fecha_inicio, fecha_fin, estado)
                 VALUES (?, ?, 'Quincenal', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY), 'Abierta')`,
                [id_tenant, id_finca]
              );
              idPlanilla = resPl.insertId;
            }

            const [labRow] = await conn.query(
              `SELECT id_labor_catalogo FROM rrhh_catalogo_labores 
               WHERE id_tenant = ? AND estado = 'Activo' LIMIT 1`,
              [id_tenant]
            );
            const activeLaborId = labRow[0]?.id_labor_catalogo || 1;

            for (const mo of mano_obra) {
              const sub = parseFloat(mo.horas_jornales) * parseFloat(mo.tarifa_por_hora);
              await conn.query(
                `INSERT INTO rrhh_planillas_manuales_detalle (id_planilla, id_empleado, id_labor_catalogo, fecha_labor, cantidad, tarifa, total)
                 VALUES (?, ?, ?, CURDATE(), ?, ?, ?)`,
                [idPlanilla, mo.id_empleado, activeLaborId, mo.horas_jornales, mo.tarifa_por_hora, sub]
              );
            }
          }

          // CONTABILIZACIÓN: ASIENTO CONTABLE AUTOMÁTICO
          const accounts = {
            '143005': 'Inventario Producto Terminado',
            '140505': 'Inventario Materia Prima',
            '250505': 'Salarios por Pagar',
            '730505': 'Costos Indirectos (CIF)'
          };
          const countIds = {};
          for (const code of Object.keys(accounts)) {
            const [existing] = await conn.query("SELECT id_cuenta FROM plan_contable WHERE codigo = ? LIMIT 1", [code]);
            if (existing.length > 0) {
              countIds[code] = existing[0].id_cuenta;
            } else {
              const [res] = await conn.query("INSERT INTO plan_contable (codigo, nombre, naturaleza) VALUES (?, ?, 'Debito')", [code, accounts[code]]);
              countIds[code] = res.insertId;
            }
          }

          const [tipoDocRow] = await conn.query("SELECT id_tipo_doc FROM tipos_documentos LIMIT 1");
          const tipoDocId = tipoDocRow[0]?.id_tipo_doc || 1;

          const [resDoc] = await conn.query(
            `INSERT INTO contab_documentos (id_tenant, id_tipo_doc, numero_doc, fecha, concepto, estado, tabla_origen, id_origen)
             VALUES (?, ?, ?, CURDATE(), ?, 'Aprobado', 'orden_produccion', ?)`,
            [id_tenant, tipoDocId, `PROD-${id_orden}`, `Contabilización de costos de producción - Orden ${codigoOrden}`, id_orden]
          );
          const idDoc = resDoc.insertId;

          // Asientos
          await conn.query(
            `INSERT INTO contab_detalles (id_documento, id_cuenta, descripcion, debito, credito)
             VALUES (?, ?, ?, ?, 0.00)`,
            [idDoc, countIds['143005'], `Ingreso PT Lote ${loteGenerado}`, costoTotal]
          );

          if (costoMateriales > 0) {
            await conn.query(
              `INSERT INTO contab_detalles (id_documento, id_cuenta, descripcion, debito, credito)
               VALUES (?, ?, ?, 0.00, ?)`,
              [idDoc, countIds['140505'], `Consumo materias primas producción`, costoMateriales]
            );
          }

          if (costoManoObra > 0) {
            await conn.query(
              `INSERT INTO contab_detalles (id_documento, id_cuenta, descripcion, debito, credito)
               VALUES (?, ?, ?, 0.00, ?)`,
              [idDoc, countIds['250505'], `Nómina operarios cargada a producción`, costoManoObra]
            );
          }

          if (costoCIF > 0) {
            await conn.query(
              `INSERT INTO contab_detalles (id_documento, id_cuenta, descripcion, debito, credito)
               VALUES (?, ?, ?, 0.00, ?)`,
              [idDoc, countIds['730505'], `Costos indirectos (maquinaria y servicios) aplicados`, costoCIF]
            );
          }
        }
      }

      await conn.commit();
      return {
        success: true,
        id_orden,
        codigo_orden: codigoOrden,
        lote_generado: loteGenerado
      };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  // ==========================================
  // CONSULTAS HISTÓRICAS Y TRAZABILIDAD
  // ==========================================

  static async getHistoricoProducciones(id_tenant, filtros) {
    const conn = await pool.getConnection();
    try {
      let query = `
        SELECT
          op.id_orden,
          op.codigo_orden,
          op.lote_generado,
          op.cantidad_ordenada,
          op.unidad_medida,
          op.fecha_orden,
          op.fecha_cierre,
          op.costo_total,
          op.estado,
          op.creado_el,
          i.nombre as nombre_producto,
          fp.nombre as nombre_formula,
          qc.cantidad_primera,
          qc.cantidad_segunda,
          qc.merma
        FROM orden_produccion op
        JOIN formula_produccion fp ON op.id_formula = fp.id_formula
        JOIN insumos i ON fp.id_insumo_producto = i.id_insumo
        LEFT JOIN orden_produccion_calidad qc ON op.id_orden = qc.id_orden
        LEFT JOIN orden_produccion_insumos opi ON op.id_orden = opi.id_orden
        LEFT JOIN orden_produccion_mano_obra opm ON op.id_orden = opm.id_orden
        LEFT JOIN orden_produccion_maquinaria opq ON op.id_orden = opq.id_orden
        WHERE op.id_tenant = ?
      `;

      const params = [id_tenant];

      // Filtros avanzados
      if (filtros.lote_generado) {
        query += ` AND op.lote_generado LIKE ?`;
        params.push(`%${filtros.lote_generado}%`);
      }

      if (filtros.lote_insumo_origen) {
        query += ` AND opi.lote_insumo_origen = ?`;
        params.push(filtros.lote_insumo_origen);
      }

      if (filtros.id_empleado) {
        query += ` AND opm.id_empleado = ?`;
        params.push(filtros.id_empleado);
      }

      if (filtros.id_maquina_taller) {
        query += ` AND opq.id_maquina_taller = ?`;
        params.push(filtros.id_maquina_taller);
      }

      if (filtros.id_finca) {
        query += ` AND op.id_finca = ?`;
        params.push(filtros.id_finca);
      }

      if (filtros.fecha_desde) {
        query += ` AND op.fecha_orden >= ?`;
        params.push(filtros.fecha_desde);
      }

      if (filtros.fecha_hasta) {
        query += ` AND op.fecha_orden <= ?`;
        params.push(filtros.fecha_hasta);
      }

      if (filtros.estado) {
        query += ` AND op.estado = ?`;
        params.push(filtros.estado);
      }

      query += ` GROUP BY op.id_orden ORDER BY op.fecha_orden DESC`;

      if (filtros.limit) {
        query += ` LIMIT ? OFFSET ?`;
        params.push(parseInt(filtros.limit), parseInt(filtros.offset || 0));
      }

      const [rows] = await conn.query(query, params);
      return rows;
    } finally {
      conn.release();
    }
  }

  static async getDetalleLoteConTrazabilidad(id_tenant, id_orden) {
    const conn = await pool.getConnection();
    try {
      // 1. Obtener la orden principal
      const [ordenes] = await conn.query(
        `SELECT op.*, fp.nombre as nombre_formula, i.nombre as nombre_producto, i.codigo as codigo_producto
         FROM orden_produccion op
         JOIN formula_produccion fp ON op.id_formula = fp.id_formula
         JOIN insumos i ON fp.id_insumo_producto = i.id_insumo
         WHERE op.id_orden = ? AND op.id_tenant = ?`,
        [id_orden, id_tenant]
      );

      if (ordenes.length === 0) return null;
      const orden = ordenes[0];

      // 2. Insumos/Materias primas origen
      const [insumos] = await conn.query(
        `SELECT opi.*, i.nombre as nombre_insumo, i.codigo as codigo_insumo
         FROM orden_produccion_insumos opi
         JOIN insumos i ON opi.id_insumo = i.id_insumo
         WHERE opi.id_orden = ?`,
        [id_orden]
      );

      // 3. Mano de Obra
      const [manoObra] = await conn.query(
        `SELECT opm.*, CONCAT(e.nombres, ' ', IFNULL(e.apellidos, '')) as nombre_empleado, e.documento as cedula
         FROM orden_produccion_mano_obra opm
         JOIN rrhh_empleados e ON opm.id_empleado = e.id_empleado
         WHERE opm.id_orden = ?`,
        [id_orden]
      );

      // 4. Maquinarias
      const [maquinaria] = await conn.query(
        `SELECT opq.*, m.marca_modelo as maquina_nombre, m.placa
         FROM orden_produccion_maquinaria opq
         JOIN agroind_maquinaria_equipo m ON opq.id_maquina_taller = m.id_maq_agro
         WHERE opq.id_orden = ?`,
        [id_orden]
      );

      // 5. Control de Calidad y Checklist BPM
      const [calidadRows] = await conn.query(
        `SELECT * FROM orden_produccion_calidad WHERE id_orden = ?`,
        [id_orden]
      );
      const calidad = calidadRows.length > 0 ? calidadRows[0] : null;

      return {
        orden,
        insumos,
        manoObra,
        maquinaria,
        calidad
      };
    } finally {
      conn.release();
    }
  }

  // ==========================================
  // AUXILIARES
  // ==========================================

  static async generarCodigoOrden(id_tenant, conn) {
    const [result] = await conn.query(
      `SELECT COUNT(*) as total FROM orden_produccion WHERE id_tenant = ? AND YEAR(creado_el) = YEAR(NOW())`,
      [id_tenant]
    );
    const numero = (result[0].total + 1).toString().padStart(5, '0');
    const año = new Date().getFullYear();
    return `ORD-${año}-${numero}`;
  }

  static async generarCodigoLote(id_tenant, id_insumo, conn) {
    const [result] = await conn.query(
      `SELECT COUNT(*) as total FROM orden_produccion op
       JOIN formula_produccion fp ON op.id_formula = fp.id_formula
       WHERE op.id_tenant = ? AND fp.id_insumo_producto = ? AND YEAR(op.fecha_orden) = YEAR(NOW())`,
      [id_tenant, id_insumo]
    );
    const numero = (result[0].total + 1).toString().padStart(4, '0');
    const año = new Date().getFullYear();
    const mes = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const dia = new Date().getDate().toString().padStart(2, '0');
    return `LOT-${año}${mes}${dia}-PROD-${numero}`;
  }

  static generarHashQR(loteCode, id_tenant) {
    const token = `${loteCode}-${id_tenant}-${Date.now()}`;
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static calcularFechaVencimiento(fechaProduccion, diasVigencia = 180) {
    const fecha = new Date(fechaProduccion);
    fecha.setDate(fecha.getDate() + diasVigencia);
    return fecha;
  }
}

export default ProductionService;
