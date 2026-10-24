import 'dotenv/config';
import path from 'path';
import logoRouter from './routes/logoPath.js';
import express from 'express';
import compression from 'compression';
import cors from 'cors';
import basculasRouter from './routes/basculas.js';
import tablesRouter from './routes/tables.js';
import crudRouter from './routes/crud.js';
import satelliteRouter from './routes/satellite.js';
import trackingRouter from './routes/tracking.js';
import agronomyRouter from './routes/agronomy.js';
import atecRouter from './routes/atec.js';
import laboresRouter from './routes/labores.js';
import semilleroRouter from './routes/semillero.js';
import nominaRouter from './routes/nomina.js';
import tasksRouter from './routes/tasks.js';
import biofabricaRouter from './routes/biofabrica.js';
import dashboardSateliteRouter from './routes/dashboard_satelite.js';
import dashboardCultivosRouter from './routes/dashboard_cultivos.js';
import gisRouter from './routes/gis.js';
import climaRouter from './routes/clima.js';
import rrhhRouter from './routes/rrhh.js';
import dashboardGerenciaRouter from './routes/dashboard_gerencia.js';
import bodegasAvanzadoRoutes from './routes/bodegas_avanzado.js';
import cuadrillaRouter from './routes/cuadrilla.js';
import rrhhCuadrillasRouter from './routes/rrhh_cuadrillas.js';
import reportsRouter from './routes/reports.js';
import trasladosRouter from './routes/traslados.js';
import configRouter from './routes/config.js';
import tomasFisicasRouter from './routes/tomas_fisicas.js';
import pedidosInternosRouter from './routes/pedidos_internos.js';
import custodiaRepuestosRouter from './routes/custodia_repuestos.js';
import tallerRouter from './routes/taller.js';
import tallerPreliquidacionRouter from './routes/taller_preliquidacion.js';
import comercializacionRouter from './routes/comercializacion.js';
import cosechasRouter from './routes/cosechas.js';
import cosechasDetalleRouter from './routes/cosechasDetalle.js';
import cultivosRouter from './routes/cultivos.js';
import cosechasAuditoriaRouter from './routes/cosechasAuditoria.js';
import produccionRouter from './routes/produccion.js';
import usuariosPermisosRouter from './routes/usuarios_permisos.js';
import radarMaquinariaRouter from './routes/radar_maquinaria.js';
import { authMiddleware, tenantPoolMiddleware } from './utils/auth.js';
import { logger, initSentry, loggerMiddleware } from './utils/logger.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { startBackupCron } from './jobs/backup.js';

const app = express();

initSentry(app);
startBackupCron();

const auth = [authMiddleware, tenantPoolMiddleware];

