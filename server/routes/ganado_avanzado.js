import express from 'express';
import pool from '../db.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(process.cwd(), 'uploads', 'ganado');
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// 1. Dashboard Censo y Mapa Satelital
router.get('/dashboard', async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, id_finca, id_potrero } = req.query;
    
    // Build finca filter — animals belong to hatos which belong to fincas
    let fincaFilter = '';
    const params = [];
    if (id_finca) {
      fincaFilter = 'AND a.id_hato IN (SELECT id_hato FROM ganado_hatos WHERE id_finca = ?)';
      params.push(id_finca);
    }

    // Censo actual
    const [censo] = await pool.query(`
      SELECT 
        SUM(CASE WHEN sexo = 'Macho' AND edad_meses >= 12 THEN 1 ELSE 0 END) as machos_ceba,
        SUM(CASE WHEN sexo = 'Hembra' AND edad_meses >= 12 THEN 1 ELSE 0 END) as hembras_cria,
        SUM(CASE WHEN edad_meses < 12 THEN 1 ELSE 0 END) as terneros,
        COUNT(*) as total
      FROM (
        SELECT a.sexo, TIMESTAMPDIFF(MONTH, a.fecha_nacimiento, CURDATE()) as edad_meses
        FROM ganado_animales a
        WHERE a.estado = 'Activo' ${fincaFilter}
      ) as t
    `, params);

    // Potreros y ocupación satelital
    let potrerosQuery = `
      SELECT p.id_potrero, p.nombre, p.hectareas, p.capacidad_carga, p.estado, p.latitud, p.longitud,
        (SELECT COUNT(*) FROM ganado_animales a WHERE a.id_potrero = p.id_potrero AND a.estado='Activo') as ocupacion_actual
      FROM ganado_potreros p
    `;
    const potrerosParams = [];
    if (id_finca) {
      potrerosQuery += ' WHERE p.id_finca = ?';
      potrerosParams.push(id_finca);
    }
    potrerosQuery += ' ORDER BY p.nombre ASC';
    const [potreros] = await pool.query(potrerosQuery, potrerosParams);

    // Piscinas de Baño
    const [piscinas] = await pool.query(`SELECT id_piscina, nombre_piscina, latitud, longitud, capacidad_litros, producto_activo, estado FROM ganado_piscinas_bano`);

    // Animales con GPS (latitud y longitud real)
    let animalesQuery = `
      SELECT id_animal, arete_crotal as arete, latitud as lat, longitud as lng, (SELECT nombre FROM ganado_potreros WHERE id_potrero = a.id_potrero) as potrero
      FROM ganado_animales a
      WHERE a.estado = 'Activo' AND a.latitud IS NOT NULL AND a.longitud IS NOT NULL
    `;
    const animalesParams = [];
    if (id_finca) {
      animalesQuery += ' AND a.id_hato IN (SELECT id_hato FROM ganado_hatos WHERE id_finca = ?)';
      animalesParams.push(id_finca);
    }
    const [animalesGps] = await pool.query(animalesQuery, animalesParams);

    res.json({ censo: censo[0], potreros, piscinas, animalesGps });


