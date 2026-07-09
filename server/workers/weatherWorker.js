import pool from '../db.js';
import fetch from 'node-fetch'; // Requiere node-fetch o usar fetch nativo en Node >= 18

// Función para obtener el centroide de un WKT Polygon
function getCentroidFromWKT(wkt) {
  // Extraer coordenadas de un WKT simple (POLYGON((lng lat, lng lat...)))
  const match = wkt.match(/\(\((.*?)\)\)/);
  if (!match) return { lat: 0, lng: 0 };
  
  const points = match[1].split(',').map(p => {
    const [lng, lat] = p.trim().split(' ');
    return { lng: parseFloat(lng), lat: parseFloat(lat) };
  });

  if (points.length === 0) return { lat: 0, lng: 0 };

  // Promedio simple para centroide aproximado
  const sum = points.reduce((acc, val) => ({ lng: acc.lng + val.lng, lat: acc.lat + val.lat }), { lng: 0, lat: 0 });
  return {
    lng: sum.lng / points.length,
    lat: sum.lat / points.length
  };
}

export async function processWeatherData() {
  console.log('Iniciando worker meteorológico (Datos reales de Open-Meteo)...');
  try {
    const [lotes] = await pool.query('SELECT id, nombre, ST_AsText(geom) as wkt FROM lotes');
    
    for (const lote of lotes) {
      if (!lote.wkt) continue;
      
      const { lat, lng } = getCentroidFromWKT(lote.wkt);
      console.log(`Consultando Open-Meteo para lote: ${lote.nombre} (Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)})`);
      
      // API libre de Open-Meteo
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`);
      
      if (!response.ok) {
        console.error(`Error HTTP Open-Meteo para lote ${lote.id}: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      
      if (data.daily && data.daily.time && data.daily.time.length > 0) {
        const todayIdx = 0; // Datos de hoy
        const tempMax = data.daily.temperature_2m_max[todayIdx];
        const tempMin = data.daily.temperature_2m_min[todayIdx];
        const precip = data.daily.precipitation_sum[todayIdx];
        
        // Registrar alerta de clima extremo si aplica
        if (tempMax > 35) {
          await pool.query(
            `INSERT INTO alertas_sat (lote_id, tipo, severidad, mensaje) VALUES (?, ?, ?, ?)`,
            [lote.id, 'clima_extremo', 'alta', `Ola de calor detectada: ${tempMax}°C máxima esperada.`]
          );
        } else if (tempMin < 0) {
          await pool.query(
            `INSERT INTO alertas_sat (lote_id, tipo, severidad, mensaje) VALUES (?, ?, ?, ?)`,
            [lote.id, 'clima_extremo', 'alta', `Riesgo de helada: ${tempMin}°C mínima esperada.`]
          );
        }
        
        console.log(`Clima Lote ${lote.id}: Max ${tempMax}°C, Min ${tempMin}°C, Lluvia ${precip}mm`);
      }
    }
    
    console.log('Worker meteorológico finalizado con éxito.');
  } catch (error) {
    console.error('Error en worker meteorológico:', error);
  }
}

// Ejecución autónoma
if (process.argv[1].includes('weatherWorker.js')) {
  processWeatherData().then(() => process.exit(0));
}
