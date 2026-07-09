import express from 'express';
import pool from '../db.js';

const router = express.Router();

router.use((req, res, next) => {
  req.tenantId = 1;
  next();
});

// Molino Insumos (Materias primas)
router.get('/insumos', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM acuicola_molino_insumos WHERE id_tenant = ? ORDER BY nombre ASC', [req.tenantId]);
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Registrar Entradas (Materia Prima)
router.post('/entradas', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id_insumo, fecha, tipo_entrada, proveedor, cantidad_kg, costo_total, notas, responsable } = req.body;
    
    // Validations
    if (!id_insumo || !cantidad_kg || !tipo_entrada) throw new Error("Faltan datos requeridos");

    // Actualizar inventario
    await connection.query('UPDATE acuicola_molino_insumos SET cantidad_actual = cantidad_actual + ? WHERE id_insumo = ? AND id_tenant = ?', [cantidad_kg, id_insumo, req.tenantId]);
    
    // Calcular costo unitario
    const costo_unitario = costo_total > 0 ? (costo_total / cantidad_kg) : 0;

    // Registrar en Kardex
    const [kardexResult] = await connection.query(`
      INSERT INTO acuicola_molino_insumos_kardex 
      (id_tenant, id_insumo, fecha, tipo, concepto, cantidad_kg, costo_unitario, usuario)
      VALUES (?, ?, ?, 'Entrada', ?, ?, ?, ?)
    `, [req.tenantId, id_insumo, fecha, `Entrada: ${tipo_entrada}${proveedor ? ' - Prov: ' + proveedor : ''}`, cantidad_kg, costo_unitario, responsable || 'Admin']);

    // Nota: Eliminamos la integración contable de Compras/Entradas porque la bodega principal ya hace el asiento contable al comprar.
    // El molino solo maneja recepciones por traslados y controla su propio inventario.

    await connection.commit();
    res.json({ message: 'Entrada registrada con éxito e inventario actualizado.' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: err.message || 'Error interno del servidor' });
  } finally {
    connection.release();
  }
});

router.post('/compras', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id_insumo, fecha, proveedor, cantidad_comprada_kg, costo_total } = req.body;
    
    // Actualizar inventario
    await connection.query('UPDATE acuicola_molino_insumos SET cantidad_actual = cantidad_actual + ? WHERE id_insumo = ? AND id_tenant = ?', [cantidad_comprada_kg, id_insumo, req.tenantId]);
    
    // Asiento contable
    const descripcion = `Compra Materia Prima Molino (Prov: ${proveedor}, Cantidad: ${cantidad_comprada_kg}kg)`;
    const [comp] = await connection.query(`
      INSERT INTO contab_comprobantes (id_tenant, fecha, tipo_documento, consecutivo, concepto, estado)
      VALUES (?, ?, 'CE', 'MOL-001', ?, 'Aprobado')
    `, [req.tenantId, fecha, descripcion]);
    
    const id_comprobante = comp.insertId;
    await connection.query(`
      INSERT INTO contab_detalles (id_comprobante, id_cuenta, tercero, descripcion, debito, credito)
      VALUES 
      (?, (SELECT id_cuenta FROM plan_contable WHERE codigo = '1405' LIMIT 1), ?, 'Ingreso Materia Prima', ?, 0),
      (?, (SELECT id_cuenta FROM plan_contable WHERE codigo = '1110' LIMIT 1), ?, 'Pago Proveedor', 0, ?)
    `, [id_comprobante, proveedor, costo_total, id_comprobante, proveedor, costo_total]);

    await connection.commit();
    res.json({ message: 'Compra registrada con éxito e inventario actualizado.' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    connection.release();
  }
});