// 1b. KPIs Alta Gerencia
router.get('/kpis', async (req, res) => {
  try {
    const { id_finca, id_hato, id_raza, fecha_inicio, fecha_fin } = req.query;
    
    // Filtros para la vista actual de animales vivos (Censo Demográfico)
    let filterA = 'WHERE a.estado = "Activo"';
    const paramsA = [];
    if (id_finca) {
      filterA += ' AND a.id_hato IN (SELECT id_hato FROM ganado_hatos WHERE id_finca = ?)';
      paramsA.push(id_finca);
    }
    if (id_hato) { filterA += ' AND a.id_hato = ?'; paramsA.push(id_hato); }
    if (id_raza) { filterA += ' AND a.id_raza = ?'; paramsA.push(id_raza); }

    // Filtros para los historicos (Sanidad, Costos, Engorde)
    let filterH = '';
    const paramsH = [];
    if (id_finca) { filterH += ' AND a.id_hato IN (SELECT id_hato FROM ganado_hatos WHERE id_finca = ?)'; paramsH.push(id_finca); }
    if (id_hato) { filterH += ' AND a.id_hato = ?'; paramsH.push(id_hato); }
    if (id_raza) { filterH += ' AND a.id_raza = ?'; paramsH.push(id_raza); }
    if (fecha_inicio && fecha_fin) {
      // Note: replaced in each subquery as AND tabla.fecha BETWEEN ? AND ?
    }

    // 1. Censo Total (Machos, Hembras, Terneros)
    const [censo] = await pool.query(`
      SELECT 
        SUM(CASE WHEN a.sexo = 'Macho' AND TIMESTAMPDIFF(MONTH, a.fecha_nacimiento, CURDATE()) >= 12 THEN 1 ELSE 0 END) as machos_ceba,
        SUM(CASE WHEN a.sexo = 'Hembra' AND TIMESTAMPDIFF(MONTH, a.fecha_nacimiento, CURDATE()) >= 12 THEN 1 ELSE 0 END) as hembras_cria,
        SUM(CASE WHEN TIMESTAMPDIFF(MONTH, a.fecha_nacimiento, CURDATE()) < 12 THEN 1 ELSE 0 END) as terneros,
        COUNT(a.id_animal) as total
      FROM ganado_animales a
      ${filterA}
    `, paramsA);

    // 2. Demografía por Fincas
    const [censo_fincas] = await pool.query(`
      SELECT f.nombre as name, COUNT(a.id_animal) as value
      FROM ganado_animales a
      JOIN ganado_hatos h ON a.id_hato = h.id_hato
      JOIN fincas f ON h.id_finca = f.id_finca
      ${filterA}
      GROUP BY f.nombre
    `, paramsA);

    // 3. Demografía por Razas
    const [censo_razas] = await pool.query(`
      SELECT r.nombre as name, COUNT(a.id_animal) as value
      FROM ganado_animales a
      JOIN ganado_razas r ON a.id_raza = r.id_raza
      ${filterA}
      GROUP BY r.nombre
    `, paramsA);

    // 4. Flujo Financiero (Costos, Ventas, Utilidad)
    let qCostos = `
      SELECT 
        mes, 
        SUM(compras) as compras, 
        SUM(ventas) as ventas, 
        SUM(perdidas) as perdidas,
        (SUM(ventas) - SUM(compras) - SUM(perdidas)) as utilidad
      FROM (
        SELECT DATE_FORMAT(c.fecha, '%Y-%m') as mes, c.valor as compras, 0 as ventas, 0 as perdidas
        FROM ganado_compras c
        JOIN ganado_animales a ON c.id_animal = a.id_animal
        WHERE 1=1 ${filterH.replace(/a\./g, 'a.')}
        ${fecha_inicio && fecha_fin ? ' AND c.fecha BETWEEN ? AND ?' : ''}
        
        UNION ALL
        
        SELECT DATE_FORMAT(v.fecha, '%Y-%m') as mes, 0 as compras, v.valor as ventas, 0 as perdidas
        FROM ganado_ventas v
        JOIN ganado_animales a ON v.id_animal = a.id_animal
        WHERE 1=1 ${filterH.replace(/a\./g, 'a.')}
        ${fecha_inicio && fecha_fin ? ' AND v.fecha BETWEEN ? AND ?' : ''}
        
        UNION ALL
        
        SELECT DATE_FORMAT(m.fecha, '%Y-%m') as mes, 0 as compras, 0 as ventas, m.impacto_economico as perdidas
        FROM ganado_mortalidad m
        JOIN ganado_animales a ON m.id_animal = a.id_animal
        WHERE 1=1 ${filterH.replace(/a\./g, 'a.')}
        ${fecha_inicio && fecha_fin ? ' AND m.fecha BETWEEN ? AND ?' : ''}
      ) t
      GROUP BY mes ORDER BY mes ASC
    `;
    
    const pCostos = [];
    // For Compras
    pCostos.push(...paramsH);
    if(fecha_inicio && fecha_fin) pCostos.push(fecha_inicio, fecha_fin);
    // For Ventas
    pCostos.push(...paramsH);
    if(fecha_inicio && fecha_fin) pCostos.push(fecha_inicio, fecha_fin);
    // For Mortalidad
    pCostos.push(...paramsH);
    if(fecha_inicio && fecha_fin) pCostos.push(fecha_inicio, fecha_fin);

    const [costos] = await pool.query(qCostos, pCostos);

    // 5. Sanidad Mensual
    let qSanidad = `
      SELECT DATE_FORMAT(s.fecha, '%Y-%m') as mes, COUNT(s.id_sanidad) as enfermedades
      FROM ganado_sanidad s
      JOIN ganado_animales a ON s.id_animal = a.id_animal
      WHERE 1=1 ${filterH.replace(/a\./g, 'a.')}
    `;
    const pSanidad = [...paramsH];
    if(fecha_inicio && fecha_fin) { qSanidad += ' AND s.fecha BETWEEN ? AND ?'; pSanidad.push(fecha_inicio, fecha_fin); }
    qSanidad += ' GROUP BY mes ORDER BY mes ASC';
    const [sanidad] = await pool.query(qSanidad, pSanidad);

    // 6. Vacunacion Mensual
    let qVacunas = `
      SELECT DATE_FORMAT(v.fecha, '%Y-%m') as mes, COUNT(v.id_vacunacion) as vacunas
      FROM ganado_vacunacion v
      JOIN ganado_animales a ON v.id_animal = a.id_animal
      WHERE 1=1 ${filterH.replace(/a\./g, 'a.')}
    `;
    const pVacunas = [...paramsH];
    if(fecha_inicio && fecha_fin) { qVacunas += ' AND v.fecha BETWEEN ? AND ?'; pVacunas.push(fecha_inicio, fecha_fin); }
    qVacunas += ' GROUP BY mes ORDER BY mes ASC';
    const [vacunacion] = await pool.query(qVacunas, pVacunas);

    // 7. Engorde Mensual
    let qEngorde = `
      SELECT DATE_FORMAT(p.fecha_pesaje, '%Y-%m') as mes, AVG(p.ganancia_diaria_g) as avg_ganancia
      FROM ganado_pesajes p
      JOIN ganado_animales a ON p.id_animal = a.id_animal
      WHERE 1=1 ${filterH.replace(/a\./g, 'a.')}
    `;
    const pEngorde = [...paramsH];
    if(fecha_inicio && fecha_fin) { qEngorde += ' AND p.fecha_pesaje BETWEEN ? AND ?'; pEngorde.push(fecha_inicio, fecha_fin); }
    qEngorde += ' GROUP BY mes ORDER BY mes ASC';
    const [engorde] = await pool.query(qEngorde, pEngorde);

    // Merge Sanidad and Vacunacion by Month
    const saludMap = {};
    sanidad.forEach(s => saludMap[s.mes] = { mes: s.mes, enfermedades: s.enfermedades, vacunas: 0 });
    vacunacion.forEach(v => {
      if(!saludMap[v.mes]) saludMap[v.mes] = { mes: v.mes, enfermedades: 0, vacunas: 0 };
      saludMap[v.mes].vacunas = v.vacunas;
    });
    const salud = Object.values(saludMap).sort((a,b) => a.mes.localeCompare(b.mes));

    // 8. Visitas Técnicas (Real Data from DB)
    const pVisitas = [];
    let qVisitas = `
      SELECT CONCAT(f.nombre, ' - ', IFNULL(p.nombre, 'General')) as ubicacion, COUNT(v.id_visita) as cantidad
      FROM visitas_tecnicas v
      JOIN visitas_tecnicas_detalles vd ON v.id_visita = vd.id_visita
      JOIN ganado_potreros p ON vd.id_origen = p.id_potrero AND vd.tabla_origen = 'ganado_potreros'
      JOIN fincas f ON p.id_finca = f.id_finca
      WHERE v.modulo = 'Ganadería' AND YEAR(v.fecha_visita) = YEAR(CURDATE())
    `;
    if (id_finca) {
      qVisitas += ' AND f.id_finca = ?';
      pVisitas.push(id_finca);
    }
    qVisitas += ' GROUP BY f.nombre, p.nombre ORDER BY cantidad DESC LIMIT 10';
    const [visitas] = await pool.query(qVisitas, pVisitas);

    res.json({
      censo: censo[0],
      demografia: { fincas: censo_fincas, razas: censo_razas },
      costos,
      salud,
      engorde,
      visitas
    });
  } catch(error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Ficha de Animal
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    let queryObj = [];
    let qStr = '';
    if (!q) {
      qStr = `SELECT id_animal, arete_crotal, nombre, collar_gps_id FROM ganado_animales WHERE estado = 'Activo' ORDER BY id_animal DESC LIMIT 20`;
    } else {
      const param = `%${q}%`;
      qStr = `SELECT id_animal, arete_crotal, nombre, collar_gps_id FROM ganado_animales WHERE arete_crotal LIKE ? OR nombre LIKE ? OR collar_gps_id LIKE ? LIMIT 20`;
      queryObj = [param, param, param];
    }
    const [animales] = await pool.query(qStr, queryObj);
    res.json(animales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/ficha/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    
    // Función recursiva para obtener un animal con sus datos de pedigrí
    async function getAnimal(identificador, isId = false) {
      const q = isId 
        ? 'SELECT a.*, p.nombre as potrero_nombre, r.nombre as raza, TIMESTAMPDIFF(MONTH, a.fecha_nacimiento, CURDATE()) as edad_meses FROM ganado_animales a LEFT JOIN ganado_potreros p ON a.id_potrero = p.id_potrero LEFT JOIN ganado_razas r ON a.id_raza = r.id_raza WHERE a.id_animal = ?'
        : 'SELECT a.*, p.nombre as potrero_nombre, r.nombre as raza, TIMESTAMPDIFF(MONTH, a.fecha_nacimiento, CURDATE()) as edad_meses FROM ganado_animales a LEFT JOIN ganado_potreros p ON a.id_potrero = p.id_potrero LEFT JOIN ganado_razas r ON a.id_raza = r.id_raza WHERE a.arete_crotal = ? OR a.nombre = ? OR a.collar_gps_id = ? LIMIT 1';
      
      const params = isId ? [identificador] : [identificador, identificador, identificador];
      const [rows] = await pool.query(q, params);
      
      if (rows.length === 0) return null;
      
      const animal = rows[0];
      
      // Obtener pedigrí si lo tiene
      const [pedigriRows] = await pool.query('SELECT * FROM ganado_pedigri WHERE id_animal = ?', [animal.id_animal]);
      if (pedigriRows.length > 0) {
        animal.pedigri = pedigriRows[0];
      }

      // Obtener fotografías
      const [fotosRows] = await pool.query('SELECT * FROM ganado_fotografias WHERE id_animal = ? ORDER BY es_principal DESC, fecha_toma DESC', [animal.id_animal]);
      animal.fotos = fotosRows;

      return animal;
    }

    const animal = await getAnimal(codigo, false);
    if (!animal) return res.status(404).json({ error: 'Animal no encontrado' });

    // Cargar Padres
    if (animal.id_padre) animal.padre = await getAnimal(animal.id_padre, true);
    if (animal.id_madre) animal.madre = await getAnimal(animal.id_madre, true);

    // Cargar Abuelos
    if (animal.padre?.id_padre) animal.padre.padre = await getAnimal(animal.padre.id_padre, true);
    if (animal.padre?.id_madre) animal.padre.madre = await getAnimal(animal.padre.id_madre, true);
    if (animal.madre?.id_padre) animal.madre.padre = await getAnimal(animal.madre.id_padre, true);
    if (animal.madre?.id_madre) animal.madre.madre = await getAnimal(animal.madre.id_madre, true);

    // Módulo Financiero / Rentabilidad
    let costo_adquisicion = 0;
    if (animal.es_comprada) {
      const [compra] = await pool.query('SELECT valor FROM ganado_compras WHERE id_animal = ? LIMIT 1', [animal.id_animal]);
      if (compra.length > 0) costo_adquisicion = parseFloat(compra[0].valor);
    } else {
      // Costo de destete estimado (ej. $200 USD)
      costo_adquisicion = 200;
    }

    // Costo de Mantenimiento (ej. $15 USD x mes de edad)
    const costo_mantenimiento = animal.edad_meses * 15;
    const inversion_total = costo_adquisicion + costo_mantenimiento;

    // Valor de venta proyectado
    // Precio por KG estimado $2.5 USD
    let valor_mercado = (animal.peso_actual_kg || 0) * 2.5;
    
    // Si tiene pedigrí, el valor aumenta (ej. + 30% o usamos el mérito genético base)
    if (animal.pedigri) {
      valor_mercado += parseFloat(animal.pedigri.merito_genetico_usd || 0) * 0.1; // 10% del mérito se suma al valor base
    }

    const rentabilidad_usd = valor_mercado - inversion_total;
    const rentabilidad_porcentaje = inversion_total > 0 ? (rentabilidad_usd / inversion_total) * 100 : 0;

    const listo_para_venta = (animal.sexo === 'Macho' && animal.peso_actual_kg > 450) || (animal.sexo === 'Hembra' && animal.edad_meses > 72);

    animal.finanzas = {
      costo_adquisicion,
      costo_mantenimiento,
      inversion_total,
      valor_mercado,
      rentabilidad_usd,
      rentabilidad_porcentaje,
      listo_para_venta
    };

    // Historial (Unimos varias tablas)
    const [historial] = await pool.query(`
      SELECT 'Vacunación' as tipo, CONCAT('Aplicada: ', tipo_vacuna, ' (', IFNULL(dosis, ''), ')') as desc_hist, fecha FROM ganado_vacunacion WHERE id_animal = ?
      UNION ALL
      SELECT 'Sanidad' as tipo, CONCAT('Diag: ', diagnostico, ' - Tratamiento: ', IFNULL(tratamiento, 'N/A')) as desc_hist, fecha FROM ganado_sanidad WHERE id_animal = ?
      UNION ALL
      SELECT 'Compra' as tipo, CONCAT('Adquisición a ', IFNULL(vendedor, 'Proveedor Anónimo'), ' por $', IFNULL(valor, 0)) as desc_hist, fecha FROM ganado_compras WHERE id_animal = ?
      ORDER BY fecha DESC
    `, [animal.id_animal, animal.id_animal, animal.id_animal]);

    res.json({ animal, historial });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 2b. Historia Clínica Avanzada (Modal)
router.get('/historia/:animalId', async (req, res) => {
  try {
    const { animalId } = req.params;
    const [animales] = await pool.query(`
      SELECT a.*, 
        p.nombre as potrero,
        f.nombre as finca,
        r.nombre as raza,
        e.nombre as especie,
        TIMESTAMPDIFF(MONTH, a.fecha_nacimiento, CURDATE()) as edad_meses
      FROM ganado_animales a
      LEFT JOIN ganado_potreros p ON a.id_potrero = p.id_potrero
      LEFT JOIN fincas f ON p.id_finca = f.id_finca
      LEFT JOIN ganado_razas r ON a.id_raza = r.id_raza
      LEFT JOIN ganado_especies e ON r.id_especie = e.id_especie
      WHERE a.id_animal = ? OR a.arete_crotal = ?
      LIMIT 1
    `, [animalId, animalId]);

    if (animales.length === 0) return res.status(404).json({ error: 'Animal no encontrado' });
    const animal = animales[0];

    const [historial] = await pool.query(`
      SELECT 'Vacunacion' as modulo, tipo_vacuna, NULL as diagnostico, NULL as tratamiento, NULL as tipo_evento, NULL as observaciones, dosis, veterinario, fecha FROM ganado_vacunacion WHERE id_animal = ?
      UNION ALL
      SELECT 'Sanidad' as modulo, NULL, diagnostico, tratamiento, NULL, NULL, NULL, NULL, fecha FROM ganado_sanidad WHERE id_animal = ?
      UNION ALL
      SELECT 'Reproduccion' as modulo, NULL, NULL, NULL, tipo_evento, observaciones, NULL, NULL, fecha FROM ganado_reproduccion WHERE id_animal = ?
      ORDER BY fecha DESC
    `, [animal.id_animal, animal.id_animal, animal.id_animal]);

    res.json({ animal, historial });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/historia/:animalId', async (req, res) => {
  try {
    const { animalId } = req.params;
    const { modulo, fecha, diagnostico, tratamiento, tipo_evento, observaciones, tipo_vacuna, dosis, proxima_fecha, veterinario } = req.body;

    if (modulo === 'Sanidad') {
      await pool.query('INSERT INTO ganado_sanidad (id_animal, diagnostico, tratamiento, fecha) VALUES (?, ?, ?, ?)', [animalId, diagnostico, tratamiento, fecha]);
    } else if (modulo === 'Reproduccion') {
      await pool.query('INSERT INTO ganado_reproduccion (id_animal, tipo_evento, observaciones, fecha) VALUES (?, ?, ?, ?)', [animalId, tipo_evento, observaciones, fecha]);
    } else if (modulo === 'Vacunacion') {
      await pool.query('INSERT INTO ganado_vacunacion (id_animal, tipo_vacuna, dosis, proxima_fecha, veterinario, fecha) VALUES (?, ?, ?, ?, ?, ?)', [animalId, tipo_vacuna, dosis, proxima_fecha || null, veterinario, fecha]);
    } else {
      return res.status(400).json({ error: 'Módulo desconocido' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});


// 3. Comercio (Compras y Ventas)
router.post('/compras', async (req, res) => {
  try {
    const { 
      fecha, arete_crotal, nombre, sexo, fecha_nacimiento, 
      procedencia, vendedor, valor, es_lote, cantidad_animales, 
      id_tenant, id_hato, id_raza, id_potrero, tipo_entrada 
    } = req.body;
    
    const tenant = id_tenant || 1;
    const isLote = Boolean(es_lote);
    const cantidad = isLote ? parseInt(cantidad_animales, 10) || 1 : 1;
    const isObsequio = tipo_entrada === 'Obsequio';
    const valorTotal = isObsequio ? 0 : (parseFloat(valor) || 0);
    const valorUnitario = valorTotal / cantidad;

    const hatoId = id_hato || 1;
    const razaId = id_raza || 1;
    const potreroId = id_potrero || null;

    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      const ids_animales = [];

      for (let i = 0; i < cantidad; i++) {
        let currentArete = arete_crotal;
        let currentNombre = nombre;
        if (isLote) {
          currentArete = `LOTE-${Date.now()}-${i}`;
          currentNombre = nombre ? `${nombre} ${i+1}` : `Animal Lote ${i+1}`;
        }

        const [resAnimal] = await conn.query(
          'INSERT INTO ganado_animales (arete_crotal, nombre, sexo, fecha_nacimiento, estado, id_hato, id_raza, id_potrero) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [currentArete, currentNombre, sexo || 'Macho', fecha_nacimiento, 'Activo', hatoId, razaId, potreroId]
        );
        const id_animal = resAnimal.insertId;
        ids_animales.push(id_animal);

        // Siempre registramos en compras para trazabilidad (incluso obsequios)
        await conn.query(
          'INSERT INTO ganado_compras (fecha, id_animal, procedencia, vendedor, valor, observaciones) VALUES (?, ?, ?, ?, ?, ?)',
          [fecha, id_animal, procedencia, vendedor || (isObsequio ? 'Donante' : ''), valorUnitario, isObsequio ? 'Entrada por Obsequio' : '']
        );
      }

      // Accounting integration
      const accionText = isObsequio ? 'Recepción de obsequio' : 'Compra';
      const conceptoContable = isLote 
        ? `${accionText} de lote de ${cantidad} animales (Procedencia: ${procedencia})`
        : `${accionText} de animal ${arete_crotal || nombre}`;

      await conn.query(
        `INSERT INTO contab_documentos 
        (id_tenant, id_comprobante, id_tipo_doc, numero_doc, fecha, concepto, id_tercero, estado, tabla_origen, id_origen) 
        VALUES (?, ?, 3, ?, ?, ?, 1, 'Borrador', 'ganado_compras', ?)`,
        [tenant, isObsequio ? 5 : 1, `ENT-GAN-${Date.now()}`, fecha, conceptoContable, ids_animales[0]] // id_comprobante 5 = ingresos no op / 1 = compras
      );

      await conn.commit();
      res.json({ success: true, ids_animales });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error(error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El arete o crotal ingresado ya existe.' });
    }
    res.status(500).json({ error: error.message });
  }
});

router.post('/ventas', async (req, res) => {
  try {
    const { 
      fecha, id_animal, comprador, valor, peso_venta_kg, es_lote, animales, 
      id_tenant, tipo_salida, causa_presunta, diagnostico_veterinario, impacto_economico
    } = req.body;
    
    const tenant = id_tenant || 1;
    const isLote = Boolean(es_lote);
    const salidaTipo = tipo_salida || 'Venta';
    const isMuerte = salidaTipo === 'Muerte';
    const isObsequio = salidaTipo === 'Obsequio';
    
    // animales can be passed as an array if it's a lot, or just fallback to id_animal if single
    let idsToSell = [];
    if (isLote && Array.isArray(animales)) {
      idsToSell = animales;
    } else if (id_animal) {
      idsToSell = [id_animal];
    }

    if (idsToSell.length === 0) {
      return res.status(400).json({ error: 'No se especificaron animales para procesar.' });
    }

    const valorTotal = (isMuerte || isObsequio) ? 0 : (parseFloat(valor) || 0);
    const valorUnitario = valorTotal / idsToSell.length;
    const pesoUnitario = peso_venta_kg ? parseFloat(peso_venta_kg) / idsToSell.length : null;

    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      for (const id of idsToSell) {
        if (isMuerte) {
          await conn.query(
            'INSERT INTO ganado_mortalidad (id_animal, causa_presunta, diagnostico_veterinario, fecha, impacto_economico) VALUES (?, ?, ?, ?, ?)',
            [id, causa_presunta || 'No especificada', diagnostico_veterinario, fecha, impacto_economico || 0]
          );
          await conn.query('UPDATE ganado_animales SET estado = ? WHERE id_animal = ?', ['Muerto', id]);
        } else {
          await conn.query(
            'INSERT INTO ganado_ventas (fecha, id_animal, comprador, valor, peso_venta_kg, observaciones) VALUES (?, ?, ?, ?, ?, ?)',
            [fecha, id, comprador || (isObsequio ? 'Beneficiario Obsequio' : ''), valorUnitario, pesoUnitario, isObsequio ? 'Salida por Obsequio' : '']
          );
          await conn.query('UPDATE ganado_animales SET estado = ? WHERE id_animal = ?', ['Vendido', id]);
        }
      }

      // Accounting integration
      let idComprobante = 2; // 2 = ingresos/ventas
      let conceptoContable = '';
      let tablaOrigen = '';
      
      if (isMuerte) {
        idComprobante = 4; // Asumiendo 4 es notas o ajustes
        conceptoContable = isLote ? `Baja por Muerte de ${idsToSell.length} semovientes. Causa: ${causa_presunta}` : `Baja por Muerte de semoviente ID ${idsToSell[0]}. Causa: ${causa_presunta}`;
        tablaOrigen = 'ganado_mortalidad';
      } else if (isObsequio) {
        idComprobante = 4; // Ajuste o gasto
        conceptoContable = isLote ? `Salida por obsequio de ${idsToSell.length} semovientes a ${comprador}` : `Salida por obsequio de semoviente ID ${idsToSell[0]} a ${comprador}`;
        tablaOrigen = 'ganado_ventas';
      } else {
        idComprobante = 2;
        conceptoContable = isLote ? `Venta de lote de ${idsToSell.length} semovientes a ${comprador}` : `Venta de semoviente ID ${idsToSell[0]} a ${comprador}`;
        tablaOrigen = 'ganado_ventas';
      }

      await conn.query(
        `INSERT INTO contab_documentos 
        (id_tenant, id_comprobante, id_tipo_doc, numero_doc, fecha, concepto, id_tercero, estado, tabla_origen, id_origen) 
        VALUES (?, ?, 1, ?, ?, ?, 1, 'Borrador', ?, ?)`,
        [tenant, idComprobante, `SAL-GAN-${Date.now()}`, fecha, conceptoContable, tablaOrigen, idsToSell[0]]
      );

      await conn.commit();
      res.json({ success: true, count: idsToSell.length });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Leche
router.post('/leche', async (req, res) => {
  try {
    const { fecha, litros, cliente, tipo_pago, valor_total } = req.body;
    await pool.query(
      'INSERT INTO ganado_ventas_leche (fecha, litros, cliente, tipo_pago, valor_total) VALUES (?, ?, ?, ?, ?)',
      [fecha, litros, cliente, tipo_pago, valor_total]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Historia Clínica y Reproductiva
router.get('/historia/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener información del animal
    const [animales] = await pool.query(`
      SELECT a.*, e.nombre as especie, r.nombre as raza, p.nombre as potrero, h.nombre as finca,
      TIMESTAMPDIFF(MONTH, a.fecha_nacimiento, CURDATE()) as edad_meses
      FROM ganado_animales a
      LEFT JOIN ganado_especies e ON a.id_especie = e.id_especie
      LEFT JOIN ganado_razas r ON a.id_raza = r.id_raza
      LEFT JOIN ganado_potreros p ON a.id_potrero = p.id_potrero
      LEFT JOIN ganado_hatos h ON a.id_hato = h.id_hato
      WHERE a.id_animal = ?
    `, [id]);
    
    if (animales.length === 0) return res.status(404).json({ error: 'Animal no encontrado' });
    const animal = animales[0];

    // Obtener eventos reproductivos
    const [repro] = await pool.query('SELECT *, "Reproduccion" as modulo FROM ganado_reproduccion WHERE id_animal = ? ORDER BY fecha DESC', [id]);
    
    // Obtener eventos sanitarios
    const [sanidad] = await pool.query('SELECT *, "Sanidad" as modulo FROM ganado_sanidad WHERE id_animal = ? ORDER BY fecha DESC', [id]);
    
    // Obtener vacunaciones
    const [vacunas] = await pool.query('SELECT *, "Vacunacion" as modulo FROM ganado_vacunacion WHERE id_animal = ? ORDER BY fecha DESC', [id]);

    // Consolidar historial
    const historial = [...repro, ...sanidad, ...vacunas].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    res.json({ animal, historial });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/historia/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { modulo, fecha, ...datos } = req.body;
    
    if (modulo === 'Reproduccion') {
      const { tipo_evento, observaciones } = datos;
      await pool.query('INSERT INTO ganado_reproduccion (id_animal, tipo_evento, fecha, observaciones) VALUES (?, ?, ?, ?)', [id, tipo_evento, fecha, observaciones]);
    } else if (modulo === 'Sanidad') {
      const { diagnostico, tratamiento } = datos;
      await pool.query('INSERT INTO ganado_sanidad (id_animal, diagnostico, tratamiento, fecha) VALUES (?, ?, ?, ?)', [id, diagnostico, tratamiento, fecha]);
    } else if (modulo === 'Vacunacion') {
      const { tipo_vacuna, dosis, veterinario, proxima_fecha } = datos;
      await pool.query('INSERT INTO ganado_vacunacion (id_animal, tipo_vacuna, fecha, dosis, veterinario, proxima_fecha) VALUES (?, ?, ?, ?, ?, ?)', [id, tipo_vacuna, fecha, dosis, veterinario, proxima_fecha || null]);
    } else {
      return res.status(400).json({ error: 'Módulo inválido' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/estudio', async (req, res) => {
  try {
    const [fotos] = await pool.query('SELECT f.*, a.nombre, a.arete_crotal, r.nombre as raza FROM ganado_fotografias f JOIN ganado_animales a ON f.id_animal = a.id_animal LEFT JOIN ganado_razas r ON a.id_raza = r.id_raza ORDER BY f.fecha_toma DESC');
    res.json(fotos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/estudio', upload.single('foto'), async (req, res) => {
  try {
    const { id_animal, descripcion, es_principal } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ninguna imagen.' });
    }
    
    // Convert to boolean since form-data might send 'true' or 'false' string
    const isPrincipal = es_principal === 'true' || es_principal === true;
    
    // Use the /uploads/ganado/ path so frontend can access it via the static route
    const url_foto = `/uploads/ganado/${req.file.filename}`;
    
    await pool.query(
      'INSERT INTO ganado_fotografias (id_animal, url_foto, descripcion, fecha_toma, es_principal) VALUES (?, ?, ?, CURDATE(), ?)',
      [id_animal, url_foto, descripcion || '', isPrincipal]
    );
    
    res.json({ success: true, url_foto });
  } catch (err) {
    console.error('Error al subir foto:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/estudio/:id_foto', async (req, res) => {
  try {
    const { id_foto } = req.params;
    
    // Optional: Fetch file path to delete it from disk
    const [rows] = await pool.query('SELECT url_foto FROM ganado_fotografias WHERE id_foto = ?', [id_foto]);
    if (rows.length > 0) {
      const filePath = path.join(process.cwd(), rows[0].url_foto);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    await pool.query('DELETE FROM ganado_fotografias WHERE id_foto = ?', [id_foto]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error al borrar foto:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
