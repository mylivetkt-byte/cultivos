import pool from './server/db.js';
import { logAudit } from './server/utils/audit.js';

async function seedSensores() {
  try {
    console.log('--- Iniciando Seed Fase 3: Sensores IoT en Suelo & Telemetría ---');

    // 1. Verificar si ya existen
    const [existentes] = await pool.query('SELECT COUNT(*) as count FROM sensores_dispositivos');
    if (existentes[0].count > 0) {
      console.log(`Ya existen ${existentes[0].count} sensores registrados.`);
      return;
    }

    // 2. Insertar 2 sondas de humedad multinivel y 1 estación de conductividad
    const sensores = [
      {
        id_tenant: 1,
        id_finca: 1,
        id_lote: 1,
        codigo_sensor: 'SND-FDR-001',
        nombre: 'Sonda FDR Multinivel Lote 1 Norte',
        tipo_sensor: 'Humedad_Multinivel',
        marca_modelo: 'Sentek Drill & Drop 60cm',
        numero_serie: 'SN-DD60-98421',
        latitud: 4.609710,
        longitud: -74.081750,
        profundidades_cm: '10,30,60',
        umbral_estres_humedad: 18.00,
        umbral_saturacion_humedad: 36.00,
        umbral_max_ce_ds_m: 2.20,
        bateria_pct: 94,
        estado: 'Activo',
        fecha_instalacion: '2026-02-10'
      },
      {
        id_tenant: 1,
        id_finca: 1,
        id_lote: 1,
        codigo_sensor: 'SND-FDR-002',
        nombre: 'Sonda FDR Multinivel Lote 1 Centro-Sur',
        tipo_sensor: 'Humedad_Multinivel',
        marca_modelo: 'Decagon 5TE / Campbell CS655',
        numero_serie: 'CS-655-44102',
        latitud: 4.608500,
        longitud: -74.082500,
        profundidades_cm: '10,30,60',
        umbral_estres_humedad: 17.50,
        umbral_saturacion_humedad: 35.00,
        umbral_max_ce_ds_m: 2.00,
        bateria_pct: 88,
        estado: 'Activo',
        fecha_instalacion: '2026-02-15'
      },
      {
        id_tenant: 1,
        id_finca: 1,
        id_lote: 5,
        codigo_sensor: 'SND-TDR-003',
        nombre: 'Sonda TDR Humedad y Salinidad Lote 5',
        tipo_sensor: 'Sonda_CE_pH',
        marca_modelo: 'GroPoint Profile TDR',
        numero_serie: 'GP-PR-11029',
        latitud: 4.611000,
        longitud: -74.080500,
        profundidades_cm: '10,30,60',
        umbral_estres_humedad: 16.00,
        umbral_saturacion_humedad: 34.00,
        umbral_max_ce_ds_m: 2.50,
        bateria_pct: 91,
        estado: 'Activo',
        fecha_instalacion: '2026-03-01'
      }
    ];

    const sensorIds = [];
    for (const s of sensores) {
      const [res] = await pool.query(`
        INSERT INTO sensores_dispositivos
        (id_tenant, id_finca, id_lote, codigo_sensor, nombre, tipo_sensor, marca_modelo, numero_serie,
         latitud, longitud, geometria_punto, profundidades_cm, umbral_estres_humedad,
         umbral_saturacion_humedad, umbral_max_ce_ds_m, bateria_pct, estado, fecha_instalacion)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ST_GeomFromText(?, 4326), ?, ?, ?, ?, ?, ?, ?)
      `, [
        s.id_tenant, s.id_finca, s.id_lote, s.codigo_sensor, s.nombre, s.tipo_sensor,
        s.marca_modelo, s.numero_serie, s.latitud, s.longitud, `POINT(${s.longitud} ${s.latitud})`,
        s.profundidades_cm, s.umbral_estres_humedad, s.umbral_saturacion_humedad,
        s.umbral_max_ce_ds_m, s.bateria_pct, s.estado, s.fecha_instalacion
      ]);

      sensorIds.push(res.insertId);

      await logAudit(pool, {
        id_tenant: 1,
        modulo: 'Sensores IoT',
        accion: 'REGISTRAR_SENSOR',
        registro_id: res.insertId,
        usuario: 'Instalador IoT',
        detalle: `Instalación de ${s.nombre} (${s.marca_modelo})`
      });
    }

    console.log(`Insertados ${sensorIds.length} sensores.`);

    // 3. Generar lecturas de telemetría continuas de las últimas 24 horas cada 2 horas para la Sonda 1
    const baseDate = new Date();
    baseDate.setHours(baseDate.getHours() - 24);

    let h10 = 26.5;
    let h30 = 29.0;
    let h60 = 31.5;
    let temp = 22.0;
    let ce = 1.15;

    for (let i = 0; i < 24; i += 2) {
      const t = new Date(baseDate.getTime() + i * 60 * 60 * 1000);
      // Simular evaporación diurna y estabilidad nocturna
      const hour = t.getHours();
      if (hour >= 8 && hour <= 16) {
        h10 -= 0.6;
        temp += 0.8;
      } else {
        h10 -= 0.1;
        temp -= 0.4;
      }

      await pool.query(`
        INSERT INTO sensores_telemetria_lecturas
        (id_tenant, id_sensor, fecha_hora, bateria_pct, temperatura_suelo_c, humedad_10cm,
         humedad_30cm, humedad_60cm, conductividad_electrica_ds_m, ph_suelo, alerta_disparada)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        1, sensorIds[0], t, 94, +temp.toFixed(1), +h10.toFixed(2),
        +h30.toFixed(2), +h60.toFixed(2), +ce.toFixed(2), 6.4, 0
      ]);
    }

    // 4. Registrar calibración inicial para la sonda
    await pool.query(`
      INSERT INTO sensores_calibraciones
      (id_tenant, id_sensor, fecha_calibracion, tipo_suelo_calibrado, coeficiente_a, coeficiente_b, tecnico_responsable, observaciones)
      VALUES (?, ?, '2026-02-11', 'Franco Arcilloso', 1.120, -0.045, 'Ing. Carlos Mendoza', 'Calibración gravimétrica en laboratorio de suelos lote 1')
    `, [1, sensorIds[0]]);

    console.log('--- Seed Fase 3 completado exitosamente con datos en MySQL ---');
    process.exit(0);
  } catch (err) {
    console.error('Error en seed sensores:', err);
    process.exit(1);
  }
}

seedSensores();