// Molino Fórmulas
router.get('/formulas', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM acuicola_molino_formulas WHERE id_tenant = ? ORDER BY fase_recomendada ASC', [req.tenantId]);
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Producción de Alimento
router.get('/produccion', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, f.nombre as formula_nombre, f.fase_recomendada
      FROM acuicola_molino_produccion p
      JOIN acuicola_molino_formulas f ON p.id_formula = f.id_formula
      WHERE p.id_tenant = ?
      ORDER BY p.fecha DESC
    `, [req.tenantId]);
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/produccion', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id_formula, fecha, cantidad_producida_kg, responsable } = req.body;
    
    // Calcular costo
    let costo_total = 0;
    
    // Obtener receta y validar inventario primero
    const [formulas] = await connection.query('SELECT detalles_json FROM acuicola_molino_formulas WHERE id_formula = ?', [id_formula]);
    if (formulas.length > 0) {
      const receta = formulas[0].detalles_json;
      if (receta && Array.isArray(receta)) {
        // Validación de inventario
        for (let item of receta) {
          const kg_requeridos = (cantidad_producida_kg * item.pct) / 100;
          const [insumos] = await connection.query('SELECT nombre, cantidad_actual, costo_unitario FROM acuicola_molino_insumos WHERE id_insumo = ?', [item.id_insumo]);
          
          if (insumos.length === 0) {
            throw new Error(`Insumo ID ${item.id_insumo} no encontrado.`);
          }
          if (insumos[0].cantidad_actual < kg_requeridos) {
            throw new Error(`Inventario insuficiente de ${insumos[0].nombre}. Se requieren ${kg_requeridos.toFixed(2)} kg pero hay ${parseFloat(insumos[0].cantidad_actual).toFixed(2)} kg.`);
          }
        }

        // Insertar producción
        const detalles_consumo = [];
        // Descontar inventario y sumar costo
        for (let item of receta) {
          const kg_requeridos = (cantidad_producida_kg * item.pct) / 100;
          const [insumos] = await connection.query('SELECT nombre, costo_unitario FROM acuicola_molino_insumos WHERE id_insumo = ?', [item.id_insumo]);
          if (insumos.length > 0) {
             costo_total += (insumos[0].costo_unitario * kg_requeridos);
             detalles_consumo.push({ 
               id_insumo: item.id_insumo,
               insumo: insumos[0].nombre, 
               kg: kg_requeridos, 
               costo: insumos[0].costo_unitario * kg_requeridos,
               costo_unitario: insumos[0].costo_unitario
             });
          }
          await connection.query('UPDATE acuicola_molino_insumos SET cantidad_actual = cantidad_actual - ? WHERE id_insumo = ?', [kg_requeridos, item.id_insumo]);
        }

        // Insertar producción (Añadiremos los campos de bultos en la base de datos o asumiremos que cantidad_producida_kg es el total)
        // Por ahora, asumimos que req.body trae cantidad_bultos y peso_bulto_kg (lo agregaremos a la tabla si no existe o lo guardamos en notas)
        const { cantidad_bultos, peso_bulto_kg } = req.body;

        const [prodResult] = await connection.query(`
          INSERT INTO acuicola_molino_produccion (id_tenant, id_formula, fecha, cantidad_producida_kg, costo_total, responsable, detalles_consumo_json)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [req.tenantId, id_formula, fecha, cantidad_producida_kg, costo_total, responsable, JSON.stringify(detalles_consumo)]);
        
        const id_produccion = prodResult.insertId;

        // Integración Contable: Pasar el costo de materias primas a costo de producción de producto terminado
        const descContable = `Producción de Alimento Molino (Lote #${id_produccion}, ${cantidad_producida_kg}kg)`;
        const [comp] = await connection.query(`
          INSERT INTO contab_comprobantes (id_tenant, fecha, tipo_documento, consecutivo, concepto, estado)
          VALUES (?, ?, 'CC', CONCAT('PROD-', ?), ?, 'Aprobado')
        `, [req.tenantId, fecha, id_produccion, descContable]);
        
        await connection.query(`
          INSERT INTO contab_detalles (id_comprobante, id_cuenta, tercero, descripcion, debito, credito)
          VALUES 
          (?, (SELECT id_cuenta FROM plan_contable WHERE codigo = '1430' LIMIT 1), 'Molino Interno', 'Ingreso Alimento Terminado', ?, 0),
          (?, (SELECT id_cuenta FROM plan_contable WHERE codigo = '1405' LIMIT 1), 'Molino Interno', 'Salida Materia Prima', 0, ?)
        `, [comp.insertId, costo_total, comp.insertId, costo_total]);

        // Registrar en Kardex de Insumos
        for (let det of detalles_consumo) {
          await connection.query(`
            INSERT INTO acuicola_molino_insumos_kardex 
            (id_tenant, id_insumo, fecha, tipo, concepto, cantidad_kg, costo_unitario, referencia_id, usuario)
            VALUES (?, ?, ?, 'Salida', 'Producción Alimento', ?, ?, ?, ?)
          `, [req.tenantId, det.id_insumo, fecha, det.kg, det.costo_unitario, id_produccion, responsable]);
        }

        // Registrar ENTRADA en el Kardex de Producción
        await connection.query(`
          INSERT INTO acuicola_molino_produccion_kardex (id_tenant, id_formula, fecha, tipo, concepto, cantidad_kg, referencia_id, usuario)
          VALUES (?, ?, ?, 'ENTRADA', 'Producción Alimento', ?, ?, ?)
        `, [req.tenantId, id_formula, fecha, cantidad_producida_kg, id_produccion, responsable || 'Admin']);
      }
    } else {
      throw new Error("Fórmula no encontrada");
    }

    await connection.commit();
    res.json({ message: 'Producción registrada y materia prima descontada.' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(400).json({ error: err.message || 'Error interno del servidor' });
  } finally {
    connection.release();
  }
});

