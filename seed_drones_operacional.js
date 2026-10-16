import pool from './server/db.js';
import { logAudit } from './server/utils/audit.js';

async function seedDronesOperacional() {
  try {
    console.log('--- Iniciando Seed Operacional de Drones & Misiones ---');

    // 1. Registrar baterías para los drones
    const [existentesBat] = await pool.query('SELECT COUNT(*) as c FROM dron_baterias');
    if (existentesBat[0].c === 0) {
      await pool.query(`
        INSERT INTO dron_baterias (equipo_dron_id, serial, ciclos_carga, salud_porcentaje, estado)
        VALUES 
        (1, 'BAT-M3M-01', 42, 96.50, 'Disponible'),
        (1, 'BAT-M3M-02', 38, 97.20, 'Disponible'),
        (2, 'BAT-T50-01', 85, 91.00, 'Disponible'),
        (2, 'BAT-T50-02', 110, 88.50, 'En_Carga')
      `);
      console.log('Insertadas 4 baterías de drones.');
    }

    // 2. Insertar misiones operacionales
    const [existentesMis] = await pool.query('SELECT COUNT(*) as c FROM dron_misiones');
    if (existentesMis[0].c === 0) {
      // Misión 1: Mapeo multiespectral completado
      const [resMis1] = await pool.query(`
        INSERT INTO dron_misiones
        (equipo_dron_id, piloto_id, lote_id, tipo, estado, fecha_programada, hora_inicio, hora_fin,
         duracion_minutos, area_cubierta_ha, altura_vuelo_m, costo_mision, fuente_datos, observaciones)
        VALUES
        (1, 1, 1, 'mapeo_multiespectral', 'completada', '2026-10-10 08:30:00', '2026-10-10 08:35:00', '2026-10-10 09:15:00',
         40, 15.50, 60.00, 180.00, 'DJI_Pilot_2', 'Vuelo ortomosaico multiespectral para generación de índice NDRE.')
      `);

      // Misión 2: Fumigación variable completada
      const [resMis2] = await pool.query(`
        INSERT INTO dron_misiones
        (equipo_dron_id, piloto_id, lote_id, tipo, estado, fecha_programada, hora_inicio, hora_fin,
         duracion_minutos, area_cubierta_ha, producto_aplicado, cantidad_aplicada_litros,
         altura_vuelo_m, costo_mision, fuente_datos, observaciones)
        VALUES
        (2, 1, 1, 'fumigacion', 'completada', '2026-10-12 07:00:00', '2026-10-12 07:10:00', '2026-10-12 08:05:00',
         55, 12.00, 'Bioestimulante Foliar + NPK', 120.00,
         3.50, 320.00, 'DJI_Agras_App', 'Aplicación aérea en franja VRA con atomizadores centrífugos.')
      `);

      // Misión 3: Inspección fitosanitaria programada
      await pool.query(`
        INSERT INTO dron_misiones
        (equipo_dron_id, piloto_id, lote_id, tipo, estado, fecha_programada,
         altura_vuelo_m, costo_mision, fuente_datos, observaciones)
        VALUES
        (1, 1, 5, 'inspeccion_termica', 'programada', '2026-10-18 09:00:00',
         45.00, 150.00, 'AgroPacioli_Dron', 'Monitoreo de estrés hídrico y puntos calientes en lote 5.')
      `);

      await logAudit(pool, {
        id_tenant: 1,
        modulo: 'Drones & AgTech',
        accion: 'PROGRAMAR_MISION_AEREA',
        registro_id: resMis1.insertId,
        usuario: 'Juan Perez',
        detalle: 'Misión de mapeo multiespectral registrada en base de datos.'
      });

      console.log('Insertadas 3 misiones de vuelo operacionales.');
    }

    console.log('--- Seed Drones Operacional finalizado con éxito ---');
    process.exit(0);
  } catch (err) {
    console.error('Error en seed drones:', err);
    process.exit(1);
  }
}

seedDronesOperacional();
