import express from 'express';
import pool from '../db.js';
import { getDb } from '../utils/db.js';

const router = express.Router();

// 1. Get all trees (with options to filter by lote)
router.get('/trees', async (req, res) => {
  const { tenantId, loteId, limit, offset } = req.query;
  const tid = tenantId || 1;

  try {
    let query = `
      SELECT 
        id_arbol, id_lote, codigo_arbol, 
        ST_AsText(gps_punto) as gps_punto_wkt,
        fecha_siembra, estado_salud, variedad, ano_siembra
      FROM siembra_arboles
      WHERE id_tenant = ?
    `;
    const params = [tid];

    if (loteId) {
      query += ` AND id_lote = ?`;
      params.push(loteId);
    }
    
    // Add pagination to prevent memory overflow with 100k+ trees
    const safeLimit = parseInt(limit, 10) || 5000;
    const safeOffset = parseInt(offset, 10) || 0;
    query += ` LIMIT ? OFFSET ?`;
    params.push(safeLimit, safeOffset);

    const [rows] = await getDb(req).query(query, params);

    // Format POINT WKT "POINT(-73.2512 10.4612)" to [lat, lng] array
    const formatted = rows.map(r => {
      let lat = null, lng = null;
      if (r.gps_punto_wkt) {
        const match = r.gps_punto_wkt.match(/point\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
        if (match) {
          lng = parseFloat(match[1]);
          lat = parseFloat(match[2]);
        }
      }
      return {
        ...r,
        lat,
        lng
      };
    });

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Get full details and phytosanitary history of a single tree
router.get('/tree/:id', async (req, res) => {
  const treeId = parseInt(req.params.id);

  try {
    // Basic tree details
    const [trees] = await getDb(req).query(`
      SELECT 
        a.id_arbol, a.codigo_arbol, ST_AsText(a.gps_punto) as gps_punto_wkt,
        a.fecha_siembra, a.estado_salud, a.variedad, a.ano_siembra,
        l.nombre as lote_nombre
      FROM siembra_arboles a
      JOIN lotes l ON a.id_lote = l.id_lote
      WHERE a.id_arbol = ?
    `, [treeId]);

    if (trees.length === 0) {
      return res.status(404).json({ error: 'Árbol no encontrado' });
    }

    const tree = trees[0];
    let lat = null, lng = null;
    if (tree.gps_punto_wkt) {
      const match = tree.gps_punto_wkt.match(/point\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
      if (match) {
        lng = parseFloat(match[1]);
        lat = parseFloat(match[2]);
      }
    }
    tree.lat = lat;
    tree.lng = lng;

    // Phytosanitary inspections history
    const [visits] = await getDb(req).query(`
      SELECT 
        v.id_visita_arbol, v.fecha_visita, v.estado_salud_detectado, 
        v.diagnostico, v.observaciones,
        CONCAT(e.nombres, ' ', e.apellidos) as agronomista_nombre
      FROM atec_visitas_arboles v
      JOIN rrhh_empleados e ON v.id_empleado = e.id_empleado
      WHERE v.id_arbol = ?
      ORDER BY v.fecha_visita DESC
    `, [treeId]);

    // Recipes associated with these inspections
    const [recipes] = await getDb(req).query(`
      SELECT 
        r.id_receta, r.id_visita_arbol, r.enfermedad_plaga_detectada, 
        r.gravedad, r.receta_tratamiento, r.dosis_recomendada, 
        r.fecha_aplicacion_sugerida, r.aplicado,
        i.nombre as insumo_nombre
      FROM atec_recetario_enfermedades r
      LEFT JOIN insumos i ON r.id_insumo = i.id_insumo
      WHERE r.id_visita_arbol IN (
        SELECT id_visita_arbol FROM atec_visitas_arboles WHERE id_arbol = ?
      )
    `, [treeId]);

    res.json({
      tree,
      visits,
      recipes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Create a new tree record (Planting)
router.post('/tree', async (req, res) => {
  const { tenantId, id_lote, codigo_arbol, lat, lng, fecha_siembra, estado_salud, variedad, ano_siembra } = req.body;
  const tid = tenantId || 1;

  if (!id_lote || !codigo_arbol || lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Faltan parámetros obligatorios: id_lote, codigo_arbol, lat, lng' });
  }

  try {
    const [result] = await getDb(req).query(`
      INSERT INTO siembra_arboles (id_tenant, id_lote, codigo_arbol, gps_punto, fecha_siembra, estado_salud, variedad, ano_siembra)
      VALUES (?, ?, ?, ST_GeomFromText(?), ?, ?, ?, ?)
    `, [
      tid, id_lote, codigo_arbol, 
      `POINT(${parseFloat(lng)} ${parseFloat(lat)})`, 
      fecha_siembra || null, 
      estado_salud || 'Sano', 
      variedad || null, 
      ano_siembra || null
    ]);

    res.json({
      success: true,
      id_arbol: result.insertId,
      message: 'Árbol registrado con coordenadas GPS exitosamente.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Register a new inspection/visit and generate disease recipe
router.post('/visit', async (req, res) => {
  const { 
    tenantId, id_arbol, id_empleado, estado_salud, diagnostico, observaciones,
    enfermedad_plaga_detectada, gravedad, receta_tratamiento, id_insumo, dosis_recomendada, fecha_aplicacion_sugerida 
  } = req.body;
  const tid = tenantId || 1;

  if (!id_arbol || !id_empleado || !estado_salud) {
    return res.status(400).json({ error: 'Faltan parámetros obligatorios de visita: id_arbol, id_empleado, estado_salud' });
  }

  const connection = await getDb(req).getConnection();
  try {
    // Start Transaction
    await connection.beginTransaction();

    // 1. Insert visit record
    const [visRes] = await connection.query(`
      INSERT INTO atec_visitas_arboles (id_tenant, id_arbol, id_empleado, fecha_visita, estado_salud_detectado, diagnostico, observaciones)
      VALUES (?, ?, ?, NOW(), ?, ?, ?)
    `, [tid, id_arbol, id_empleado, estado_salud, diagnostico || null, observaciones || null]);

    const visitId = visRes.insertId;

    // 2. Update tree health status
    await connection.query(
      'UPDATE siembra_arboles SET estado_salud = ? WHERE id_arbol = ?',
      [estado_salud, id_arbol]
    );

    // 3. If there is a recipe / disease diagnostic, insert recipe card
    let recipeId = null;
    if (enfermedad_plaga_detectada && receta_tratamiento) {
      const [recRes] = await connection.query(`
        INSERT INTO atec_recetario_enfermedades (id_tenant, id_visita_arbol, enfermedad_plaga_detectada, gravedad, receta_tratamiento, id_insumo, dosis_recomendada, fecha_aplicacion_sugerida, aplicado)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
      `, [
        tid, visitId, enfermedad_plaga_detectada, 
        gravedad || 'Media', 
        receta_tratamiento, 
        id_insumo || null, 
        dosis_recomendada || null, 
        fecha_aplicacion_sugerida || null
      ]);
      recipeId = recRes.insertId;
    }

    await connection.commit();

    res.json({
      success: true,
      id_visita_arbol: visitId,
      id_receta: recipeId,
      message: 'Inspección fitosanitaria y receta médica agrícola registradas con éxito.'
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// 5. Get all recipes / diagnoses cards list
router.get('/recipes', async (req, res) => {
  const { tenantId, limit, offset } = req.query;
  const tid = tenantId || 1;

  try {
    const safeLimit = parseInt(limit, 10) || 1000;
    const safeOffset = parseInt(offset, 10) || 0;
    
    const [rows] = await getDb(req).query(`
      SELECT 
        r.id_receta, r.enfermedad_plaga_detectada, r.gravedad, 
        r.receta_tratamiento, r.dosis_recomendada, r.fecha_aplicacion_sugerida, r.aplicado,
        i.nombre as insumo_nombre,
        a.codigo_arbol, a.id_arbol,
        l.nombre as lote_nombre,
        v.fecha_visita,
        CONCAT(e.nombres, ' ', e.apellidos) as agronomista_nombre
      FROM atec_recetario_enfermedades r
      JOIN atec_visitas_arboles v ON r.id_visita_arbol = v.id_visita_arbol
      JOIN siembra_arboles a ON v.id_arbol = a.id_arbol
      JOIN lotes l ON a.id_lote = l.id_lote
      JOIN rrhh_empleados e ON v.id_empleado = e.id_empleado
      WHERE r.id_tenant = ?
      ORDER BY v.fecha_visita DESC
      LIMIT ? OFFSET ?
    `, [tid, safeLimit, safeOffset]);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Check/Apply recipe (applied = 1)
router.post('/recipe/:id/apply', async (req, res) => {
  const recipeId = parseInt(req.params.id);

  try {
    await getDb(req).query('UPDATE atec_recetario_enfermedades SET aplicado = 1 WHERE id_receta = ?', [recipeId]);
    res.json({ success: true, message: 'Tratamiento marcado como aplicado en el árbol.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
