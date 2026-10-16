import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Obtener la lista real de Fincas y Lotes
router.get('/fincas', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const [fincas] = await pool.query('SELECT id_finca, nombre, altitud_promedio, zona_agroecologica FROM fincas WHERE id_tenant = ?', [tenantId || 1]);
    const [lotes] = await pool.query('SELECT id_nucleo as id_lote, id_finca, nombre, hectareas as area_hectareas FROM nucleos');
    res.json({ fincas, lotes });
  } catch (error) {
    console.error('Error fetching fincas:', error);
    res.status(500).json({ error: 'Error obteniendo fincas reales' });
  }
});

// Obtener cultivos viables para la altitud seleccionada
router.get('/cultivos-viables', async (req, res) => {
  const { altitud } = req.query;
  try {
    const alt = parseInt(altitud) || 0;
    const [cultivos] = await pool.query('SELECT id, nombre_cultivo as nombre, tipo_cultivo as tipo, imagen_url FROM cultivos_recetas_maestras WHERE ? BETWEEN altitud_min AND altitud_max', [alt]);
    res.json(cultivos);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo cultivos' });
  }
});

// Calcular y obtener parámetros económicos reales (Motor de Precisión ABC)
router.get('/wizard-data', async (req, res) => {
  const { tenantId, fincaId, cultivo } = req.query;
  
  if (!tenantId || !fincaId || !cultivo) {
    return res.status(400).json({ error: 'tenantId, fincaId y cultivo son requeridos' });
  }

  try {
    const tId = tenantId || 1;

    // --- 1. RECETA AGRONÓMICA TÉCNICA (Por Hectárea) DESDE DB MAESTRA ---
    const [recetasDB] = await pool.query('SELECT * FROM cultivos_recetas_maestras WHERE nombre_cultivo = ? LIMIT 1', [cultivo]);
    let receta = { jornales: 45, horas_tractor: 4, semilla_kg: 45, abono_kg: 250, ciclo_dias: 120 }; // Fallback
    
    if (recetasDB.length > 0) {
      const r = recetasDB[0];
      receta = {
        jornales: r.jornales_por_ha,
        horas_tractor: r.horas_tractor_ha,
        semilla_kg: r.kg_semilla_ha,
        abono_kg: r.kg_abono_ha,
        ciclo_dias: r.ciclo_dias_total,
        tipo: r.tipo_cultivo,
        precioBase: r.precio_mercado_estimado,
        rendimiento: r.rendimiento_esperado_kg_ha
      };
    }

    // --- 2. INTELIGENCIA REGIONAL: MANO DE OBRA ---
    // Buscamos la finca para saber su zona y ajustar el precio del jornal
    const [fincas] = await pool.query('SELECT zona_agroecologica, altitud_promedio FROM fincas WHERE id_finca = ?', [fincaId]);
    const isAndina = fincas[0] && fincas[0].altitud_promedio > 1000;
    
    // Obtenemos el salario promedio base de los empleados de la empresa
    const [rrhh] = await pool.query(`
      SELECT AVG(COALESCE(salario_base, 0) / 30) as jornal_base 
      FROM rrhh_empleados 
      WHERE id_tenant = ? AND estado = 'Activo'
    `, [tId]);
    
    let jornalBase = rrhh[0].jornal_base || 45000;
    // Factor de ajuste regional
    let costoJornalRegional = isAndina ? (jornalBase * 1.1) : (jornalBase * 1.25); // Ej. Zona tropical cuesta más conseguir mano de obra

    // --- 3. CASCADA DE INSUMOS (BODEGA vs WEB API) ---
    // Simulamos la búsqueda del insumo principal (Semilla) en la bodega
    let insumoBodega = [];
    try {
      [insumoBodega] = await pool.query(`
        SELECT costo_unitario 
        FROM bod_inventario 
        WHERE id_tenant = ? AND nombre LIKE ? AND stock_actual > 0
        LIMIT 1
      `, [tId, `%${cultivo}%`]);
    } catch (e) {
      if (e.code !== 'ER_NO_SUCH_TABLE') {
        console.warn("Error consultando inventario:", e.message);
      }
      // Si la tabla no existe, insumoBodega se mantiene vacío y usa precios de la Web automáticamente
    }
    
    let costoSemillaKilo = 0;
    let fuenteSemilla = '';
    
    if (insumoBodega.length > 0 && insumoBodega[0].costo_unitario > 0) {
      costoSemillaKilo = insumoBodega[0].costo_unitario;
      fuenteSemilla = 'Stock en Bodega Interna';
    } else {
      // Simulación de consulta a API externa (Ej. Agronet / DANE)
      costoSemillaKilo = cultivo === 'Frijol' ? 12000 : 5000;
      fuenteSemilla = 'Cotización Web (Agronet Col)';
    }

    // Costo promedio de abono/fertilizante (Simulado por simplificación de la consulta)
    let costoAbonoKilo = 2500; 
    let costoTotalInsumosHa = (receta.semilla_kg * costoSemillaKilo) + (receta.abono_kg * costoAbonoKilo);

    // --- 4. MAQUINARIA Y GASTOS ---
    // Costo hora tractor regional
    let costoHoraTractor = isAndina ? 80000 : 95000; 
    let costoMaquinariaHa = receta.horas_tractor * costoHoraTractor;
    let gastosVariosHa = 150000; // Imprevistos

    // --- 5. PRECIO DE MERCADO (VENTAS) ---
    const [precios] = await pool.query(`
      SELECT precio_cop 
      FROM com_precios_mercado 
      WHERE producto LIKE ? 
      ORDER BY fecha DESC LIMIT 1
    `, [`%${cultivo}%`]);
    let precioMercadoKg = precios.length > 0 ? precios[0].precio_cop : (receta.precioBase || 4500);

    // --- 6. IA: ALTERNATIVAS RENTABLES ---
    const altitudFinca = fincas[0] && fincas[0].altitud_promedio ? fincas[0].altitud_promedio : 0;
    const [todasLasRecetas] = await pool.query('SELECT * FROM cultivos_recetas_maestras WHERE altitud_min <= ? AND altitud_max >= ? AND nombre_cultivo != ?', [altitudFinca, altitudFinca, cultivo]);
    
    let alternativas = todasLasRecetas.map(r => {
      // Costos por Ha
      const costoInsumos = (r.kg_semilla_ha * 5000) + (r.kg_abono_ha * 2500);
      const costoManoObra = r.jornales_por_ha * costoJornalRegional;
      const costoMaq = r.horas_tractor_ha * costoHoraTractor;
      const totalCosto = costoInsumos + costoManoObra + costoMaq + 150000;
      
      // Ventas por Ha
      const ventas = r.rendimiento_esperado_kg_ha * r.precio_mercado_estimado;
      const roi = ventas - totalCosto;
      
      return {
        cultivo: r.nombre_cultivo,
        roi_ha: roi,
        precio: r.precio_mercado_estimado,
        rendimiento: r.rendimiento_esperado_kg_ha
      };
    });
    
    // Sort by ROI desc and take top 2
    alternativas.sort((a, b) => b.roi_ha - a.roi_ha);
    const topAlternativas = alternativas.slice(0, 2);

    // Fetch Transporters
    const [transportadores] = await pool.query('SELECT * FROM com_empresas_transportadoras WHERE especialidad = "Agricola" AND activo = 1');

    // Retornamos el paquete de inteligencia
    res.json({
      receta_tecnica: receta,
      costos_unitarios: {
        jornal_mano_obra: Math.round(costoJornalRegional),
        insumos_hectarea: Math.round(costoTotalInsumosHa),
        maquinaria_hectarea: Math.round(costoMaquinariaHa),
        gastos_varios_hectarea: gastosVariosHa
      },
      fuentes_datos: {
        semilla_origen: fuenteSemilla,
        costo_semilla_kilo: costoSemillaKilo
      },
      mercado: {
        precio_kilo_actual: Math.round(precioMercadoKg)
      },
      alternativas_rentables: topAlternativas,
      transportadores: transportadores
    });

  } catch (error) {
    console.error('Error en /wizard-data:', error);
    res.status(500).json({ error: 'Error calculando costos reales' });
  }
});

router.post('/guardar', async (req, res) => {
  const { tenantId, fincaId, cultivoId, nombre_proyecto, area_hectareas, costo_proyectado, ventas_proyectadas, ganancia_proyectada, vehiculos_requeridos } = req.body;
  try {
    const [result] = await pool.query(`
      INSERT INTO simulaciones_historico 
      (id_tenant, id_finca, id_cultivo, nombre_proyecto, area_hectareas, costo_proyectado, ventas_proyectadas, ganancia_proyectada, vehiculos_requeridos)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [tenantId || 1, fincaId, cultivoId || 1, nombre_proyecto, area_hectareas, costo_proyectado, ventas_proyectadas, ganancia_proyectada, vehiculos_requeridos]);
    res.json({ success: true, simulacion_id: result.insertId });
  } catch (error) {
    console.error('Error al guardar simulación:', error);
    res.status(500).json({ error: 'Error al guardar' });
  }
});

export default router;
