import defaultPool from '../db.js';
import { getTenantPool } from '../db-tenant.js';

async function getPool(userContext) {
  if (userContext && userContext.db_name) return await getTenantPool(userContext.db_name);
  return defaultPool;
}
import fetch from 'node-fetch';

// SCHEMA DEFINITIONS PARA GEMINI
export const toolsSchema = [
  {
    name: 'get_resumen_finca',
    description: 'Obtiene un resumen general de la finca: empleados, maquinaria operando, alertas y misiones de drones del día.',
    parameters: { type: 'OBJECT', properties: {} }
  },
  {
    name: 'get_ubicacion_empleados',
    description: 'Obtiene la última ubicación GPS de los empleados, el lote asignado y hace cuántos minutos.',
    parameters: {
      type: 'OBJECT',
      properties: {
        fecha: { type: 'STRING', description: 'Fecha opcional en formato YYYY-MM-DD. Si no se pasa, asume hoy.' }
      }
    }
  },
  {
    name: 'get_ubicacion_maquinaria',
    description: 'Obtiene la ubicación GPS, estado, operador y tenencia de la maquinaria.',
    parameters: {
      type: 'OBJECT',
      properties: {
        nombre: { type: 'STRING', description: 'Nombre o código de la máquina para filtrar' }
      }
    }
  },
  {
    name: 'get_estado_cultivos',
    description: 'Obtiene el estado de los cultivos: etapa fenológica, días desde siembra, último NDVI y alertas asociadas.',
    parameters: {
      type: 'OBJECT',
      properties: {
        lote: { type: 'STRING', description: 'ID o nombre del lote para filtrar' }
      }
    }
  },
  {
    name: 'get_estado_potreros',
    description: 'Obtiene el estado de los potreros ganaderos: cantidad de animales, estado del pasto y días de descanso.',
    parameters: { type: 'OBJECT', properties: {} }
  },
  {
    name: 'get_estado_lagos',
    description: 'Obtiene el estado de los lagos acuícolas: nivel de agua, temperatura, calidad y alertas.',
    parameters: { type: 'OBJECT', properties: {} }
  },
  {
    name: 'get_historial',
    description: 'Obtiene los eventos históricos de una unidad específica.',
    parameters: {
      type: 'OBJECT',
      properties: {
        unidad: { type: 'STRING', description: 'lote, potrero o lago' },
        dias: { type: 'NUMBER', description: 'Cantidad de días hacia atrás' }
      },
      required: ['unidad', 'dias']
    }
  },
  {
    name: 'get_tendencia_ndvi',
    description: 'Obtiene la tendencia histórica del índice NDVI de un lote.',
    parameters: {
      type: 'OBJECT',
      properties: {
        lote: { type: 'STRING', description: 'ID o nombre del lote' },
        semanas: { type: 'NUMBER', description: 'Cantidad de semanas hacia atrás' }
      },
      required: ['lote']
    }
  },
  {
    name: 'get_estado_drones',
    description: 'Obtiene el estado de la flota de drones: propio vs alquilado, misiones activas y salud de baterías.',
    parameters: { type: 'OBJECT', properties: {} }
  },
  {
    name: 'get_misiones',
    description: 'Obtiene misiones de drones programadas o históricas.',
    parameters: {
      type: 'OBJECT',
      properties: {
        fecha: { type: 'STRING', description: 'Fecha en formato YYYY-MM-DD para buscar. Si se omite, trae las recientes y futuras.' }
      }
    }
  },
  {
    name: 'get_inventario',
    description: 'Obtiene el inventario actual (stock) y alertas de stock mínimo.',
    parameters: {
      type: 'OBJECT',
      properties: {
        producto: { type: 'STRING', description: 'Nombre o código del producto a buscar. Si se omite, muestra un resumen con los más escasos.' }
      }
    }
  },
  {
    name: 'get_tareas',
    description: 'Obtiene tareas o labores agrícolas planificadas o en ejecución.',
    parameters: {
      type: 'OBJECT',
      properties: {
        fecha: { type: 'STRING', description: 'Fecha en formato YYYY-MM-DD. Si se omite, asume hoy.' }
      }
    }
  },
  {
    name: 'get_alertas_activas',
    description: 'Obtiene alertas críticas activas en la finca (clima, maquinaria, cultivos, etc).',
    parameters: { type: 'OBJECT', properties: {} }
  },
  {
    name: 'get_clima',
    description: 'Obtiene el clima actual y pronóstico para la finca.',
    parameters: { type: 'OBJECT', properties: {} }
  }
];

