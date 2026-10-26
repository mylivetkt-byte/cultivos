import express from 'express';
import pool from '../db.js';
import axios from 'axios';

const router = express.Router();

// GET all crops
router.get('/', async (req, res) => {
  try {
    const db = req.tenantPool || pool;
    const [rows] = await db.query('SELECT * FROM cultivos_catalogo ORDER BY nombre_oficial ASC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching catalogo cultivos super:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET distinct species
router.get('/especies', async (req, res) => {
  try {
    const db = req.tenantPool || pool;
    const [rows] = await db.query('SELECT DISTINCT especie_biologica FROM cultivos_catalogo WHERE especie_biologica IS NOT NULL AND especie_biologica != "" ORDER BY especie_biologica ASC');
    res.json(rows.map(r => ({ especie_biologica: r.especie_biologica })));
  } catch (error) {
    console.error('Error fetching especies:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET single crop with all its relational data
router.get('/:id', async (req, res) => {
  try {
    const db = req.tenantPool || pool;
    const { id } = req.params;
    const [cultivo] = await db.query('SELECT * FROM cultivos_catalogo WHERE id_catalogo = ?', [id]);
    
    if (cultivo.length === 0) return res.status(404).json({ message: 'No encontrado' });

    const [plagas] = await db.query('SELECT * FROM catalogo_plagas_cultivo WHERE id_catalogo = ?', [id]);
    const [enfermedades] = await db.query('SELECT * FROM catalogo_enfermedades WHERE id_catalogo = ?', [id]);
    const [abonos] = await db.query('SELECT * FROM catalogo_abonos_formulas WHERE id_catalogo = ?', [id]);
    const [fumigacion] = await db.query('SELECT * FROM catalogo_fumigacion_formulas WHERE id_catalogo = ?', [id]);
    const [semillas] = await db.query('SELECT * FROM catalogo_semillas_variedades WHERE id_catalogo = ?', [id]);
    const [riegos] = await db.query('SELECT * FROM catalogo_riegos WHERE id_catalogo = ?', [id]);
    const [siembra] = await db.query('SELECT * FROM catalogo_siembra_patrones WHERE id_catalogo = ?', [id]);

    res.json({
      ...cultivo[0],
      plagas,
      enfermedades,
      abonos,
      fumigacion,
      semillas,
      riegos,
      siembra
    });
  } catch (error) {
    console.error('Error fetching crop details:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST to fetch scientific data automatically from Wikipedia
router.post('/auto-fetch', async (req, res) => {
  try {
    const { nombre_oficial, especie_biologica } = req.body;
    let query = especie_biologica || nombre_oficial;
    if (!query) {
      return res.json({ imagen_url: null, resumen_cientifico_api: '' });
    }
    
    // Wikipedia API call
    const wikiUrl = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
    
    try {
      const response = await axios.get(wikiUrl, { timeout: 5000 });
      const data = response.data;
      
      return res.json({
        imagen_url: data.thumbnail?.source || null,
        resumen_cientifico_api: data.extract || 'Resumen no encontrado'
      });
    } catch (wikiError) {
      try {
        let genus = query.split(' ')[0];
        const res2 = await axios.get(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(genus)}`, { timeout: 5000 });
        return res.json({
          imagen_url: res2.data.thumbnail?.source || null,
          resumen_cientifico_api: res2.data.extract || 'Resumen no encontrado'
        });
      } catch (e) {
        return res.json({
          imagen_url: null,
          resumen_cientifico_api: 'No se encontró información científica para este nombre.'
        });
      }
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST to create crop and its child tables
router.post('/', async (req, res) => {
  const db = req.tenantPool || pool;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const data = req.body;

    // 1. Check for duplicates
    const [existing] = await connection.query(
      'SELECT id_catalogo FROM cultivos_catalogo WHERE nombre_oficial = ? OR (especie_biologica = ? AND especie_biologica != "")',
      [data.nombre_oficial, data.especie_biologica]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(409).json({ error: 'El cultivo con este nombre o especie ya existe.' });
    }

    // 2. Insert parent
    const [result] = await connection.query(
      `INSERT INTO cultivos_catalogo 
      (nombre_oficial, especie_biologica, familia_botanica, imagen_url, resumen_cientifico_api, distancia_siembra_m, densidad_ha, dias_ciclo) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.nombre_oficial, data.especie_biologica, data.familia_botanica,
        data.imagen_url, data.resumen_cientifico_api, data.distancia_siembra_m || null,
        data.densidad_ha || null, data.dias_ciclo || null
      ]
    );
    const id = result.insertId;

    // 3. Insert Plagas
    if (data.plagas && data.plagas.length > 0) {
      for (const p of data.plagas) {
        if (!p.nombre_plaga) continue;
        await connection.query(
          'INSERT INTO catalogo_plagas_cultivo (id_catalogo, nombre_plaga, etapa_ataque, umbral_dano) VALUES (?, ?, ?, ?)',
          [id, p.nombre_plaga, p.etapa_ataque || null, p.umbral_dano || null]
        );
      }
    }

    // 4. Insert Enfermedades
    if (data.enfermedades && data.enfermedades.length > 0) {
      for (const e of data.enfermedades) {
        if (!e.nombre_enfermedad) continue;
        await connection.query(
          'INSERT INTO catalogo_enfermedades (id_catalogo, nombre_enfermedad, sintomas, nivel_riesgo) VALUES (?, ?, ?, ?)',
          [id, e.nombre_enfermedad, e.sintomas || null, e.nivel_riesgo || 'Medio']
        );
      }
    }

    // 5. Insert Abonos
    if (data.abonos && data.abonos.length > 0) {
      for (const a of data.abonos) {
        if (!a.fase_aplicacion) continue;
        await connection.query(
          'INSERT INTO catalogo_abonos_formulas (id_catalogo, fase_aplicacion, dosis_npk, cantidad_por_planta_gr) VALUES (?, ?, ?, ?)',
          [id, a.fase_aplicacion, a.dosis_npk || null, a.cantidad_por_planta_gr || null]
        );
      }
    }

    // 6. Insert Fumigaciones
    if (data.fumigaciones && data.fumigaciones.length > 0) {
      for (const f of data.fumigaciones) {
        if (!f.ingrediente_activo) continue;
        await connection.query(
          'INSERT INTO catalogo_fumigacion_formulas (id_catalogo, ingrediente_activo, dosis_cc_litro, frecuencia_dias) VALUES (?, ?, ?, ?)',
          [id, f.ingrediente_activo, f.dosis_cc_litro || null, f.frecuencia_dias || null]
        );
      }
    }

    // 7. Insert Semillas
    if (data.semillas && data.semillas.length > 0) {
      for (const s of data.semillas) {
        if (!s.nombre_variedad) continue;
        await connection.query(
          'INSERT INTO catalogo_semillas_variedades (id_catalogo, nombre_variedad, proveedor, tolerancia) VALUES (?, ?, ?, ?)',
          [id, s.nombre_variedad, s.proveedor || null, s.tolerancia || null]
        );
      }
    }

    // 8. Insert Riegos
    if (data.riegos && data.riegos.length > 0) {
      for (const r of data.riegos) {
        if (!r.etapa_fenologica) continue;
        await connection.query(
          'INSERT INTO catalogo_riegos (id_catalogo, etapa_fenologica, requerimiento_hidrico_mm, frecuencia_dias, metodo_recomendado) VALUES (?, ?, ?, ?, ?)',
          [id, r.etapa_fenologica, r.requerimiento_hidrico_mm || null, r.frecuencia_dias || null, r.metodo_recomendado || null]
        );
      }
    }

    // 9. Insert Siembra
    if (data.siembra && data.siembra.length > 0) {
      for (const sp of data.siembra) {
        if (!sp.sistema_siembra) continue;
        await connection.query(
          'INSERT INTO catalogo_siembra_patrones (id_catalogo, sistema_siembra, distancia_surcos_m, distancia_plantas_m, plantas_por_ha, instrucciones_especiales) VALUES (?, ?, ?, ?, ?, ?)',
          [id, sp.sistema_siembra, sp.distancia_surcos_m || null, sp.distancia_plantas_m || null, sp.plantas_por_ha || null, sp.instrucciones_especiales || null]
        );
      }
    }

    await connection.commit();
    res.status(201).json({ success: true, id_catalogo: id });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// PUT /:id to update crop
router.put('/:id', async (req, res) => {
  const db = req.tenantPool || pool;
  try {
    const { id } = req.params;
    const data = req.body;
    await db.query(`
      UPDATE cultivos_catalogo SET
        nombre_oficial = ?,
        especie_biologica = ?,
        familia_botanica = ?,
        imagen_url = ?,
        resumen_cientifico_api = ?,
        distancia_siembra_m = ?,
        densidad_ha = ?,
        dias_ciclo = ?
      WHERE id_catalogo = ?
    `, [
      data.nombre_oficial,
      data.especie_biologica,
      data.familia_botanica,
      data.imagen_url,
      data.resumen_cientifico_api,
      data.distancia_siembra_m || null,
      data.densidad_ha || null,
      data.dias_ciclo || null,
      id
    ]);
    res.json({ success: true, message: 'Cultivo actualizado exitosamente' });
  } catch (error) {
    console.error('Error updating cultivo:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /:id to delete crop
router.delete('/:id', async (req, res) => {
  const db = req.tenantPool || pool;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    await connection.query('DELETE FROM catalogo_plagas_cultivo WHERE id_catalogo = ?', [id]);
    await connection.query('DELETE FROM catalogo_enfermedades WHERE id_catalogo = ?', [id]);
    await connection.query('DELETE FROM catalogo_abonos_formulas WHERE id_catalogo = ?', [id]);
    await connection.query('DELETE FROM catalogo_fumigacion_formulas WHERE id_catalogo = ?', [id]);
    await connection.query('DELETE FROM catalogo_semillas_variedades WHERE id_catalogo = ?', [id]);
    await connection.query('DELETE FROM catalogo_riegos WHERE id_catalogo = ?', [id]);
    await connection.query('DELETE FROM catalogo_siembra_patrones WHERE id_catalogo = ?', [id]);
    await connection.query('DELETE FROM cultivos_catalogo WHERE id_catalogo = ?', [id]);
    await connection.commit();
    res.json({ success: true, message: 'Cultivo eliminado correctamente' });
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting cultivo:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

export default router;
