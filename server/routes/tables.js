import { Router } from 'express';
import pool from '../db.js';
import { getDb } from '../utils/db.js';

const router = Router();

// GET /api/tables — list all tables with row counts
router.get('/', async (req, res) => {
  try {
    const [tables] = await getDb(req).query(
      `SELECT TABLE_NAME, TABLE_ROWS, TABLE_COMMENT
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_NAME`
    );
    res.json(tables);
  } catch (err) {
    console.error('Error listing tables:', err);
    const msg = err.code || err.message || 'Unknown error';
    res.status(500).json({ error: `Database error: ${msg}` });
  }
});

// GET /api/tables/finca & /api/tables/fincas — get fincas table data with tenant filtering
export const getFincasHandler = async (req, res) => {
  try {
    const id_tenant = req.query.tenantId || req.user?.id_tenant || 1;
    const [rows] = await pool.query(`
      SELECT id_finca as id, id_finca, nombre, codigo, 
             departamento, municipio, vereda,
             hectareas_totales, id_tenant, activo
      FROM fincas
      WHERE (id_tenant = ? OR ? IS NULL) AND activo = 1
      ORDER BY nombre ASC
    `, [id_tenant, id_tenant]);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching fincas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
router.get('/finca', getFincasHandler);
router.get('/fincas', getFincasHandler);

// GET /api/tables/lotes — get lotes table data with tenant/finca filtering
router.get('/lotes', async (req, res) => {
  try {
    const id_tenant = req.query.tenantId || req.user?.id_tenant || 1;
    const id_finca = req.query.fincaId || req.query.id_finca;
    let sql = `
      SELECT l.id_lote as id, l.id_lote, l.nombre, l.codigo, l.id_nucleo,
             n.id_finca, f.nombre as finca_nombre
      FROM lotes l
      LEFT JOIN nucleos n ON l.id_nucleo = n.id_nucleo
      LEFT JOIN fincas f ON n.id_finca = f.id_finca
      WHERE (f.id_tenant = ? OR f.id_tenant IS NULL) AND l.activo = 1
    `;
    const params = [id_tenant];
    if (id_finca) {
      sql += ' AND n.id_finca = ?';
      params.push(id_finca);
    }
    sql += ' ORDER BY l.nombre ASC';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching lotes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/tables/viveros — get viveros table data with tenant/finca filtering
router.get('/viveros', async (req, res) => {
  try {
    const id_tenant = req.query.tenantId || req.user?.id_tenant || 1;
    const id_finca = req.query.fincaId || req.query.id_finca;
    let sql = `
      SELECT v.id_vivero as id, v.id_vivero, v.nombre, v.codigo, v.id_finca,
             f.nombre as finca_nombre
      FROM viveros v
      LEFT JOIN fincas f ON v.id_finca = f.id_finca
      WHERE (v.id_tenant = ? OR v.id_tenant IS NULL) AND v.activo = 1
    `;
    const params = [id_tenant];
    if (id_finca) {
      sql += ' AND (v.id_finca = ? OR v.id_finca IS NULL)';
      params.push(id_finca);
    }
    sql += ' ORDER BY v.nombre ASC';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching viveros:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/tables/nucleos — get nucleos table data with tenant/finca filtering
router.get('/nucleos', async (req, res) => {
  try {
    const id_tenant = req.query.tenantId || req.user?.id_tenant || 1;
    const id_finca = req.query.fincaId || req.query.id_finca;
    let sql = `
      SELECT n.id_nucleo as id, n.id_nucleo, n.nombre, n.codigo, n.id_finca,
             f.nombre as finca_nombre
      FROM nucleos n
      LEFT JOIN fincas f ON n.id_finca = f.id_finca
      WHERE (f.id_tenant = ? OR f.id_tenant IS NULL) AND n.activo = 1
    `;
    const params = [id_tenant];
    if (id_finca) {
      sql += ' AND n.id_finca = ?';
      params.push(id_finca);
    }
    sql += ' ORDER BY n.nombre ASC';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching nucleos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/table/empleados — get empleados table data with tenant filtering
router.get('/empleados', async (req, res) => {
  try {
    const id_tenant = req.query.tenantId || 1;
    const [rows] = await pool.query(`
      SELECT id_empleado as id, CONCAT(nombres, ' ', IFNULL(apellidos, '')) as nombre,
             ruc_cedula as cedula, valor_hora as tarifa_hora, estado, id_tenant
      FROM rrhh_empleados
      WHERE id_tenant = ? AND estado IN ('Activo', 'Inactivo')
    `, [id_tenant]);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching empleados:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/table/maquinas — get maquinaria table data with tenant filtering
router.get('/maquinas', async (req, res) => {
  try {
    const id_tenant = req.query.tenantId || 1;
    const [rows] = await pool.query(`
      SELECT id_maq_agro as id, marca_modelo as nombre, placa, 
             costo_hora_estimado as costo_hora, 
             horometro_actual as horometro
      FROM agroind_maquinaria_equipo
      WHERE id_tenant = ? AND activo = 1
    `, [id_tenant]);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching maquinas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/tables/modules — get table modules structure data
router.get('/modules', async (req, res) => {
  try {
    const [tables] = await getDb(req).query(
      `SELECT TABLE_NAME, TABLE_ROWS, TABLE_COMMENT
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_NAME`
    );

    const moduleGroups = {
      'Core': {
        icon: '⚙️',
        prefixes: ['tenants', 'usuarios', 'sedes', 'sys_configuracion_pais', 'configuracion_pais', 'regulaciones_pais'],
        tables: [],
      },
      'Geografía': {
        icon: '🗺️',
        prefixes: ['fincas', 'nucleos', 'lotes', 'caminos_calles', 'capas_geo'],
        tables: [],
      },
      'Clima': {
        icon: '🌤️',
        prefixes: ['estaciones_clima', 'estaciones_', 'datos_climaticos_', 'eventos_climaticos', 'niveles_humedad'],
        tables: [],
      },
      'Viveros': {
        icon: '🌱',
        prefixes: ['viveros', 'vivero_produccion', 'vivero_'],
        tables: [],
      },
      'Cultivos': {
        icon: '🌿',
        prefixes: ['cultivos', 'variedades', 'fenologia_', 'asociacion_cultivos', 'calendario_', 'rotaciones_'],
        tables: [],
      },
      'Suelos': {
        icon: '🧪',
        prefixes: ['analisis_suelos', 'analisis_tejido', 'fertilizaciones', 'planes_fertilizacion'],
        tables: [],
      },
      'Fitosanitario': {
        icon: '🐛',
        prefixes: ['plagas', 'enfermedades', 'malezas', 'agentes_biologicos', 'detecciones_', 'liberaciones_', 'monitoreo_', 'produccion_agentes_', 'control_plagas', 'umbrales_plagas', 'registro_aplicaciones'],
        tables: [],
      },
      'Riego': {
        icon: '💧',
        prefixes: ['sistemas_riego', 'riegos_', 'calendario_riego'],
        tables: [],
      },
      'Cosecha': {
        icon: '🍎',
        prefixes: ['cosechas', 'productos_cosecha', 'calidad_postcosecha'],
        tables: [],
      },
      'Inventario': {
        icon: '📦',
        prefixes: ['categorias_insumos', 'insumos', 'movimientos_inventario', 'inv_'],
        tables: [],
      },
      'Finanzas': {
        icon: '💰',
        prefixes: ['cajas_menores', 'categorias_gastos', 'gastos_diarios', 'indicadores_rentabilidad', 'con_distribucion_documentos'],
        tables: [],
      },
      'Compras': {
        icon: '🛒',
        prefixes: ['solicitudes_pedido', 'solicitudes_detalle', 'ordenes_compra', 'compras_'],
        tables: [],
      },
      'Logística': {
        icon: '🚚',
        prefixes: ['transportes', 'despachos'],
        tables: [],
      },
      'Certificaciones': {
        icon: '✅',
        prefixes: ['certificaciones_', 'auditorias_certificacion'],
        tables: [],
      },
      'RRHH & Labores': {
        icon: '👥',
        prefixes: ['rrhh_', 'empleados', 'contratos', 'asistencias', 'cargos', 'departamentos', 'labor_stats', 'labores_diarias'],
        tables: [],
      },
      'Ganado': {
        icon: '🐄',
        prefixes: ['ganado_'],
        tables: [],
      },
      'Acuícola': {
        icon: '🐟',
        prefixes: ['acuicola_'],
        tables: [],
      },
      'Aplicaciones Agrícolas': {
        icon: '🚜',
        prefixes: ['app_', 'lib_fitosanitaria', 'plagas', 'enfermedades', 'control_plagas', 'malezas', 'detecciones_fitosanitarias', 'monitoreo_biologico', 'agentes_biologicos', 'liberaciones_', 'produccion_agentes', 'registro_aplicaciones', 'umbrales_plagas'],
        tables: [],
      },
      'Siembras': {
        icon: '🌱',
        prefixes: ['siembra', 'cultivos', 'variedades', 'calendario_cultivo', 'asociacion_cultivos', 'fenologia_', 'rotaciones_', 'presupuestos_siembra', 'trazabilidad_'],
        tables: [],
      },
      'Agroindustria & Maquinaria': {
        icon: '🏭',
        prefixes: ['agroind_', 'maquinaria', 'vehiculos', 'activos_', 'tipos_activo_', 'ordenes_trabajo_', 'planes_mantenimiento_', 'historial_', 'actividades_', 'detalle_orden_mantenimiento'],
        tables: [],
      },
      'Agua': {
        icon: '🌊',
        prefixes: ['agua_', 'aljibes'],
        tables: [],
      },
      'Ambiente': {
        icon: '🌿',
        prefixes: ['amb_', 'datos_climaticos', 'eventos_climaticos', 'estaciones_meteorologicas'],
        tables: [],
      },
      'Bodegas': {
        icon: '🏗️',
        prefixes: ['bod_', 'basculas', 'app_control_envases'],
        tables: [],
      },
      'Comercialización': {
        icon: '📊',
        prefixes: ['com_', 'productos_cosecha', 'cosechas', 'calidad_postcosecha'],
        tables: [],
      },
      'ATEC': {
        icon: '👨‍🌾',
        prefixes: ['atec_', 'analisis_', 'fertilizaciones', 'riegos_', 'niveles_humedad', 'sistemas_riego', 'calendario_riego', 'planes_fertilizacion'],
        tables: [{ TABLE_NAME: 'atec-dashboard', TABLE_ROWS: 0, TABLE_COMMENT: 'Dashboard Gerencial ATEC' }],
      },
      'Energía': {
        icon: '⚡',
        prefixes: ['energia_'],
        tables: [],
      },
      'Seguros': {
        icon: '🛡️',
        prefixes: ['seg_'],
        tables: [],
      },
      'Forestal': {
        icon: '🌲',
        prefixes: ['forest_'],
        tables: [],
      },
      'Satélite & GPS Tracker': {
        icon: '🛰️',
        prefixes: ['sat_', 'gps_', 'dispositivos_moviles', 'v_sat_', 'calendario_agricola', 'regulaciones_pais', 'capas_geo'],
        tables: [],
      },
      'Laboratorio': {
        icon: '🔬',
        prefixes: ['lab_', 'puntos_muestreo'],
        tables: [],
      },
      'Sistema': {
        icon: '🖥️',
        prefixes: ['sys_', 'log_auditoria', 'auditorias', 'comunicaciones', 'documentos_', 'tenants', 'usuarios', 'sedes', 'fincas', 'nucleos', 'lotes', 'caminos_calles'],
        tables: [],
      },
      'KPIs': {
        icon: '📈',
        prefixes: ['kpis_', 'alertas', 'agri_alerts'],
        tables: [],
      },
      'IA & Tareas': {
        icon: '🤖',
        prefixes: ['configuracion_agente_ia', 'ia_', 'reglas_tareas_', 'tipos_tarea', 'task', 'notificaciones_tareas', 'tareas_programadas'],
        tables: [],
      },
    };

    const assigned = new Set();
    const unassigned = [];

    for (const t of tables) {
      let matched = false;
      for (const [moduleName, group] of Object.entries(moduleGroups)) {
        for (const prefix of group.prefixes) {
          if (t.TABLE_NAME === prefix || t.TABLE_NAME.startsWith(prefix)) {
            group.tables.push(t);
            assigned.add(t.TABLE_NAME);
            matched = true;
            break;
          }
        }
        if (matched) break;
      }
      if (!matched) {
        unassigned.push(t);
      }
    }

    const result = {};
    for (const [name, group] of Object.entries(moduleGroups)) {
      if (group.tables.length > 0) {
        result[name] = {
          icon: group.icon,
          tables: group.tables,
        };
      } else {
        // Ensure empty groups are still represented
        result[name] = { icon: group.icon, tables: [] };
      }
    }
    if (unassigned.length > 0) {
      result['Otro'] = { icon: '📁', tables: unassigned };
    }

    res.json(result);
  } catch (err) {
    console.error('Error grouping modules:', err);
    const msg = err.code || err.message || 'Unknown error';
    res.status(500).json({ error: `Database error: ${msg}` });
  }
});

// GET /api/table/:name/structure — column definitions
router.get('/:name/structure', async (req, res) => {
  try {
    const tableName = req.params.name;

    const [columns] = await getDb(req).query(
      `SELECT COLUMN_NAME, COLUMN_TYPE, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT,
              COLUMN_KEY, EXTRA, CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE,
              COLUMN_COMMENT
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [tableName]
    );

    if (columns.length === 0) {
      return res.status(404).json({ error: `Table ${tableName} not found` });
    }

    const [fks] = await getDb(req).query(
      `SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [tableName]
    );

    const fkMap = {};
    for (const fk of fks) {
      fkMap[fk.COLUMN_NAME] = {
        referencedTable: fk.REFERENCED_TABLE_NAME,
        referencedColumn: fk.REFERENCED_COLUMN_NAME,
      };
    }

    const structure = columns.map((col) => {
      const isPrimaryKey = col.COLUMN_KEY === 'PRI';
      const isAutoIncrement = col.EXTRA === 'auto_increment';
      const isForeignKey = !!fkMap[col.COLUMN_NAME];
      const fkInfo = fkMap[col.COLUMN_NAME] || null;

      let enumValues = null;
      if (col.DATA_TYPE === 'enum') {
        const match = col.COLUMN_TYPE.match(/^enum\((.+)\)$/);
        if (match) {
          enumValues = match[1]
            .split(',')
            .map((v) => v.replace(/^'|'$/g, '').trim());
        }
      }

      let displayType = col.DATA_TYPE;
      if (col.DATA_TYPE === 'tinyint' && col.COLUMN_TYPE === 'tinyint(1)') {
        displayType = 'boolean';
      } else if (['varchar', 'char'].includes(col.DATA_TYPE)) {
        displayType = col.CHARACTER_MAXIMUM_LENGTH > 255 ? 'textarea' : 'text';
      } else if (col.DATA_TYPE === 'text') {
        displayType = 'textarea';
      } else if (col.DATA_TYPE === 'int' || col.DATA_TYPE === 'bigint') {
        displayType = 'number';
      } else if (['decimal', 'float', 'double'].includes(col.DATA_TYPE)) {
        displayType = 'decimal';
      } else if (col.DATA_TYPE === 'date') {
        displayType = 'date';
      } else if (['datetime', 'timestamp'].includes(col.DATA_TYPE)) {
        displayType = 'datetime';
      } else if (col.DATA_TYPE === 'time') {
        displayType = 'time';
      } else if (col.DATA_TYPE === 'json') {
        displayType = 'json';
      }

      return {
        name: col.COLUMN_NAME,
        type: col.DATA_TYPE,
        columnType: col.COLUMN_TYPE,
        displayType,
        isNullable: col.IS_NULLABLE === 'YES',
        defaultValue: col.COLUMN_DEFAULT,
        isPrimaryKey,
        isAutoIncrement,
        isForeignKey,
        referencedTable: fkInfo?.referencedTable || null,
        referencedColumn: fkInfo?.referencedColumn || null,
        enumValues,
        maxLength: col.CHARACTER_MAXIMUM_LENGTH,
        numericPrecision: col.NUMERIC_PRECISION,
        numericScale: col.NUMERIC_SCALE,
        comment: col.COLUMN_COMMENT,
      };
    });

    if (tableName === 'insumos') {
      const targetOrder = ['id_grupo', 'id_subgrupo', 'codigo'];
      structure.sort((a, b) => {
        const indexA = targetOrder.indexOf(a.name);
        const indexB = targetOrder.indexOf(b.name);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return 0; // maintain original relative order otherwise
      });
    }

    res.json({
      tableName,
      columns: structure,
      primaryKey: structure.find((c) => c.isPrimaryKey)?.name || null,
    });
  } catch (err) {
    console.error('Error getting table structure:', err);
    const msg = err.code || err.message || 'Unknown error';
    res.status(500).json({ error: `Database error: ${msg}` });
  }
});

export default router;
