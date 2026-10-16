import express from 'express';
import db from '../db.js';
import { getTenantPool } from '../db-tenant.js';

const router = express.Router();

// Obtener parámetros de simulación para un cultivo específico
router.get('/parametros/:id_cultivo', async (req, res) => {
  try {
    const { id_cultivo } = req.params;
    const [rows] = await db.query('SELECT * FROM catalogo_cultivos_variables WHERE id_cultivo = ?', [id_cultivo]);
    if (rows.length === 0) {
      // Default fallback parameters if not configured yet
      return res.json({
        distancia_surcos_m: 1.5,
        distancia_plantas_m: 1.5,
        porcentaje_germinacion: 95.0,
        costo_semilla_unitario: 500,
        costo_prep_hectarea: 250000,
        costo_mantenimiento_hectarea: 800000,
        precio_venta_esperado_kg: 3500,
        rendimiento_esperado_kg_ha: 15000,
        ciclo_dias: 180
      });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching parametros cultivo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para calcular la simulación financiera (Presiembra)
router.post('/simular', (req, res) => {
  try {
    const { hectareas, id_cultivo, parametros } = req.body;
    const ha = parseFloat(hectareas) || 0;
    
    // 1. Optimización de Semilla
    // 1 hectárea = 10,000 m2
    const m2 = ha * 10000;
    const areaPorPlanta = (parametros.distancia_surcos_m || 1) * (parametros.distancia_plantas_m || 1);
    const plantasTeoricas = Math.floor(m2 / areaPorPlanta);
    const factorPerdida = 100 / (parametros.porcentaje_germinacion || 100);
    const cantidadPlantasReales = Math.ceil(plantasTeoricas * factorPerdida);
    
    const costoSemilla = cantidadPlantasReales * (parametros.costo_semilla_unitario || 0);
    const costoPreparacion = ha * (parametros.costo_prep_hectarea || 0);
    const costoMantenimiento = ha * (parametros.costo_mantenimiento_hectarea || 0);
    const costoInsumos = costoMantenimiento * 0.4; // 40% del mantenimiento
    const costoManoObra = costoMantenimiento * 0.4; // 40% del mantenimiento
    const costoRiego = costoMantenimiento * 0.2; // 20% del mantenimiento

    const costoTotal = costoSemilla + costoPreparacion + costoInsumos + costoManoObra + costoRiego;
    
    // Proyección de cosecha
    const produccionEstimadaKg = ha * (parametros.rendimiento_esperado_kg_ha || 0);
    const ingresosEsperados = produccionEstimadaKg * (parametros.precio_venta_esperado_kg || 0);
    const rentabilidad = ingresosEsperados - costoTotal;
    const puntoEquilibrioKg = produccionEstimadaKg > 0 ? costoTotal / produccionEstimadaKg : 0;

    res.json({
      datos_agronomicos: {
        plantas_teoricas: plantasTeoricas,
        plantas_requeridas_con_margen: cantidadPlantasReales,
        ciclo_dias: parametros.ciclo_dias || 0,
        produccion_estimada_kg: produccionEstimadaKg
      },
      presupuesto_detallado: [
        { categoria: 'Material Vegetal / Semilla', monto: costoSemilla },
        { categoria: 'Preparación de Suelo', monto: costoPreparacion },
        { categoria: 'Insumos y Agroquímicos', monto: costoInsumos },
        { categoria: 'Jornales (Mano de Obra)', monto: costoManoObra },
        { categoria: 'Riego y Servicios', monto: costoRiego }
      ],
      totales: {
        costo_total: costoTotal,
        ingresos_esperados: ingresosEsperados,
        rentabilidad_proyectada: rentabilidad,
        punto_equilibrio_precio_kg: puntoEquilibrioKg
      }
    });

  } catch (error) {
    console.error('Error simulando presiembra:', error);
    res.status(500).json({ error: 'Error simulando presiembra' });
  }
});

// Guardar Presupuesto Asignado a la Siembra
router.post('/guardar-presupuesto', async (req, res) => {
  try {
    const { id_siembra, presupuesto_detallado, tenantId } = req.body;
    if (!id_siembra || !tenantId) return res.status(400).json({ error: 'id_siembra y tenantId son requeridos' });

    const tenantPool = await getTenantPool(tenantId);
    
    // Eliminar presupuestos anteriores si existen (por si están actualizando)
    await tenantPool.query('DELETE FROM presupuestos_siembra WHERE id_siembra = ?', [id_siembra]);

    // Insertar el nuevo detalle
    for (const item of presupuesto_detallado) {
      await tenantPool.query(
        'INSERT INTO presupuestos_siembra (id_siembra, etapa_categoria, costo_estimado) VALUES (?, ?, ?)',
        [id_siembra, item.categoria, item.monto]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error guardando presupuesto:', error);
    res.status(500).json({ error: 'Error guardando presupuesto' });
  }
});

export default router;
