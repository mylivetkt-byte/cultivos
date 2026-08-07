import express from 'express';
import pool from '../db.js';

const router = express.Router();

// sys_municipios_dian is a global table, so we always use the main pool

// GET /api/municipios?q=...
router.get('/', async (req, res) => {
  const { q } = req.query;
  
  if (!q || q.length < 2) {
    return res.json([]);
  }

  try {
    const search = `%${q}%`;
    const [rows] = await pool.query(`
      SELECT codigo_dane, departamento, municipio 
      FROM sys_municipios_dian 
      WHERE activo = 1 
        AND (municipio LIKE ? OR departamento LIKE ? OR codigo_dane LIKE ?)
      ORDER BY departamento, municipio
      LIMIT 20
    `, [search, search, search]);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching municipios:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/departamentos', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT DISTINCT departamento 
      FROM sys_municipios_dian 
      WHERE activo = 1 
      ORDER BY departamento
    `);
    res.json(rows.map(r => r.departamento));
  } catch (error) {
    console.error('Error fetching departamentos:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/departamentos/:nombre/municipios', async (req, res) => {
  try {
    const { nombre } = req.params;
    const [rows] = await pool.query(`
      SELECT municipio, codigo_dane 
      FROM sys_municipios_dian 
      WHERE activo = 1 AND departamento = ?
      ORDER BY municipio
    `, [nombre]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching municipios by depto:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
