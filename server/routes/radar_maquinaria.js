import { Router } from 'express';
import { authMiddleware, tenantPoolMiddleware } from '../utils/auth.js';

const router = Router();
router.use(authMiddleware);
router.use(tenantPoolMiddleware);

// GET: Máquinas activas
router.get('/activas', async (req, res) => {
  try {
    const pool = req.tenantPool;
    const [rows] = await pool.query(`
      SELECT 
        b.id_bitacora, b.fecha_hora_inicio, b.horometro_inicial, b.estado,
        m.marca_modelo, m.placa, m.tipo,
        l.nombre as lote_nombre,
        e.nombres, e.apellidos
      FROM maq_radar_bitacora b
      JOIN agroind_maquinaria_equipo m ON b.id_maq_agro = m.id_maq_agro
      JOIN lotes l ON b.id_lote = l.id_lote
      JOIN rrhh_empleados e ON b.id_empleado = e.id_empleado
      WHERE b.id_tenant = ? AND b.estado = 'Trabajando'
    `, [req.tenantId]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching active machines:', err);
    res.status(500).json({ error: 'Error obteniendo maquinaria activa' });
  }
});

// POST: Check-in
router.post('/checkin', async (req, res) => {
  try {
    const { id_maq_agro, id_lote, id_empleado, horometro_inicial } = req.body;
    if (!id_maq_agro || !id_lote || !id_empleado || horometro_inicial === undefined) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const pool = req.tenantPool;
    
    // Verificar si ya está trabajando
    const [existing] = await pool.query(
      'SELECT id_bitacora FROM maq_radar_bitacora WHERE id_maq_agro = ? AND estado = "Trabajando"', 
      [id_maq_agro]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'La máquina ya se encuentra operando en otro lote.' });
    }

    const [result] = await pool.query(`
      INSERT INTO maq_radar_bitacora 
      (id_tenant, id_maq_agro, id_lote, id_empleado, fecha_hora_inicio, horometro_inicial, estado)
      VALUES (?, ?, ?, ?, NOW(), ?, 'Trabajando')
    `, [req.tenantId, id_maq_agro, id_lote, id_empleado, horometro_inicial]);

    // Actualizar horómetro actual en la máquina
    await pool.query(
      'UPDATE agroind_maquinaria_equipo SET horometro_actual = ? WHERE id_maq_agro = ?', 
      [horometro_inicial, id_maq_agro]
    );

    res.json({ success: true, id_bitacora: result.insertId });
  } catch (err) {
    console.error('Error in checkin:', err);
    res.status(500).json({ error: 'Error al registrar el check-in' });
  }
});

// POST: Check-out
router.post('/checkout', async (req, res) => {
  try {
    const { id_bitacora, horometro_final, combustible_consumido_gal, novedades } = req.body;
    if (!id_bitacora || horometro_final === undefined) {
      return res.status(400).json({ error: 'Faltan datos requeridos (id_bitacora, horometro_final)' });
    }

    const pool = req.tenantPool;

    const [bitacoras] = await pool.query(
      'SELECT id_maq_agro, horometro_inicial FROM maq_radar_bitacora WHERE id_bitacora = ? AND id_tenant = ?',
      [id_bitacora, req.tenantId]
    );

    if (bitacoras.length === 0) {
      return res.status(404).json({ error: 'Bitácora no encontrada' });
    }

    const bitacora = bitacoras[0];
    const horas_trabajadas = parseFloat(horometro_final) - parseFloat(bitacora.horometro_inicial);
    
    if (horas_trabajadas < 0) {
      return res.status(400).json({ error: 'El horómetro final no puede ser menor al inicial' });
    }

    // Aquí asumo un costo fijo temporal por hora para combustible y depreciación, en un sistema real saldría de la BD
    const COSTO_POR_HORA = 15000;
    const costo_operacion = horas_trabajadas * COSTO_POR_HORA;

    await pool.query(`
      UPDATE maq_radar_bitacora 
      SET fecha_hora_fin = NOW(),
          horometro_final = ?,
          horas_trabajadas = ?,
          combustible_consumido_gal = ?,
          costo_operacion = ?,
          novedades = ?,
          estado = 'Finalizado'
      WHERE id_bitacora = ?
    `, [horometro_final, horas_trabajadas, combustible_consumido_gal || 0, costo_operacion, novedades || '', id_bitacora]);

    // Actualizar horómetro actual en la máquina
    await pool.query(
      'UPDATE agroind_maquinaria_equipo SET horometro_actual = ? WHERE id_maq_agro = ?', 
      [horometro_final, bitacora.id_maq_agro]
    );

    res.json({ success: true, horas_trabajadas, costo_operacion });
  } catch (err) {
    console.error('Error in checkout:', err);
    res.status(500).json({ error: 'Error al registrar el check-out' });
  }
});

export default router;
