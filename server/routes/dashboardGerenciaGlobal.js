import express from 'express';
import pool from '../db.js';

const router = express.Router();

function getDb(req) {
  return req.tenantPool || pool;
}

// GET /api/sistemas/dashboard-alta-gerencia
router.get('/', async (req, res) => {
  try {
    const db = getDb(req);

    // 1. KPIs Globales
    const [[{ total_bodegas }]] = await db.query('SELECT COUNT(*) as total_bodegas FROM bod_bodegas');
    const [[{ total_empleados }]] = await db.query('SELECT COUNT(*) as total_empleados FROM rrhh_empleados WHERE estado = "Activo"');
    const [[{ total_maquinas }]] = await db.query('SELECT COUNT(*) as total_maquinas FROM maquinaria WHERE estado_operativo = "Operativo" OR activo = 1');
    const [[{ total_lagos }]] = await db.query('SELECT COUNT(*) as total_lagos FROM acuicola_estanques WHERE estado_actual = "Activo" OR estado_actual = "Operativo"');
    const [[{ total_ganado }]] = await db.query('SELECT COUNT(*) as total_ganado FROM ganado_animales WHERE estado = "Activo" OR estado = "Vivo"');
    
    // Hectáreas sembradas (sum of area from active lots)
    const [[{ hectareas_sembradas }]] = await db.query(`
      SELECT SUM(hectareas) as hectareas_sembradas 
      FROM lotes 
      WHERE estado = 'Sembrado' OR estado = 'Activo'
    `);

    // 2. Agricultura (Cultivos y Cosechas)
    const [cultivos_stats] = await db.query(`
      SELECT 
        c.nombre as nombre_cultivo,
        COUNT(l.id_lote) as cantidad_lotes,
        SUM(l.hectareas) as area_total,
        MAX(co.fecha_cosecha) as ultima_cosecha,
        MAX(DATE_ADD(s.fecha_siembra, INTERVAL c.ciclo_dias DAY)) as proxima_cosecha
      FROM cultivos c
      LEFT JOIN siembras s ON s.id_cultivo = c.id_cultivo AND s.estado = 'Activo'
      LEFT JOIN lotes l ON s.id_lote = l.id_lote
      LEFT JOIN cosechas co ON co.id_siembra = s.id_siembra
      GROUP BY c.id_cultivo, c.nombre
      HAVING cantidad_lotes > 0
    `);

    // 3. Viveros y Semilleros (Plantas)
    const [viveros_stats] = await db.query(`
      SELECT 
        ubicacion_vivero as nombre_vivero,
        COUNT(id_camada) as total_camadas,
        SUM(cantidad_actual) as plantas_desarrollo
      FROM vivero_camadas 
      WHERE estado != 'Agotada'
      GROUP BY ubicacion_vivero
    `);

    // 4. Bioles / Producción Orgánica (Usando app_produccion_organica)
    const [bioles_stats] = await db.query(`
      SELECT 
        producto,
        COUNT(*) as total_lotes,
        SUM(cantidad_litros) as volumen_total
      FROM app_produccion_organica
      GROUP BY producto
    `);

    // 5. Ganadería (Por razas)
    const [ganaderia_razas] = await db.query(`
      SELECT 
        r.nombre as nombre_raza,
        COUNT(a.id_animal) as total_cabezas
      FROM ganado_animales a
      LEFT JOIN ganado_razas r ON a.id_raza = r.id_raza
      WHERE a.estado = 'Activo' OR a.estado = 'Vivo'
      GROUP BY r.id_raza, r.nombre
    `);

    // 6. Acuícola (Lagos y Especies)
    const [acuicola_especies] = await db.query(`
      SELECT 
        e.nombre as especie,
        COUNT(s.id_siembra_acui) as siembras_activas,
        SUM(s.cantidad_alevines) as total_peces
      FROM acuicola_siembras s
      LEFT JOIN acuicola_especies e ON s.id_especie_acui = e.id_especie_acui
      WHERE s.estado = 'Activo' OR s.estado = 'En Engorde'
      GROUP BY e.id_especie_acui, e.nombre
    `);

    // 6.5 Acuícola (Inventario Semillero / Alevinos)
    const [alevinos_stats] = await db.query(`
      SELECT 
        e.nombre as especie,
        SUM(i.cantidad_disponible) as total_alevinos
      FROM acuicola_alevinos_inventario i
      LEFT JOIN acuicola_especies e ON i.id_especie = e.id_especie_acui
      GROUP BY e.id_especie_acui, e.nombre
    `);

    // 7. Estadísticas por Fincas
    let centros_costo = [];
    try {
      [centros_costo] = await db.query(`
        SELECT 
          f.nombre,
          (SELECT COUNT(*) FROM lotes l JOIN nucleos n ON l.id_nucleo = n.id_nucleo WHERE n.id_finca = f.id_finca AND l.estado = 'Activo') as lotes_activos,
          (SELECT COUNT(*) FROM rrhh_empleados e WHERE e.id_finca = f.id_finca AND e.estado = 'Activo') as empleados_asignados,
          (SELECT COUNT(*) FROM maquinaria m WHERE m.id_finca = f.id_finca AND (m.estado_operativo = 'Operativo' OR m.activo = 1)) as maquinas_asignadas
        FROM fincas f
        WHERE f.activo = 1
      `);
    } catch (e) {
      console.error('Error in fincas query:', e.message);
    }

    res.json({
      kpis: {
        total_bodegas: total_bodegas || 0,
        total_empleados: total_empleados || 0,
        total_maquinas: total_maquinas || 0,
        total_lagos: total_lagos || 0,
        total_ganado: total_ganado || 0,
        hectareas_sembradas: hectareas_sembradas || 0,
      },
      agricultura: cultivos_stats,
      viveros: viveros_stats,
      bioles: bioles_stats,
      ganaderia: ganaderia_razas,
      acuicola: {
        especies: acuicola_especies.map(e => ({ ...e, total_peces: Number(e.total_peces) })),
        alevinos: alevinos_stats.map(a => ({ ...a, total_alevinos: Number(a.total_alevinos) }))
      },
      centros_costo: centros_costo
    });

  } catch (err) {
    console.error('Error fetching dashboard gerencia stats:', err);
    res.status(500).json({ error: 'Error interno del servidor al consultar estadísticas' });
  }
});

export default router;
