import express from 'express';
import pool from '../db.js';

const router = express.Router();

function getDb(req) { return req.tenantPool || pool; }

// GET /api/sync/pull
// Usado por la App Móvil (WatermelonDB) para descargar cambios del servidor
router.get('/pull', async (req, res) => {
  try {
    const lastPulledAt = parseInt(req.query.lastPulledAt || '0', 10);
    const db = getDb(req);

    // Convert lastPulledAt (Unix timestamp) to MySQL DATETIME
    const syncDate = new Date(lastPulledAt).toISOString().slice(0, 19).replace('T', ' ');

    // 1. Fetch created/updated records since lastPulledAt
    // For this example, we return full catalogs on first sync (lastPulledAt === 0), 
    // and only updated records on subsequent syncs.

    const [fincas] = await db.query('SELECT * FROM fincas WHERE updated_at > ? OR ? = 0', [syncDate, lastPulledAt]);
    const [potreros] = await db.query('SELECT * FROM ganado_potreros WHERE updated_at > ? OR ? = 0', [syncDate, lastPulledAt]);
    const [estanques] = await db.query('SELECT * FROM acuicola_estanques WHERE updated_at > ? OR ? = 0', [syncDate, lastPulledAt]);
    const [visitas] = await db.query('SELECT * FROM visitas_tecnicas WHERE updated_at > ? OR ? = 0', [syncDate, lastPulledAt]);
    const [detalles] = await db.query('SELECT * FROM visitas_tecnicas_detalles WHERE updated_at > ? OR ? = 0', [syncDate, lastPulledAt]);

    const changes = {
      fincas: { created: lastPulledAt === 0 ? fincas : [], updated: lastPulledAt > 0 ? fincas : [], deleted: [] },
      ganado_potreros: { created: lastPulledAt === 0 ? potreros : [], updated: lastPulledAt > 0 ? potreros : [], deleted: [] },
      acuicola_estanques: { created: lastPulledAt === 0 ? estanques : [], updated: lastPulledAt > 0 ? estanques : [], deleted: [] },
      visitas_tecnicas: { created: lastPulledAt === 0 ? visitas : [], updated: lastPulledAt > 0 ? visitas : [], deleted: [] },
      visitas_tecnicas_detalles: { created: lastPulledAt === 0 ? detalles : [], updated: lastPulledAt > 0 ? detalles : [], deleted: [] },
    };

    res.json({
      changes,
      timestamp: Date.now() // new lastPulledAt for the client
    });
  } catch (error) {
    console.error('Error in /api/sync/pull:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sync/push
// Usado por la App Móvil para enviar registros creados/modificados offline
router.post('/push', async (req, res) => {
  try {
    const { changes, lastPulledAt } = req.body;
    const db = getDb(req);

    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
      // Procesar Visitas Técnicas Creadas
      if (changes.visitas_tecnicas && changes.visitas_tecnicas.created.length > 0) {
        for (const v of changes.visitas_tecnicas.created) {
          await conn.query(`
            INSERT INTO visitas_tecnicas (uuid, id_finca, modulo, fecha_visita, latitud, longitud, firma_digital, hash_auditoria, observaciones_generales)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
              observaciones_generales = VALUES(observaciones_generales), 
              firma_digital = VALUES(firma_digital),
              hash_auditoria = VALUES(hash_auditoria)
          `, [
            v.id, // WatermelonDB ID is usually UUID mapped to 'id' property
            v.id_finca, v.modulo, new Date(v.fecha_visita), v.latitud, v.longitud, v.firma_digital, v.hash_auditoria, v.observaciones_generales
          ]);

          // Si el módulo es 'Cultivos', integrarlo con atec_visitas_tecnicas para no duplicar info
          if (v.modulo === 'Cultivos') {
             // Lógica de puente hacia agricultura
             await conn.query(`
               INSERT INTO atec_visitas_tecnicas (fecha_visita, id_finca, recomendaciones, estado)
               VALUES (?, ?, ?, 'Realizada')
             `, [new Date(v.fecha_visita), v.id_finca, v.observaciones_generales]);
          }
        }
      }

      // Procesar Detalles de Visitas Creadas
      if (changes.visitas_tecnicas_detalles && changes.visitas_tecnicas_detalles.created.length > 0) {
        for (const d of changes.visitas_tecnicas_detalles.created) {
          // Find the auto-increment id_visita generated from the uuid
          const [vRows] = await conn.query('SELECT id_visita FROM visitas_tecnicas WHERE uuid = ?', [d.id_visita_uuid]);
          if (vRows.length > 0) {
            await conn.query(`
              INSERT INTO visitas_tecnicas_detalles (uuid, id_visita, id_origen, tabla_origen, diagnostico, tratamiento, recomendaciones)
              VALUES (?, ?, ?, ?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE 
                diagnostico = VALUES(diagnostico), 
                tratamiento = VALUES(tratamiento),
                recomendaciones = VALUES(recomendaciones)
            `, [
              d.id, vRows[0].id_visita, d.id_origen, d.tabla_origen, d.diagnostico, d.tratamiento, d.recomendaciones
            ]);
          }
        }
      }

      await conn.commit();
      res.json({ success: true });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Error in /api/sync/push:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
