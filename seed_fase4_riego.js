import pool from './server/db.js';
import { logAudit } from './server/utils/audit.js';

async function seedRiego() {
  try {
    console.log('--- Iniciando Seed Fase 4: Manejo Hídrico de Precisión FAO-56 ---');

    const [existentes] = await pool.query('SELECT COUNT(*) as count FROM riego_sectores_hidricos');
    if (existentes[0].count > 0) {
      console.log(`Ya existen ${existentes[0].count} sectores de riego.`);
      return;
    }

    // 1. Insertar 2 sectores de riego tecnificado
    const [resSec1] = await pool.query(`
      INSERT INTO riego_sectores_hidricos
      (id_tenant, id_finca, id_lote, codigo_sector, nombre, metodo_riego,
       caudal_diseno_lps, presion_trabajo_bar, espaciamiento_emisores_m, espaciamiento_lineas_m,
       caudal_emisor_lph, eficiencia_aplicacion_ea_porc, precipitacion_sistema_mm_h, area_sector_ha, estado)
      VALUES (1, 1, 1, 'SEC-PLZ-01-A', 'Sector 1A Goteo Alta Frecuencia', 'Goteo', 14.50, 1.80, 0.50, 1.50, 2.00, 92.00, 2.67, 2.50, 'Operativo')
    `);
    const idSec1 = resSec1.insertId;

    const [resSec2] = await pool.query(`
      INSERT INTO riego_sectores_hidricos
      (id_tenant, id_finca, id_lote, codigo_sector, nombre, metodo_riego,
       caudal_diseno_lps, presion_trabajo_bar, espaciamiento_emisores_m, espaciamiento_lineas_m,
       caudal_emisor_lph, eficiencia_aplicacion_ea_porc, precipitacion_sistema_mm_h, area_sector_ha, estado)
      VALUES (1, 1, 5, 'SEC-PLZ-05-B', 'Sector 5B Microaspersión Frutales', 'Microaspersion', 18.20, 2.20, 3.00, 4.00, 35.00, 88.00, 2.92, 3.20, 'Operativo')
    `);
    const idSec2 = resSec2.insertId;

    await logAudit(pool, {
      id_tenant: 1,
      modulo: 'Riego de Precisión',
      accion: 'REGISTRAR_SECTOR',
      registro_id: idSec1,
      usuario: 'Ing. Riego',
      detalle: 'Sector 1A Goteo Alta Frecuencia registrado'
    });

    console.log('Insertados 2 sectores de riego.');

    // 2. Insertar 2 programaciones de riego basadas en balance FAO-56
    const today = new Date().toISOString().split('T')[0];
    await pool.query(`
      INSERT INTO riego_programacion_precision
      (id_tenant, id_sector, fecha_programada, et0_mm_dia, kc_cultivo, etc_mm_dia,
       precipitacion_efectiva_mm, agotamiento_permitido_p, lamina_neta_mm, lamina_bruta_mm,
       horas_riego_calculadas, volumen_total_m3, estado, observaciones)
      VALUES (1, ?, ?, 4.80, 1.05, 5.04, 0.00, 0.45, 5.04, 5.48, 2.05, 137.00, 'Programado', 'Riego matutino de alta frecuencia 06:00 AM')
    `, [idSec1, today]);

    await pool.query(`
      INSERT INTO riego_programacion_precision
      (id_tenant, id_sector, fecha_programada, et0_mm_dia, kc_cultivo, etc_mm_dia,
       precipitacion_efectiva_mm, agotamiento_permitido_p, lamina_neta_mm, lamina_bruta_mm,
       horas_riego_calculadas, volumen_total_m3, estado, observaciones)
      VALUES (1, ?, '2026-10-15', 4.50, 1.00, 4.50, 1.20, 0.45, 3.30, 3.59, 1.34, 89.75, 'Ejecutado', 'Ejecutado con bomba principal sin incidencias')
    `, [idSec1]);

    // 3. Insertar ensayo de uniformidad Christiansen
    const pluviometros = [120, 118, 125, 112, 130, 115, 122, 108, 126, 114, 119, 121, 116, 123, 115, 122];
    await pool.query(`
      INSERT INTO riego_evaluacion_uniformidad
      (id_tenant, id_sector, fecha_ensayo, presion_cabezal_bar, presion_cola_bar,
       numero_pluviometros, lecturas_volumen_ml, coeficiente_christiansen_cu,
       uniformidad_distribucion_du, diagnostico, evaluador, observaciones)
      VALUES
      (1, ?, '2026-09-20', 1.85, 1.72, 16, ?, 93.40, 89.10, 'Excelente Uniformidad (Distribución Óptima)', 'Ing. Roberto Silva', 'Presiones estables en laterales, goteros autocompensantes limpios')
    `, [idSec1, JSON.stringify(pluviometros)]);

    console.log('--- Seed Fase 4 completado con éxito en MySQL ---');
    process.exit(0);
  } catch (err) {
    console.error('Error en seed riego:', err);
    process.exit(1);
  }
}

seedRiego();
