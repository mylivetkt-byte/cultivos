import pool from './server/db.js';
import { logAudit } from './server/utils/audit.js';

async function seedRendimiento() {
  try {
    console.log('--- Iniciando Seed Fase 6: Mapas de Rendimiento, Strip Trials & Retorno ROI ---');

    const [existentes] = await pool.query('SELECT COUNT(*) as count FROM rendimiento_mapas_cosecha');
    if (existentes[0].count > 0) {
      console.log(`Ya existen ${existentes[0].count} mapas de rendimiento.`);
      return;
    }

    // 1. Insertar Mapa de Cosecha
    const [resMapa] = await pool.query(`
      INSERT INTO rendimiento_mapas_cosecha
      (id_tenant, id_finca, id_lote, codigo_mapa, nombre_cosecha, cultivo,
       fecha_cosecha, total_puntos_muestreados, rendimiento_promedio_ton_ha,
       rendimiento_min_ton_ha, rendimiento_max_ton_ha, humedad_grano_promedio_porc,
       archivo_origen_tipo, creado_por)
      VALUES
      (1, 1, 1, 'YLD-2026-PLZ-01', 'Cosecha Palma/Maíz Ciclo A 2026', 'Palma de Aceite',
       '2026-09-28', 12, 28.50, 19.20, 36.80, 13.50, 'Monitor_Cosechadora', 'Ing. Cosecha')
    `);
    const idMapa = resMapa.insertId;

    // 2. Insertar puntos de cosecha
    const puntos = [
      { lat: 4.6097, lng: -74.0817, kg: 28500, hum: 13.5, vel: 5.2 },
      { lat: 4.6101, lng: -74.0815, kg: 31200, hum: 13.2, vel: 5.0 },
      { lat: 4.6105, lng: -74.0813, kg: 34500, hum: 13.0, vel: 4.8 },
      { lat: 4.6109, lng: -74.0811, kg: 36800, hum: 13.4, vel: 5.1 },
      { lat: 4.6095, lng: -74.0820, kg: 22100, hum: 14.1, vel: 5.4 },
      { lat: 4.6092, lng: -74.0824, kg: 19200, hum: 14.5, vel: 5.5 }
    ];

    for (const pt of puntos) {
      await pool.query(`
        INSERT INTO rendimiento_puntos_detalle
        (id_mapa, latitud, longitud, geometria_punto, rendimiento_kg_ha, humedad_pct, velocidad_kmh)
        VALUES (?, ?, ?, ST_GeomFromText(?, 4326), ?, ?, ?)
      `, [idMapa, pt.lat, pt.lng, `POINT(${pt.lng} ${pt.lat})`, pt.kg, pt.hum, pt.vel]);
    }

    // 3. Insertar Strip Trial ROI
    // Control: Dosis Fija 200 kg/ha ($350/ha) -> 24 ton/ha
    // VRA: Dosis Variable ($285/ha) -> 28.5 ton/ha
    // Precio venta ton: $220/ton
    // Ahorro insumos: $65/ha
    // Ingreso adicional: (28.5 - 24) * 220 = 4.5 * 220 = $990/ha
    // ROI Neto: $65 + $990 = $1,055/ha
    const [resTrial] = await pool.query(`
      INSERT INTO rendimiento_strip_trials_roi
      (id_tenant, id_finca, id_lote, codigo_ensayo, nombre, tratamiento_control, tratamiento_vra,
       costo_insumo_control_ha, costo_insumo_vra_ha, rendimiento_control_ton_ha, rendimiento_vra_ton_ha,
       precio_venta_tonelada, ahorro_insumos_ha, ingreso_adicional_ha, roi_neto_ha,
       fecha_evaluacion, evaluador, observaciones)
      VALUES
      (1, 1, 1, 'TRL-VRA-2026-01', 'Ensayo en Franjas: Dosis Variable NPK vs Testigo Fijo',
       'Dosis Fija Convencional (200 kg/ha)', 'Dosis Variable VRA Zonas 1-3',
       350.00, 285.00, 24.00, 28.50, 220.00, 65.00, 990.00, 1055.00,
       '2026-10-05', 'Ing. Carlos Mendoza', 'La tasa variable evitó desperdicio en zonas de alta fertilidad e incrementó 4.5 ton/ha en sectores deprimidos.')
    `);

    await logAudit(pool, {
      id_tenant: 1,
      modulo: 'Evaluación ROI Rendimiento',
      accion: 'REGISTRAR_STRIP_TRIAL',
      registro_id: resTrial.insertId,
      usuario: 'Ing. Carlos Mendoza',
      detalle: 'Strip Trial TRL-VRA-2026-01: ROI Neto $1,055.00/ha verificado en campo.'
    });

    console.log('--- Seed Fase 6 completado exitosamente en MySQL ---');
    process.exit(0);
  } catch (err) {
    console.error('Error en seed rendimiento:', err);
    process.exit(1);
  }
}

seedRendimiento();
