import express from 'express';
import pool from '../db.js';

const router = express.Router();

function getDb(req) { return req.tenantPool || pool; }

// Obtener Opciones de Filtro (Fincas, Lagos, Siembras)
router.get('/filtros', async (req, res) => {
  const tenantId = req.query.tenantId || 1;
  try {
    const [fincas] = await getDb(req).query('SELECT DISTINCT f.id_finca, f.nombre FROM fincas f JOIN acuicola_estanques a ON f.id_finca = a.id_finca WHERE f.id_tenant = ?', [tenantId]);
    const [estanques] = await getDb(req).query('SELECT id_estanque, id_finca, codigo, area_m2 FROM acuicola_estanques WHERE id_tenant = ?', [tenantId]);
    const [siembras] = await getDb(req).query(`
      SELECT s.id_siembra_acui, s.id_estanque, s.fecha_siembra, s.estado, e.nombre as especie_nombre 
      FROM acuicola_siembras s 
      JOIN acuicola_especies e ON s.id_especie_acui = e.id_especie_acui 
      JOIN acuicola_estanques a ON s.id_estanque = a.id_estanque
      WHERE a.id_tenant = ?
      ORDER BY s.fecha_siembra DESC
    `, [tenantId]);
    const [visitas] = await getDb(req).query(`
      SELECT CONCAT(f.nombre, ' - Lago ', a.codigo) as ubicacion, COUNT(v.id_visita) as cantidad
      FROM visitas_tecnicas v
      JOIN visitas_tecnicas_detalles vd ON v.id_visita = vd.id_visita
      JOIN acuicola_estanques a ON vd.id_origen = a.id_estanque AND vd.tabla_origen = 'acuicola_estanques'
      JOIN fincas f ON a.id_finca = f.id_finca
      WHERE v.modulo = 'Piscícola' AND YEAR(v.fecha_visita) = YEAR(CURDATE()) AND a.id_tenant = ?
      GROUP BY f.nombre, a.codigo ORDER BY cantidad DESC LIMIT 10
    `, [tenantId]);
    
    res.json({ fincas, estanques, siembras, visitas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener Estadísticas Globales Gerenciales
router.get('/global-stats', async (req, res) => {
  const tenantId = req.query.tenantId || 1;
  try {
    const db = getDb(req);
    
    // 1. Lagos por Finca
    const [lagosFinca] = await db.query(`
      SELECT f.nombre as finca, COUNT(a.id_estanque) as cantidad
      FROM acuicola_estanques a
      JOIN fincas f ON a.id_finca = f.id_finca
      WHERE a.id_tenant = ?
      GROUP BY f.nombre
    `, [tenantId]);

    // 2. Cosecha Global y Proyección
    const [cosechaGlobal] = await db.query(`
      SELECT SUM(c.biomasa_total_kg) as biomasa_historica, SUM(c.ingreso_total) as ingresos_historicos
      FROM acuicola_cosechas c
      JOIN acuicola_siembras s ON c.id_siembra_acui = s.id_siembra_acui
      JOIN acuicola_estanques a ON s.id_estanque = a.id_estanque
      WHERE a.id_tenant = ?
    `, [tenantId]);

    const [lotesActivos] = await db.query(`
      SELECT s.id_siembra_acui, s.cantidad_alevines, e.nombre as especie, 
             s.peso_promedio_inicial_g,
             (SELECT SUM(cantidad_muertes) FROM acuicola_novedades WHERE id_siembra_acui = s.id_siembra_acui) as muertes,
             (SELECT peso_promedio_g FROM acuicola_muestreos WHERE id_siembra_acui = s.id_siembra_acui ORDER BY fecha DESC LIMIT 1) as ultimo_peso,
             (SELECT SUM(costo) FROM acuicola_alimentacion WHERE id_siembra_acui = s.id_siembra_acui) as costo_alimento,
             (SELECT SUM(costo_repuestos) FROM acuicola_novedades WHERE id_siembra_acui = s.id_siembra_acui) as costo_repuestos,
             s.costo_siembra
      FROM acuicola_siembras s
      JOIN acuicola_estanques a ON s.id_estanque = a.id_estanque
      JOIN acuicola_especies e ON s.id_especie_acui = e.id_especie_acui
      WHERE s.estado = 'Activo' AND a.id_tenant = ?
    `, [tenantId]);

    let biomasa_proyectada = 0;
    let biomasa_actual_est = 0;
    let costosTotalesEnProceso = 0;

    const proyeccionLotes = lotesActivos.map(lote => {
      const pecesVivos = lote.cantidad_alevines - (lote.muertes || 0);
      const ultimoPesoKg = (lote.ultimo_peso || lote.peso_promedio_inicial_g || 10) / 1000;
      const pesoMetaKg = 0.500; 
      
      const biomasa_actual = pecesVivos * ultimoPesoKg;
      const biomasa_futura = pecesVivos * pesoMetaKg;
      
      biomasa_actual_est += biomasa_actual;
      biomasa_proyectada += biomasa_futura;

      const costoLote = parseFloat(lote.costo_siembra || 0) + parseFloat(lote.costo_alimento || 0) + parseFloat(lote.costo_repuestos || 0);
      costosTotalesEnProceso += costoLote;

      return {
        id: lote.id_siembra_acui,
        especie: lote.especie,
        pecesVivos,
        biomasa_actual,
        biomasa_futura,
        costoLote
      };
    });

    // 3. Costos vs Ventas
    const [ventasVsCostos] = await db.query(`
      SELECT 
        DATE_FORMAT(c.fecha_cosecha, '%Y-%m') as mes,
        SUM(c.ingreso_total) as ventas,
        SUM(s.costo_siembra + 
            COALESCE((SELECT SUM(costo) FROM acuicola_alimentacion WHERE id_siembra_acui = s.id_siembra_acui), 0) + 
            COALESCE((SELECT SUM(costo_repuestos) FROM acuicola_novedades WHERE id_siembra_acui = s.id_siembra_acui), 0)) as costos
      FROM acuicola_cosechas c
      JOIN acuicola_siembras s ON c.id_siembra_acui = s.id_siembra_acui
      JOIN acuicola_estanques a ON s.id_estanque = a.id_estanque
      WHERE a.id_tenant = ? AND c.fecha_cosecha >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(c.fecha_cosecha, '%Y-%m')
      ORDER BY mes ASC
    `, [tenantId]);

    res.json({ 
      lagosFinca, 
      resumen: {
        biomasa_historica: cosechaGlobal[0]?.biomasa_historica || 0,
        ingresos_historicos: cosechaGlobal[0]?.ingresos_historicos || 0,
        biomasa_actual_est,
        biomasa_proyectada,
        costosTotalesEnProceso,
        lotes_activos: lotesActivos.length
      },
      proyeccionLotes,
      ventasVsCostos
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
router.get('/stats/:idSiembra', async (req, res) => {
  try {
    const idSiembra = req.params.idSiembra;
    
    // Basicos de la siembra
    const [sRows] = await getDb(req).query(`
      SELECT s.*, e.nombre as especie_nombre, a.codigo as estanque_codigo, a.id_finca, f.nombre as finca_nombre
      FROM acuicola_siembras s
      JOIN acuicola_especies e ON s.id_especie_acui = e.id_especie_acui
      JOIN acuicola_estanques a ON s.id_estanque = a.id_estanque
      JOIN fincas f ON a.id_finca = f.id_finca
      WHERE s.id_siembra_acui = ?
    `, [idSiembra]);
    if (sRows.length === 0) return res.status(404).json({error: 'No encontrado'});
    const siembra = sRows[0];

    // Novedades (Muertes y Repuestos)
    const [nRows] = await getDb(req).query(`
      SELECT SUM(cantidad_muertes) as total_muertes, SUM(cantidad_repuestos) as total_repuestos, SUM(costo_repuestos) as total_costo_repuestos
      FROM acuicola_novedades WHERE id_siembra_acui = ?
    `, [idSiembra]);
    const novedades = nRows[0] || { total_muertes: 0, total_repuestos: 0, total_costo_repuestos: 0 };

    // Alimentación
    const [aRows] = await getDb(req).query(`
      SELECT SUM(cantidad_kg) as total_alimento_kg, SUM(costo) as total_costo_alimento
      FROM acuicola_alimentacion
      WHERE id_siembra_acui = ?
    `, [idSiembra]);
    const alimento = aRows[0] || { total_alimento_kg: 0, total_costo_alimento: 0 };

    // Crecimiento (Muestreos)
    const [mRows] = await getDb(req).query(`
      SELECT fecha, peso_promedio_g, biomasa_estimada_kg 
      FROM acuicola_muestreos WHERE id_siembra_acui = ? ORDER BY fecha ASC
    `, [idSiembra]);

    // Cosecha (si aplica)
    const [cRows] = await getDb(req).query(`
      SELECT fecha_cosecha, biomasa_total_kg, precio_venta_kg, ingreso_total
      FROM acuicola_cosechas WHERE id_siembra_acui = ?
    `, [idSiembra]);
    const cosecha = cRows.length > 0 ? cRows[0] : null;

    // Nomina asociada
    // Buscamos las labores diarias en ese estanque desde la fecha_siembra hasta la cosecha (o hoy)
    const fechaFin = cosecha ? cosecha.fecha_cosecha : new Date();
    const [lRows] = await getDb(req).query(`
      SELECT COUNT(*) as dias_labor 
      FROM labores_diarias 
      WHERE id_estanque = ? AND fecha_completado BETWEEN ? AND ?
    `, [siembra.id_estanque, siembra.fecha_siembra, fechaFin]);
    // Asumimos costo de labor fijo por dia o extraemos de planillas. Por simplicidad del dashboard, 50k por dia de labor detectado.
    const diasLabor = lRows[0].dias_labor;
    const costoNomina = diasLabor * 50000;

    res.json({
      siembra,
      novedades,
      alimento,
      muestreos: mRows,
      cosecha,
      costoNomina,
      peces_vivos: siembra.cantidad_alevines - (novedades.total_muertes || 0) + (novedades.total_repuestos || 0)
    });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ENDPOINT PARA CREAR DATA DEMO
router.get('/cosechas-mobile/seed', async (req, res) => {
  try {
    const db = getDb(req);
    const [estanques] = await db.query("SELECT * FROM acuicola_estanques WHERE id_tenant = 1 LIMIT 5");
    const [especies] = await db.query("SELECT * FROM acuicola_especies LIMIT 3");
    
    if(estanques.length === 0 || especies.length === 0) return res.json({ msg: 'Faltan estanques/especies' });

    const [siembrasExistentes] = await db.query("SELECT * FROM acuicola_siembras WHERE estado = 'Activo' AND id_tenant = 1");
    if (siembrasExistentes.length >= 3) return res.json({ msg: 'Ya existen siembras activas' });

    let inserted = 0;
    for (let i = 0; i < Math.min(4, estanques.length); i++) {
      const estanque = estanques[i];
      const especie = especies[i % especies.length];
      
      const q = `
        INSERT INTO acuicola_siembras 
        (id_tenant, id_estanque, id_especie_acui, fecha_siembra, cantidad_alevines, peso_promedio_ingreso_g, estado, notas)
        VALUES (1, ?, ?, DATE_SUB(NOW(), INTERVAL 180 DAY), ?, 5, 'Activo', 'Siembra demo de auditoría')
      `;
      const args = [estanque.id_estanque, especie.id_especie_acui, 5000 + (i * 1000)];
      await db.query(q, args);
      inserted++;
    }
    res.json({ msg: 'Seed completado', inserted });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// 1. Obtener lagos (siembras) listos para cosecha o campañas en progreso
router.get('/cosechas-mobile/siembras-activas', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const [rows] = await getDb(req).query(`
      SELECT 
        s.id_siembra_acui, 
        s.id_estanque, 
        est.codigo as estanque_codigo, 
        est.id_finca,
        f.nombre as finca_nombre,
        s.id_especie_acui as id_especie, 
        e.nombre as especie_nombre,
        s.fecha_siembra,
        s.cantidad_alevines
      FROM acuicola_siembras s
      JOIN acuicola_estanques est ON s.id_estanque = est.id_estanque
      JOIN fincas f ON est.id_finca = f.id_finca
      JOIN acuicola_especies e ON s.id_especie_acui = e.id_especie_acui
      WHERE s.estado = 'Activo' AND (? IS NULL OR est.id_tenant = ?)
    `, [tenantId || null, tenantId || null]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener lotes en progreso
router.get('/cosechas-mobile/lotes-progreso', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const [rows] = await getDb(req).query(`
      SELECT 
        l.*,
        est.codigo as estanque_codigo,
        e.nombre as especie_nombre
      FROM acuicola_lotes_cosecha l
      JOIN acuicola_estanques est ON l.id_estanque = est.id_estanque
      JOIN acuicola_especies e ON l.id_especie = e.id_especie_acui
      WHERE l.estado = 'En Progreso' AND (? IS NULL OR l.id_tenant = ?)
    `, [tenantId || null, tenantId || null]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Iniciar una nueva cosecha (Campaña)
router.post('/cosechas-mobile/start', async (req, res) => {
  const { tenantId, id_finca, id_estanque, id_siembra_acui, id_especie } = req.body;
  try {
    const [result] = await getDb(req).query(`
      INSERT INTO acuicola_lotes_cosecha (id_tenant, id_finca, id_estanque, id_siembra_acui, id_especie, fecha_inicio, estado)
      VALUES (?, ?, ?, ?, ?, NOW(), 'En Progreso')
    `, [tenantId || 1, id_finca, id_estanque, id_siembra_acui, id_especie]);
    res.json({ id_lote_cosecha: result.insertId, message: 'Campaña iniciada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Registrar una pesada (Captura)
router.post('/cosechas-mobile/:id/pesaje', async (req, res) => {
  const id_lote_cosecha = req.params.id;
  const { tenantId, peso_bruto_kg, peso_tara_kg, peso_neto_kg, promedio_talla_g, id_empleado_pesador, notas } = req.body;
  
  const con = await getDb(req).getConnection();
  try {
    await con.beginTransaction();
    
    await con.query(`
      INSERT INTO acuicola_capturas_pesajes (id_tenant, id_lote_cosecha, peso_bruto_kg, peso_tara_kg, peso_neto_kg, promedio_talla_g, fecha_captura, id_empleado_pesador, notas)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?)
    `, [tenantId || 1, id_lote_cosecha, peso_bruto_kg, peso_tara_kg, peso_neto_kg, promedio_talla_g, id_empleado_pesador, notas]);

    // Actualizar total_capturado_kg
    await con.query(`
      UPDATE acuicola_lotes_cosecha 
      SET total_capturado_kg = (SELECT SUM(peso_neto_kg) FROM acuicola_capturas_pesajes WHERE id_lote_cosecha = ?)
      WHERE id_lote_cosecha = ?
    `, [id_lote_cosecha, id_lote_cosecha]);

    await con.commit();
    res.json({ message: 'Pesaje registrado exitosamente' });
  } catch (err) {
    await con.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    con.release();
  }
});

// 4. Obtener pesajes de un lote
router.get('/cosechas-mobile/:id/pesajes', async (req, res) => {
  const id_lote_cosecha = req.params.id;
  try {
    const [rows] = await getDb(req).query(`
      SELECT p.*, e.nombre as empleado_nombre
      FROM acuicola_capturas_pesajes p
      LEFT JOIN rrhh_empleados e ON p.id_empleado_pesador = e.id_empleado
      WHERE p.id_lote_cosecha = ?
      ORDER BY p.fecha_captura DESC
    `, [id_lote_cosecha]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Finalizar cosecha
router.post('/cosechas-mobile/:id/finalize', async (req, res) => {
  const id_lote_cosecha = req.params.id;
  
  const con = await getDb(req).getConnection();
  try {
    await con.beginTransaction();

    // 1. Marcar lote como cerrado
    await con.query(`
      UPDATE acuicola_lotes_cosecha 
      SET estado = 'Cerrado', fecha_cierre = NOW()
      WHERE id_lote_cosecha = ?
    `, [id_lote_cosecha]);

    // 2. Obtener datos del lote
    const [lotes] = await con.query('SELECT * FROM acuicola_lotes_cosecha WHERE id_lote_cosecha = ?', [id_lote_cosecha]);
    if (lotes.length === 0) throw new Error('Lote no encontrado');
    const lote = lotes[0];

    // 3. Marcar siembra como Cosechada
    await con.query(`
      UPDATE acuicola_siembras 
      SET estado = 'Cosechado'
      WHERE id_siembra_acui = ?
    `, [lote.id_siembra_acui]);

    // 4. Sumar inventario de pescado
    const [invRows] = await con.query(`SELECT id_inventario FROM acuicola_inventario_pescado WHERE id_especie = ? AND id_tenant = ?`, [lote.id_especie, lote.id_tenant]);
    
    if (invRows.length > 0) {
      await con.query(`
        UPDATE acuicola_inventario_pescado 
        SET saldo_actual_kg = saldo_actual_kg + ?
        WHERE id_inventario = ?
      `, [lote.total_capturado_kg, invRows[0].id_inventario]);
    } else {
      await con.query(`
        INSERT INTO acuicola_inventario_pescado (id_tenant, id_especie, saldo_actual_kg)
        VALUES (?, ?, ?)
      `, [lote.id_tenant, lote.id_especie, lote.total_capturado_kg]);
    }

    await con.commit();
    res.json({ message: 'Cosecha finalizada, inventario actualizado y siembra cerrada.' });
  } catch (err) {
    await con.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    con.release();
  }
});


// === RUTAS RECURSOS COSECHA MOBILE ===
router.get('/cosechas-mobile/test-schema', async (req, res) => {
  try {
    const [rows] = await getDb(req).query('SELECT * FROM rrhh_empleados LIMIT 5');
    res.json(rows);
  } catch(e) {
    res.json({error: e.toString()});
  }
});

router.get('/cosechas-mobile/empleados/activos', async (req, res) => {
  try {
    const tenantId = req.query.tenantId || 1;
    const con = await getDb(req).getConnection();
    try {
      await con.query(`
        ALTER TABLE acuicola_cosechas_recursos 
        ADD COLUMN hora_inicio DATETIME DEFAULT CURRENT_TIMESTAMP, 
        ADD COLUMN hora_fin DATETIME NULL, 
        ADD COLUMN estado VARCHAR(20) DEFAULT 'Activo'
      `);
    } catch(e) { console.error('ALTER Error', e); }
    con.release();
    
    const [empleados] = await getDb(req).query('SELECT id_empleado, documento as numero_identificacion, CONCAT(nombres, " ", apellidos) as nombre_completo FROM rrhh_empleados WHERE estado = "Activo" AND id_tenant = ? ORDER BY nombres', [tenantId]);
    res.json(empleados);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/cosechas-mobile/:id/recursos', async (req, res) => {
  try {
    const { id } = req.params;
    const [recursos] = await getDb(req).query(`
      SELECT r.id_recurso_cosecha, r.id_entidad as id_empleado, CONCAT(e.nombres, ' ', e.apellidos) as nombre_completo, e.documento as numero_identificacion, r.hora_inicio, r.hora_fin, r.estado
      FROM acuicola_cosechas_recursos r
      JOIN rrhh_empleados e ON r.id_entidad = e.id_empleado
      WHERE r.id_lote_cosecha = ? AND r.tipo_recurso = 'Empleado'
    `, [id]);
    res.json(recursos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/cosechas-mobile/:id/recursos', async (req, res) => {
  try {
    const { id } = req.params;
    const { empleados } = req.body;
    const tenantId = req.query.tenantId || req.body.tenantId || 1;
    const con = await getDb(req).getConnection();

    try {
      await con.beginTransaction();
      
      // Desactivamos a los que ya no están en la lista en vez de borrarlos para preservar el tiempo
      const [existing] = await con.query("SELECT id_entidad, estado FROM acuicola_cosechas_recursos WHERE id_lote_cosecha = ? AND tipo_recurso = 'Empleado'", [id]);
      
      for (const emp of existing) {
        if (!empleados.includes(emp.id_entidad) && emp.estado === 'Activo') {
          // Fue removido, le ponemos hora de fin
          await con.query("UPDATE acuicola_cosechas_recursos SET estado = 'Retirado', hora_fin = CURRENT_TIMESTAMP WHERE id_lote_cosecha = ? AND id_entidad = ? AND tipo_recurso = 'Empleado'", [id, emp.id_entidad]);
        }
      }

      // Agregamos a los nuevos
      const existingIds = existing.map(e => e.id_entidad);
      if(empleados && empleados.length > 0){
        for (const empId of empleados) {
          if (!existingIds.includes(empId)) {
            await con.query("INSERT INTO acuicola_cosechas_recursos (id_tenant, id_lote_cosecha, tipo_recurso, id_entidad, estado) VALUES (?, ?, 'Empleado', ?, 'Activo')", [tenantId, id, empId]);
          }
        }
      }
      
      await con.commit();
      res.json({ message: 'Recolectores actualizados correctamente' });
    } catch (e) {
      await con.rollback();
      throw e;
    } finally {
      con.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/cosechas-mobile/:id/recursos/retirar', async (req, res) => {
  try {
    const { id } = req.params;
    const { id_empleado } = req.body;
    await getDb(req).query("UPDATE acuicola_cosechas_recursos SET estado = 'Retirado', hora_fin = CURRENT_TIMESTAMP WHERE id_lote_cosecha = ? AND id_entidad = ? AND tipo_recurso = 'Empleado'", [id, id_empleado]);
    res.json({ message: 'Pescador retirado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// =====================================

export default router;

