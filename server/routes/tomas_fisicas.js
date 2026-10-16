import express from 'express';
import pool from '../db.js';
import { getDb } from '../utils/db.js';

const router = express.Router();

// 1. Obtener listado de tomas físicas
router.get('/', async (req, res) => {
  const { tenantId } = req.query;
  if (!tenantId) return res.status(400).json({ error: 'Falta tenantId' });

  try {
    const [tomas] = await getDb(req).query(`
      SELECT t.*, b.nombre as bodega, r.nombres as resp_nombres, r.apellidos as resp_apellidos,
        (SELECT COUNT(*) FROM inv_tomas_fisicas_detalle d WHERE d.id_toma = t.id_toma) as total_items,
        (SELECT COUNT(*) FROM inv_tomas_fisicas_detalle d WHERE d.id_toma = t.id_toma AND d.stock_fisico IS NOT NULL) as contados
      FROM inv_tomas_fisicas t
      JOIN bod_bodegas b ON t.id_bodega = b.id_bodega
      LEFT JOIN rrhh_empleados r ON t.responsable_id = r.id_empleado
      WHERE t.id_tenant = ?
      ORDER BY t.fecha_creacion DESC
    `, [tenantId]);
    res.json({ success: true, tomas });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Crear Toma Física y congelar stock
router.post('/', async (req, res) => {
  const { tenantId, id_bodega, responsable_id, observaciones } = req.body;
  
  const conn = await getDb(req).getConnection();
  try {
    await conn.beginTransaction();

    // 1. Insert header
    const [tomaRes] = await conn.query(`
      INSERT INTO inv_tomas_fisicas (id_tenant, id_bodega, responsable_id, observaciones)
      VALUES (?, ?, ?, ?)
    `, [tenantId, id_bodega, responsable_id || null, observaciones || null]);

    const idToma = tomaRes.insertId;

    // 2. Fetch current theoretical stock (Freeze)
    // ONLY include items that actually have existence in this bodega
    const [existencias] = await conn.query(`
      SELECT id_insumo, cantidad 
      FROM inv_existencias 
      WHERE id_bodega = ?
    `, [id_bodega]);

    if (existencias.length > 0) {
      const valores = existencias.map(e => [idToma, e.id_insumo, e.cantidad]);
      await conn.query(`
        INSERT INTO inv_tomas_fisicas_detalle (id_toma, id_insumo, stock_teorico)
        VALUES ?
      `, [valores]);
    }

    await conn.commit();
    res.json({ success: true, id_toma: idToma });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// 3. Obtener detalles para contar (Puede esconder el teórico si es móvil)
router.get('/:idToma/detalles', async (req, res) => {
  const { idToma } = req.params;
  const { modoConteo } = req.query; // If true, we could obfuscate theoretical stock

  try {
    const [detalles] = await getDb(req).query(`
      SELECT d.*, i.codigo, i.nombre, i.unidad_medida, i.imagen_url
      FROM inv_tomas_fisicas_detalle d
      JOIN insumos i ON d.id_insumo = i.id_insumo
      WHERE d.id_toma = ?
      ORDER BY i.nombre ASC
    `, [idToma]);

    // If mobile counting mode, hide theoretical stock to force blind count
    if (modoConteo === 'true') {
      detalles.forEach(d => {
        delete d.stock_teorico;
        delete d.diferencia;
      });
    }

    res.json({ success: true, detalles });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Guardar conteo físico de un ítem
router.put('/:idToma/conteo/:idDetalle', async (req, res) => {
  const { idToma, idDetalle } = req.params;
  const { stock_fisico } = req.body;

  try {
    // Calculamos la diferencia al vuelo
    const [det] = await getDb(req).query(`SELECT stock_teorico FROM inv_tomas_fisicas_detalle WHERE id_detalle = ? AND id_toma = ?`, [idDetalle, idToma]);
    if (det.length === 0) return res.status(404).json({ error: 'Detalle no encontrado' });

    const teorico = det[0].stock_teorico;
    const fisico = Number(stock_fisico);
    const diferencia = fisico - teorico;

    await getDb(req).query(`
      UPDATE inv_tomas_fisicas_detalle 
      SET stock_fisico = ?, diferencia = ?
      WHERE id_detalle = ?
    `, [fisico, diferencia, idDetalle]);

    // Change status to En Conteo if it was Borrador
    await getDb(req).query(`UPDATE inv_tomas_fisicas SET estado = 'En Conteo' WHERE id_toma = ? AND estado = 'Borrador'`, [idToma]);

    res.json({ success: true, diferencia });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Agregar Insumo no previsto (Que estaba en 0 teórico y apareció)
router.post('/:idToma/extra', async (req, res) => {
  const { idToma } = req.params;
  const { id_insumo, stock_fisico } = req.body;

  try {
    // Check if it already exists
    const [exists] = await getDb(req).query('SELECT id_detalle FROM inv_tomas_fisicas_detalle WHERE id_toma = ? AND id_insumo = ?', [idToma, id_insumo]);
    if (exists.length > 0) return res.status(400).json({ error: 'El insumo ya está en la lista de conteo' });

    await getDb(req).query(`
      INSERT INTO inv_tomas_fisicas_detalle (id_toma, id_insumo, stock_teorico, stock_fisico, diferencia)
      VALUES (?, ?, 0, ?, ?)
    `, [idToma, id_insumo, stock_fisico, stock_fisico]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Cierre Mágico: Conciliar y generar Ajustes
router.post('/:idToma/cierre', async (req, res) => {
  const { idToma } = req.params;
  const { tenantId } = req.body;

  const conn = await getDb(req).getConnection();
  try {
    await conn.beginTransaction();

    const [tomas] = await conn.query('SELECT * FROM inv_tomas_fisicas WHERE id_toma = ?', [idToma]);
    if (tomas.length === 0) throw new Error('Toma no encontrada');
    const toma = tomas[0];

    if (toma.estado === 'Conciliado') throw new Error('Esta toma física ya fue conciliada previamente');

    const idBodega = toma.id_bodega;

    // Check if all items are counted
    const [uncounted] = await conn.query(`SELECT COUNT(*) as c FROM inv_tomas_fisicas_detalle WHERE id_toma = ? AND stock_fisico IS NULL`, [idToma]);
    if (uncounted[0].c > 0) throw new Error(`Faltan ${uncounted[0].c} ítems por contar. No se puede conciliar.`);

    // Check Document Types for Adjustments
    let [tdIn] = await conn.query("SELECT id_tipo FROM inv_tipos_documento WHERE naturaleza = 'Entrada' AND nombre LIKE '%Ajuste%' AND id_tenant = ? LIMIT 1", [tenantId]);
    if (tdIn.length === 0) {
      await conn.query("INSERT INTO inv_tipos_documento (id_tenant, codigo, nombre, naturaleza) VALUES (?, 'AJ+', 'Ajuste de Entrada por Sobrante', 'Entrada')", [tenantId]);
      [tdIn] = await conn.query("SELECT id_tipo FROM inv_tipos_documento WHERE codigo = 'AJ+' AND id_tenant = ? LIMIT 1", [tenantId]);
    }
    const idTipoEntrada = tdIn[0].id_tipo;

    let [tdOut] = await conn.query("SELECT id_tipo FROM inv_tipos_documento WHERE naturaleza = 'Salida' AND nombre LIKE '%Ajuste%' AND id_tenant = ? LIMIT 1", [tenantId]);
    if (tdOut.length === 0) {
      await conn.query("INSERT INTO inv_tipos_documento (id_tenant, codigo, nombre, naturaleza) VALUES (?, 'AJ-', 'Ajuste de Salida por Faltante', 'Salida')", [tenantId]);
      [tdOut] = await conn.query("SELECT id_tipo FROM inv_tipos_documento WHERE codigo = 'AJ-' AND id_tenant = ? LIMIT 1", [tenantId]);
    }
    const idTipoSalida = tdOut[0].id_tipo;

    // Get discrepancies
    const [detalles] = await conn.query(`SELECT * FROM inv_tomas_fisicas_detalle WHERE id_toma = ? AND diferencia != 0`, [idToma]);
    
    let docsCreados = { entrada: null, salida: null };

    const sobrantes = detalles.filter(d => d.diferencia > 0);
    const faltantes = detalles.filter(d => d.diferencia < 0);

    // Create Entry Document (Sobrantes)
    if (sobrantes.length > 0) {
      const [docIn] = await conn.query(`
        INSERT INTO inv_documentos (id_tenant, id_bodega, id_tipo_documento, fecha_documento, estado, persona_reclama, observaciones)
        VALUES (?, ?, ?, CURDATE(), 'Confirmado', 'SISTEMA', ?)
      `, [tenantId, idBodega, idTipoEntrada, `Generado automáticamente por Conciliación de Toma Física #${idToma}`]);
      docsCreados.entrada = docIn.insertId;

      for (const s of sobrantes) {
        const cant = Math.abs(s.diferencia);
        // Costo Unitario para sobrante (Get from current average or 0)
        let costo = 0;
        const [exis] = await conn.query('SELECT costo_promedio FROM inv_existencias WHERE id_bodega = ? AND id_insumo = ?', [idBodega, s.id_insumo]);
        if (exis.length > 0 && exis[0].costo_promedio) costo = exis[0].costo_promedio;

        await conn.query(`
          INSERT INTO inv_documentos_detalle (id_documento, id_insumo, cantidad, costo_unitario, subtotal)
          VALUES (?, ?, ?, ?, ?)
        `, [docsCreados.entrada, s.id_insumo, cant, costo, cant * costo]);

        // Update Stock
        if (exis.length > 0) {
          await conn.query('UPDATE inv_existencias SET cantidad = cantidad + ? WHERE id_bodega = ? AND id_insumo = ?', [cant, idBodega, s.id_insumo]);
        } else {
          await conn.query('INSERT INTO inv_existencias (id_bodega, id_insumo, cantidad, costo_promedio) VALUES (?, ?, ?, ?)', [idBodega, s.id_insumo, cant, costo]);
        }

        // Tracking
        await conn.query(`
          INSERT INTO movimientos_inventario (id_tenant, id_insumo, tipo_movimiento, cantidad, costo_unitario, documento_referencia, usuario_responsable, observaciones, id_bodega, id_documento)
          VALUES (?, ?, 'Ajuste', ?, ?, ?, ?, ?, ?, ?)
        `, [tenantId, s.id_insumo, cant, costo, `TF-${idToma}`, toma.responsable_id || 0, 'Sobrante en Toma Física', idBodega, docsCreados.entrada]);
      }
    }

    // Create Exit Document (Faltantes)
    if (faltantes.length > 0) {
      const [docOut] = await conn.query(`
        INSERT INTO inv_documentos (id_tenant, id_bodega, id_tipo_documento, fecha_documento, estado, persona_reclama, observaciones)
        VALUES (?, ?, ?, CURDATE(), 'Confirmado', 'SISTEMA', ?)
      `, [tenantId, idBodega, idTipoSalida, `Generado automáticamente por Conciliación de Toma Física #${idToma}`]);
      docsCreados.salida = docOut.insertId;

      for (const f of faltantes) {
        const cant = Math.abs(f.diferencia);
        let costo = 0;
        const [exis] = await conn.query('SELECT costo_promedio FROM inv_existencias WHERE id_bodega = ? AND id_insumo = ?', [idBodega, f.id_insumo]);
        if (exis.length > 0 && exis[0].costo_promedio) costo = exis[0].costo_promedio;

        await conn.query(`
          INSERT INTO inv_documentos_detalle (id_documento, id_insumo, cantidad, costo_unitario, subtotal)
          VALUES (?, ?, ?, ?, ?)
        `, [docsCreados.salida, f.id_insumo, cant, costo, cant * costo]);

        // Update Stock
        await conn.query('UPDATE inv_existencias SET cantidad = cantidad - ? WHERE id_bodega = ? AND id_insumo = ?', [cant, idBodega, f.id_insumo]);

        // Tracking
        await conn.query(`
          INSERT INTO movimientos_inventario (id_tenant, id_insumo, tipo_movimiento, cantidad, costo_unitario, documento_referencia, usuario_responsable, observaciones, id_bodega, id_documento)
          VALUES (?, ?, 'Ajuste', ?, ?, ?, ?, ?, ?, ?)
        `, [tenantId, f.id_insumo, -cant, costo, `TF-${idToma}`, toma.responsable_id || 0, 'Faltante en Toma Física', idBodega, docsCreados.salida]);
      }
    }

    // Mark as Conciliado
    await conn.query(`UPDATE inv_tomas_fisicas SET estado = 'Conciliado' WHERE id_toma = ?`, [idToma]);

    await conn.commit();
    res.json({ success: true, ajustes: docsCreados });

  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

export default router;
