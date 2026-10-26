import { Router } from 'express';
import pool from '../db.js';
import { getDb } from '../utils/db.js';

const router = Router();

function getGlobalDb() {
  return pool;
}

// Custom endpoints for Machinery History with Joins and Filters
router.get('/maquinaria/:id/labores', async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, id_finca, id_lote } = req.query;
    
    let sql = `
      SELECT l.id_labor, l.fecha_planificada, l.categoria, l.descripcion_labor, l.estado,
             e.nombres AS empleado_nombre, e.apellidos AS empleado_apellido,
             lo.nombre AS lote_nombre, lo.codigo AS lote_codigo,
             f.nombre AS finca_nombre,
             c.nombre AS cultivo_nombre
      FROM labores_diarias l
      LEFT JOIN rrhh_empleados e ON l.id_empleado = e.id_empleado
      LEFT JOIN lotes lo ON l.id_lote = lo.id_lote
      LEFT JOIN nucleos n ON lo.id_nucleo = n.id_nucleo
      LEFT JOIN fincas f ON n.id_finca = f.id_finca
      LEFT JOIN siembras s ON lo.id_lote = s.id_lote AND s.estado = 'Activo'
      LEFT JOIN cultivos c ON s.id_cultivo = c.id_cultivo
      WHERE l.id_maquinaria = ? OR l.id_vehiculo = ?
    `;
    const params = [id, id];

    if (startDate && endDate) {
      sql += ' AND l.fecha_planificada BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    if (id_finca) {
      sql += ' AND f.id_finca = ?';
      params.push(id_finca);
    }
    if (id_lote) {
      sql += ' AND l.id_lote = ?';
      params.push(id_lote);
    }

    sql += ' ORDER BY l.fecha_planificada DESC LIMIT 500';

    const [rows] = await getDb(req).query(sql, params);
    res.json({ data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/maquinaria/:id/mantenimientos', async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    
    let sql = `
      SELECT m.*,
             e.nombres AS tecnico_nombre, e.apellidos AS tecnico_apellido
      FROM ordenes_trabajo_mantenimiento m
      LEFT JOIN rrhh_empleados e ON m.id_tecnico_asignado = e.id_empleado
      LEFT JOIN activos_mantenimiento a ON m.id_activo = a.id_activo
      WHERE a.id_maquinaria = ? OR a.id_vehiculo = ?
    `;
    const params = [id, id];

    if (startDate && endDate) {
      sql += ' AND m.fecha_solicitud BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    sql += ' ORDER BY m.fecha_solicitud DESC LIMIT 500';

    const [rows] = await getDb(req).query(sql, params);
    res.json({ data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/mecanicos/:id/labores', async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, id_finca, id_lote } = req.query;
    
    let sql = `
      SELECT l.id_labor, l.fecha_planificada, l.categoria, l.descripcion_labor, l.estado,
             m.marca_modelo AS maquina_nombre, v.placa AS vehiculo_placa,
             lo.nombre AS lote_nombre, lo.codigo AS lote_codigo,
             f.nombre AS finca_nombre,
             c.nombre AS cultivo_nombre
      FROM labores_diarias l
      LEFT JOIN agroind_maquinaria_equipo m ON l.id_maquinaria = m.id_maq_agro
      LEFT JOIN vehiculos v ON l.id_vehiculo = v.id_vehiculo
      LEFT JOIN lotes lo ON l.id_lote = lo.id_lote
      LEFT JOIN nucleos n ON lo.id_nucleo = n.id_nucleo
      LEFT JOIN fincas f ON n.id_finca = f.id_finca
      LEFT JOIN siembras s ON lo.id_lote = s.id_lote AND s.estado = 'Activo'
      LEFT JOIN cultivos c ON s.id_cultivo = c.id_cultivo
      WHERE l.id_empleado = ?
    `;
    const params = [id];

    if (startDate && endDate) {
      sql += ' AND l.fecha_planificada BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    if (id_finca) {
      sql += ' AND f.id_finca = ?';
      params.push(id_finca);
    }
    if (id_lote) {
      sql += ' AND lo.id_lote = ?';
      params.push(id_lote);
    }

    sql += ' ORDER BY l.fecha_planificada DESC LIMIT 500';

    const [rows] = await getDb(req).query(sql, params);
    res.json({ data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/mecanicos/:id/mantenimientos', async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    
    let sql = `
      SELECT m.*,
             a.nombre AS activo_nombre, a.codigo AS activo_codigo, a.estado_operativo
      FROM ordenes_trabajo_mantenimiento m
      LEFT JOIN activos_mantenimiento a ON m.id_activo = a.id_activo
      WHERE m.id_tecnico_asignado = ?
    `;
    const params = [id];

    if (startDate && endDate) {
      sql += ' AND m.fecha_solicitud BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    sql += ' ORDER BY m.fecha_solicitud DESC LIMIT 500';

    const [rows] = await getDb(req).query(sql, params);
    res.json({ data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});


async function getTableMeta(tableName, db = pool) {
  const [cols] = await db.query(
    `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, EXTRA, COLUMN_KEY
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
     ORDER BY ORDINAL_POSITION`,
    [tableName]
  );

  const pkCol = cols.find((c) => c.EXTRA === 'auto_increment' || c.COLUMN_KEY === 'PRI');
  const pk = pkCol ? pkCol.COLUMN_NAME : cols[0]?.COLUMN_NAME;

  const [fks] = await db.query(
    `SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
    [tableName]
  );

  const fkMap = {};
  for (const fk of fks) {
    fkMap[fk.COLUMN_NAME] = {
      referencedTable: fk.REFERENCED_TABLE_NAME,
      referencedColumn: fk.REFERENCED_COLUMN_NAME,
    };
  }

  return { columns: cols, pk, fkMap };
}

function sanitizeColumnValue(val, col) {
  if (val === undefined || val === null) return null;
  const dataType = (col.DATA_TYPE || '').toLowerCase();
  
  if (dataType === 'date' && typeof val === 'string' && val.includes('T')) {
    return val.split('T')[0];
  }
  
  if ((dataType === 'datetime' || dataType === 'timestamp') && typeof val === 'string' && val.includes('T')) {
    return val.replace('T', ' ').split('.')[0].split('Z')[0];
  }
  
  return val;
}

// Convert JSON coords or GeoJSON into Well-Known Text (WKT) for MySQL
function convertToWKT(val, type) {
  if (val === undefined || val === null) return null;
  
  let strVal = val;
  if (typeof val !== 'string') {
    try {
      strVal = JSON.stringify(val);
    } catch (e) {
      return null;
    }
  }
  
  const cleanVal = strVal.trim();
  if (!cleanVal) return null;
  
  const upperVal = cleanVal.toUpperCase();
  if (upperVal.startsWith('POINT') || upperVal.startsWith('POLYGON') || upperVal.startsWith('MULTILINESTRING')) {
    return cleanVal;
  }
  
  try {
    const parsed = JSON.parse(cleanVal);
    const lowerType = type.toLowerCase();
    
    if (lowerType === 'point') {
      if (Array.isArray(parsed)) {
        return `POINT(${parsed[0]} ${parsed[1]})`;
      } else if (parsed.lng !== undefined && parsed.lat !== undefined) {
        return `POINT(${parsed.lng} ${parsed.lat})`;
      } else if (parsed.x !== undefined && parsed.y !== undefined) {
        return `POINT(${parsed.x} ${parsed.y})`;
      }
    } else if (lowerType === 'polygon') {
      let coords = parsed;
      if (parsed.coordinates) {
        coords = parsed.coordinates;
      }
      if (parsed.type === 'Feature' && parsed.geometry) {
        coords = parsed.geometry.coordinates;
      }
      
      if (Array.isArray(coords)) {
        // Handle nested GeoJSON coordinates [[[lng, lat], ...]]
        if (coords.length > 0 && Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
          coords = coords[0];
        }
        
        const points = coords.map(p => `${p[0]} ${p[1]}`);
        if (points.length > 0 && points[0] !== points[points.length - 1]) {
          points.push(points[0]);
        }
        return `POLYGON((${points.join(', ')}))`;
      }
    }
  } catch (err) {
    // If it's a list of coordinates like "[lng lat, lng lat]"
    console.error('[Spatial] Error converting coordinates to JSON:', err.message);
  }
  
  return cleanVal;
}

// Generate the SELECT clause handles spatial fields cleanly via ST_AsText
function getSelectClause(columns) {
  const fields = [];
  const params = [];
  
  for (const col of columns) {
    const isSpatial = ['point', 'polygon', 'geometry', 'linestring', 'multipoint', 'multipolygon', 'multilinestring', 'geometrycollection'].includes(col.DATA_TYPE?.toLowerCase());
    if (isSpatial) {
      fields.push('ST_AsText(??) AS ??');
      params.push(col.COLUMN_NAME, col.COLUMN_NAME);
    } else {
      fields.push('??');
      params.push(col.COLUMN_NAME);
    }
  }
  
  return { fieldsStr: fields.join(', '), selectParams: params };
}

function buildTenantFilter(tableName, columns, query) {
  const { tenantId, fincaId, nucleoId } = query;
  
  if (!tenantId && !fincaId && !nucleoId) {
    return { filterSql: '', filterParams: [] };
  }

  const colNames = columns.map(c => c.COLUMN_NAME || c.name);
  const conditions = [];
  const params = [];

  // Special cases for the hierarchy tables themselves
  if (tableName === 'tenants') {
    if (tenantId) {
      conditions.push('id_tenant = ?');
      params.push(tenantId);
    }
    return { filterSql: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', filterParams: params };
  }
  
  if (tableName === 'fincas') {
    if (fincaId) {
      conditions.push('id_finca = ?');
      params.push(fincaId);
    } else if (tenantId) {
      conditions.push('id_tenant = ?');
      params.push(tenantId);
    }
    return { filterSql: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', filterParams: params };
  }

  if (tableName === 'nucleos') {
    if (nucleoId) {
      conditions.push('id_nucleo = ?');
      params.push(nucleoId);
    } else if (fincaId) {
      conditions.push('id_finca = ?');
      params.push(fincaId);
    } else if (tenantId) {
      conditions.push('id_finca IN (SELECT id_finca FROM fincas WHERE id_tenant = ?)');
      params.push(tenantId);
    }
    return { filterSql: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', filterParams: params };
  }

  if (tableName === 'lotes') {
    if (nucleoId) {
      conditions.push('id_nucleo = ?');
      params.push(nucleoId);
    } else if (fincaId) {
      conditions.push('id_nucleo IN (SELECT id_nucleo FROM nucleos WHERE id_finca = ?)');
      params.push(fincaId);
    } else if (tenantId) {
      conditions.push('id_nucleo IN (SELECT id_nucleo FROM nucleos n JOIN fincas f ON n.id_finca = f.id_finca WHERE f.id_tenant = ?)');
      params.push(tenantId);
    }
    return { filterSql: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', filterParams: params };
  }

  // Generic tables
  if (colNames.includes('id_tenant') && tenantId) {
    conditions.push('id_tenant = ?');
    params.push(tenantId);
  } else if (colNames.includes('id_finca')) {
    if (fincaId) {
      conditions.push('id_finca = ?');
      params.push(fincaId);
    } else if (tenantId) {
      conditions.push('id_finca IN (SELECT id_finca FROM fincas WHERE id_tenant = ?)');
      params.push(tenantId);
    }
  } else if (colNames.includes('id_nucleo')) {
    if (nucleoId) {
      conditions.push('id_nucleo = ?');
      params.push(nucleoId);
    } else if (fincaId) {
      conditions.push('id_nucleo IN (SELECT id_nucleo FROM nucleos WHERE id_finca = ?)');
      params.push(fincaId);
    } else if (tenantId) {
      conditions.push('id_nucleo IN (SELECT id_nucleo FROM nucleos n JOIN fincas f ON n.id_finca = f.id_finca WHERE f.id_tenant = ?)');
      params.push(tenantId);
    }
  } else if (colNames.includes('id_lote')) {
    if (nucleoId) {
      conditions.push('id_lote IN (SELECT id_lote FROM lotes WHERE id_nucleo = ?)');
      params.push(nucleoId);
    } else if (fincaId) {
      conditions.push('id_lote IN (SELECT id_lote FROM lotes l JOIN nucleos n ON l.id_nucleo = n.id_nucleo WHERE n.id_finca = ?)');
      params.push(fincaId);
    } else if (tenantId) {
      conditions.push('id_lote IN (SELECT id_lote FROM lotes l JOIN nucleos n ON l.id_nucleo = n.id_nucleo JOIN fincas f ON n.id_finca = f.id_finca WHERE f.id_tenant = ?)');
      params.push(tenantId);
    }
  } else if (colNames.includes('id_siembra')) {
    if (nucleoId) {
      conditions.push('id_siembra IN (SELECT id_siembra FROM siembras s JOIN lotes l ON s.id_lote = l.id_lote WHERE l.id_nucleo = ?)');
      params.push(nucleoId);
    } else if (fincaId) {
      conditions.push('id_siembra IN (SELECT id_siembra FROM siembras s JOIN lotes l ON s.id_lote = l.id_lote JOIN nucleos n ON l.id_nucleo = n.id_nucleo WHERE n.id_finca = ?)');
      params.push(fincaId);
    } else if (tenantId) {
      conditions.push('id_siembra IN (SELECT id_siembra FROM siembras s JOIN lotes l ON s.id_lote = l.id_lote JOIN nucleos n ON l.id_nucleo = n.id_nucleo JOIN fincas f ON n.id_finca = f.id_finca WHERE f.id_tenant = ?)');
      params.push(tenantId);
    }
  }

  return {
    filterSql: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    filterParams: params
  };
}

function escapeIdSafe(value) {
  return `\`${String(value).replace(/`/g, '``')}\``;
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value) {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function findDuplicateDocumento(tableName, documento, excludeId = null, db = pool) {
  if (tableName !== 'rrhh_empleados') return null;
  if (documento === undefined || documento === null) return null;
  const normalizedDocumento = String(documento).trim();
  if (!normalizedDocumento) return null;

  const { pk } = await getTableMeta(tableName, db);
  let sql = `SELECT ${escapeIdSafe(pk)} AS id_empleado, documento, nombres, apellidos
             FROM ${escapeIdSafe(tableName)}
             WHERE documento = ?`;
  const params = [normalizedDocumento];

  if (excludeId !== undefined && excludeId !== null && excludeId !== '') {
    sql += ` AND ${escapeIdSafe(pk)} <> ?`;
    params.push(excludeId);
  }

  sql += ' LIMIT 1';
  const [rows] = await db.query(sql, params);
  return rows[0] || null;
}

async function getUniqueRules(tableName, db = pool) {
  try {
    const [rows] = await getGlobalDb().query(
      `SELECT id_regla, modulo, tabla, columnas_unicas, columnas_ambito, alcance, mensaje_error, descripcion
       FROM sys_unicidad_reglas
       WHERE tabla = ? AND activo = 1
       ORDER BY id_regla ASC`,
      [tableName]
    );

    return rows.map((row) => ({
      ...row,
      columnas_unicas: parseJsonArray(row.columnas_unicas),
      columnas_ambito: parseJsonArray(row.columnas_ambito),
    }));
  } catch (err) {
    if (String(err.code || '').includes('ER_NO_SUCH_TABLE')) {
      return [];
    }
    throw err;
  }
}

async function checkConfiguredUniqueRules(tableName, body, excludeId = null, db = pool) {
  const { columns, pk } = await getTableMeta(tableName, db);
  const validColumns = new Set(columns.map((c) => c.COLUMN_NAME));
  const rules = await getUniqueRules(tableName, db);

  for (const rule of rules) {
    const ruleColumns = [...(rule.columnas_unicas || []), ...(rule.columnas_ambito || [])];
    if (ruleColumns.length === 0) continue;
    if (!ruleColumns.every((col) => validColumns.has(col))) continue;

    const values = [];
    let skipRule = false;
    for (const col of ruleColumns) {
      if (!(col in body)) {
        skipRule = true;
        break;
      }
      const rawValue = body[col];
      if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') {
        skipRule = true;
        break;
      }
      values.push(String(rawValue).trim());
    }
    if (skipRule) continue;

    const conditions = ruleColumns.map((col) => `${escapeIdSafe(col)} = ?`);
    const params = [...values];

    if (excludeId !== undefined && excludeId !== null && excludeId !== '') {
      conditions.push(`${escapeIdSafe(pk)} <> ?`);
      params.push(excludeId);
    }

    const [rows] = await db.query(
      `SELECT ${escapeIdSafe(pk)} AS id FROM ${escapeIdSafe(tableName)} WHERE ${conditions.join(' AND ')} LIMIT 1`,
      params
    );

    if (rows.length > 0) {
      return {
        exists: true,
        rule,
        record: rows[0],
      };
    }
  }

  return { exists: false, rule: null, record: null };
}

router.get('/:name/unique', async (req, res) => {
  try {
    const tableName = req.params.name;
    const { column, value, excludeId } = req.query;
    const scope = parseJsonObject(req.query.scope);

    if (!column) {
      return res.status(400).json({ error: 'column is required' });
    }
    if (value === undefined || value === null || String(value).trim() === '') {
      return res.json({ exists: false, record: null });
    }

    const { columns, pk } = await getTableMeta(tableName, getDb(req));
    const validColumns = columns.map((c) => c.COLUMN_NAME);
    if (!validColumns.includes(column)) {
      return res.status(400).json({ error: 'Invalid column' });
    }

    const normalizedValue = String(value).trim();
    let sql = `SELECT ${escapeIdSafe(pk)} AS id, ${escapeIdSafe(column)} AS value
               FROM ${escapeIdSafe(tableName)}
               WHERE ${escapeIdSafe(column)} = ?`;
    const params = [normalizedValue];

    for (const [scopeColumn, scopeValue] of Object.entries(scope)) {
      if (!validColumns.includes(scopeColumn)) {
        return res.status(400).json({ error: `Invalid scope column: ${scopeColumn}` });
      }
      if (scopeValue === undefined || scopeValue === null || String(scopeValue).trim() === '') continue;
      sql += ` AND ${escapeIdSafe(scopeColumn)} = ?`;
      params.push(String(scopeValue).trim());
    }

    if (excludeId !== undefined && excludeId !== null && String(excludeId).trim() !== '') {
      sql += ` AND ${escapeIdSafe(pk)} <> ?`;
      params.push(excludeId);
    }

    sql += ' LIMIT 1';
    const [rows] = await getDb(req).query(sql, params);
    res.json({ exists: rows.length > 0, record: rows[0] || null });
  } catch (err) {
    console.error('Error checking uniqueness:', err);
    const msg = err.code || err.message || 'Unknown error';
    res.status(500).json({ error: `Database error: ${msg}` });
  }
});

router.get('/unicidad/reglas', async (req, res) => {
  try {
    const { tabla = '' } = req.query;
    const sql = tabla
      ? `SELECT id_regla, modulo, tabla, columnas_unicas, columnas_ambito, alcance, activo, mensaje_error, descripcion, created_at, updated_at
         FROM sys_unicidad_reglas
         WHERE tabla = ?
         ORDER BY id_regla ASC`
      : `SELECT id_regla, modulo, tabla, columnas_unicas, columnas_ambito, alcance, activo, mensaje_error, descripcion, created_at, updated_at
         FROM sys_unicidad_reglas
         ORDER BY tabla ASC, id_regla ASC`;
    const params = tabla ? [tabla] : [];
    const [rows] = await getGlobalDb().query(sql, params);
    res.json({
      data: rows.map((row) => ({
        ...row,
        columnas_unicas: parseJsonArray(row.columnas_unicas),
        columnas_ambito: parseJsonArray(row.columnas_ambito),
      })),
    });
  } catch (err) {
    console.error('Error fetching uniqueness rules:', err);
    if (String(err.code || '').includes('ER_NO_SUCH_TABLE')) {
      return res.json({ data: [] });
    }
    res.status(500).json({ error: err.message || 'Error fetching uniqueness rules' });
  }
});

// GET /api/table/:name/data
router.get('/:name/data', async (req, res) => {
  try {
    const tableName = req.params.name;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(25000, Math.max(1, parseInt(req.query.pageSize) || 20));
    const search = req.query.search || '';
    const sortColumn = req.query.sortColumn || '';
    const sortDirection = (req.query.sortDirection || 'ASC').toUpperCase();

    const { columns, pk, fkMap } = await getTableMeta(tableName, getDb(req));

    const validColumns = columns.map((c) => c.COLUMN_NAME);
    const safeSortCol = validColumns.includes(sortColumn) ? sortColumn : pk;
    const safeSortDir = ['ASC', 'DESC'].includes(sortDirection) ? sortDirection : 'ASC';

    let searchWhereClause = '';
    const searchParams = [];
    if (search) {
      if (tableName === 'insumos') {
        const searchTerm = `%${search}%`;
        searchWhereClause = `WHERE (
          CAST(codigo AS CHAR) LIKE ? OR
          CAST(nombre AS CHAR) LIKE ? OR
          CAST(descripcion_corta AS CHAR) LIKE ? OR
          id_grupo IN (SELECT id_grupo FROM inv_grupos WHERE nombre LIKE ?) OR
          id_subgrupo IN (SELECT id_subgrupo FROM inv_subgrupos WHERE nombre LIKE ?)
        )`;
        searchParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      } else {
        const textColumns = columns.filter(
          (c) => ['varchar', 'char', 'text', 'mediumtext', 'longtext', 'int', 'bigint', 'decimal', 'float', 'double', 'date', 'datetime', 'timestamp'].includes(c.DATA_TYPE)
        );
        if (textColumns.length > 0) {
          const conditions = textColumns.map(() => `CAST(?? AS CHAR) LIKE ?`);
          searchWhereClause = `WHERE ${conditions.join(' OR ')}`;
          const searchTerm = `%${search}%`;
          for (let i = 0; i < textColumns.length; i++) {
            searchParams.push(textColumns[i].COLUMN_NAME);
            searchParams.push(searchTerm);
          }
        }
      }
    }

    // Apply multi-tenant filters
    const { filterSql, filterParams } = buildTenantFilter(tableName, columns, req.query);

    // Combine WHERE clauses
    let finalWhereClause = '';
    const finalParams = [];

    if (filterSql && searchWhereClause) {
      const filterCond = filterSql.replace('WHERE', '').trim();
      const searchCond = searchWhereClause.replace('WHERE', '').trim();
      finalWhereClause = `WHERE (${filterCond}) AND (${searchCond})`;
      finalParams.push(...filterParams, ...searchParams);
    } else if (filterSql) {
      finalWhereClause = filterSql;
      finalParams.push(...filterParams);
    } else if (searchWhereClause) {
      finalWhereClause = searchWhereClause;
      finalParams.push(...searchParams);
    }

    // Append custom dropdown filters for Finca and Date Range
    const { filterFinca, filterDateFrom, filterDateTo } = req.query;

    if (filterFinca) {
      if (validColumns.includes('id_finca')) {
        finalWhereClause = finalWhereClause ? finalWhereClause + ' AND id_finca = ?' : 'WHERE id_finca = ?';
        finalParams.push(filterFinca);
      }
    }

    if (filterDateFrom || filterDateTo) {
      // Find the first date-like column
      const dateCol = columns.find(c => ['date', 'datetime', 'timestamp'].includes(c.DATA_TYPE?.toLowerCase()));
      if (dateCol) {
        if (filterDateFrom) {
          finalWhereClause = finalWhereClause ? finalWhereClause + ` AND ${pool.escapeId(dateCol.COLUMN_NAME)} >= ?` : `WHERE ${pool.escapeId(dateCol.COLUMN_NAME)} >= ?`;
          finalParams.push(filterDateFrom);
        }
        if (filterDateTo) {
          finalWhereClause = finalWhereClause ? finalWhereClause + ` AND ${pool.escapeId(dateCol.COLUMN_NAME)} <= ?` : `WHERE ${pool.escapeId(dateCol.COLUMN_NAME)} <= ?`;
          // Append 23:59:59 if it's a date string
          const toDateStr = filterDateTo.includes('T') || filterDateTo.includes(' ') ? filterDateTo : `${filterDateTo} 23:59:59`;
          finalParams.push(toDateStr);
        }
      }
    }

    // Append custom dropdown filters for insumos
    if (tableName === 'insumos') {
      const { filterGrupo, filterSubgrupo } = req.query;
      if (filterGrupo) {
        if (finalWhereClause) {
          finalWhereClause += ' AND id_grupo = ?';
        } else {
          finalWhereClause = 'WHERE id_grupo = ?';
        }
        finalParams.push(filterGrupo);
      }
      if (filterSubgrupo) {
        if (finalWhereClause) {
          finalWhereClause += ' AND id_subgrupo = ?';
        } else {
          finalWhereClause = 'WHERE id_subgrupo = ?';
        }
        finalParams.push(filterSubgrupo);
      }
    }

    // Get Total Count for Pagination
    const [countResult] = await getDb(req).query(
      `SELECT COUNT(*) as total FROM ?? ${finalWhereClause}`,
      [tableName, ...finalParams]
    );
    const total = countResult[0].total;

    const offset = (page - 1) * pageSize;
    const { fieldsStr, selectParams } = getSelectClause(columns);
    
    const [rows] = await getDb(req).query(
      `SELECT ${fieldsStr} FROM ?? ${finalWhereClause} ORDER BY ?? ${safeSortDir} LIMIT ? OFFSET ?`,
      [...selectParams, tableName, ...finalParams, safeSortCol, pageSize, offset]
    );

    res.json({
      data: rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    console.error('Error fetching data:', err);
    const msg = err.code || err.message || 'Unknown error';
    res.status(500).json({ error: `Database error: ${msg}` });
  }
});

// POST /api/table/:name/data
router.post('/:name/data', async (req, res) => {
  try {
    const tableName = req.params.name;
    const { columns, pk } = await getTableMeta(tableName, getDb(req));

    const uniquenessCheck = await checkConfiguredUniqueRules(tableName, req.body, null, getDb(req));

    if (tableName === 'bod_bodegas') {
      if (!req.body.id_finca || String(req.body.id_finca).trim() === '' || String(req.body.id_finca) === 'null') {
        return res.status(400).json({ error: 'Debe seleccionar una Finca obligatoriamente para crear una bodega.' });
      }
    }

    if (uniquenessCheck.exists) {
      return res.status(409).json({
        error: uniquenessCheck.rule?.mensaje_error || 'El registro ya existe y viola una regla de unicidad.',
        rule: {
          tabla: uniquenessCheck.rule?.tabla,
          modulo: uniquenessCheck.rule?.modulo,
          columnas_unicas: uniquenessCheck.rule?.columnas_unicas,
          columnas_ambito: uniquenessCheck.rule?.columnas_ambito,
          alcance: uniquenessCheck.rule?.alcance,
        }
      });
    }

    const autoIncCols = columns.filter((c) => c.EXTRA === 'auto_increment').map((c) => c.COLUMN_NAME);

    const fields = [];
    const placeholders = [];
    const params = [];

    for (const col of columns) {
      if (autoIncCols.includes(col.COLUMN_NAME)) continue;
      if (!(col.COLUMN_NAME in req.body)) continue;
      
      const isSpatial = ['point', 'polygon', 'geometry', 'linestring'].includes(col.DATA_TYPE?.toLowerCase());
      
      if (req.body[col.COLUMN_NAME] === null || req.body[col.COLUMN_NAME] === undefined || req.body[col.COLUMN_NAME] === '') {
        if (col.IS_NULLABLE === 'YES') {
          fields.push(pool.escapeId(col.COLUMN_NAME));
          placeholders.push('NULL');
        }
        continue;
      }
      
      fields.push(pool.escapeId(col.COLUMN_NAME));
      
      if (isSpatial) {
        placeholders.push('ST_GeomFromText(?)');
        params.push(convertToWKT(req.body[col.COLUMN_NAME], col.DATA_TYPE));
      } else {
        placeholders.push('?');
        params.push(sanitizeColumnValue(req.body[col.COLUMN_NAME], col));
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields provided for insert' });
    }

    const sql = `INSERT INTO ${pool.escapeId(tableName)} (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
    const [result] = await getDb(req).query(sql, params);

    const insertId = result.insertId;
    let newRecord;
    if (insertId) {
      const { fieldsStr, selectParams } = getSelectClause(columns);
      const [rows] = await getDb(req).query(
        `SELECT ${fieldsStr} FROM ?? WHERE ?? = ?`, 
        [...selectParams, tableName, pk, insertId]
      );
      newRecord = rows[0];
    } else {
      newRecord = { inserted: true, affectedRows: result.affectedRows };
    }

    // TRIGGER PARA CARTERA AUTOMATICA AL REGISTRAR FACTURAS (COMPRAS O VENTAS A CREDITO)
    if (tableName === 'documentos_comerciales' && insertId && newRecord) {
      const tipoPago = newRecord.tipo_pago;
      if (tipoPago === 'Credito' || tipoPago === 'Mixto') {
        const montoTotal = Number(newRecord.total || 0);
        const idTercero = newRecord.id_tercero;
        try {
          const [tRows] = await getDb(req).query('SELECT es_proveedor, es_cliente FROM terceros WHERE id_tercero = ?', [idTercero]);
          const esProveedor = tRows[0]?.es_proveedor === 1;
            
          if (esProveedor) {
            await getDb(req).query('INSERT INTO cartera_cxp (id_documento, saldo_pendiente, estado) VALUES (?, ?, "Vigente")', [insertId, montoTotal]);
          } else {
            await getDb(req).query('INSERT INTO cartera_cxc (id_documento, saldo_pendiente, estado) VALUES (?, ?, "Vigente")', [insertId, montoTotal]);
          }
        } catch(e) {
          console.error("Error creando cartera automatica: ", e);
        }
      }
    }

    res.json({ success: true, data: newRecord });
    } catch (err) {
    console.error('Error inserting data:', err);
    let msg = err.code || err.message || 'Unknown error';
    if (err.code === 'ER_DUP_ENTRY') {
      msg = 'El registro ya existe. Verifica que no haya documentos o códigos duplicados.';
      return res.status(409).json({ error: msg });
    }
    res.status(500).json({ error: msg });
  }
});

// PUT /api/table/:name/data/:id
router.put('/:name/data/:id', async (req, res) => {
  try {
    const tableName = req.params.name;
    const id = req.params.id;
    const { columns, pk } = await getTableMeta(tableName, getDb(req));

    if (tableName === 'bod_bodegas') {
      if (!req.body.id_finca || String(req.body.id_finca).trim() === '' || String(req.body.id_finca) === 'null') {
        return res.status(400).json({ error: 'Debe seleccionar una Finca obligatoriamente para esta bodega.' });
      }
    }

    const uniquenessCheck = await checkConfiguredUniqueRules(tableName, req.body, id, getDb(req));
    if (uniquenessCheck.exists) {
      return res.status(409).json({
        error: uniquenessCheck.rule?.mensaje_error || 'El registro ya existe y viola una regla de unicidad.',
        rule: {
          tabla: uniquenessCheck.rule?.tabla,
          modulo: uniquenessCheck.rule?.modulo,
          columnas_unicas: uniquenessCheck.rule?.columnas_unicas,
          columnas_ambito: uniquenessCheck.rule?.columnas_ambito,
          alcance: uniquenessCheck.rule?.alcance,
        }
      });
    }

    const setClauses = [];
    const params = [];

    for (const col of columns) {
      if (col.COLUMN_NAME === pk && columns.find((c) => c.EXTRA === 'auto_increment')?.COLUMN_NAME === pk) continue;
      if (!(col.COLUMN_NAME in req.body)) continue;
      
      const isSpatial = ['point', 'polygon', 'geometry', 'linestring'].includes(col.DATA_TYPE?.toLowerCase());
      
      if (isSpatial) {
        if (req.body[col.COLUMN_NAME] === null || req.body[col.COLUMN_NAME] === undefined || req.body[col.COLUMN_NAME] === '') {
          if (col.IS_NULLABLE === 'YES') {
            setClauses.push('?? = NULL');
            params.push(col.COLUMN_NAME);
          }
        } else {
          setClauses.push('?? = ST_GeomFromText(?)');
          params.push(col.COLUMN_NAME);
          params.push(convertToWKT(req.body[col.COLUMN_NAME], col.DATA_TYPE));
        }
      } else {
        setClauses.push('?? = ?');
        params.push(col.COLUMN_NAME);
        params.push(sanitizeColumnValue(req.body[col.COLUMN_NAME], col));
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No fields provided for update' });
    }

    params.push(pk);
    params.push(id);
    const sql = `UPDATE ?? SET ${setClauses.join(', ')} WHERE ?? = ?`;
    const [result] = await getDb(req).query(sql, [tableName, ...params]);

    const { fieldsStr, selectParams } = getSelectClause(columns);
    const [rows] = await getDb(req).query(
      `SELECT ${fieldsStr} FROM ?? WHERE ?? = ?`, 
      [...selectParams, tableName, pk, id]
    );

    res.json({ success: true, data: rows[0], affectedRows: result.affectedRows });
    } catch (err) {
    console.error('Error updating data:', err);
    let msg = err.code || err.message || 'Unknown error';
    if (err.code === 'ER_DUP_ENTRY') {
      msg = 'El registro ya existe. Verifica que no haya documentos o códigos duplicados.';
      return res.status(409).json({ error: msg });
    }
    res.status(500).json({ error: msg });
  }
});

// DELETE /api/table/:name/data/:id
router.delete('/:name/data/:id', async (req, res) => {
  try {
    const tableName = req.params.name;
    const id = req.params.id;
    const { pk } = await getTableMeta(tableName, getDb(req));

    const [result] = await getDb(req).query(`DELETE FROM ?? WHERE ?? = ?`, [tableName, pk, id]);

    res.json({ success: true, affectedRows: result.affectedRows });
  } catch (err) {
    console.error('Error deleting data:', err);
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ error: 'No se puede eliminar porque este registro tiene movimientos o historiales vinculados.' });
    }
    const msg = err.code || err.message || 'Unknown error';
    res.status(500).json({ error: `Database error: ${msg}` });
  }
});

// GET /api/table/:name/lookup/:fkCol
router.get('/:name/lookup/:fkCol', async (req, res) => {
  try {
    const tableName = req.params.name;
    const fkCol = req.params.fkCol;

    const [fks] = await getDb(req).query(
      `SELECT REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [tableName, fkCol]
    );

    if (fks.length === 0) {
      return res.status(404).json({ error: `No FK found for column ${fkCol}` });
    }

    const refTable = fks[0].REFERENCED_TABLE_NAME;
    const refCol = fks[0].REFERENCED_COLUMN_NAME;

    const [refCols] = await getDb(req).query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND DATA_TYPE IN ('varchar', 'char', 'text', 'mediumtext', 'longtext')`,
      [refTable]
    );

    let displayCol = refCol;
    let isRawSql = false;

    // Custom logic for tables without good descriptive columns
    if (refTable === 'siembras' || refTable === 'acuicola_siembras') {
      displayCol = `CONCAT('Siembra #', id_siembra, ' - ', DATE_FORMAT(fecha_siembra, '%Y-%m-%d'))`;
      isRawSql = true;
    } else if (refTable === 'vehiculos') {
      displayCol = `CONCAT(placa, ' - ', TRIM(CONCAT(IFNULL(marca, ''), ' ', IFNULL(modelo, ''))))`;
      isRawSql = true;
    } else if (refTable === 'maquinaria') {
      displayCol = `CONCAT(codigo, ' - ', nombre, IF(NULLIF(TRIM(CONCAT(IFNULL(marca, ''), ' ', IFNULL(modelo, ''))), '') IS NOT NULL, CONCAT(' (', TRIM(CONCAT(IFNULL(marca, ''), ' ', IFNULL(modelo, ''))), ')'), ''))`;
      isRawSql = true;
    } else if (refTable === 'agroind_maquinaria_equipo') {
      displayCol = `CONCAT(IFNULL(placa, 'S/P'), ' - ', marca_modelo)`;
      isRawSql = true;
    } else if (refTable === 'ordenes_compra') {
      displayCol = `CONCAT(IFNULL(numero_orden, CONCAT('OC #', id_orden_compra)), ' - ', DATE_FORMAT(fecha_emision, '%Y-%m-%d'))`;
      isRawSql = true;
    } else if (refTable === 'plan_contable') {
      displayCol = `CONCAT(codigo, ' - ', nombre)`;
      isRawSql = true;
    } else if (refTable === 'cosechas') {
      displayCol = `CONCAT('Cosecha #', id_cosecha, ' - ', DATE_FORMAT(fecha_cosecha, '%Y-%m-%d'))`;
      isRawSql = true;
    } else if (refTable === 'empleados') {
      displayCol = `CONCAT(nombres, ' ', IFNULL(apellidos, ''))`;
      isRawSql = true;
    } else if (['plagas', 'enfermedades', 'malezas'].includes(refTable)) {
      displayCol = `CONCAT(nombre_comun, ' (', nombre_cientifico, ')')`;
      isRawSql = true;
    } else if (refCols.length > 0) {
      const colNames = refCols.map(c => c.COLUMN_NAME.toLowerCase());
      const prioritizedNames = ['nombre_completo', 'razon_social', 'nombre', 'descripcion', 'titulo', 'codigo'];
      
      let found = false;
      for (const p of prioritizedNames) {
        const match = colNames.find(c => c === p || c.includes(p));
        if (match) {
          displayCol = refCols.find(c => c.COLUMN_NAME.toLowerCase() === match).COLUMN_NAME;
          found = true;
          break;
        }
      }
      if (!found) {
        displayCol = refCols[0].COLUMN_NAME;
      }
    } else {
      displayCol = `CONCAT('ID: ', ${refCol})`;
      isRawSql = true;
    }

    // Fetch column metadata of referenced table to apply tenant filtering
    const [refMetaCols] = await getDb(req).query(
      `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [refTable]
    );
    const mappedCols = refMetaCols.map(c => ({ COLUMN_NAME: c.COLUMN_NAME, DATA_TYPE: c.DATA_TYPE }));
    const { filterSql, filterParams } = buildTenantFilter(refTable, mappedCols, req.query);

    const displaySelect = isRawSql ? displayCol : '??';
    let sql = `SELECT ?? as id, ${displaySelect} as display, ??.* FROM ?? ${filterSql} ORDER BY 2 LIMIT 25000`;
    let queryParams = [refCol];
    if (!isRawSql) queryParams.push(displayCol);
    queryParams.push(refTable, refTable, ...filterParams);

    if (refTable === 'gen_municipios') {
      sql = `SELECT codigo_dane as id, CONCAT(codigo_dane, ' - ', municipio, ', ', departamento) as display, CONCAT(municipio, ', ', departamento) as short_display, ??.* FROM ?? ${filterSql} ORDER BY departamento, municipio LIMIT 15000`;
      queryParams = [refTable, refTable, ...filterParams];
    } else if (refTable === 'gen_tipos_documento' || refTable === 'gen_regimen_fiscal') {
      sql = `SELECT codigo as id, CONCAT(codigo, ' - ', descripcion) as display, descripcion as short_display, ??.* FROM ?? ${filterSql} ORDER BY codigo LIMIT 15000`;
      queryParams = [refTable, refTable, ...filterParams];
    } else if (refTable === 'terceros') {
      sql = `SELECT id_tercero as id, CONCAT(documento, ' - ', nombre_completo) as display, nombre_completo as short_display, ??.* FROM ?? ${filterSql} ORDER BY nombre_completo LIMIT 500`;
      queryParams = [refTable, refTable, ...filterParams];
    } else if (refTable === 'rrhh_cargos') {
      sql = `SELECT id_cargo as id, CONCAT(codigo, ' - ', descripcion) as display, descripcion as short_display, ??.* FROM ?? ${filterSql} ORDER BY descripcion LIMIT 15000`;
      queryParams = [refTable, refTable, ...filterParams];
    } else if (refTable === 'rrhh_empleados') {
      sql = `SELECT id_empleado as id, CONCAT(IFNULL(documento, ''), ' - ', IFNULL(nombres, ''), ' ', IFNULL(apellidos, '')) as display, CONCAT(IFNULL(nombres, ''), ' ', IFNULL(apellidos, '')) as short_display, ??.* FROM ?? ${filterSql} ORDER BY nombres LIMIT 15000`;
      queryParams = [refTable, refTable, ...filterParams];
    }

    const [rows] = await getDb(req).query(sql, queryParams);

    res.json({ table: refTable, idColumn: refCol, displayColumn: displayCol, options: rows });
  } catch (err) {
    console.error('Error fetching FK lookup:', err);
    const msg = err.code || err.message || 'Unknown error';
    res.status(500).json({ error: `Database error: ${msg}` });
  }
});
// GET /api/table/insumos/next-code
router.get('/insumos/next-code', async (req, res) => {
  try {
    const { grupo, subgrupo } = req.query;
    if (!grupo || !subgrupo) {
      return res.status(400).json({ error: 'Grupo and Subgrupo required' });
    }
    const [gRes] = await getDb(req).query('SELECT codigo FROM inv_grupos WHERE id_grupo = ?', [grupo]);
    const [sRes] = await getDb(req).query('SELECT codigo FROM inv_subgrupos WHERE id_subgrupo = ?', [subgrupo]);
    if (!gRes.length || !sRes.length) {
      return res.status(404).json({ error: 'Grupo or Subgrupo not found' });
    }
    const codG = gRes[0].codigo;
    const codS = sRes[0].codigo;
    const prefix = `${codG}-${codS}-`;
    
    // We could use count, but to be safe against deletions, let's parse the max existing code
    const [maxRes] = await getDb(req).query('SELECT codigo FROM insumos WHERE id_grupo = ? AND id_subgrupo = ? ORDER BY codigo DESC LIMIT 1', [grupo, subgrupo]);
    
    let nextNum = 1;
    if (maxRes.length > 0 && maxRes[0].codigo) {
      const parts = maxRes[0].codigo.split('-');
      if (parts.length === 3) {
        const lastNum = parseInt(parts[2], 10);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
      }
    }
    
    const consec = String(nextNum).padStart(3, '0');
    res.json({ nextCode: `${prefix}${consec}` });
  } catch (err) {
    console.error('Error generating code:', err);
    res.status(500).json({ error: 'Database error generating code' });
  }
});

export default router;

// Trigger backend restart
