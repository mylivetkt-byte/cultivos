const mysql = require('mysql2/promise');
const axios = require('axios');
require('dotenv').config();

(async () => {
  try {
    const pool = mysql.createPool({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: process.env.MYSQL_PORT || 3307,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sas_db'
    });

    const [cultivos] = await pool.query('SELECT * FROM cultivos_catalogo');
    
    if (cultivos.length === 0) {
      console.log('No hay cultivos en la base de datos para poblar.');
      process.exit(0);
    }

    console.log(`Poblando datos relacionales y de Wikipedia para ${cultivos.length} cultivos...`);

    for (const cultivo of cultivos) {
      const id = cultivo.id_catalogo;
      const query = cultivo.especie_biologica || cultivo.nombre_oficial;
      
      console.log(`-> Procesando: ${cultivo.nombre_oficial} (${query})`);

      // 1. Fetch from Wikipedia
      let imagen_url = null;
      let resumen = 'No se encontró información científica.';
      
      try {
        const wikiUrl = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
        const res = await axios.get(wikiUrl);
        imagen_url = res.data.thumbnail?.source || null;
        resumen = res.data.extract || resumen;
      } catch (err) {
        // Fallback to genus
        try {
          const genus = query.split(' ')[0];
          const res2 = await axios.get(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(genus)}`);
          imagen_url = res2.data.thumbnail?.source || null;
          resumen = res2.data.extract || resumen;
        } catch (e) {
          // keep defaults
        }
      }

      // Update the parent
      await pool.query(
        'UPDATE cultivos_catalogo SET imagen_url = ?, resumen_cientifico_api = ? WHERE id_catalogo = ?',
        [imagen_url, resumen, id]
      );

      // Insert dummy pests
      await pool.query('DELETE FROM catalogo_plagas_cultivo WHERE id_catalogo = ?', [id]);
      await pool.query(
        'INSERT INTO catalogo_plagas_cultivo (id_catalogo, nombre_plaga, etapa_ataque, umbral_dano) VALUES (?, ?, ?, ?)',
        [id, 'Pulgón verde (Aphis spp.)', 'Crecimiento Vegetativo', '10% de hojas afectadas']
      );

      // Insert dummy diseases
      await pool.query('DELETE FROM catalogo_enfermedades WHERE id_catalogo = ?', [id]);
      await pool.query(
        'INSERT INTO catalogo_enfermedades (id_catalogo, nombre_enfermedad, sintomas, nivel_riesgo) VALUES (?, ?, ?, ?)',
        [id, 'Oídio (Mildiu polvoroso)', 'Manchas blancas en hojas', 'Medio']
      );

      // Insert dummy fertilizers
      await pool.query('DELETE FROM catalogo_abonos_formulas WHERE id_catalogo = ?', [id]);
      await pool.query(
        'INSERT INTO catalogo_abonos_formulas (id_catalogo, fase_aplicacion, dosis_npk, cantidad_por_planta_gr) VALUES (?, ?, ?, ?)',
        [id, 'Pre-floración', '15-15-15', 50]
      );

      // Insert dummy fumigations
      await pool.query('DELETE FROM catalogo_fumigacion_formulas WHERE id_catalogo = ?', [id]);
      await pool.query(
        'INSERT INTO catalogo_fumigacion_formulas (id_catalogo, ingrediente_activo, dosis_cc_litro, frecuencia_dias) VALUES (?, ?, ?, ?)',
        [id, 'Cipermetrina', 2.5, 15]
      );

      // Insert dummy seeds
      await pool.query('DELETE FROM catalogo_semillas_variedades WHERE id_catalogo = ?', [id]);
      await pool.query(
        'INSERT INTO catalogo_semillas_variedades (id_catalogo, nombre_variedad, proveedor, tolerancia) VALUES (?, ?, ?, ?)',
        [id, `Variedad Mejorada ${cultivo.nombre_oficial}`, 'AgroSemillas SAS', 'Alta tolerancia a sequía']
      );
      
      console.log(`   Completado: ${cultivo.nombre_oficial}`);
    }

    console.log('Seed completado exitosamente.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
