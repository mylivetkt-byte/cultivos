import express from 'express';
import pool from '../db.js';
import { getDb } from '../utils/db.js';
import { sendWaterRecord } from '../services/whatsapp.js';

const router = express.Router();

// LISTAR registros de agua (con filtros opcionales)
router.get('/', async (req, res) => {
  const { tenantId, fincaId, loteId, semilleroId, startDate, endDate, waterOption } = req.query;
  if (!tenantId) return res.status(400).json({ error: 'tenantId requerido' });
  let sql = `SELECT w.*, f.nombre as finca_nombre, l.nombre as lote_nombre, v.nombre as semillero_nombre 
             FROM water_records w 
             LEFT JOIN fincas f ON w.id_finca = f.id_finca
             LEFT JOIN lotes l ON w.id_lote = l.id_lote
             LEFT JOIN viveros v ON w.id_semillero = v.id_vivero
             WHERE w.id_finca IN (SELECT id_finca FROM fincas WHERE id_tenant = ?)`;
  const params = [tenantId];
  if (fincaId) { sql += ' AND w.id_finca = ?'; params.push(fincaId); }
  if (loteId) { sql += ' AND w.id_lote = ?'; params.push(loteId); }
  if (semilleroId) { sql += ' AND w.id_semillero = ?'; params.push(semilleroId); }
  if (waterOption) { sql += ' AND w.water_option = ?'; params.push(waterOption); }
  if (startDate && endDate) { sql += ' AND w.fecha_inicio >= ? AND w.fecha_fin <= ?'; params.push(startDate, endDate); }
  // condition logic already handled above
  try {
    const [rows] = await getDb(req).query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error list water records:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.get('/options', (req, res) => {
  const options = ['suministro', 'calidad', 'riego', 'reciclado', 'lagos', 'algibes'];
  res.json(options);
});

// CREAR nuevo registro de agua
router.post('/', async (req, res) => {
  const tenantId = req.body.tenantId || req.user?.id_tenant || 1;
  const { id_finca, id_lote, id_semillero, observaciones } = req.body;
  const waterOption = req.body.waterOption || req.body.water_option;
  const fecha_inicio = req.body.fecha_inicio ? String(req.body.fecha_inicio).split('T')[0] : '';
  const fecha_fin = req.body.fecha_fin ? String(req.body.fecha_fin).split('T')[0] : '';

  if (!tenantId || !id_finca || !waterOption || !fecha_inicio || !fecha_fin) {
    return res.status(400).json({ error: 'Datos obligatorios faltantes (finca, tipo de agua, fecha inicio y fin)' });
  }
  // Verificar unicidad por finca + opción + rango de fechas
  const checkSql = `SELECT 1 FROM water_records WHERE id_finca = ? AND water_option = ? AND ((fecha_inicio BETWEEN ? AND ?) OR (fecha_fin BETWEEN ? AND ?) OR (? BETWEEN fecha_inicio AND fecha_fin) OR (? BETWEEN fecha_inicio AND fecha_fin))`;
  try {
    const [dup] = await getDb(req).query(checkSql, [id_finca, waterOption, fecha_inicio, fecha_fin, fecha_inicio, fecha_fin, fecha_inicio, fecha_fin]);
    if (dup.length > 0) {
      return res.status(409).json({ error: 'Registro duplicado para la misma finca y rango de fechas' });
    }
    const insertSql = `INSERT INTO water_records (id_finca, id_lote, id_semillero, water_option, fecha_inicio, fecha_fin, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const [result] = await getDb(req).query(insertSql, [id_finca, id_lote || null, id_semillero || null, waterOption, fecha_inicio, fecha_fin, observaciones || null]);
    const newRecord = { id: result.insertId, id_finca, id_lote, id_semillero, waterOption, water_option: waterOption, fecha_inicio, fecha_fin, observaciones };
    // Enviar notificación por WhatsApp (no bloquear la respuesta)
    sendWaterRecord(newRecord).catch(err => console.error('WhatsApp error:', err));
    res.status(201).json(newRecord);
  } catch (err) {
    console.error('Error create water record:', err);
    res.status(500).json({ error: 'Error del servidor: ' + err.message });
  }
});

// ACTUALIZAR registro existente
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { id_finca, id_lote, id_semillero, observaciones } = req.body;
  const waterOption = req.body.waterOption || req.body.water_option;
  const fecha_inicio = req.body.fecha_inicio ? String(req.body.fecha_inicio).split('T')[0] : '';
  const fecha_fin = req.body.fecha_fin ? String(req.body.fecha_fin).split('T')[0] : '';

  if (!id_finca || !waterOption || !fecha_inicio || !fecha_fin) {
    return res.status(400).json({ error: 'Datos obligatorios faltantes (finca, tipo de agua, fecha inicio y fin)' });
  }
  // Chequear unicidad similar al POST (excluyendo el registro actual)
  const checkSql = `SELECT 1 FROM water_records WHERE id_finca = ? AND water_option = ? AND id <> ? AND ((fecha_inicio BETWEEN ? AND ?) OR (fecha_fin BETWEEN ? AND ?) OR (? BETWEEN fecha_inicio AND fecha_fin) OR (? BETWEEN fecha_inicio AND fecha_fin))`;
  try {
    const [dup] = await getDb(req).query(checkSql, [id_finca, waterOption, id, fecha_inicio, fecha_fin, fecha_inicio, fecha_fin, fecha_inicio, fecha_fin]);
    if (dup.length > 0) {
      return res.status(409).json({ error: 'Actualización produciría registro duplicado' });
    }
    const updateSql = `UPDATE water_records SET id_finca = ?, id_lote = ?, id_semillero = ?, water_option = ?, fecha_inicio = ?, fecha_fin = ?, observaciones = ? WHERE id = ?`;
    await getDb(req).query(updateSql, [id_finca, id_lote || null, id_semillero || null, waterOption, fecha_inicio, fecha_fin, observaciones || null, id]);
    const updatedRecord = { id, id_finca, id_lote, id_semillero, waterOption, water_option: waterOption, fecha_inicio, fecha_fin, observaciones };
    sendWaterRecord(updatedRecord).catch(err => console.error('WhatsApp error:', err));
    res.json(updatedRecord);
  } catch (err) {
    console.error('Error update water record:', err);
    res.status(500).json({ error: err.message });
  }
});

// ELIMINAR (desactivar) registro
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await getDb(req).query('DELETE FROM water_records WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error delete water record:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

export default router;
