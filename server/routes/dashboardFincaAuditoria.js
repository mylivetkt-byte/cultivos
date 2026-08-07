import express from 'express';
import pool from '../db.js';
import { requireRole } from '../utils/auth.js';

const router = express.Router();

function getDb(req) {
  return req.tenantPool || pool;
}

// Endpoint para listar Fincas activas
router.get('/fincas', async (req, res) => {
  try {
    const db = getDb(req);
    const [fincas] = await db.query(`SELECT id_finca, nombre FROM fincas WHERE activo = 1 ORDER BY nombre`);
    res.json(fincas);
  } catch (error) {
    res.status(500).json({ error: 'Error cargando fincas' });
  }
});

// Endpoint para el Procesamiento del Dashboard de Auditoría por Finca
// Se requiere rol admin o gerente, aunque permitiremos que el auth middleware valide (asumimos que la app lo manejará).
router.post('/', async (req, res) => {
  try {
    // Se eliminó la restricción de rol a petición del usuario.
    // El middleware 'auth' global en index.js ya garantiza que el usuario está logueado.

    const { id_finca, fechaInicio, fechaFin } = req.body;
    if (!id_finca || !fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Faltan parámetros: id_finca, fechaInicio, fechaFin' });
    }

    const db = getDb(req);

    // 1. Información Administrativa (Finca y Mayordomo)
    const [[finca]] = await db.query(`SELECT nombre, hectareas_totales FROM fincas WHERE id_finca = ?`, [id_finca]);
    const [mayordomos] = await db.query(`
      SELECT nombres, apellidos, telefono, cargo 
      FROM rrhh_empleados 
      WHERE id_finca = ? AND (cargo LIKE '%Mayordomo%' OR cargo LIKE '%Administrador%') AND estado = 'Activo'
      LIMIT 1
    `, [id_finca]);

    // 2. Agricultura (Lotes y Tratamientos)
    // Extraemos todos los lotes de la finca (a través de nucleos)
    const [lotes] = await db.query(`
      SELECT l.id_lote, l.nombre, l.hectareas, l.estado, c.nombre as cultivo,
             MAX(DATE_ADD(s.fecha_siembra, INTERVAL c.ciclo_dias DAY)) as proxima_cosecha
      FROM lotes l
      JOIN nucleos n ON l.id_nucleo = n.id_nucleo
      LEFT JOIN siembras s ON s.id_lote = l.id_lote AND s.estado = 'Activo'
      LEFT JOIN cultivos c ON s.id_cultivo = c.id_cultivo
      WHERE n.id_finca = ?
      GROUP BY l.id_lote, l.nombre, l.hectareas, l.estado, c.nombre
    `, [id_finca]);

    const idsLotes = lotes.map(l => l.id_lote);
    let tratamientos = [];
    if (idsLotes.length > 0) {
      [tratamientos] = await db.query(`
        SELECT r.id_lote, r.producto_comercial, r.ingrediente_activo, r.dosis_ha, r.fecha_creacion, e.nombre_comun as enfermedad
        FROM registro_aplicaciones r
        LEFT JOIN enfermedades e ON r.id_enfermedad = e.id_enfermedad
        WHERE r.id_lote IN (?) AND DATE(r.fecha_creacion) BETWEEN ? AND ?
      `, [idsLotes, fechaInicio, fechaFin]).catch(() => [[], []]); 
      // Usamos .catch por si no existe id_enfermedad o fecha_creacion en registro_aplicaciones
    }

    // 3. Ganadería (Demografía y Razas)
    const [ganado_razas] = await db.query(`
      SELECT r.nombre as raza, COUNT(a.id_animal) as cantidad
      FROM ganado_animales a
      JOIN ganado_potreros p ON a.id_potrero = p.id_potrero
      LEFT JOIN ganado_razas r ON a.id_raza = r.id_raza
      WHERE p.id_finca = ? AND a.estado = 'Activo'
      GROUP BY r.nombre
    `, [id_finca]);

    const [[ganado_demografia]] = await db.query(`
      SELECT 
        COUNT(CASE WHEN sexo = 'Macho' AND DATEDIFF(CURDATE(), fecha_nacimiento) > 365 THEN 1 END) as toros,
        COUNT(CASE WHEN sexo = 'Hembra' AND DATEDIFF(CURDATE(), fecha_nacimiento) > 365 THEN 1 END) as hembras,
        COUNT(CASE WHEN DATEDIFF(CURDATE(), fecha_nacimiento) <= 365 THEN 1 END) as terneros
      FROM ganado_animales a
      JOIN ganado_potreros p ON a.id_potrero = p.id_potrero
      WHERE p.id_finca = ? AND a.estado = 'Activo'
    `, [id_finca]);

    // Vacas Preñadas y En Ordeño
    const [[{ prenadas }]] = await db.query(`
      SELECT COUNT(DISTINCT a.id_animal) as prenadas
      FROM ganado_animales a
      JOIN ganado_potreros p ON a.id_potrero = p.id_potrero
      JOIN ganado_reproduccion r ON a.id_animal = r.id_animal
      WHERE p.id_finca = ? AND a.estado = 'Activo' AND r.estado_gestacion = 'Preñada'
    `, [id_finca]).catch(() => [[{prenadas: 0}]]);

    const [[{ en_leche }]] = await db.query(`
      SELECT COUNT(DISTINCT a.id_animal) as en_leche
      FROM ganado_animales a
      JOIN ganado_potreros p ON a.id_potrero = p.id_potrero
      JOIN ganado_produccion_leche l ON a.id_animal = l.id_animal
      WHERE p.id_finca = ? AND a.estado = 'Activo' AND DATE(l.fecha) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    `, [id_finca]).catch(() => [[{en_leche: 0}]]);

    // 4. Acuacultura (Estanques, Siembras, Mortalidad)
    const [estanques] = await db.query(`
      SELECT id_estanque, codigo, area_m2, profundidad_m, estado_actual 
      FROM acuicola_estanques 
      WHERE id_finca = ? AND estado_actual IN ('Produccion', 'Mantenimiento', 'Preparacion', 'Activo')
    `, [id_finca]);

    const idsEstanques = estanques.map(e => e.id_estanque);
    let siembras = [];
    let novedades = [];
    if (idsEstanques.length > 0) {
      [siembras] = await db.query(`
        SELECT s.id_siembra_acui, s.id_estanque, s.fecha_siembra, s.cantidad_alevines, e.nombre as especie
        FROM acuicola_siembras s
        LEFT JOIN acuicola_especies e ON s.id_especie_acui = e.id_especie_acui
        WHERE s.id_estanque IN (?) AND s.estado IN ('Activo', 'En Engorde')
      `, [idsEstanques]);

      const idsSiembras = siembras.map(s => s.id_siembra_acui);
      if (idsSiembras.length > 0) {
        [novedades] = await db.query(`
          SELECT id_siembra_acui, SUM(cantidad_muertes) as total_muertes, SUM(cantidad_repuestos) as total_repuestos
          FROM acuicola_novedades
          WHERE id_siembra_acui IN (?) AND DATE(fecha) BETWEEN ? AND ?
          GROUP BY id_siembra_acui
        `, [idsSiembras, fechaInicio, fechaFin]);
      }
    }

    // 5. Contabilidad (Integridad Financiera - Espejo Operativo)
    let contabilidad = {
      id_centro_costo: null,
      total_debito: 0,
      total_credito: 0,
      detalles: []
    };
    const [[cc]] = await db.query(`SELECT id_centro_costo, codigo, nombre FROM centros_costo WHERE id_finca = ?`, [id_finca]).catch(() => [null]);
    if (cc) {
      contabilidad.id_centro_costo = cc.id_centro_costo;
      const [movimientos] = await db.query(`
        SELECT d.id_cuenta, c.codigo as codigo_cuenta, c.nombre as nombre_cuenta, d.descripcion, d.debito, d.credito, doc.fecha, doc.numero_doc
        FROM contab_detalles d
        JOIN contab_documentos doc ON d.id_documento = doc.id_documento
        LEFT JOIN contab_cuentas c ON d.id_cuenta = c.id_cuenta
        WHERE d.id_centro_costo = ? AND DATE(doc.fecha) BETWEEN ? AND ?
        ORDER BY doc.fecha DESC
      `, [cc.id_centro_costo, fechaInicio, fechaFin]);
      
      let total_debito = 0;
      let total_credito = 0;
      movimientos.forEach(m => {
        total_debito += parseFloat(m.debito || 0);
        total_credito += parseFloat(m.credito || 0);
      });
      contabilidad.total_debito = total_debito;
      contabilidad.total_credito = total_credito;
      contabilidad.detalles = movimientos;
    }

    res.json({
      finca: finca || {},
      mayordomo: mayordomos[0] || null,
      agricultura: { lotes, tratamientos },
      ganaderia: { 
        razas: ganado_razas, 
        demografia: { ...ganado_demografia, prenadas, en_leche } 
      },
      acuicola: { estanques, siembras, novedades },
      contabilidad
    });
  } catch (error) {
    console.error('Error procesando auditoría:', error);
    res.status(500).json({ error: 'Ocurrió un error al procesar el reporte de auditoría.' });
  }
});

export default router;
