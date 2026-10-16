// routes/cosechasDetalle.js
import express from 'express';
import pool from '../db.js';
import { getDb } from '../utils/db.js';

const router = express.Router();

// GET /api/cosechas/:cosechaId/detalle - list details for a harvest
router.get('/:cosechaId/detalle', async (req, res) => {
  const db = getDb(req);
  const { cosechaId } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM cosechas_detalle WHERE id_cosecha = ?', [cosechaId]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching cosechas detalle:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/cosechas/:cosechaId/detalle - add a detail record
router.post('/:cosechaId/detalle', async (req, res) => {
  const db = getDb(req);
  const { cosechaId } = req.params;
  const { tipo_insumo, cantidad, unidad } = req.body;
  if (!tipo_insumo || cantidad == null) {
    return res.status(400).json({ error: 'Campos obligatorios faltantes' });
  }
  try {
    const insertSql = `INSERT INTO cosechas_detalle (id_cosecha, tipo_insumo, cantidad, unidad) VALUES (?,?,?,?)`;
    const [{ insertId }] = await db.query(insertSql, [cosechaId, tipo_insumo, cantidad, unidad]);
    res.status(201).json({ id: insertId });
  } catch (err) {
    console.error('Error inserting cosechas detalle:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

export default router;