// ============================================================================
// ESCUDOS DE SEGURIDAD Y BLINDAJE INDUSTRIAL (NIVEL 3)
// ============================================================================
app.use(helmet({
  hidePoweredBy: true,
  noSniff: true,
  frameguard: { action: 'deny' }, // Anti-clickjacking / iframing
  xssFilter: true,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Marca de agua y aviso legal de derechos de autor en cabeceras HTTP de respuesta
app.use((req, res, next) => {
  res.setHeader('X-Software-Notice', 'AgroPaccioli (C) 2026. All rights reserved. Protected under Colombian Law 23 of 1982 and Andean Decision 351.');
  next();
});

// HONEYPOT: Atrapa y bloquea bots o piratas que intentan escanear rutas vulnerables
const honeypotPaths = ['/wp-login.php', '/wp-admin', '/.env', '/admin/dump-db', '/api/backup/download'];
honeypotPaths.forEach(path => {
  app.all(path, (req, res) => {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.warn(`[SECURITY ALERT] Honeypot activado desde IP ${clientIp} intentando acceder a ruta protegida ${path}`);
    res.status(403).json({ error: 'Access Denied by AgroPaccioli Security Shield' });
  });
});

// Endpoint de verificación y certificación de titularidad intelectual
app.get('/api/security/verification', (req, res) => {
  res.json({
    software: 'AgroPaccioli ERP Enterprise',
    version: '3.8.0-Hardened',
    titular: 'AgroPaccioli S.A.S.',
    pais: 'Colombia',
    normativa: 'Ley 23 de 1982 & Decision Andina 351',
    hash_certificacion: 'SHA256:7b9f84a1e94d2c8015cf68d29b139045ea79168f12d5e305e4c62b719468e21a',
    estado_licencia: 'Propiedad Privada Registrada'
  });
});

// Bloquea IPs que hagan más de 500 peticiones en 15 minutos (Anti-DDoS y Anti-Scraping)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Demasiadas peticiones desde esta IP. Bloqueo temporal por seguridad.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(compression());

// Endpoint de semilla protegido (solo administradores autenticados)
app.get('/api/public-seed-cosechas', authMiddleware, tenantPoolMiddleware, async (req, res) => {
  try {
    const db = pool;
    const [estanques] = await db.query("SELECT * FROM acuicola_estanques WHERE id_tenant = 1 LIMIT 5");
    const [especies] = await db.query("SELECT * FROM acuicola_especies WHERE id_tenant = 1 LIMIT 3");
    if(estanques.length === 0 || especies.length === 0) return res.json({ msg: 'Faltan estanques/especies' });
    const [siembrasExistentes] = await db.query("SELECT * FROM acuicola_siembras WHERE estado = 'Activo' AND id_tenant = 1");
    if (siembrasExistentes.length >= 3) return res.json({ msg: 'Ya existen siembras activas', inserted: 0 });
    let inserted = 0;
    for (let i = 0; i < Math.min(4, estanques.length); i++) {
      const q = `INSERT INTO acuicola_siembras (id_tenant, id_estanque, id_especie_acui, fecha_siembra, cantidad_alevines, peso_promedio_ingreso_g, estado, notas) VALUES (1, ?, ?, DATE_SUB(NOW(), INTERVAL 180 DAY), ?, 5, 'Activo', 'Siembra demo de auditoría')`;
      await db.query(q, [estanques[i].id_estanque, especies[i % especies.length].id_especie_acui, 5000 + (i * 1000)]);
      inserted++;
    }
    res.json({ msg: 'Seed completado', inserted });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.use('/api/cosechas', authMiddleware, tenantPoolMiddleware, cosechasRouter);
app.use('/api/cosechas', authMiddleware, tenantPoolMiddleware, cosechasDetalleRouter);
app.use('/api/cosechas', auth, cosechasAuditoriaRouter);

import aiRouter from './routes/ai_diagnosis.js';
import whatsappRoutes from './routes/whatsapp.js';
import reportesInventarioRouter from './routes/reportes-inventario.js';
import { connectToWhatsApp } from './services/whatsappService.js';
import authRouter from './routes/auth.js';
import sistemasRouter from './routes/sistemas.js';

import parametrosRoutes from './routes/parametros.js';
import gerenciaGlobalRouter from './routes/dashboardGerenciaGlobal.js';
import dashboardFincaAuditoriaRouter from './routes/dashboardFincaAuditoria.js';
import contabilidadRouter from './routes/contabilidad.js';
import municipiosRouter from './routes/municipios.js';
import carteraRouter from './routes/cartera.js';
import comprasRouter from './routes/compras.js';
import tercerosStatsRouter from './routes/terceros_stats.js';
import kardexRouter from './routes/kardex.js';
import applicationsRouter from './routes/applications.js';
import aplicacionesAuxRouter from './routes/aplicaciones_aux.js';
import aplicacionesReportesRouter from './routes/aplicaciones_reportes.js';
import auditoriaRouter from './routes/auditoria.js';
import finanzasAgroRouter from './routes/finanzas_agro.js';
import dianRouter from './routes/dian.js';
import estadosFinancierosRouter from './routes/estados_financieros.js';
import recetasRouter from './routes/recetas.js';
import erpBridgeRouter from './routes/erp_bridge.js';
import acuicolaRouter from './routes/acuicola.js';
import waterRouter from './routes/water.js';
import ganadoAvanzadoRouter from './routes/ganado_avanzado.js';
import ganadoHerramientasRouter from './routes/ganado_herramientas.js';
import ganadoReproduccionRouter from './routes/ganado_reproduccion.js';
import acuicolaHerramientasRouter from './routes/acuicola_herramientas.js';
import acuicolaProgramadorRouter from './routes/acuicola_programador.js';
import acuicolaMolinoRouter from './routes/acuicola_molino.js';
import acuicolaCosechasMobileRouter from './routes/acuicola_cosechas_mobile.js';
import syncRouter from './routes/sync.js';
import suelosRouter from './routes/suelos.js';
import sensoresRouter from './routes/sensores.js';
import riegoPrecisionRouter from './routes/riego_precision.js';
import vraPrescripcionRouter from './routes/vra_prescripcion.js';
import rendimientoRouter from './routes/rendimiento.js';
import dronesRouter from './routes/drones.js';
import pool from './db.js';


const PORT = Number(process.env.PORT || 3002);

app.use(cors());
app.use(loggerMiddleware); // <--- INYECTAMOS EL LOGGER AQUÍ
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Public auth routes (no middleware)
app.use('/api/auth', apiLimiter, authRouter);

// Health check (public)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protected routes - all require authentication + tenant pool
// Aplicamos un rate limit un poco más estricto a las rutas generales de API
app.use('/api/', apiLimiter);

app.use('/api/basculas', auth, basculasRouter);
app.use('/api/tables', auth, tablesRouter);
app.use('/api/whatsapp', auth, whatsappRoutes);
app.use('/api/table', auth, crudRouter);
app.use('/api/biofabrica', auth, biofabricaRouter);
app.use('/api/ai', auth, aiRouter);
app.use('/api/ai-diagnosis', auth, aiRouter);
app.use('/api/recetas', auth, recetasRouter);
app.use('/api/pedidos_internos', auth, pedidosInternosRouter);
app.use('/api/gis', auth, gisRouter);
app.use('/api/dashboard-satelite', auth, dashboardSateliteRouter);
app.use('/api/dashboard-cultivos', auth, dashboardCultivosRouter);
app.use('/api/dashboard-gerencia', auth, dashboardGerenciaRouter);
app.use('/api/tracking', auth, trackingRouter);
app.use('/api/agronomy', auth, agronomyRouter);
app.use('/api/atec', auth, atecRouter);
app.use('/api/clima', auth, climaRouter);
app.use('/api/labores', auth, laboresRouter);
app.use('/api/semillero', auth, semilleroRouter);
app.use('/api/nomina', auth, nominaRouter);
app.use('/api/tasks', auth, tasksRouter);
app.use('/api/sistemas/dashboard-alta-gerencia', auth, gerenciaGlobalRouter);
app.use('/api/sistemas/dashboard-finca-auditoria', auth, dashboardFincaAuditoriaRouter);
app.use('/api/rrhh', auth, rrhhRouter);
app.use('/api/satellite', auth, satelliteRouter);
app.use('/api/suelos', auth, suelosRouter);
app.use('/api/inventario', auth, bodegasAvanzadoRoutes);
app.use('/api/cuadrilla', auth, cuadrillaRouter);
app.use('/api/catalogo-cuadrillas', rrhhCuadrillasRouter);
app.use('/api/reportes', auth, reportsRouter);
// app.use('/api/notificaciones', auth, notificacionesRouter);
app.use('/api/usuarios-permisos', auth, usuariosPermisosRouter);
app.use('/api/traslados', auth, trasladosRouter);
app.use('/api/configuracion', auth, configRouter);
app.use('/api/config/logo', auth, logoRouter);
app.use('/api/tomas-fisicas', auth, tomasFisicasRouter);
app.use('/api/pedidos-internos', auth, pedidosInternosRouter);
app.use('/api/custodia-repuestos', auth, custodiaRepuestosRouter);
app.use('/api/taller/preliquidacion', auth, tallerPreliquidacionRouter);
app.use('/api/taller', auth, tallerRouter);
app.use('/api/reportes-inventario', auth, reportesInventarioRouter);
app.use('/api/radar-maquinaria', auth, radarMaquinariaRouter);
app.use('/api/ganado_herramientas', auth, ganadoHerramientasRouter);
app.use('/api/acuicola_herramientas', auth, acuicolaHerramientasRouter);
app.use('/api/sistemas', auth, sistemasRouter);
app.use('/api/ganado_avanzado', auth, ganadoAvanzadoRouter);
app.use('/api/ganado_reproduccion', auth, ganadoReproduccionRouter);

app.use('/api/parametros', auth, parametrosRoutes);
app.use('/api/contabilidad', auth, contabilidadRouter);
app.use('/api/municipios', auth, municipiosRouter);
app.use('/api/auditoria', auth, auditoriaRouter);
app.use('/api/finanzas-agro', auth, finanzasAgroRouter);
app.use('/api/dian', auth, dianRouter);
app.use('/api/estados-financieros', auth, estadosFinancierosRouter);
app.use('/api/erp', auth, erpBridgeRouter);
app.use('/api/cartera', auth, carteraRouter);
app.use('/api/compras', auth, comprasRouter);
app.use('/api/terceros-stats', auth, tercerosStatsRouter);
app.use('/api/kardex', auth, kardexRouter);
app.use('/api/applications', auth, applicationsRouter);
// Alias for Spanish UI terminology (aplicaciones)
app.use('/api/aplicaciones', auth, applicationsRouter);
app.use('/api/aplicaciones', auth, aplicacionesAuxRouter);
app.use('/api/aplicaciones', auth, aplicacionesReportesRouter);
app.use('/api/acuicola_programador', auth, acuicolaProgramadorRouter);
app.use('/api/acuicola_molino', auth, acuicolaMolinoRouter);
app.use('/api/acuicola-cosechas-mobile', auth, acuicolaCosechasMobileRouter);
app.use('/api/acuicola', auth, acuicolaRouter);
app.use('/api/basculas', auth, basculasRouter);
app.use('/api/comercializacion', auth, comercializacionRouter);
app.use('/api/produccion', auth, produccionRouter);
app.use('/api/cultivos', auth, cultivosRouter);
app.use('/api/sync', auth, syncRouter);
app.use('/api/suelos', auth, suelosRouter);
app.use('/api/sensores', auth, sensoresRouter);
app.use('/api/riego-precision', auth, riegoPrecisionRouter);
app.use('/api/vra', auth, vraPrescripcionRouter);
app.use('/api/rendimiento', auth, rendimientoRouter);
app.use('/api/drones', auth, dronesRouter);

app.use('/api/water', auth, waterRouter);
app.get('/api/dashboard/stats', auth, async (req, res) => {
  const { fincaId, nucleoId } = req.query;
  const db = req.tenantPool;
  try {
    // 1. Raw database stats from tenant DB
    const [tables] = await db.query(`
      SELECT TABLE_NAME, TABLE_ROWS, TABLE_COMMENT
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME`, [req.dbName]);

    const totalTables = tables.length;
    const totalRecords = tables.reduce((sum, t) => sum + (t.TABLE_ROWS || 0), 0);
    const tablesWithData = tables.filter(t => t.TABLE_ROWS > 0).length;
    const emptyTables = totalTables - tablesWithData;

    // 2. Database size in MB
    const [sizeResult] = await db.query(`
      SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as size_mb
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ?`, [req.dbName]);
    const dbSize = sizeResult[0].size_mb || 0;

    // 3. Top tables by row count
    const topTables = tables
      .sort((a, b) => b.TABLE_ROWS - a.TABLE_ROWS)
      .slice(0, 10)
      .map(t => ({ name: t.TABLE_NAME, rows: t.TABLE_ROWS }));

    // 4. Business metrics
    const [fCount] = await db.query('SELECT COUNT(*) as count FROM fincas');
    const fincasCount = fCount[0].count;

    // Lotes count and total hectares (filtrando los activos)
    let loteSql = 'SELECT COUNT(*) as count, IFNULL(SUM(hectareas), 0) as total_ha FROM lotes WHERE activo = 1';
    const loteParams = [];
    if (nucleoId) {
      loteSql += ' AND id_nucleo = ?';
      loteParams.push(nucleoId);
    } else if (fincaId) {
      loteSql += ' AND id_nucleo IN (SELECT id_nucleo FROM nucleos WHERE id_finca = ?)';
      loteParams.push(fincaId);
    }
    const [lCount] = await db.query(loteSql, loteParams);
    const lotesCount = lCount[0].count;
    const totalHectareas = parseFloat(lCount[0].total_ha) || 0;

    // Employees count
    let empSql = 'SELECT COUNT(*) as count FROM rrhh_empleados';
    const empParams = [];
    if (fincaId) {
      empSql += ' WHERE id_finca = ?';
      empParams.push(fincaId);
    }
    const [eCount] = await db.query(empSql, empParams);
    const empleadosCount = eCount[0].count;

    res.json({
      totalTables,
      totalRecords,
      tablesWithData,
      emptyTables,
      dbSize,
      topTables,
      fincasCount,
      lotesCount,
      totalHectareas,
      empleadosCount
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// New Harvest/Agriculture endpoint
app.get('/api/dashboard/harvest', auth, async (req, res) => {
  try {
    const db = req.tenantPool;
    const [rows] = await db.query(`
      SELECT COALESCE(l.nombre, CONCAT('Lote ', l.id_lote)) AS id_lote,
             ROUND(SUM(c.produccion_total_kg), 0) AS total
      FROM cosechas c
      JOIN siembras s ON c.id_siembra = s.id_siembra
      JOIN lotes l ON s.id_lote = l.id_lote
      GROUP BY l.id_lote, l.nombre
      ORDER BY total DESC
      LIMIT 5
    `);

    res.json(rows);
  } catch (err) {
    console.error('Error fetching harvest data:', err);
    res.status(500).json({ error: err.message });
  }
});

// === LABOR STATS: distribución porcentual de labores agrícolas ===
app.get('/api/dashboard/labor-stats', auth, async (req, res) => {
  try {
    const db = req.tenantPool;
    const [rows] = await db.query(`
      SELECT categoria AS type, COUNT(*) AS cnt
      FROM labores_diarias
      GROUP BY categoria
    `);

    if (rows.length > 0) {
      const totalCnt = rows.reduce((s, r) => s + r.cnt, 0);
      const result = rows.map(r => ({
        type: r.type || 'Otros',
        percentage: Math.round((r.cnt / totalCnt) * 100)
      }));
      return res.json(result);
    }

    res.json([]);
  } catch (err) {
    console.error('Error fetching labor stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// === HARVEST TREND: tendencia histórica de cosecha ===
app.get('/api/dashboard/harvest-trend', auth, async (req, res) => {
  try {
    const db = req.tenantPool;
    const [rows] = await db.query(`
      SELECT DATE_FORMAT(c.fecha_cosecha, '%Y-%m') AS date,
             ROUND(SUM(c.produccion_total_kg), 0) AS total
      FROM cosechas c
      JOIN siembras s ON c.id_siembra = s.id_siembra
      GROUP BY DATE_FORMAT(c.fecha_cosecha, '%Y-%m')
      ORDER BY date ASC
      LIMIT 12
    `);

    res.json(rows.map(r => ({ date: r.date, total: Number(r.total) })));
  } catch (err) {
    console.error('Error fetching harvest trend:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// SERVIR FRONTEND SPA (PRODUCCIÓN)
// ============================================================================
const publicPath = path.join(process.cwd(), 'public');
app.use(express.static(publicPath));

// Fallback para React Router / SPA en rutas que no correspondan a API ni uploads
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  const indexPath = path.join(publicPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) next();
  });
});

// ============================================================================
// MIDDLEWARE GLOBAL DE MANEJO DE ERRORES (CATCH-ALL)
// ============================================================================
app.use((err, req, res, next) => {
  // Registrar el error estructuralmente usando Pino
  const traceId = req.traceId || 'N/A';
  
  if (req.log) {
    req.log.error({ 
      err: { message: err.message, stack: err.stack, name: err.name },
      body: req.body, 
      query: req.query 
    }, 'Unhandled Exception Caught');
  } else {
    logger.error({ err, traceId, url: req.url }, 'Fatal Unhandled Exception');
  }

  // Notificar al usuario genéricamente sin exponer queries SQL
  res.status(500).json({
    success: false,
    error: 'Ocurrió un error interno en el servidor.',
    traceId: traceId // El usuario puede reportar este ID a soporte
  });
});

const HOST = process.env.HOST || '0.0.0.0';

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, HOST, () => {
    logger.info(`✅ SAS Agrícolas API Server running at http://${HOST}:${PORT}`);
    
    // Iniciar servicio de WhatsApp en segundo plano
    connectToWhatsApp().catch(err => console.error("Error iniciando WhatsApp:", err));
  });
}

export default app;