// Salidas y Ventas
router.get('/salidas', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.*, f.nombre as formula_nombre, e.codigo as estanque_codigo
      FROM acuicola_molino_salidas s
      JOIN acuicola_molino_formulas f ON s.id_formula = f.id_formula
      LEFT JOIN acuicola_estanques e ON s.id_estanque = e.id_estanque
      WHERE s.id_tenant = ?
      ORDER BY s.fecha DESC
    `, [req.tenantId]);
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/salidas', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id_formula, fecha, cantidad_kg, tipo_salida, id_estanque, cliente_tercero, valor_venta, notas } = req.body;

    const [result] = await connection.query(`
      INSERT INTO acuicola_molino_salidas 
      (id_tenant, id_formula, fecha, cantidad_kg, tipo_salida, id_estanque, cliente_tercero, valor_venta, notas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [req.tenantId, id_formula, fecha, cantidad_kg, tipo_salida, id_estanque || null, cliente_tercero || null, valor_venta || null, notas]);

    const id_salida = result.insertId;

    if (tipo_salida === 'Venta Externa' && valor_venta > 0) {
      // Create Sale Document
      const descripcion = `Venta Alimento Acuicola (Formula ID: ${id_formula}, ${cantidad_kg} kg)`;
      const [comp] = await connection.query(`
        INSERT INTO contab_documentos (id_tenant, fecha, tipo_documento, numero, concepto, estado)
        VALUES (?, ?, 'FV', CONCAT('FV-ALI-', ?), ?, 'Aprobado')
      `, [req.tenantId, fecha, id_salida, descripcion]);
      
      const id_documento = comp.insertId;

      await connection.query(`
        INSERT INTO contab_asientos (id_documento, cuenta_contable, debito, credito, tercero, descripcion)
        VALUES 
        (?, '130505', ?, 0, ?, 'Cuentas por Cobrar Clientes'),
        (?, '410505', 0, ?, ?, 'Ingreso por Venta de Alimento')
      `, [id_documento, valor_venta, cliente_tercero, id_documento, valor_venta, cliente_tercero]);
    } else if (tipo_salida === 'Consumo Interno' && id_estanque) {
      // Find active siembra for the lake
      const [siembras] = await connection.query(`
        SELECT id_siembra_acui, DATEDIFF(CURDATE(), fecha_siembra) as dias_cultivo 
        FROM acuicola_siembras 
        WHERE id_estanque = ? AND estado = 'Activo' ORDER BY fecha_siembra DESC LIMIT 1
      `, [id_estanque]);
      
      if (siembras.length > 0) {
        const dias = siembras[0].dias_cultivo;
        
        // We need the formula name and phase
        const [formulas] = await connection.query('SELECT nombre, fase_recomendada FROM acuicola_molino_formulas WHERE id_formula = ?', [id_formula]);
        const formulaName = formulas.length > 0 ? formulas[0].nombre : 'Alimento Propio';
        const fase = formulas.length > 0 ? formulas[0].fase_recomendada : null;

        // Validacion Biologica
        if (fase === 'Iniciación' && dias > 30) {
          throw new Error(`Validación Biológica Falló: El lago tiene ${dias} días (Pece adulto). No puede recibir alimento de Iniciación.`);
        }
        if (fase === 'Levante' && (dias <= 30 || dias > 90)) {
          throw new Error(`Validación Biológica Falló: El lago tiene ${dias} días. La fase Levante es para 31-90 días.`);
        }
        if (fase === 'Engorde' && dias <= 90) {
          throw new Error(`Validación Biológica Falló: El lago tiene ${dias} días (Pez joven). La fase Engorde es para > 90 días.`);
        }

        await connection.query(`
          INSERT INTO acuicola_alimentacion (id_siembra_acui, tipo_alimento, cantidad_kg, frecuencia, costo)
          VALUES (?, ?, ?, 'Diario', 0)
        `, [siembras[0].id_siembra_acui, formulaName, cantidad_kg]);
      } else {
        throw new Error("El estanque seleccionado no tiene una siembra Activa.");
      }
    }

    // Registrar SALIDA en el Kardex de Producción
    await connection.query(`
      INSERT INTO acuicola_molino_produccion_kardex (id_tenant, id_formula, fecha, tipo, concepto, cantidad_kg, referencia_id, usuario)
      VALUES (?, ?, ?, 'SALIDA', ?, ?, ?, 'Admin')
    `, [req.tenantId, id_formula, fecha, `Salida: ${tipo_salida}`, cantidad_kg, id_salida]);

    await connection.commit();
    res.json({ message: 'Salida registrada con éxito.', id_salida });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(400).json({ error: err.message || 'Error interno del servidor' });
  } finally {
    connection.release();
  }
});