// TOOL IMPLEMENTATIONS
export const toolsFunctions = {
  get_resumen_finca: async (userContext) => {
    const pool = await getPool(userContext);
    try {
      const [[{ empleados }]] = await pool.query(`SELECT COUNT(*) as empleados FROM rrhh_empleados WHERE activo=1`);
      const [[{ drones }]] = await pool.query(`SELECT COUNT(*) as drones FROM maquinaria WHERE categoria='DRON' AND estado='OPERATIVO'`);
      const [[{ alertas }]] = await pool.query(`SELECT COUNT(*) as alertas FROM alertas WHERE leida=0`);
      const [[{ misiones }]] = await pool.query(`SELECT COUNT(*) as misiones FROM dron_misiones WHERE DATE(fecha_programada) = CURDATE()`);
      
      return {
        empleados_activos: empleados,
        maquinas_operando: drones, // simplificado a drones por ahora
        alertas_pendientes: alertas,
        misiones_hoy: misiones
      };
    } catch (err) {
      return { error: 'No se pudo obtener el resumen' };
    }
  },

  get_ubicacion_empleados: async ({ fecha }, userContext) => {
    const pool = await getPool(userContext);
    try {
      const query = `
        SELECT e.nombres, u.lat, u.lng, l.nombre as lote, 
               TIMESTAMPDIFF(MINUTE, u.fecha_hora, NOW()) as hace_minutos
        FROM registro_ubicaciones u
        JOIN rrhh_empleados e ON u.entidad_id = e.id_empleado
        LEFT JOIN lotes l ON l.id_lote = 1 /* Mock de relación por simplificación */
        WHERE u.tipo_entidad = 'empleado'
        ${fecha ? `AND DATE(u.fecha_hora) = ?` : `AND DATE(u.fecha_hora) = CURDATE()`}
        ORDER BY u.fecha_hora DESC LIMIT 10
      `;
      const [rows] = await pool.query(query, fecha ? [fecha] : []);
      return rows.length ? rows : { mensaje: 'No hay registros recientes' };
    } catch (err) {
      return { error: 'Error obteniendo ubicaciones' };
    }
  },

  get_ubicacion_maquinaria: async ({ nombre }, userContext) => {
    const pool = await getPool(userContext);
    try {
      let query = `
        SELECT m.codigo, m.nombre, m.estado, m.tenencia, u.lat, u.lng,
               TIMESTAMPDIFF(MINUTE, u.fecha_hora, NOW()) as hace_minutos
        FROM maquinaria m
        LEFT JOIN registro_ubicaciones u ON u.entidad_id = m.id_maquinaria AND u.tipo_entidad = 'maquinaria'
        WHERE 1=1
      `;
      const params = [];
      if (nombre) {
        query += ` AND (m.nombre LIKE ? OR m.codigo LIKE ?)`;
        params.push(`%${nombre}%`, `%${nombre}%`);
      }
      query += ` ORDER BY u.fecha_hora DESC LIMIT 10`;
      const [rows] = await pool.query(query, params);
      return rows.length ? rows : { mensaje: 'No se encontró maquinaria' };
    } catch (err) {
      return { error: 'Error obteniendo maquinaria' };
    }
  },

  get_estado_cultivos: async ({ lote }, userContext) => {
    const pool = await getPool(userContext);
    try {
      let query = `
        SELECT l.nombre as lote, cl.cultivo, cl.variedad, c.etapa, 
               DATEDIFF(NOW(), c.fecha_inicio) as dias_etapa, c.indice_ndvi_promedio
        FROM cultivo_historial_etapas c
        JOIN cultivo_lotes cl ON c.cultivo_id = cl.id
        JOIN lotes l ON cl.lote_id = l.id_lote
      `;
      const params = [];
      if (lote) {
        query += ` WHERE l.nombre LIKE ? OR l.id_lote = ?`;
        params.push(`%${lote}%`, lote);
      }
      query += ` ORDER BY c.fecha_inicio DESC LIMIT 5`;
      const [rows] = await pool.query(query, params);
      return rows.length ? rows : { mensaje: 'No hay cultivos activos' };
    } catch (err) {
      return { error: 'Error obteniendo cultivos' };
    }
  },

  get_estado_potreros: async (userContext) => {
    const pool = await getPool(userContext);
    try {
      const [rows] = await pool.query(`
        SELECT p.nombre, h.num_animales, h.estado_pasto, h.dias_descanso
        FROM potrero_historial h
        JOIN ganado_potreros p ON h.potrero_id = p.id_potrero
        WHERE h.id IN (SELECT MAX(id) FROM potrero_historial GROUP BY potrero_id)
      `);
      return rows.length ? rows : { mensaje: 'No hay datos de potreros' };
    } catch (err) {
      return { error: 'Error obteniendo potreros' };
    }
  },

  get_estado_lagos: async (userContext) => {
    const pool = await getPool(userContext);
    try {
      const [rows] = await pool.query(`
        SELECT l.nombre, h.nivel_agua_m, h.temperatura_c, h.oxigeno_disuelto, h.ph
        FROM lago_historial h
        JOIN acuicola_lagos l ON h.lago_id = l.id
        WHERE h.id IN (SELECT MAX(id) FROM lago_historial GROUP BY lago_id)
      `);
      return rows.length ? rows : { mensaje: 'No hay datos de lagos' };
    } catch (err) {
      return { error: 'Error obteniendo lagos' };
    }
  },

  get_historial: async ({ unidad, dias }, userContext) => {
    const pool = await getPool(userContext);
    try {
      let query = '';
      if (unidad.toLowerCase() === 'lote') {
        query = `SELECT tipo_evento, created_at as fecha FROM lote_historial WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) LIMIT 10`;
      } else if (unidad.toLowerCase() === 'potrero') {
        query = `SELECT estado_pasto as evento, fecha FROM potrero_historial WHERE fecha >= DATE_SUB(NOW(), INTERVAL ? DAY) LIMIT 10`;
      } else {
        return { mensaje: 'Unidad no soportada. Use lote o potrero' };
      }
      const [rows] = await pool.query(query, [dias || 7]);
      return rows.length ? rows : { mensaje: 'Sin historial reciente' };
    } catch (err) {
      return { error: 'Error obteniendo historial' };
    }
  },

  get_tendencia_ndvi: async ({ lote, semanas }, userContext) => {
    const pool = await getPool(userContext);
    try {
      const [rows] = await pool.query(`
        SELECT a.fecha_analisis, a.indice_promedio
        FROM dron_analisis a
        JOIN lotes l ON a.lote_id = l.id_lote
        WHERE (l.nombre LIKE ? OR l.id_lote = ?)
          AND a.fecha_analisis >= DATE_SUB(NOW(), INTERVAL ? WEEK)
        ORDER BY a.fecha_analisis ASC
      `, [`%${lote}%`, lote, semanas || 4]);
      return rows.length ? rows : { mensaje: 'Sin datos NDVI recientes' };
    } catch (err) {
      return { error: 'Error obteniendo NDVI' };
    }
  },

  get_estado_drones: async (userContext) => {
    const pool = await getPool(userContext);
    try {
      const [rows] = await pool.query(`
        SELECT m.codigo, m.nombre, m.tenencia, e.horas_vuelo_acumuladas,
               (SELECT salud_porcentaje FROM dron_baterias b WHERE b.equipo_dron_id = e.id LIMIT 1) as bateria_salud
        FROM equipos_dron e
        JOIN maquinaria m ON e.equipo_id = m.id_maquinaria
      `);
      return rows.length ? rows : { mensaje: 'No hay drones' };
    } catch (err) {
      return { error: 'Error obteniendo flota' };
    }
  },

  get_misiones: async ({ fecha }, userContext) => {
    const pool = await getPool(userContext);
    try {
      const query = `
        SELECT m.tipo, m.estado, m.fecha_programada, m.area_cubierta_ha, l.nombre as lote
        FROM dron_misiones m
        LEFT JOIN lotes l ON m.lote_id = l.id_lote
        ${fecha ? `WHERE DATE(m.fecha_programada) = ?` : `WHERE m.fecha_programada >= DATE_SUB(NOW(), INTERVAL 7 DAY)`}
        ORDER BY m.fecha_programada DESC LIMIT 10
      `;
      const [rows] = await pool.query(query, fecha ? [fecha] : []);
      return rows.length ? rows : { mensaje: 'No hay misiones' };
    } catch (err) {
      return { error: 'Error obteniendo misiones' };
    }
  },

  get_inventario: async ({ producto }, userContext) => {
    const pool = await getPool(userContext);
    try {
      let query = `
        SELECT i.codigo, i.nombre, SUM(e.cantidad) as stock_total
        FROM inv_existencias e
        JOIN insumos i ON e.id_articulo = i.id_insumo
      `;
      const params = [];
      if (producto) {
        query += ` WHERE i.nombre LIKE ? OR i.codigo LIKE ?`;
        params.push(`%${producto}%`, `%${producto}%`);
      }
      query += ` GROUP BY i.id_insumo ORDER BY stock_total ASC LIMIT 10`;
      const [rows] = await pool.query(query, params);
      return rows.length ? rows : { mensaje: 'No se encontraron productos' };
    } catch (err) {
      return { error: 'Error obteniendo inventario' };
    }
  },

  get_tareas: async ({ fecha }, userContext) => {
    const pool = await getPool(userContext);
    try {
      const [rows] = await pool.query(`
        SELECT tipo, estado, fecha_programada 
        FROM dron_misiones 
        WHERE DATE(fecha_programada) = ?
      `, [fecha || new Date().toISOString().split('T')[0]]);
      return rows.length ? rows : { mensaje: 'Sin tareas hoy' };
    } catch (err) {
      return { error: 'Error obteniendo tareas' };
    }
  },

  get_alertas_activas: async (userContext) => {
    const pool = await getPool(userContext);
    try {
      const [rows] = await pool.query(`
        SELECT tipo, descripcion, fecha_alerta 
        FROM alertas 
        WHERE leida=0 
        ORDER BY fecha_alerta DESC LIMIT 5
      `);
      return rows.length ? rows : { mensaje: 'No hay alertas críticas' };
    } catch (err) {
      return { error: 'Error obteniendo alertas' };
    }
  },

  get_clima: async (userContext) => {
    const pool = await getPool(userContext);
    try {
      const API_KEY = process.env.OPENWEATHER_API_KEY;
      if (!API_KEY) {
        return {
          clima: 'Despejado (Datos simulados, falta API KEY)',
          temperatura: '25°C',
          humedad: '60%',
          probabilidad_lluvia: '10%'
        };
      }
      
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Bogota,CO&units=metric&appid=${API_KEY}`);
      const data = await res.json();
      return {
        clima: data.weather[0].description,
        temperatura: `${data.main.temp}°C`,
        humedad: `${data.main.humidity}%`
      };
    } catch (err) {
      return { error: 'No se pudo obtener el clima.' };
    }
  }
};
