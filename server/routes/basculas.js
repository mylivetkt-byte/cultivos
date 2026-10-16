import express from 'express';
import pool from '../db.js';
import { getDb } from '../utils/db.js';
import xlsx from 'xlsx';
import PDFDocument from 'pdfkit';
import stream from 'stream';

const router = express.Router();

// LISTAR básculas (opcional filtro activo)
router.get('/', async (req, res) => {
  const { tenantId, activa } = req.query;
  if (!tenantId) return res.status(400).json({ error: 'tenantId requerido' });
  const sql = `SELECT * FROM basculas WHERE id_tenant = ?${activa ? ' AND activa = 1' : ''}`;
  try {
    const [rows] = await getDb(req).query(sql, [tenantId]);
    res.json(rows);
  } catch (err) {
    console.error('Error list basculas:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// CREAR nueva báscula
router.post('/', async (req, res) => {
  const { tenantId: tId, id_tenant, codigo, nombre, ubicacion, capacidad_maxima,
          precision_kg, unidad, tipo_conexion, codigo_sensor, fecha_calibracion,
          inicio_lectura, longitud_lectura, protocolo, baud_rate,
          data_bits, paridad, stop_bits, modo_lectura, comando_peticion } = req.body;
  const tenantId = id_tenant || tId;
  if (!tenantId || !codigo || !nombre || !tipo_conexion) {
    return res.status(400).json({ error: 'Datos obligatorios faltantes' });
  }
  const sql = `INSERT INTO basculas 
    (id_tenant, codigo, nombre, ubicacion, capacidad_maxima, precision_kg, unidad,
     tipo_conexion, codigo_sensor, fecha_calibracion, inicio_lectura, longitud_lectura,
     protocolo, baud_rate, data_bits, paridad, stop_bits, activa, modo_lectura, comando_peticion)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)`;
  try {
    await getDb(req).query(sql, [tenantId, codigo, nombre, ubicacion, capacidad_maxima,
      precision_kg, unidad, tipo_conexion, codigo_sensor, fecha_calibracion,
      inicio_lectura ?? 0, longitud_lectura ?? 10,
      protocolo ?? 'continua', baud_rate ?? 9600, data_bits ?? 8, paridad ?? 'none', stop_bits ?? 1,
      modo_lectura ?? 'continuo', comando_peticion ?? null]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error create bascula:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ACTUALIZAR báscula existente
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  // Only allow columns that exist in the basculas table
  const validColumns = [
    'codigo', 'nombre', 'ubicacion', 'capacidad_maxima', 'precision_kg',
    'unidad', 'tipo_conexion', 'codigo_sensor', 'fecha_calibracion',
    'inicio_lectura', 'longitud_lectura', 'protocolo', 'baud_rate',
    'data_bits', 'paridad', 'stop_bits', 'activa', 'modo_lectura', 'comando_peticion'
  ];
  const filtered = Object.entries(req.body).filter(([k]) => validColumns.includes(k));
  if (filtered.length === 0) return res.status(400).json({ error: 'Nada que actualizar' });
  const setClause = filtered.map(([f]) => `${f} = ?`).join(', ');
  const values = filtered.map(([, v]) => v);
  const sql = `UPDATE basculas SET ${setClause} WHERE id_bascula = ?`;
  try {
    await getDb(req).query(sql, [...values, id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error update bascula:', err);
    res.status(500).json({ error: err.message });
  }
});

// ELIMINAR lógica (desactivar)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await getDb(req).query('UPDATE basculas SET activa = 0 WHERE id_bascula = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error delete bascula:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// REGISTRO DE PESO (uso en entradas, salidas, traslados)
router.post('/:id/registro-peso', async (req, res) => {
  const { id } = req.params; // id_bascula
  const { peso, movimientoId } = req.body;
  if (!peso || !movimientoId) return res.status(400).json({ error: 'peso y movimientoId son obligatorios' });
  try {
    // Guardar auditoría
    await getDb(req).query(
      'INSERT INTO registro_pesos (id_bascula, id_movimiento, peso) VALUES (?,?,?)',
      [id, movimientoId, peso]
    );
    // Actualizar movimiento
    await getDb(req).query(
      'UPDATE movimientos_inventario SET peso = ?, id_bascula = ? WHERE id_movimiento = ?',
      [peso, id, movimientoId]
    );
    res.json({ success: true, peso });
  } catch (err) {
    console.error('Error registro peso:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.get('/reportes/pesos-diarios', async (req, res) => {
  const { tenantId, startDate, endDate } = req.query;
  if (!tenantId) return res.status(400).json({ error: 'tenantId requerido' });
  let sql = `SELECT DATE(r.created_at) as fecha, r.id_bascula, b.codigo, b.nombre, SUM(r.peso) as peso_total
    FROM registro_pesos r
    JOIN basculas b ON b.id_bascula = r.id_bascula
    WHERE r.id_tenant = ?`;
  const params = [tenantId];
  if (startDate && endDate) {
    sql += ' AND DATE(r.created_at) BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }
  sql += ' GROUP BY DATE(r.created_at), r.id_bascula ORDER BY fecha DESC';
  try {
    const [rows] = await getDb(req).query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error reporte pesos diarios:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// EXPORTAR reportes de pesos a Excel o PDF
router.get('/export', async (req, res) => {
  const { tenantId, startDate, endDate, format } = req.query;
  if (!tenantId) return res.status(400).json({ error: 'tenantId requerido' });
  if (!format || !['excel', 'pdf'].includes(format))
    return res.status(400).json({ error: 'Formato exportación inválido' });

  // Consulta datos (igual que reporte)
  let sql = `SELECT DATE(r.created_at) as fecha, r.id_bascula, b.codigo, b.nombre, SUM(r.peso) as peso_total
    FROM registro_pesos r
    JOIN basculas b ON b.id_bascula = r.id_bascula
    WHERE r.id_tenant = ?`;
  const params = [tenantId];
  if (startDate && endDate) {
    sql += ' AND DATE(r.created_at) BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }
  sql += ' GROUP BY DATE(r.created_at), r.id_bascula ORDER BY fecha DESC';
  try {
    const [rows] = await getDb(req).query(sql, params);
    if (format === 'excel') {
      const ws = xlsx.utils.json_to_sheet(rows);
      const wb = { SheetNames: ['Reporte'], Sheets: { Reporte: ws } };
      const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const filename = `pesos_basculas_${tenantId}_${Date.now()}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buf);
    } else {
      // PDF generation
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        const filename = `pesos_basculas_${tenantId}_${Date.now()}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(pdfData);
      });
      // Header
      doc.fontSize(16).text('Reporte de Pesos Diarios', { align: 'center' });
      doc.moveDown();
      // Table header
      const headers = ['Fecha', 'Id Báscula', 'Código', 'Nombre', 'Peso Total (kg)'];
      const startX = doc.x;
      const startY = doc.y;
      const columnWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / headers.length;
      doc.fontSize(10).font('Helvetica-Bold');
      headers.forEach((h, i) => {
        doc.text(h, startX + i * columnWidth, startY, { width: columnWidth, align: 'left' });
      });
      doc.moveDown();
      // Table rows
      doc.font('Helvetica');
      rows.forEach((row) => {
        const y = doc.y;
        const values = [row.fecha, row.id_bascula, row.codigo, row.nombre, row.peso_total];
        values.forEach((v, i) => {
          doc.text(String(v), startX + i * columnWidth, y, { width: columnWidth, align: 'left' });
        });
        doc.moveDown();
      });
      doc.end();
    }
  } catch (err) {
    console.error('Error export reporte pesos:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

export default router;
