const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: __dirname + '/../.env' });

const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: '12345',
  database: 'sas_agricolas',
  port: 3307,
};

function generateTemperature(dayOfYear, minYearly, maxYearly) {
  // Sinusoidal curve peaking around day 180 (summer-ish)
  const amplitude = (maxYearly - minYearly) / 2;
  const mean = minYearly + amplitude;
  const value = mean - amplitude * Math.cos((dayOfYear * 2 * Math.PI) / 365);
  // Add some daily noise
  return value + (Math.random() * 4 - 2); 
}

function generateRainfall(dayOfYear) {
  // Simulate two rainy seasons (e.g. bimodal precipitation in tropics)
  // Peaks around day 100 (April) and day 280 (October)
  const isRainy1 = Math.abs(dayOfYear - 100) < 40;
  const isRainy2 = Math.abs(dayOfYear - 280) < 40;
  
  if (isRainy1 || isRainy2) {
    // High chance of rain, higher volume
    return Math.random() > 0.3 ? Math.random() * 40 : 0;
  } else {
    // Dry season: low chance of rain, low volume
    return Math.random() > 0.85 ? Math.random() * 10 : 0;
  }
}

async function seedClima() {
  let connection;
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database successfully.');

    const [tenants] = await connection.query('SELECT id_tenant FROM tenants LIMIT 1');
    if (tenants.length === 0) throw new Error('No tenants found.');
    const tenantId = tenants[0].id_tenant;

    console.log('Clearing existing Climate data...');
    await connection.query('DELETE FROM datos_climaticos_diarios');
    await connection.query('DELETE FROM estaciones_meteorologicas');

    // 1. Create Estaciones Meteorológicas
    const estaciones = [
      { codigo: 'EST-NORTE', nombre: 'Estación Zona Norte (Planta Extractora)', lat: 4.5, lon: -73.5, marca: 'Davis Instruments', modelo: 'Vantage Pro2' },
      { codigo: 'EST-SUR', nombre: 'Estación Zona Sur (Cultivo Joven)', lat: 4.4, lon: -73.55, marca: 'Campbell Scientific', modelo: 'CR1000X' },
      { codigo: 'EST-CENTRO', nombre: 'Estación Central (Compostaje)', lat: 4.45, lon: -73.52, marca: 'Pessl Instruments', modelo: 'iMETOS' }
    ];

    const estacionIds = [];
    for (const est of estaciones) {
      const [res] = await connection.query(
        'INSERT INTO estaciones_meteorologicas (id_tenant, codigo, nombre, marca, modelo, activa) VALUES (?, ?, ?, ?, ?, 1)',
        [tenantId, est.codigo, est.nombre, est.marca, est.modelo]
      );
      estacionIds.push(res.insertId);
    }
    console.log(`Inserted ${estacionIds.length} weather stations.`);

    // 2. Generate 3 years of daily data per station
    console.log('Generating massive daily weather data for the last 3 years...');
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 3);

    const msPerDay = 1000 * 60 * 60 * 24;
    const totalDays = Math.floor((endDate - startDate) / msPerDay);
    
    let totalRecords = 0;

    for (let stationId of estacionIds) {
      const isSouthStation = stationId === estacionIds[1]; // South might be slightly cooler/wetter
      
      let currentDay = new Date(startDate);
      
      const values = [];
      for (let i = 0; i <= totalDays; i++) {
        const dayOfYear = Math.floor((currentDay - new Date(currentDay.getFullYear(), 0, 0)) / msPerDay);
        
        let tMax = generateTemperature(dayOfYear, 28, 35) + (isSouthStation ? -1 : 0);
        let tMin = generateTemperature(dayOfYear, 20, 24) + (isSouthStation ? -1 : 0);
        
        // Ensure tMax > tMin
        if (tMin > tMax) {
          const temp = tMax;
          tMax = tMin;
          tMin = temp;
        }
        
        const tAvg = (tMax + tMin) / 2;
        
        let rain = generateRainfall(dayOfYear);
        if (isSouthStation) rain *= 1.2; // 20% more rain in south
        
        // Humidity correlates inversely with temp, directly with rain
        let hAvg = 75 + (rain > 0 ? 10 : -10) - (tAvg > 30 ? 10 : 0) + (Math.random()*10 - 5);
        hAvg = Math.max(40, Math.min(100, hAvg));
        const hMax = Math.min(100, hAvg + 15);
        const hMin = Math.max(30, hAvg - 15);
        
        const solar = (Math.random() * 3 + 4) * (rain > 5 ? 0.6 : 1); // 4 to 7 kWh/m2, less if raining
        const wind = Math.random() * 15 + 2; // 2 to 17 km/h
        const evapo = (tAvg * 0.2) + (solar * 0.5) + (wind * 0.1) - (hAvg * 0.05); // Rough evapotranspiration approx
        const uv = rain > 10 ? Math.random() * 4 : Math.random() * 6 + 5; // Low if rainy, high if clear

        values.push([
          stationId,
          currentDay.toISOString().split('T')[0],
          tMax.toFixed(2),
          tMin.toFixed(2),
          tAvg.toFixed(2),
          hMax.toFixed(2),
          hMin.toFixed(2),
          hAvg.toFixed(2),
          rain.toFixed(2),
          wind.toFixed(2),
          solar.toFixed(2),
          Math.max(0, evapo).toFixed(2),
          uv.toFixed(1)
        ]);
        
        totalRecords++;
        currentDay.setDate(currentDay.getDate() + 1);
        
        // Batch insert every 500 to avoid query too large
        if (values.length >= 500 || i === totalDays) {
          await connection.query(
            'INSERT INTO datos_climaticos_diarios (id_estacion, fecha, temperatura_max, temperatura_min, temperatura_promedio, humedad_relativa_max, humedad_relativa_min, humedad_promedio, precipitacion_mm, velocidad_viento_kmh, radiacion_solar, evaporacion_mm, indice_uv) VALUES ?',
            [values]
          );
          values.length = 0; // clear array
        }
      }
    }

    console.log(`Successfully inserted ${totalRecords} daily climate records!`);

    // 3. Seed Eventos Climaticos
    console.log('Generating eventos climaticos...');
    const tiposEventos = ['Sequia', 'Tormenta', 'Inundacion', 'Helada', 'Granizada', 'Huracan'];
    const severidades = ['Baja', 'Media', 'Alta', 'Critica'];
    
    // Get fincas and lotes
    const [fincas] = await connection.query('SELECT id_finca FROM fincas WHERE id_tenant = ?', [tenantId]);
    if (fincas.length > 0) {
      const [lotes] = await connection.query('SELECT id_lote FROM lotes');
      
      for (let i = 0; i < 20; i++) {
        const fincaId = fincas[Math.floor(Math.random() * fincas.length)].id_finca;
        const loteId = lotes.length > 0 && Math.random() > 0.5 ? lotes[Math.floor(Math.random() * lotes.length)].id_lote : null;
        
        const fechaInicio = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
        const fechaFin = new Date(fechaInicio.getTime() + Math.random() * 5 * msPerDay);
        
        const tipo = tiposEventos[Math.floor(Math.random() * tiposEventos.length)];
        const sev = severidades[Math.floor(Math.random() * severidades.length)];
        const impacto = (Math.random() * 10000).toFixed(2);
        const area = (Math.random() * 50).toFixed(2);
        
        await connection.query(
          'INSERT INTO eventos_climaticos (id_finca, id_lote, tipo_evento, fecha_inicio, fecha_fin, severidad, descripcion, impacto_estimado, area_afectada_ha) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [fincaId, loteId, tipo, fechaInicio, fechaFin, sev, `Evento registrado de ${tipo} con severidad ${sev}`, impacto, area]
        );
      }
    }

    // 4. Seed Niveles de Humedad
    console.log('Generating niveles de humedad...');
    const [lotesHumedad] = await connection.query('SELECT id_lote FROM lotes LIMIT 10');
    if (lotesHumedad.length > 0) {
      const humValues = [];
      for (let l of lotesHumedad) {
        for (let i = 0; i < 50; i++) {
          const fechaMedicion = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
          const profundidad = Math.random() > 0.5 ? 20 : 40; // 20cm or 40cm
          const humedad = (Math.random() * 20 + 10).toFixed(2); // 10% to 30%
          const capacidad = 35.00; // typical field capacity
          
          humValues.push([
            l.id_lote,
            fechaMedicion.toISOString().slice(0, 19).replace('T', ' '),
            profundidad,
            humedad,
            capacidad
          ]);
        }
      }
      if (humValues.length > 0) {
        await connection.query(
          'INSERT INTO niveles_humedad (id_lote, fecha_medicion, profundidad_cm, humedad_pct, capacidad_campo_pct) VALUES ?',
          [humValues]
        );
      }
    }

    console.log('Clima module tables seeded successfully!');  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seedClima();
