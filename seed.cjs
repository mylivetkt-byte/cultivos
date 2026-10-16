const mysql = require('mysql2/promise');
require('dotenv').config({path: '.env'});

const CULTIVOS = [
  // CULTIVOS PERMANENTES Y SEMIPERMANENTES
  { nombre: 'Café (Arábica)', tipo: 'Permanente', altitud_min: 1200, altitud_max: 2000, jornales: 150, horas_tractor: 0, semilla_kg: 5000, abono_kg: 800, ciclo_dias: 365, precio: 15000 },
  { nombre: 'Aguacate Hass', tipo: 'Permanente', altitud_min: 1800, altitud_max: 2500, jornales: 120, horas_tractor: 10, semilla_kg: 400, abono_kg: 1000, ciclo_dias: 365, precio: 6000 },
  { nombre: 'Cacao', tipo: 'Permanente', altitud_min: 0, altitud_max: 1200, jornales: 90, horas_tractor: 5, semilla_kg: 1100, abono_kg: 600, ciclo_dias: 365, precio: 12000 },
  { nombre: 'Plátano (Hartón)', tipo: 'Semipermanente', altitud_min: 0, altitud_max: 1500, jornales: 85, horas_tractor: 2, semilla_kg: 1500, abono_kg: 400, ciclo_dias: 300, precio: 1500 },
  { nombre: 'Banano (Exportación)', tipo: 'Semipermanente', altitud_min: 0, altitud_max: 800, jornales: 180, horas_tractor: 8, semilla_kg: 2000, abono_kg: 1200, ciclo_dias: 330, precio: 1200 },
  { nombre: 'Palma de Aceite', tipo: 'Permanente', altitud_min: 0, altitud_max: 500, jornales: 60, horas_tractor: 20, semilla_kg: 143, abono_kg: 1500, ciclo_dias: 365, precio: 600 },
  { nombre: 'Caña Panelera', tipo: 'Semipermanente', altitud_min: 500, altitud_max: 1800, jornales: 110, horas_tractor: 15, semilla_kg: 8000, abono_kg: 800, ciclo_dias: 450, precio: 2000 },
  
  // CULTIVOS TRANSITORIOS (CICLO CORTO)
  { nombre: 'Papa (R12 / Parda)', tipo: 'Transitorio', altitud_min: 2200, altitud_max: 3200, jornales: 70, horas_tractor: 12, semilla_kg: 2000, abono_kg: 1500, ciclo_dias: 180, precio: 1200 },
  { nombre: 'Arroz (Riego)', tipo: 'Transitorio', altitud_min: 0, altitud_max: 1000, jornales: 35, horas_tractor: 15, semilla_kg: 150, abono_kg: 600, ciclo_dias: 140, precio: 1800 },
  { nombre: 'Arroz (Secano)', tipo: 'Transitorio', altitud_min: 0, altitud_max: 1000, jornales: 25, horas_tractor: 8, semilla_kg: 120, abono_kg: 400, ciclo_dias: 150, precio: 1700 },
  { nombre: 'Maíz (Amarillo Duro)', tipo: 'Transitorio', altitud_min: 0, altitud_max: 2000, jornales: 35, horas_tractor: 6, semilla_kg: 25, abono_kg: 350, ciclo_dias: 140, precio: 1400 },
  { nombre: 'Frijol (Cargamanto)', tipo: 'Transitorio', altitud_min: 1500, altitud_max: 2500, jornales: 50, horas_tractor: 4, semilla_kg: 50, abono_kg: 300, ciclo_dias: 120, precio: 8000 },
  { nombre: 'Sorgo Forrajero', tipo: 'Transitorio', altitud_min: 0, altitud_max: 1200, jornales: 25, horas_tractor: 5, semilla_kg: 15, abono_kg: 200, ciclo_dias: 130, precio: 1100 },
  { nombre: 'Yuca (Industrial/Consumo)', tipo: 'Transitorio', altitud_min: 0, altitud_max: 1500, jornales: 55, horas_tractor: 6, semilla_kg: 10000, abono_kg: 250, ciclo_dias: 300, precio: 900 },
  { nombre: 'Tomate (Invernadero)', tipo: 'Transitorio', altitud_min: 1500, altitud_max: 2400, jornales: 300, horas_tractor: 0, semilla_kg: 1, abono_kg: 2000, ciclo_dias: 150, precio: 2500 },
  { nombre: 'Cebolla de Bulbo', tipo: 'Transitorio', altitud_min: 2000, altitud_max: 2800, jornales: 80, horas_tractor: 10, semilla_kg: 5, abono_kg: 800, ciclo_dias: 120, precio: 1500 }
];

(async () => {
  try {
    const pool = mysql.createPool({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: process.env.MYSQL_PORT || 3307,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sas_agricolas'
    });

    console.log("Creando tabla cultivos_recetas_maestras...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cultivos_recetas_maestras (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre_cultivo VARCHAR(100) NOT NULL,
        tipo_cultivo VARCHAR(50) NOT NULL,
        altitud_min INT NOT NULL,
        altitud_max INT NOT NULL,
        jornales_por_ha INT NOT NULL,
        horas_tractor_ha DECIMAL(10,2) NOT NULL,
        kg_semilla_ha DECIMAL(10,2) NOT NULL,
        kg_abono_ha DECIMAL(10,2) NOT NULL,
        ciclo_dias_total INT NOT NULL,
        precio_mercado_estimado DECIMAL(15,2) NOT NULL,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("Limpiando datos antiguos...");
    await pool.query('TRUNCATE TABLE cultivos_recetas_maestras');

    console.log("Insertando extenso catálogo de Colombia...");
    for (const c of CULTIVOS) {
      await pool.query(`
        INSERT INTO cultivos_recetas_maestras 
        (nombre_cultivo, tipo_cultivo, altitud_min, altitud_max, jornales_por_ha, horas_tractor_ha, kg_semilla_ha, kg_abono_ha, ciclo_dias_total, precio_mercado_estimado)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [c.nombre, c.tipo, c.altitud_min, c.altitud_max, c.jornales, c.horas_tractor, c.semilla_kg, c.abono_kg, c.ciclo_dias, c.precio]);
    }
    
    console.log("✅ Seed completado con éxito con " + CULTIVOS.length + " cultivos.");
    process.exit(0);
  } catch (e) {
    console.error("Error en seed:", e);
    process.exit(1);
  }
})();
