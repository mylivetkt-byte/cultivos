import 'dotenv/config';
import pool from './server/db.js';

(async () => {
  const conn = await pool.getConnection();
  try {
    console.log('--- Iniciando Seed Fase 2: Ground Truth Satelital ---');

    // 1. Obtener lote y finca
    const [lotes] = await conn.query(`
      SELECT l.id_lote, l.codigo, l.nombre, n.id_finca, f.id_tenant
      FROM lotes l
      JOIN nucleos n ON l.id_nucleo = n.id_nucleo
      JOIN fincas f ON n.id_finca = f.id_finca
      LIMIT 1
    `);

    if (lotes.length === 0) {
      console.log('No se encontraron lotes.');
      return;
    }

    const lote = lotes[0];
    const tenantId = lote.id_tenant || 1;
    const fincaId = lote.id_finca;
    const loteId = lote.id_lote;

    const baseLat = 4.6520;
    const baseLng = -74.0920;

    const inspections = [
      {
        codigo: 'GT-2026-001',
        lat: baseLat + 0.0005,
        lng: baseLng + 0.0008,
        indice: 'NDRE',
        valor_sat: 0.18,
        estado: 'Deficiencia_Nutricional',
        severidad: 'Alta',
        diagnostico: 'Clorosis interveinal severa detectada por baja reflectancia en Red Edge. Se evidencia deficiencia de Magnesio y Nitrógeno.',
        accion: 'Fertilización foliar correctiva con Sulfato de Magnesio al 2% y Urea 1%.',
        estado_inspeccion: 'En_Tratamiento'
      },
      {
        codigo: 'GT-2026-002',
        lat: baseLat + 0.0018,
        lng: baseLng + 0.0002,
        indice: 'NDMI',
        valor_sat: -0.12,
        estado: 'Estres_Hidrico',
        severidad: 'Media',
        diagnostico: 'Déficit de humedad en canopia por obturación de emisores en el ramal 3 del sistema de goteo.',
        accion: 'Lavado y purga de líneas secundarias de riego por goteo.',
        estado_inspeccion: 'Resuelta'
      },
      {
        codigo: 'GT-2026-003',
        lat: baseLat + 0.0010,
        lng: baseLng + 0.0022,
        indice: 'NDVI',
        valor_sat: 0.28,
        estado: 'Ataque_Plagas',
        severidad: 'Critica',
        diagnostico: 'Foco inicial de defoliación rápida causado por gusano cogollero (Spodoptera frugiperda).',
        accion: 'Aplicación biológica focalizada con Bacillus thuringiensis.',
        estado_inspeccion: 'Pendiente_Accion'
      }
    ];

    for (const insp of inspections) {
      const [exists] = await conn.query(
        'SELECT id_verificacion FROM sat_verificaciones_campo WHERE id_tenant = ? AND codigo_verificacion = ?',
        [tenantId, insp.codigo]
      );

      if (exists.length === 0) {
        await conn.query(`
          INSERT INTO sat_verificaciones_campo
          (id_tenant, id_finca, id_lote, codigo_verificacion, fecha_inspeccion, latitud, longitud,
           geometria_punto, indice_observado, valor_indice_satelite, estado_cultivo_real, severidad,
           diagnostico_campo, accion_correctiva, estado_inspeccion)
          VALUES (?, ?, ?, ?, NOW(), ?, ?, ST_GeomFromText(?, 4326), ?, ?, ?, ?, ?, ?, ?)
        `, [
          tenantId, fincaId, loteId, insp.codigo, insp.lat, insp.lng,
          `POINT(${insp.lng} ${insp.lat})`, insp.indice, insp.valor_sat, insp.estado,
          insp.severidad, insp.diagnostico, insp.accion, insp.estado_inspeccion
        ]);
        console.log(`Inspección ${insp.codigo} registrada.`);
      }
    }

    console.log('✅ Seed de Fase 2 completado con éxito.');
  } catch (err) {
    console.error('Error en seed Fase 2:', err);
  } finally {
    conn.release();
    process.exit(0);
  }
})();
