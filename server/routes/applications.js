import express from 'express';
import pool from '../db.js';
import { sendTextMessage } from '../services/whatsappService.js';

const router = express.Router();

function getDb(req) {
  return req.tenantPool || pool;
}

// ============================================
// BIBLIOTECA FITOSANITARIA (ICA)
// ============================================
router.get('/ica', async (req, res) => {
  try {
    const [rows] = await getDb(req).query('SELECT * FROM lib_fitosanitaria_ica ORDER BY tipo, cultivo, nombre_comun');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// RECETAS AGRÍCOLAS
// ============================================
router.get('/recipes', async (req, res) => {
  const tenantId = req.query.tenantId || 1;
  try {
    const [recipes] = await getDb(req).query(`
      SELECT r.*, l.nombre_comun as plaga_enfermedad, c.nombre as cultivo_nombre
      FROM app_recetas r
      LEFT JOIN lib_fitosanitaria_ica l ON r.id_enfermedad_plaga = l.id_enfermedad_plaga
      LEFT JOIN cultivos c ON r.id_cultivo = c.id_cultivo
      WHERE r.id_tenant = ?
    `, [tenantId]);

    for (let r of recipes) {
      const [detalles] = await getDb(req).query(`
        SELECT d.*, i.nombre as insumo_nombre, i.codigo 
        FROM app_recetas_detalle d
        JOIN insumos i ON d.id_insumo = i.id_insumo
        WHERE d.id_receta = ?
      `, [r.id_receta]);
      r.detalles = detalles;
    }
    res.json(recipes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/recipes', async (req, res) => {
  const { tenantId, nombre_receta, tipo, id_cultivo, id_enfermedad_plaga, autor_tecnico, instrucciones_preparacion, recomendaciones_seguridad, detalles } = req.body;
  const conn = await getDb(req).getConnection();
  try {
    await conn.beginTransaction();
    const [resR] = await conn.query(`
      INSERT INTO app_recetas (id_tenant, nombre_receta, tipo, id_cultivo, id_enfermedad_plaga, autor_tecnico, fecha_creacion, instrucciones_preparacion, recomendaciones_seguridad)
      VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?, ?)
    `, [tenantId || 1, nombre_receta, tipo, id_cultivo, id_enfermedad_plaga, autor_tecnico, instrucciones_preparacion, recomendaciones_seguridad]);
    
    const id_receta = resR.insertId;

    for (let d of detalles) {
      await conn.query(`
        INSERT INTO app_recetas_detalle (id_receta, id_insumo, dosis_recomendada, unidad_medida, notas)
        VALUES (?, ?, ?, ?, ?)
      `, [id_receta, d.id_insumo, d.dosis_recomendada, d.unidad_medida, d.notas]);
    }

    await conn.commit();

    res.json({ success: true, id_receta });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ============================================
// PROGRAMACIÓN DE APLICACIONES
// ============================================
router.get('/schedule', async (req, res) => {
  const tenantId = req.query.tenantId || 1;
  try {
    const [schedules] = await getDb(req).query(`
      SELECT p.*, r.nombre_receta, l.nombre as lote_nombre, f.nombre as finca_nombre
      FROM app_programacion p
      LEFT JOIN app_recetas r ON p.id_receta = r.id_receta
      LEFT JOIN lotes l ON p.id_lote = l.id_lote
      LEFT JOIN fincas f ON p.id_finca = f.id_finca
      WHERE p.id_tenant = ?
      ORDER BY p.fecha_programada DESC
    `, [tenantId]);

    for (let s of schedules) {
      const [insumos] = await getDb(req).query(`
        SELECT pi.*, i.nombre as insumo_nombre, i.es_nocivo
        FROM app_programacion_insumos pi
        JOIN insumos i ON pi.id_insumo = i.id_insumo
        WHERE pi.id_programacion = ?
      `, [s.id_programacion]);
      s.insumos = insumos;
    }

    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/schedule', async (req, res) => {
  const { tenantId, id_finca, id_lote, id_receta, fecha_programada, metodo_aplicacion, id_maquinaria, responsable_aplicacion, insumos } = req.body;
  const conn = await getDb(req).getConnection();
  try {
    await conn.beginTransaction();

    const [resP] = await conn.query(`
      INSERT INTO app_programacion (id_tenant, id_finca, id_lote, id_receta, fecha_programada, metodo_aplicacion, id_maquinaria, responsable_aplicacion)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [tenantId || 1, id_finca, id_lote, id_receta, fecha_programada, metodo_aplicacion, id_maquinaria || null, responsable_aplicacion]);
    
    const id_prog = resP.insertId;

    // ----------- Stock verification & automatic actions (Moved to Schedule) -----------
    let recetaNombre = "Mezcla Manual";
    let recetaTipo = "Quimico";
    if (id_receta) {
      const [rRows] = await conn.query(`SELECT nombre_receta, tipo FROM app_recetas WHERE id_receta = ?`, [id_receta]);
      if (rRows.length > 0) {
        recetaNombre = rRows[0].nombre_receta;
        recetaTipo = rRows[0].tipo;
      }
    }

    const insumoMap = {};

    for (let i of insumos) {
      await conn.query(`
        INSERT INTO app_programacion_insumos (id_programacion, id_insumo, cantidad_proyectada)
        VALUES (?, ?, ?)
      `, [id_prog, i.id_insumo, i.cantidad_proyectada]);
      
      insumoMap[i.id_insumo] = (insumoMap[i.id_insumo] || 0) + parseFloat(i.cantidad_proyectada);
    }

    // Consultar stock disponible
    const [stockRows] = await conn.query(
      `SELECT id_insumo, cantidad FROM inv_existencias WHERE id_bodega = 1 AND id_insumo IN (${Object.keys(insumoMap).length > 0 ? Object.keys(insumoMap).join(',') : '0'})`
    );
    const stock = {};
    for (const r of stockRows) stock[r.id_insumo] = parseFloat(r.cantidad);

    const falta = [];
    for (const [id, qty] of Object.entries(insumoMap)) {
      if (!stock[id] || stock[id] < qty) falta.push({ id_insumo: Number(id), falta: qty - (stock[id] || 0), prioridad: insumos.find(i => i.id_insumo === Number(id))?.prioridad || 'Media' });
    }

    if (falta.length === 0 && insumos.length > 0) {
      // Stock suficiente → notificar despacho con Lote exacto
      const mensaje = `🟢 Aplicación Programada en Lote ID ${id_lote}. Receta: ${recetaNombre} (PROG-${id_prog}) lista para despacho. Stock disponible para todos los insumos.`;
      const destino = (recetaTipo === 'Quimico' || recetaTipo === 'Mixto') ? process.env.WHATSAPP_BODEGUERO : process.env.WHATSAPP_JEFE_VIOLLES;
      if (destino) await sendTextMessage(destino, mensaje);
    } else if (falta.length > 0) {
      // Falta stock → crear solicitudes automáticas
      for (const f of falta) {
        if (recetaTipo === 'Quimico' || recetaTipo === 'Mixto') {
          // Solicitud de compra
          await conn.query(
            `INSERT INTO solicitudes_pedido (id_tenant, id_insumo, cantidad, estado, notas) VALUES (?, ?, ?, 'Pendiente', ?)`,
            [tenantId || 1, f.id_insumo, f.falta, `Prioridad: ${f.prioridad}`]
          );
          const msg = `⚠️ URGENTE (${f.prioridad}): Falta stock para insumo ID ${f.id_insumo} (${f.falta} unidades) para la programación en Lote ID ${id_lote} (Receta: ${recetaNombre}). Se generó solicitud de compra.`;
          const jefe = process.env.WHATSAPP_JEFE_COMPRAS;
          if (jefe) await sendTextMessage(jefe, msg);
        } else {
          // Producción orgánica
          const [prod] = await conn.query(
            `INSERT INTO app_produccion_organica (id_tenant, lote_id, producto, cantidad_litros, costo_materiales, costo_jornales) VALUES (?, ?, ?, ?, 0, 0)`,
            [tenantId || 1, id_lote, `Bio-preparado para ${recetaNombre}`, f.falta]
          );
          const msg = `⚠️ Se necesita Bio-preparado urgente para Lote ID ${id_lote}. Falta insumo ID ${f.id_insumo} (${f.falta} Lts). Se creó orden de producción (ID ${prod.insertId}).`;
          const jefe = process.env.WHATSAPP_JEFE_VIOLLES;
          if (jefe) await sendTextMessage(jefe, msg);
        }
      }
    }

    await conn.commit();
    res.json({ success: true, id_programacion: id_prog });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

router.post('/complete/:id', async (req, res) => {
  const id_programacion = req.params.id;
  const { insumos_aplicados, envases, mantenimiento_notas } = req.body; 
  // insumos_aplicados: [{id_insumo, cantidad_real_aplicada, costo_total}]
  // envases: [{id_insumo, cantidad_envases_vacios, lavado_triple_realizado, entregado_centro_acopio}]
  
  const conn = await getDb(req).getConnection();
  try {
    await conn.beginTransaction();

    // 1. Update programacion status
    await conn.query(`
      UPDATE app_programacion 
      SET estado = 'Completada', fecha_ejecucion = NOW(), observaciones = ?
      WHERE id_programacion = ?
    `, [mantenimiento_notas || '', id_programacion]);

    let costoTotalAplicacion = 0;

    // 2. Update real quantities applied & Injection
    for (let ia of insumos_aplicados) {
      await conn.query(`
        UPDATE app_programacion_insumos
        SET cantidad_real_aplicada = ?, costo_total = ?
        WHERE id_programacion = ? AND id_insumo = ?
      `, [ia.cantidad_real_aplicada, ia.costo_total || 0, id_programacion, ia.id_insumo]);

      costoTotalAplicacion += parseFloat(ia.costo_total || 0);

      // INVENTORY DEDUCTION (KARDEX) - Descuento del Insumo Puro o Mezcla
      await conn.query(`
        INSERT INTO inv_kardex (id_tenant, tipo_movimiento, id_documento, numero_documento, fecha_movimiento, 
          id_bodega, id_insumo, cantidad, costo_unitario, costo_total, observaciones)
        VALUES (1, 'Egreso', 3, ?, NOW(), 1, ?, ?, 0, ?, ?)
      `, [`PROG-${id_programacion}`, ia.id_insumo, ia.cantidad_real_aplicada, ia.costo_total || 0, `Aplicación en Lote`]);
    }

    // 3. Register Control Envases (BPA)
    if (envases && envases.length > 0) {
      for (let e of envases) {
        await conn.query(`
          INSERT INTO app_control_envases (id_programacion, id_insumo, cantidad_envases_vacios, lavado_triple_realizado, perforado_inutilizado, entregado_centro_acopio)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [id_programacion, e.id_insumo, e.cantidad_envases_vacios, e.lavado_triple_realizado, e.lavado_triple_realizado, e.entregado_centro_acopio]);
      }
    }

    // 4. Inyección Contable
    if (costoTotalAplicacion > 0) {
      // Fetch lote and finca from programacion
      const [progInfo] = await conn.query(`SELECT id_finca, id_lote, responsable_aplicacion FROM app_programacion WHERE id_programacion = ?`, [id_programacion]);
      const finca = progInfo[0]?.id_finca || 1;
      const lote = progInfo[0]?.id_lote || 1;
      const agronomo = progInfo[0]?.responsable_aplicacion || 'Técnico';

      await conn.query(`
        INSERT INTO costos_produccion (id_tenant, id_finca, id_lote, categoria, descripcion, monto, fecha_gasto, estado)
        VALUES (1, ?, ?, 'Insumos / Aplicaciones', ?, ?, CURDATE(), 'Aprobado')
      `, [finca, lote, `Inyección automática: Aplicación PROG-${id_programacion}`, costoTotalAplicacion]);
      
      await conn.query(`
        INSERT INTO contab_comprobantes (id_tenant, id_finca, tipo_comprobante, numero_comprobante, fecha, concepto, monto_total, estado)
        VALUES (1, ?, 'Egreso', ?, CURDATE(), ?, ?, 'Aprobado')
      `, [finca, `APP-${id_programacion}`, `Costo de aplicación insumos lote ${lote}`, costoTotalAplicacion]);

      // Notificación de Cierre al Agrónomo
      const msgAgronomo = `✅ Aplicación PROG-${id_programacion} completada en Lote ID ${lote}. Operario: ${agronomo}. Costo Inyectado: $${costoTotalAplicacion}. Auditoría guardada.`;
      const telefonoAgronomo = process.env.WHATSAPP_AGRONOMO; // Or derived from User
      if (telefonoAgronomo) await sendTextMessage(telefonoAgronomo, msgAgronomo);
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

export default router;
