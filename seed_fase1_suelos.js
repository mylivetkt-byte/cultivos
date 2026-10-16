import 'dotenv/config';
import pool from './server/db.js';

(async () => {
  const conn = await pool.getConnection();
  try {
    console.log('--- Iniciando Seed Fase 1: Suelos & Laboratorio ---');

    // 1. Obtener un lote existente con finca
    const [lotes] = await conn.query(`
      SELECT l.id_lote, l.codigo, l.nombre, n.id_finca, f.id_tenant
      FROM lotes l
      JOIN nucleos n ON l.id_nucleo = n.id_nucleo
      JOIN fincas f ON n.id_finca = f.id_finca
      LIMIT 1
    `);

    if (lotes.length === 0) {
      console.log('No se encontraron lotes. Abortando seed.');
      return;
    }

    const lote = lotes[0];
    const tenantId = lote.id_tenant || 1;
    const fincaId = lote.id_finca;
    const loteId = lote.id_lote;

    console.log(`Lote seleccionado: ${lote.nombre} (ID: ${loteId}, Finca: ${fincaId})`);

    // 2. Verificar o crear Malla de Muestreo Demo
    const codigoMalla = `MAL-${lote.codigo || 'L101'}-2026`;
    const [mallasExistentes] = await conn.query(
      'SELECT id_malla FROM suelo_mallas_muestreo WHERE id_tenant = ? AND codigo_malla = ?',
      [tenantId, codigoMalla]
    );

    let idMalla;
    if (mallasExistentes.length > 0) {
      idMalla = mallasExistentes[0].id_malla;
      console.log(`Malla existente encontrada: ID ${idMalla}`);
    } else {
      const [mallaRes] = await conn.query(`
        INSERT INTO suelo_mallas_muestreo
        (id_tenant, id_finca, id_lote, codigo_malla, descripcion, tamano_cuadricula_m, tipo_malla, total_puntos, fecha_plan, estado)
        VALUES (?, ?, ?, ?, 'Campaña Diagnóstico Suelo Pre-Siembra 2026', 100.00, 'Regular', 6, '2026-10-15', 'En_Muestreo')
      `, [tenantId, fincaId, loteId, codigoMalla]);
      idMalla = mallaRes.insertId;
      console.log(`Nueva Malla creada: ID ${idMalla}`);
    }

    // 3. Crear 6 Puntos Georreferenciados (en torno a 4.65, -74.09)
    const baseLat = 4.6520;
    const baseLng = -74.0920;
    const puntosData = [
      { cod: 'P01', lat: baseLat + 0.0000, lng: baseLng + 0.0000, estado: 'Analizada', prof: 30 },
      { cod: 'P02', lat: baseLat + 0.0012, lng: baseLng + 0.0000, estado: 'Analizada', prof: 30 },
      { cod: 'P03', lat: baseLat + 0.0024, lng: baseLng + 0.0000, estado: 'Analizada', prof: 30 },
      { cod: 'P04', lat: baseLat + 0.0000, lng: baseLng + 0.0015, estado: 'Colectada', prof: 30 },
      { cod: 'P05', lat: baseLat + 0.0012, lng: baseLng + 0.0015, estado: 'Colectada', prof: 30 },
      { cod: 'P06', lat: baseLat + 0.0024, lng: baseLng + 0.0015, estado: 'Pendiente', prof: 30 },
    ];

    const puntosInsertados = [];
    for (const p of puntosData) {
      const [ptExist] = await conn.query(
        'SELECT id_punto FROM suelo_muestreo_puntos WHERE id_malla = ? AND codigo_punto = ?',
        [idMalla, p.cod]
      );
      let idPunto;
      if (ptExist.length > 0) {
        idPunto = ptExist[0].id_punto;
      } else {
        const [resP] = await conn.query(`
          INSERT INTO suelo_muestreo_puntos
          (id_tenant, id_malla, id_lote, codigo_punto, latitud, longitud, profundidad_cm, estado, fecha_recoleccion)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [tenantId, idMalla, loteId, p.cod, p.lat, p.lng, p.prof, p.estado]);
        idPunto = resP.insertId;
      }
      puntosInsertados.push({ id_punto: idPunto, ...p });
    }

    console.log(`Puntos procesados: ${puntosInsertados.length}`);

    // 4. Crear Resultados de Laboratorio para los 3 primeros puntos
    const analisisData = [
      {
        puntoIdx: 0,
        informe: 'LAB-AGRO-2026-001',
        ph: 5.20,
        mo: 2.80,
        p: 8.50,
        k: 0.18,
        ca: 3.40,
        mg: 1.10,
        al: 0.85,
        arena: 48.0,
        limo: 28.0,
        arcilla: 24.0,
        textura: 'Franco-Arenoso'
      },
      {
        puntoIdx: 1,
        informe: 'LAB-AGRO-2026-002',
        ph: 5.65,
        mo: 3.40,
        p: 14.20,
        k: 0.32,
        ca: 4.80,
        mg: 1.60,
        al: 0.20,
        arena: 40.0,
        limo: 35.0,
        arcilla: 25.0,
        textura: 'Franco'
      },
      {
        puntoIdx: 2,
        informe: 'LAB-AGRO-2026-003',
        ph: 6.10,
        mo: 4.10,
        p: 22.00,
        k: 0.45,
        ca: 6.20,
        mg: 2.10,
        al: 0.05,
        arena: 35.0,
        limo: 38.0,
        arcilla: 27.0,
        textura: 'Franco-Arcilloso'
      }
    ];

    for (const an of analisisData) {
      const p = puntosInsertados[an.puntoIdx];
      const [anExist] = await conn.query(
        'SELECT id_analisis FROM suelo_analisis_laboratorio WHERE id_punto = ?',
        [p.id_punto]
      );
      if (anExist.length === 0) {
        const ca = an.ca;
        const mg = an.mg;
        const k = an.k;
        const na = 0.05;
        const al = an.al;
        const sumaBases = ca + mg + k + na;
        const cic = sumaBases + al;
        const satBases = (sumaBases / cic) * 100;
        const satAl = (al / cic) * 100;

        await conn.query(`
          INSERT INTO suelo_analisis_laboratorio
          (id_tenant, id_punto, id_lote, numero_informe, laboratorio_nombre, fecha_muestreo, fecha_analisis,
           textura_clase, arena_porc, limo_porc, arcilla_porc, densidad_aparente,
           ph, ce_ds_m, materia_organica_porc, nitrogeno_total_porc, fosforo_ppm,
           potasio_meq, calcio_meq, magnesio_meq, sodio_meq, aluminio_meq,
           cic, saturacion_bases_porc, saturacion_aluminio_porc,
           observaciones, interpretacion_agronomica)
          VALUES (?, ?, ?, ?, 'Agrolab Internacional', '2026-10-10', '2026-10-14',
                  ?, ?, ?, ?, 1.25,
                  ?, 0.18, ?, 0.15, ?,
                  ?, ?, ?, ?, ?,
                  ?, ?, ?,
                  'Muestra compuesta de 10 submuestras a 30 cm de profundidad.',
                  'Diagnóstico inicial de precisión completado.')
        `, [
          tenantId, p.id_punto, loteId, an.informe,
          an.textura, an.arena, an.limo, an.arcilla,
          an.ph, an.mo, an.p,
          k, ca, mg, na, al,
          cic.toFixed(2), satBases.toFixed(2), satAl.toFixed(2)
        ]);
        console.log(`Análisis ${an.informe} insertado para punto ${p.cod}`);
      }
    }

    console.log('✅ Seed de Fase 1 completado con éxito.');
  } catch (err) {
    console.error('Error en seed:', err);
  } finally {
    conn.release();
    process.exit(0);
  }
})();
