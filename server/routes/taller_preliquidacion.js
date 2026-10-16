import express from 'express';
import { getDb } from '../utils/db.js';

const router = express.Router();

// Obtener catalogos para los selectores (equipos, mecanicos, repuestos)
router.get('/catalogo', async (req, res) => {
  try {
    const db = getDb(req);
    const id_tenant = req.user?.id_tenant || 1;

    // 1. Equipos (Unión de Maquinaria, Vehículos, Drones)
    const [maquinaria] = await db.query("SELECT id_maquinaria as id, 'Maquinaria' as tipo, concat(COALESCE(nombre, marca, ''), ' ', COALESCE(modelo, '')) as nombre FROM maquinaria WHERE id_tenant = ?", [id_tenant]);
    const [vehiculos] = await db.query("SELECT id_vehiculo as id, 'Vehiculo' as tipo, concat(COALESCE(marca, ''), ' ', COALESCE(modelo, ''), ' (', placa, ')') as nombre FROM vehiculos WHERE id_tenant = ?", [id_tenant]);
    const [drones] = await db.query("SELECT id as id, 'Dron' as tipo, concat('Dron SN: ', COALESCE(serial_number, '')) as nombre FROM equipos_dron");
    const equipos = [...maquinaria, ...vehiculos, ...drones];

    // 2. Mecánicos (Empleados y Terceros Proveedores)
    const [empleados] = await db.query("SELECT id_empleado as id, 'Interno' as tipo, concat(nombres, ' ', apellidos, ' (', cargo, ')') as nombre, 25000 as valor_hora FROM rrhh_empleados WHERE id_tenant = ? AND estado = 'Activo' AND (cargo LIKE '%mecánico%' OR cargo LIKE '%mecanico%' OR cargo LIKE '%taller%' OR cargo LIKE '%electricista%' OR cargo LIKE '%electromecánico%' OR cargo LIKE '%diesel%')", [id_tenant]);
    const [proveedores] = await db.query("SELECT id_tercero as id, 'Externo' as tipo, nombre_completo as nombre, 45000 as valor_hora FROM terceros WHERE id_tenant = ? AND es_proveedor = 1 AND (nombre_completo LIKE '%taller%' OR nombre_completo LIKE '%mecanic%' OR nombre_completo LIKE '%motor%' OR nombre_completo LIKE '%rectificadora%' OR nombre_completo LIKE '%diesel%' OR nombre_completo LIKE '%bosch%' OR nombre_completo LIKE '%concesionario%' OR nombre_completo LIKE '%caterpillar%')", [id_tenant]);
    const mecanicos = [...empleados, ...proveedores];

    // 3. Repuestos (Insumos) - Filtrar agroquímicos (grupo 1), semillas (grupo 6), y herramientas (grupo 2), y nulos que sean frutas/venenos
    const [repuestos] = await db.query("SELECT id_insumo as id, nombre as nombre, costo_unitario as precio, stock_actual as stock FROM insumos WHERE id_tenant = ? AND estado = 'Activo' AND (id_grupo IS NULL OR id_grupo IN (3, 4, 7, 8)) AND nombre NOT LIKE '%Fertilizante%' AND nombre NOT LIKE '%Semilla%' AND nombre NOT LIKE '%Frijol%' AND nombre NOT LIKE '%Urea%' AND nombre NOT LIKE '%Insecticida%' AND nombre NOT LIKE '%Fungicida%' AND nombre NOT LIKE '%Herbicida%' AND nombre NOT LIKE '%Naranja%'", [id_tenant]);

    res.json({
      equipos,
      mecanicos,
      repuestos
    });
  } catch (err) {
    console.error('Error obteniendo catalogos de taller:', err);
    res.status(500).json({ error: 'Error obteniendo catalogos' });
  }
});

