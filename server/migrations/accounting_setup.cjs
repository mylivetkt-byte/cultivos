const mysql = require('mysql2/promise');

async function runMigration() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: '12345',
    database: 'sas_agricolas',
    multipleStatements: true
  });

  try {
    console.log("Starting Accounting Migration...");
    
    // 1. Alter Tables
    try {
      await connection.query(`
        ALTER TABLE comprobantes_detalle 
        ADD COLUMN id_tercero INT NULL AFTER id_cuenta;
      `);
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }
    
    try {
      await connection.query(`
        ALTER TABLE plan_contable 
        ADD COLUMN porcentaje_impuesto DECIMAL(5,2) NULL AFTER requiere_centro_costo,
        ADD COLUMN requiere_tercero TINYINT(1) DEFAULT 0 AFTER porcentaje_impuesto;
      `);
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }

    // 2. Insert Tipos de Comprobantes
    const comprobantesQuery = `
      INSERT IGNORE INTO tipos_comprobantes (id_tipo_comp, id_tenant, codigo, nombre, consecutivo_actual, es_factura_electronica) VALUES 
      (1, 1, 'ING', 'Recibo de Caja / Ingreso', 1, 0),
      (2, 1, 'EGR', 'Comprobante de Egreso', 1, 0),
      (3, 1, 'COM', 'Factura de Compra', 1, 0),
      (4, 1, 'VEN', 'Factura de Venta', 1, 1),
      (5, 1, 'DIA', 'Comprobante de Diario', 1, 0),
      (6, 1, 'NOM', 'Causación de Nómina', 1, 0),
      (7, 1, 'DEP', 'Depreciación y Amortización', 1, 0);
    `;
    await connection.query(comprobantesQuery);

    // 3. Insert Periodos Contables para 2026
    for (let i = 1; i <= 12; i++) {
      const mes = i.toString().padStart(2, '0');
      const start = `2026-${mes}-01`;
      const end = new Date(2026, i, 0).toISOString().split('T')[0];
      await connection.query(`
        INSERT IGNORE INTO periodos_contables (id_tenant, ano, mes, fecha_inicio, fecha_fin, estado)
        SELECT 1, 2026, ?, ?, ?, 'Abierto'
        WHERE NOT EXISTS (SELECT 1 FROM periodos_contables WHERE ano=2026 AND mes=?);
      `, [i, start, end, i]);
    }

    // 4. Insert Centros de Costo (Palma de Aceite)
    const ccostoQuery = `
      INSERT IGNORE INTO centros_costo (id_tenant, codigo, nombre, tipo, activo) VALUES
      (1, 'ADM-01', 'Administración General', 'Administrativo', 1),
      (1, 'VIV-01', 'Vivero y Pre-vivero', 'Productivo', 1),
      (1, 'LOT-01', 'Lote 01 - Palma Joven', 'Productivo', 1),
      (1, 'LOT-02', 'Lote 02 - Palma Adulta', 'Productivo', 1),
      (1, 'EXT-01', 'Planta Extractora', 'Industrial', 1),
      (1, 'MAQ-01', 'Maquinaria Agrícola', 'Servicios', 1);
    `;
    await connection.query(ccostoQuery);

    // 5. Insert Plan Contable (NIIF Agricola Simplificado Nivel 5)
    // Nivel 1: Clase, Nivel 2: Grupo, Nivel 3: Cuenta, Nivel 4: Subcuenta, Nivel 5: Auxiliar (Movimiento)
    const planContable = [
      // 1. ACTIVOS
      [1, '1', 'ACTIVO', 1, 'Debito', 0, null, 0],
      [1, '11', 'EFECTIVO Y EQUIVALENTES DE EFECTIVO', 2, 'Debito', 0, null, 0],
      [1, '1105', 'Caja', 3, 'Debito', 0, null, 0],
      [1, '110505', 'Caja General', 4, 'Debito', 0, null, 0],
      [1, '11050501', 'Caja Menor Administración', 5, 'Debito', 0, null, 1], // Auxiliar
      [1, '1110', 'Bancos', 3, 'Debito', 0, null, 0],
      [1, '111005', 'Bancos Nacionales', 4, 'Debito', 0, null, 0],
      [1, '11100501', 'Banco Agrario Cta Cte', 5, 'Debito', 0, null, 0], // Auxiliar
      
      // CXC
      [1, '13', 'DEUDORES (CxC)', 2, 'Debito', 0, null, 0],
      [1, '1305', 'Clientes Nacionales', 3, 'Debito', 0, null, 1],
      [1, '130505', 'Venta de Fruto Fresco (RFF)', 4, 'Debito', 0, null, 1],
      [1, '13050501', 'CxC Extractora Palmera', 5, 'Debito', 0, null, 1], // Auxiliar

      // Activos Biologicos
      [1, '14', 'INVENTARIOS', 2, 'Debito', 0, null, 0],
      [1, '1405', 'Materias Primas', 3, 'Debito', 0, null, 0],
      [1, '140505', 'Fertilizantes y Agroquímicos', 5, 'Debito', 0, null, 0], // Auxiliar
      [1, '1430', 'Activos Biológicos Consumibles (Vivero)', 3, 'Debito', 1, null, 0],
      [1, '143005', 'Plántulas de Palma', 5, 'Debito', 1, null, 0], // Auxiliar

      // Propiedad Planta y Equipo / Activos Biológicos Productores
      [1, '15', 'PROPIEDADES, PLANTA Y EQUIPO', 2, 'Debito', 0, null, 0],
      [1, '1512', 'Maquinaria y Equipo Agrícola', 3, 'Debito', 1, null, 0],
      [1, '151205', 'Tractores', 5, 'Debito', 1, null, 0], // Auxiliar
      [1, '1530', 'Activos Biológicos Productores (Palma Adulta)', 3, 'Debito', 1, null, 0],
      [1, '153005', 'Desarrollo de Plantación Palma', 5, 'Debito', 1, null, 0], // Auxiliar

      // 2. PASIVOS
      [1, '2', 'PASIVO', 1, 'Credito', 0, null, 0],
      [1, '22', 'PROVEEDORES', 2, 'Credito', 0, null, 1],
      [1, '2205', 'Nacionales', 3, 'Credito', 0, null, 1],
      [1, '220505', 'Proveedores de Insumos', 5, 'Credito', 0, null, 1], // Auxiliar

      // CXP Impuestos
      [1, '23', 'CUENTAS POR PAGAR', 2, 'Credito', 0, null, 1],
      [1, '2365', 'Retención en la Fuente', 3, 'Credito', 0, null, 1],
      [1, '236540', 'Retención por Compras Agrícolas (1.5%)', 5, 'Credito', 0, 1.5, 1], // Auxiliar
      [1, '2368', 'Impuesto de Industria y Comercio Retenido', 3, 'Credito', 0, null, 1],
      [1, '236805', 'ReteICA (0.96%)', 5, 'Credito', 0, 0.96, 1], // Auxiliar
      
      [1, '24', 'IMPUESTOS, GRAVAMENES Y TASAS', 2, 'Credito', 0, null, 0],
      [1, '2408', 'Impuesto sobre las Ventas por Pagar (IVA)', 3, 'Credito', 0, null, 0],
      [1, '240801', 'IVA Generado (19%)', 5, 'Credito', 0, 19, 0], // Auxiliar
      [1, '240802', 'IVA Descontable (19%)', 5, 'Debito', 0, 19, 0], // Auxiliar
      [1, '240803', 'IVA Bienes Exentos Agricolas (0%)', 5, 'Credito', 0, 0, 0], // Auxiliar

      // 3. PATRIMONIO
      [1, '3', 'PATRIMONIO', 1, 'Credito', 0, null, 0],
      [1, '31', 'CAPITAL SOCIAL', 2, 'Credito', 0, null, 0],
      [1, '3105', 'Capital Suscrito y Pagado', 5, 'Credito', 0, null, 0], // Auxiliar

      // 4. INGRESOS
      [1, '4', 'INGRESOS', 1, 'Credito', 0, null, 0],
      [1, '41', 'OPERACIONALES', 2, 'Credito', 0, null, 0],
      [1, '4105', 'Agricultura (Venta RFF Palma)', 3, 'Credito', 1, null, 1],
      [1, '410505', 'Ingresos por RFF Lotes', 5, 'Credito', 1, null, 1], // Auxiliar

      // 5. GASTOS
      [1, '5', 'GASTOS', 1, 'Debito', 0, null, 0],
      [1, '51', 'OPERACIONALES DE ADMINISTRACION', 2, 'Debito', 1, null, 0],
      [1, '5105', 'Gastos de Personal', 3, 'Debito', 1, null, 1],
      [1, '510506', 'Sueldos Administrativos', 5, 'Debito', 1, null, 1], // Auxiliar
      [1, '5110', 'Honorarios', 3, 'Debito', 1, null, 1],
      [1, '511005', 'Asesoría Agronómica', 5, 'Debito', 1, null, 1], // Auxiliar

      // 7. COSTOS DE PRODUCCION
      [1, '7', 'COSTOS DE PRODUCCION O DE OPERACION', 1, 'Debito', 1, null, 0],
      [1, '71', 'MATERIA PRIMA', 2, 'Debito', 1, null, 0],
      [1, '7105', 'Fertilizantes y Agroquímicos', 5, 'Debito', 1, null, 0], // Auxiliar
      [1, '72', 'MANO DE OBRA DIRECTA', 2, 'Debito', 1, null, 1],
      [1, '7205', 'Jornales Cosecha RFF', 5, 'Debito', 1, null, 1], // Auxiliar
      [1, '7210', 'Jornales Labores Culturales (Poda, Plateo)', 5, 'Debito', 1, null, 1], // Auxiliar
      [1, '73', 'COSTOS INDIRECTOS', 2, 'Debito', 1, null, 0],
      [1, '7305', 'Combustibles Maquinaria', 5, 'Debito', 1, null, 0] // Auxiliar
    ];

    for (let pc of planContable) {
      const q = `INSERT IGNORE INTO plan_contable (id_tenant, codigo, nombre, nivel, naturaleza, requiere_centro_costo, porcentaje_impuesto, requiere_tercero) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      await connection.query(q, pc);
    }

    console.log("Migration completed successfully!");

  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await connection.end();
  }
}

runMigration();