// Estanques Activos (Para selects)
router.get('/estanques', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT e.id_estanque, e.codigo, f.nombre as finca_nombre 
      FROM acuicola_estanques e
      JOIN fincas f ON e.id_finca = f.id_finca
      WHERE e.id_tenant = ?
      ORDER BY f.nombre, e.codigo
    `, [req.tenantId]);
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Kardex
router.get('/kardex', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT k.*, i.nombre as insumo_nombre, i.codigo as insumo_codigo
      FROM acuicola_molino_insumos_kardex k
      JOIN acuicola_molino_insumos i ON k.id_insumo = i.id_insumo
      WHERE k.id_tenant = ?
      ORDER BY k.fecha DESC, k.id_movimiento DESC
    `, [req.tenantId]);
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener Kardex' });
  }
});

// Kardex Producción
router.get('/kardex_produccion', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT k.*, f.nombre as formula_nombre
      FROM acuicola_molino_produccion_kardex k
      JOIN acuicola_molino_formulas f ON k.id_formula = f.id_formula
      WHERE k.id_tenant = ?
      ORDER BY k.fecha DESC, k.id_movimiento DESC
    `, [req.tenantId]);
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener Kardex Producción' });
  }
});

// Update Formula
router.put('/formulas/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { detalles_json } = req.body;
    
    // Check total 100%
    const detalles = JSON.parse(detalles_json);
    const totalPct = detalles.reduce((acc, curr) => acc + curr.pct, 0);
    if (Math.abs(totalPct - 100) > 0.01) {
       throw new Error(`La suma de ingredientes debe ser exactamente 100%. Actual: ${totalPct}%`);
    }

    await connection.query('UPDATE acuicola_molino_formulas SET detalles_json = ? WHERE id_formula = ? AND id_tenant = ?', [detalles_json, req.params.id, req.tenantId]);
    await connection.commit();
    res.json({ message: 'Fórmula actualizada correctamente.' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(400).json({ error: err.message || 'Error interno del servidor' });
  } finally {
    connection.release();
  }
});

// Salida Manual de Insumos (Otros Usos)
router.post('/insumos/salida_manual', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id_insumo, cantidad_kg, concepto, usuario } = req.body;

    const [insumos] = await connection.query('SELECT cantidad_actual, costo_unitario FROM acuicola_molino_insumos WHERE id_insumo = ?', [id_insumo]);
    if (insumos.length === 0 || insumos[0].cantidad_actual < cantidad_kg) {
      throw new Error('Inventario insuficiente para esta salida.');
    }

    await connection.query('UPDATE acuicola_molino_insumos SET cantidad_actual = cantidad_actual - ? WHERE id_insumo = ?', [cantidad_kg, id_insumo]);

    await connection.query(`
      INSERT INTO acuicola_molino_insumos_kardex 
      (id_tenant, id_insumo, fecha, tipo, concepto, cantidad_kg, costo_unitario, usuario)
      VALUES (?, ?, CURDATE(), 'Salida', ?, ?, ?, ?)
    `, [req.tenantId, id_insumo, concepto, cantidad_kg, insumos[0].costo_unitario, usuario]);

    await connection.commit();
    res.json({ message: 'Salida registrada correctamente.' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(400).json({ error: err.message || 'Error interno del servidor' });
  } finally {
    connection.release();
  }
});

export default router;