// Obtener preliquidaciones
router.get('/', async (req, res) => {
  try {
    const db = getDb(req);
    const id_tenant = req.user?.id_tenant || 1; // Fallback para dev si no hay tenant
    
    const [rows] = await db.query(`
      SELECT p.*,
        (SELECT COUNT(*) FROM taller_preliquidacion_detalle WHERE id_preliquidacion = p.id_preliquidacion) as items_count
      FROM taller_preliquidacion p
      WHERE p.id_tenant = ?
      ORDER BY p.creado_en DESC
    `, [id_tenant]);

    // Opcional: Obtener detalles si piden el query param includeDetails
    if (req.query.includeDetails) {
      for (let p of rows) {
        const [detalles] = await db.query('SELECT * FROM taller_preliquidacion_detalle WHERE id_preliquidacion = ?', [p.id_preliquidacion]);
        p.detalles = detalles;
      }
    }

    res.json(rows);
  } catch (err) {
    console.error('Error obteniendo preliquidaciones:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear una preliquidación
router.post('/', async (req, res) => {
  try {
    const db = getDb(req);
    const id_tenant = req.user?.id_tenant || 1;
    const { 
      tipo_equipo, id_equipo, nombre_equipo, falla_reportada, diagnostico_tecnico,
      id_mecanico, tipo_mecanico, detalles 
    } = req.body;

    // Calcular totales
    let total_repuestos = 0;
    let total_mano_obra = 0;
    let total_servicios = 0;

    const items = detalles || [];
    for (let item of items) {
      const subtotal = item.cantidad * item.costo_unitario_estimado;
      if (item.tipo_item === 'Repuesto') total_repuestos += subtotal;
      if (item.tipo_item === 'Mano_Obra') total_mano_obra += subtotal;
      if (item.tipo_item === 'Servicio_Externo') total_servicios += subtotal;
    }

    const total_general = total_repuestos + total_mano_obra + total_servicios;

    await db.query('BEGIN');

    const [result] = await db.query(`
      INSERT INTO taller_preliquidacion 
      (id_tenant, tipo_equipo, id_equipo, nombre_equipo, falla_reportada, diagnostico_tecnico, id_mecanico, tipo_mecanico, total_repuestos, total_mano_obra, total_servicios, total_general, creado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id_tenant, tipo_equipo, id_equipo, nombre_equipo, falla_reportada, diagnostico_tecnico,
      id_mecanico, tipo_mecanico, total_repuestos, total_mano_obra, total_servicios, total_general, req.user?.id_usuario || null
    ]);

    const id_preliquidacion = result.insertId;

    // Insertar detalles
    if (items.length > 0) {
      const detailValues = items.map(item => [
        id_preliquidacion,
        item.tipo_item,
        item.id_referencia || null,
        item.descripcion,
        item.cantidad,
        item.costo_unitario_estimado,
        item.cantidad * item.costo_unitario_estimado,
        item.requiere_compra ? 1 : 0
      ]);
      
      await db.query(`
        INSERT INTO taller_preliquidacion_detalle 
        (id_preliquidacion, tipo_item, id_referencia, descripcion, cantidad, costo_unitario_estimado, subtotal, requiere_compra)
        VALUES ?
      `, [detailValues]);
    }

    await db.query('COMMIT');

    res.json({ success: true, message: 'Preliquidación creada exitosamente', id_preliquidacion });
  } catch (err) {
    console.error('Error creando preliquidación:', err);
    try { const db = getDb(req); await db.query('ROLLBACK'); } catch (e) {}
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Cambiar estado de la preliquidación
router.put('/:id/estado', async (req, res) => {
  try {
    const db = getDb(req);
    const { estado } = req.body;
    const { id } = req.params;

    await db.query('UPDATE taller_preliquidacion SET estado = ? WHERE id_preliquidacion = ?', [estado, id]);
    
    // Aquí podemos integrar lógica para enviar notificaciones de whatsapp si el estado cambia a "Aprobada" o "Esperando_Repuestos".
    // Por ahora solo actualiza el estado.

    res.json({ success: true, message: 'Estado actualizado' });
  } catch (error) {
    console.error('Error al cargar catálogo de preliquidación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para crear un proveedor (taller externo) rápidamente
router.post('/proveedor-rapido', async (req, res) => {
  try {
    const db = getDb(req);
    const id_tenant = req.user?.id_tenant || 1;
    const { tipo_documento, documento, dv, nombre_completo, telefono, direccion } = req.body;
    
    if (!documento || !nombre_completo) {
      return res.status(400).json({ error: 'El documento y el nombre son obligatorios para la DIAN' });
    }
    
    const tipo_persona = tipo_documento === 'NIT' ? 'Juridica' : 'Natural';
    const regimen_fiscal = tipo_persona === 'Juridica' ? 'R-99-PN' : 'O-47-PN'; // Default regimen
    const primer_n = tipo_persona === 'Natural' ? nombre_completo : null;

    const [result] = await db.query(`
      INSERT INTO terceros 
      (id_tenant, tipo_persona, tipo_documento, documento, dv, nombre_completo, primer_nombre, telefono, direccion, es_proveedor, activo, regimen_fiscal)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?)
    `, [id_tenant, tipo_persona, tipo_documento, documento, dv || null, nombre_completo, primer_n, telefono || null, direccion || null, regimen_fiscal]);
    
    res.json({ id: result.insertId, nombre: nombre_completo, tipo: 'Externo', valor_hora: 45000 });
  } catch (error) {
    console.error('Error creando proveedor rápido:', error);
    res.status(500).json({ error: 'Error al registrar el taller externo' });
  }
});

// Endpoint para obtener los repuestos sugeridos según el equipo (Ficha técnica/BOM)
router.get('/sugerencias/:id_equipo', async (req, res) => {
  try {
    const db = getDb(req);
    const id_tenant = req.user?.id_tenant || 1;
    const { id_equipo } = req.params;
    
    // Cruzar rutinas con los insumos para esa máquina
    const [rutinas] = await db.query(`
      SELECT r.id_rutina, r.nombre_rutina, i.id_insumo as id, i.nombre as nombre, 
             i.costo_unitario as precio, i.stock_actual as stock, ri.cantidad_requerida
      FROM taller_rutinas r
      JOIN taller_rutinas_insumos ri ON r.id_rutina = ri.id_rutina
      JOIN insumos i ON ri.id_insumo = i.id_insumo
      WHERE r.id_maq_agro = ? AND i.id_tenant = ? AND i.estado = 'Activo'
    `, [id_equipo, id_tenant]);

    res.json(rutinas);
  } catch (error) {
    console.error('Error cargando sugerencias de repuestos:', error);
    res.status(500).json({ error: 'Error cargando sugerencias' });
  }
});

export default router;
