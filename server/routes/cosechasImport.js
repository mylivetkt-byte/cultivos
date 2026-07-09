// routes/cosechasImport.js
import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse';
import pool from '../db.js';

const router = express.Router();

// Multer setup – store file in memory (no disk)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB limit

/**
 * POST /api/cosechas/import
 * Accepts a CSV file with columns: id_parcela,id_cultivo,codigoCosecha,fecha_cosecha,peso_total_kg
 * Validates each row, ensures uniqueness (codigoCosecha and id_parcela+fecha_cosecha).
 * Entire import is atomic – any error rolls back the transaction.
 */
router.post('/import', upload.single('file'), async (req, res) => {
  const db = req.tenantPool || pool;
  const userId = req.user?.id || 0;
  if (!req.file) {
    return res.status(400).json({ error: 'Archivo CSV requerido' });
  }

  const csvString = req.file.buffer.toString('utf8');
  const records = [];
  const parser = parse(csvString, {
    columns: true,
    trim: true,
    skip_empty_lines: true,
  });

  parser.on('readable', () => {
    let record;
    while ((record = parser.read())) {
      records.push(record);
    }
  });

  parser.on('error', (err) => {
    console.error('CSV parse error:', err);
    return res.status(400).json({ error: 'Error al parsear CSV', details: err.message });
  });

  parser.on('end', async () => {
    if (records.length === 0) {
      return res.status(400).json({ error: 'CSV vacío o sin filas válidas' });
    }
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const { id_parcela, id_cultivo, codigoCosecha, fecha_cosecha, peso_total_kg } = row;
        // Basic field validation
        if (!id_parcela || !id_cultivo || !codigoCosecha || !fecha_cosecha || !peso_total_kg) {
          throw new Error(`Fila ${i + 1}: Campos obligatorios faltantes`);
        }
        // Uniqueness check
        const [dup] = await connection.query(
          `SELECT id FROM cosechas WHERE codigoCosecha = ? OR (id_parcela = ? AND fecha_cosecha = ?) LIMIT 1`,
          [codigoCosecha, id_parcela, fecha_cosecha]
        );
        if (dup.length) {
          throw new Error(`Fila ${i + 1}: Duplicado de código o parcela/fecha`);
        }
        // Insert row
        const insertSql = `INSERT INTO cosechas (id_parcela, id_cultivo, codigoCosecha, fecha_cosecha, peso_total_kg, created_by) VALUES (?,?,?,?,?,?)`;
        const [{ insertId }] = await connection.query(insertSql, [id_parcela, id_cultivo, codigoCosecha, fecha_cosecha, peso_total_kg, userId]);
        // Audit entry for each insert (optional – could be a single entry later)
        await connection.query(
          `INSERT INTO cosechas_auditoria (id_cosecha, action, user_id, payload) VALUES (?,?,?,?)`,
          [insertId, 'INSERT', userId, JSON.stringify(row)]
        );
      }

      await connection.commit();
      res.json({ inserted: records.length });
    } catch (err) {
      if (connection) await connection.rollback();
      console.error('Error importando cosechas:', err);
      res.status(400).json({ error: 'Error en importación', details: err.message });
    } finally {
      if (connection) connection.release();
    }
  });

  // Trigger parsing
  parser.write(csvString);
  parser.end();
});

export default router;
