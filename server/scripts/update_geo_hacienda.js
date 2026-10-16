import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

function generatePolygon(baseLat, baseLng, radiusOffset = 0.005) {
  // Genera WKT Polygon
  const p1 = `${baseLng - radiusOffset} ${baseLat - radiusOffset}`;
  const p2 = `${baseLng + radiusOffset} ${baseLat - radiusOffset}`;
  const p3 = `${baseLng + radiusOffset} ${baseLat + radiusOffset}`;
  const p4 = `${baseLng - radiusOffset} ${baseLat + radiusOffset}`;
  const p5 = p1; // cierre
  
  return `POLYGON((${p1}, ${p2}, ${p3}, ${p4}, ${p5}))`;
}

function generateInnerPolygon(baseLat, baseLng, index, maxHectareas) {
  const offset = index * 0.001; 
  const radius = 0.001 * (maxHectareas / 10);
  
  const centerLat = baseLat + offset;
  const centerLng = baseLng + offset;
  
  return generatePolygon(centerLat, centerLng, radius);
}

async function run() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: process.env.MYSQL_PORT || 3307,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'sas_agricolas'
  });

  try {
    console.log("📍 Iniciando Migración Geoespacial (Hacienda Villavicencio)...");
    
    // Coordenadas base de Villavicencio
    let baseLat = 4.1420;
    let baseLng = -73.6266;
    const ALTITUD_VILLAVICENCIO = 467;

    const [fincas] = await pool.query('SELECT id_finca, nombre FROM fincas');
    console.log(`🌾 Encontradas ${fincas.length} fincas. Asignando altitud y polígonos...`);

    for (let i = 0; i < fincas.length; i++) {
      const finca = fincas[i];
      const fLat = baseLat + (i * 0.015);
      const fLng = baseLng + (i * 0.015);
      
      const poligonoFinca = generatePolygon(fLat, fLng, 0.01);

      await pool.query(
        'UPDATE fincas SET altitud_promedio = ?, hectareas_totales = ?, poligono_gps = ST_GeomFromText(?), centro_gps = ST_GeomFromText(?) WHERE id_finca = ?',
        [ALTITUD_VILLAVICENCIO, 500, poligonoFinca, `POINT(${fLng} ${fLat})`, finca.id_finca]
      );

      // Lotes / Núcleos
      const [lotes] = await pool.query('SELECT id_nucleo, nombre, hectareas FROM nucleos WHERE id_finca = ?', [finca.id_finca]);
      
      if (lotes.length > 0) {
        console.log(`   🚜 Finca ${finca.id_finca}: Actualizando ${lotes.length} lotes anidados...`);
        for (let j = 0; j < lotes.length; j++) {
          const lote = lotes[j];
          const poligonoLote = generateInnerPolygon(fLat, fLng, j, lote.hectareas || 50);
          await pool.query(
            'UPDATE nucleos SET poligono_gps = ST_GeomFromText(?) WHERE id_nucleo = ?',
            [poligonoLote, lote.id_nucleo]
          );
        }
      } else {
        console.log(`   ⚠️ Finca ${finca.id_finca}: No tiene lotes. Inyectando lotes de contingencia...`);
        const lotesNuevos = [
          { nombre: 'Núcleo Principal', has: 150 },
          { nombre: 'Lote Secundario', has: 50 }
        ];
        
        for (let j = 0; j < lotesNuevos.length; j++) {
          const lInfo = lotesNuevos[j];
          const poligonoLote = generateInnerPolygon(fLat, fLng, j, lInfo.has);
          const codigo = `LOT-F${finca.id_finca}-0${j+1}`;
          await pool.query(
            'INSERT INTO nucleos (id_finca, codigo, nombre, hectareas, activo, poligono_gps) VALUES (?, ?, ?, ?, 1, ST_GeomFromText(?))',
            [finca.id_finca, codigo, lInfo.nombre, lInfo.has, poligonoLote]
          );
        }
      }
    }

    console.log("✅ Migración Geoespacial Completada con Éxito. ¡Auditorías intactas!");

  } catch (error) {
    console.error("❌ Error en la migración:", error);
  } finally {
    await pool.end();
  }
}

run();
