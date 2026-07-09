import * as dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'sas_agricolas',
  port: parseInt(process.env.MYSQL_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function runDemoData() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    console.log("Iniciando creación de datos demo...");

    // 0. Proveedor Demo
    const suffix = Date.now().toString().slice(-4);
    let [provResult] = await connection.query(`
      INSERT INTO terceros (id_tenant, tipo_persona, tipo_documento, documento, nombre_completo, es_proveedor, activo)
      VALUES (1, 'Juridica', 'NIT', ?, CONCAT('Agroquímicos del Norte S.A.S. - ', ?), 1, 1)
    `, ['900123' + suffix, suffix]);
    const idProveedor = provResult.insertId;

    // 1. Crear Insumos Comerciales (Fertilizantes y Agroquímicos)
    console.log("Creando insumos químicos...");
    let idInsumosComerciales = [];
    const comerciales = [
      { nombre: 'Fungicida Premium Demo ' + suffix, codigo: 'DEMO-Q01-' + suffix, unidad: 'Litro', costo: 45000, tipo: 'Producto', origen: 'Nacional' },
      { nombre: 'Herbicida Glifo-X Demo ' + suffix, codigo: 'DEMO-Q02-' + suffix, unidad: 'Litro', costo: 32000, tipo: 'Producto', origen: 'Nacional' },
      { nombre: 'Insecticida Barrera Demo ' + suffix, codigo: 'DEMO-Q03-' + suffix, unidad: 'Litro', costo: 55000, tipo: 'Producto', origen: 'Nacional' }
    ];
    for (const c of comerciales) {
      const [res] = await connection.query(`
        INSERT INTO insumos (id_tenant, nombre, codigo, unidad_medida, costo_unitario, origen, stock_actual, tipo_item, id_proveedor)
        VALUES (1, ?, ?, ?, ?, ?, 0, ?, ?)
      `, [c.nombre, c.codigo, c.unidad, c.costo, c.origen, c.tipo, idProveedor]);
      idInsumosComerciales.push(res.insertId);
    }

    // 2. Crear Materia Prima para Violes
    console.log("Creando materia prima...");
    let idMateriasPrimas = [];
    const materias = [
      { nombre: 'Melaza Orgánica Demo ' + suffix, codigo: 'DEMO-M01-' + suffix, unidad: 'Litro', costo: 2500, tipo: 'Producto' },
      { nombre: 'Microorganismos Eficientes EM Demo ' + suffix, codigo: 'DEMO-M02-' + suffix, unidad: 'Litro', costo: 8000, tipo: 'Producto' },
      { nombre: 'Levadura Agrícola Demo ' + suffix, codigo: 'DEMO-M03-' + suffix, unidad: 'Kilo', costo: 15000, tipo: 'Producto' }
    ];
    for (const m of materias) {
      const [res] = await connection.query(`
        INSERT INTO insumos (id_tenant, nombre, codigo, unidad_medida, costo_unitario, origen, stock_actual, tipo_item, id_proveedor)
        VALUES (1, ?, ?, ?, ?, 'Nacional', 0, ?, ?)
      `, [m.nombre, m.codigo, m.unidad, m.costo, m.tipo, idProveedor]);
      idMateriasPrimas.push(res.insertId);
    }

    // 3. Crear Productos Terminados (Violes / Biofábrica)
    console.log("Creando Violes...");
    let idVioles = [];
    let idAgentesBiologicos = [];
    const violes = [
      { nombre: 'Viol Súper Raíz Demo ' + suffix, codigo: 'DEMO-B01-' + suffix, unidad: 'Litro', tipo: 'Producto' },
      { nombre: 'Viol Anti-Plagas Demo ' + suffix, codigo: 'DEMO-B02-' + suffix, unidad: 'Litro', tipo: 'Producto' }
    ];
    for (const v of violes) {
      const [resAgente] = await connection.query(`
        INSERT INTO agentes_biologicos (codigo, nombre_comun, tipo, costo_unitario, unidad_medida)
        VALUES (?, ?, 'Biofertilizante', 0, ?)
      `, [v.codigo, v.nombre, v.unidad]);
      idAgentesBiologicos.push(resAgente.insertId);

      const [res] = await connection.query(`
        INSERT INTO insumos (id_tenant, nombre, codigo, unidad_medida, costo_unitario, origen, stock_actual, tipo_item)
        VALUES (1, ?, ?, ?, 0, 'Nacional', 0, ?)
      `, [v.nombre, v.codigo, v.unidad, v.tipo]);
      idVioles.push(res.insertId);
    }

    // 4. Registrar Entrada de Almacén (COMPRA)
    console.log("Ingresando compras de comerciales y materias primas al almacén...");
    const [docCompra] = await connection.query(`
      INSERT INTO inv_documentos (id_tenant, id_tipo, consecutivo, fecha, estado, observaciones)
      VALUES (1, 1, ?, CURDATE(), 'Aplicado', 'Compra inicial de inventario demo')
    `, ['ENT-DEMO-' + suffix]);
    const idDocCompra = docCompra.insertId;

    // Ingresar saldos de compra
    let totalCompra = 0;
    
    // Cantidades a comprar
    const qtyComercial = 200; // 200 de cada químico
    const qtyMateriaPrima = 1000; // 1000 de cada materia prima
    
    for (let i = 0; i < comerciales.length; i++) {
      const idIns = idInsumosComerciales[i];
      const costo = comerciales[i].costo;
      await connection.query(`INSERT INTO inv_existencias (id_bodega, id_insumo, cantidad, costo_promedio) VALUES (1, ?, ?, ?)`, [idIns, qtyComercial, costo]);
      await connection.query(`UPDATE insumos SET stock_actual = ? WHERE id_insumo = ?`, [qtyComercial, idIns]);
      await connection.query(`INSERT INTO movimientos_inventario (id_tenant, id_insumo, tipo_movimiento, cantidad, costo_unitario, fecha_movimiento, id_documento, id_bodega, observaciones, usuario_responsable) VALUES (1, ?, 'ENTRADA', ?, ?, NOW(), ?, 1, 'Compra Demo', 1)`, [idIns, qtyComercial, costo, idDocCompra]);
      totalCompra += (qtyComercial * costo);
    }
    
    for (let i = 0; i < materias.length; i++) {
      const idIns = idMateriasPrimas[i];
      const costo = materias[i].costo;
      await connection.query(`INSERT INTO inv_existencias (id_bodega, id_insumo, cantidad, costo_promedio) VALUES (1, ?, ?, ?)`, [idIns, qtyMateriaPrima, costo]);
      await connection.query(`UPDATE insumos SET stock_actual = ? WHERE id_insumo = ?`, [qtyMateriaPrima, idIns]);
      await connection.query(`INSERT INTO movimientos_inventario (id_tenant, id_insumo, tipo_movimiento, cantidad, costo_unitario, fecha_movimiento, id_documento, id_bodega, observaciones, usuario_responsable) VALUES (1, ?, 'ENTRADA', ?, ?, NOW(), ?, 1, 'Compra Demo Materias Primas', 1)`, [idIns, qtyMateriaPrima, costo, idDocCompra]);
      totalCompra += (qtyMateriaPrima * costo);
    }

    // 5. Contabilidad de la Compra
    console.log("Generando Comprobante Diario de Compras...");
    const [compCompra] = await connection.query(`
      INSERT INTO contab_comprobantes (id_tenant, id_periodo, id_tipo_comp, numero, descripcion, estado, fecha_creacion)
      VALUES (1, 1, 1, ?, 'Comprobante Diario de Compras - Demo', 'Abierto', CURDATE())
    `, ['CD-COMP-' + suffix]);
    const idCompCompra = compCompra.insertId;
    
    const [docContabCompra] = await connection.query(`
      INSERT INTO contab_documentos (id_tenant, id_comprobante, id_tipo_doc, numero_doc, fecha, concepto, estado)
      VALUES (1, ?, 1, ?, CURDATE(), 'Compra inicial Demo', 'Aprobado')
    `, [idCompCompra, 'DOC-COMP-' + suffix]);
    const idDocContabCompra = docContabCompra.insertId;

    await connection.query(`
      INSERT INTO contab_detalles (id_documento, id_cuenta, descripcion, debito, credito, id_tercero)
      VALUES (?, 1, 'Inventario General', ?, 0, ?),
             (?, 2, 'Cuentas por Pagar Proveedores', 0, ?, ?)
    `, [idDocContabCompra, totalCompra, idProveedor, idDocContabCompra, totalCompra, idProveedor]);

    // 6. Proceso de BIOFÁBRICA (Producción del Viol 1: Super Raíz)
    console.log("Simulando producción en Biofábrica...");
    // Consumo de Melaza (M01) y EM (M02)
    const melazaConsumida = 300;
    const emConsumido = 50;
    const costoJornal = 120000;
    const idLoteBio = 1;
    
    await connection.query(`UPDATE insumos SET stock_actual = stock_actual - ? WHERE id_insumo = ?`, [melazaConsumida, idMateriasPrimas[0]]);
    await connection.query(`UPDATE insumos SET stock_actual = stock_actual - ? WHERE id_insumo = ?`, [emConsumido, idMateriasPrimas[1]]);
    
    const costoViol1 = (melazaConsumida * materias[0].costo) + (emConsumido * materias[1].costo);
    const cantidadViol1 = 350; // Se producen 350L de Viol
    const costoUnitarioViol1 = Math.round(costoViol1 / cantidadViol1);

    const [prod1] = await connection.query(`
      INSERT INTO app_produccion_organica (id_tenant, lote_id, producto, id_insumo, cantidad_litros, costo_materiales, costo_jornales)
      VALUES (1, ?, ?, ?, ?, ?, ?)
    `, [idLoteBio, violes[0].nombre, idVioles[0], cantidadViol1, costoViol1, costoJornal]);
    const idProd1 = prod1.insertId;

    // Detalles:
    await connection.query(`
      INSERT INTO app_produccion_organica_detalles (id_produccion, id_insumo, cantidad, costo_unitario, costo_total)
      VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)
    `, [
      idProd1, idMateriasPrimas[0], melazaConsumida, materias[0].costo, melazaConsumida * materias[0].costo,
      idProd1, idMateriasPrimas[1], emConsumido, materias[1].costo, emConsumido * materias[1].costo
    ]);

    // Registro en agentes biológicos (para herencia en otras tablas si se requiere)
    await connection.query(`
      INSERT INTO produccion_agentes_biologicos (id_tenant, id_agente, fecha_produccion, cantidad_producida, costo_produccion)
      VALUES (1, ?, CURDATE(), ?, ?)
    `, [idAgentesBiologicos[0], cantidadViol1, costoViol1]);

    // Ingresar Producto Terminado (Viol 1)
    await connection.query(`INSERT INTO inv_existencias (id_bodega, id_insumo, cantidad, costo_promedio) VALUES (1, ?, ?, ?)`, [idVioles[0], cantidadViol1, costoUnitarioViol1]);
    await connection.query(`UPDATE insumos SET stock_actual = ?, costo_unitario = ? WHERE id_insumo = ?`, [cantidadViol1, costoUnitarioViol1, idVioles[0]]);
    await connection.query(`INSERT INTO movimientos_inventario (id_tenant, id_insumo, tipo_movimiento, cantidad, costo_unitario, fecha_movimiento, id_bodega, observaciones, usuario_responsable) VALUES (1, ?, 'ENTRADA', ?, ?, NOW(), 1, 'Producción Biofábrica Lote 1', 1)`, [idVioles[0], cantidadViol1, costoUnitarioViol1]);

    // Producción Viol 2 (Anti-Plagas)
    const melazaConsumida2 = 200;
    const levaduraConsumida = 10;
    await connection.query(`UPDATE insumos SET stock_actual = stock_actual - ? WHERE id_insumo = ?`, [melazaConsumida2, idMateriasPrimas[0]]);
    await connection.query(`UPDATE insumos SET stock_actual = stock_actual - ? WHERE id_insumo = ?`, [levaduraConsumida, idMateriasPrimas[2]]);
    
    const costoViol2 = (melazaConsumida2 * materias[0].costo) + (levaduraConsumida * materias[2].costo);
    const cantidadViol2 = 200; // 200L
    const costoUnitarioViol2 = Math.round(costoViol2 / cantidadViol2);

    const [prod2] = await connection.query(`
      INSERT INTO app_produccion_organica (id_tenant, lote_id, producto, id_insumo, cantidad_litros, costo_materiales, costo_jornales)
      VALUES (1, ?, ?, ?, ?, ?, ?)
    `, [idLoteBio, violes[1].nombre, idVioles[1], cantidadViol2, costoViol2, costoJornal]);
    const idProd2 = prod2.insertId;

    await connection.query(`
      INSERT INTO app_produccion_organica_detalles (id_produccion, id_insumo, cantidad, costo_unitario, costo_total)
      VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)
    `, [
      idProd2, idMateriasPrimas[0], melazaConsumida2, materias[0].costo, melazaConsumida2 * materias[0].costo,
      idProd2, idMateriasPrimas[2], levaduraConsumida, materias[2].costo, levaduraConsumida * materias[2].costo
    ]);

    await connection.query(`
      INSERT INTO produccion_agentes_biologicos (id_tenant, id_agente, fecha_produccion, cantidad_producida, costo_produccion)
      VALUES (1, ?, CURDATE(), ?, ?)
    `, [idAgentesBiologicos[1], cantidadViol2, costoViol2]);

    // Ingresar Producto Terminado (Viol 2)
    await connection.query(`INSERT INTO inv_existencias (id_bodega, id_insumo, cantidad, costo_promedio) VALUES (1, ?, ?, ?)`, [idVioles[1], cantidadViol2, costoUnitarioViol2]);
    await connection.query(`UPDATE insumos SET stock_actual = ?, costo_unitario = ? WHERE id_insumo = ?`, [cantidadViol2, costoUnitarioViol2, idVioles[1]]);
    await connection.query(`INSERT INTO movimientos_inventario (id_tenant, id_insumo, tipo_movimiento, cantidad, costo_unitario, fecha_movimiento, id_bodega, observaciones, usuario_responsable) VALUES (1, ?, 'ENTRADA', ?, ?, NOW(), 1, 'Producción Biofábrica Lote 2', 1)`, [idVioles[1], cantidadViol2, costoUnitarioViol2]);

    // Contabilidad de Producción Biofábrica
    console.log("Generando Comprobante Diario de Producción...");
    const totalCostoBiofabrica = costoViol1 + costoViol2;
    const [compProd] = await connection.query(`
      INSERT INTO contab_comprobantes (id_tenant, id_periodo, id_tipo_comp, numero, descripcion, estado, fecha_creacion)
      VALUES (1, 1, 2, ?, 'Comprobante Diario de Producción - Violes Demo', 'Abierto', CURDATE())
    `, ['CD-PROD-' + suffix]);
    
    const [docContabProd] = await connection.query(`
      INSERT INTO contab_documentos (id_tenant, id_comprobante, id_tipo_doc, numero_doc, fecha, concepto, estado)
      VALUES (1, ?, 2, ?, CURDATE(), 'Producción inicial Demo', 'Aprobado')
    `, [compProd.insertId, 'DOC-PROD-' + suffix]);

    await connection.query(`
      INSERT INTO contab_detalles (id_documento, id_cuenta, descripcion, debito, credito)
      VALUES (?, 1, 'Inventario Producto Terminado Biológico', ?, 0),
             (?, 3, 'Inventario Materias Primas Consumidas', 0, ?)
    `, [docContabProd.insertId, totalCostoBiofabrica, docContabProd.insertId, totalCostoBiofabrica]);

    await connection.commit();
    console.log("¡Datos Demo inyectados con éxito!");
  } catch (error) {
    await connection.rollback();
    console.error("Error ejecutando los datos demo, rollback iniciado:", error);
  } finally {
    connection.release();
    process.exit(0);
  }
}

runDemoData();
