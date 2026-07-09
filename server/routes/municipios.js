import express from 'express';
import pool from '../db.js';

const router = express.Router();

function getDb(req) {
  return req.tenantPool || pool;
}

// GET /api/municipios?q=...
router.get('/', async (req, res) => {
  const { q } = req.query;
  
  if (!q || q.length < 2) {
    return res.json([]);
  }

  try {
    const search = `%${q}%`;
    const [rows] = await getDb(req).query(`
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

export default router;
