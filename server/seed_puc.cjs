const mysql = require('mysql2/promise');


const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '12345',
  database: process.env.DB_NAME || 'sas_agricolas',
  port: process.env.DB_PORT || 3307
};

const pucData = [
  // CLASE 1 - ACTIVO
  { codigo: '1', nombre: 'ACTIVO', nivel: 1, naturaleza: 'Debito' },
  { codigo: '11', nombre: 'DISPONIBLE', nivel: 2, naturaleza: 'Debito' },
  { codigo: '1105', nombre: 'CAJA', nivel: 3, naturaleza: 'Debito' },
  { codigo: '110505', nombre: 'Caja General', nivel: 4, naturaleza: 'Debito' },
  { codigo: '1110', nombre: 'BANCOS', nivel: 3, naturaleza: 'Debito' },
  { codigo: '111005', nombre: 'Moneda Nacional', nivel: 4, naturaleza: 'Debito' },
  { codigo: '13', nombre: 'DEUDORES', nivel: 2, naturaleza: 'Debito' },
  { codigo: '1305', nombre: 'CLIENTES', nivel: 3, naturaleza: 'Debito' },
  { codigo: '130505', nombre: 'Nacionales', nivel: 4, naturaleza: 'Debito' },
  { codigo: '1330', nombre: 'ANTICIPOS Y AVANCES', nivel: 3, naturaleza: 'Debito' },
  { codigo: '133005', nombre: 'A Proveedores', nivel: 4, naturaleza: 'Debito' },
  { codigo: '1365', nombre: 'CUENTAS POR COBRAR A TRABAJADORES', nivel: 3, naturaleza: 'Debito' },
  { codigo: '14', nombre: 'INVENTARIOS', nivel: 2, naturaleza: 'Debito' },
  { codigo: '1405', nombre: 'MATERIAS PRIMAS', nivel: 3, naturaleza: 'Debito' },
  { codigo: '1410', nombre: 'PRODUCTOS EN PROCESO', nivel: 3, naturaleza: 'Debito' },
  { codigo: '141005', nombre: 'Agrícolas', nivel: 4, naturaleza: 'Debito' },
  { codigo: '1430', nombre: 'PRODUCTOS TERMINADOS', nivel: 3, naturaleza: 'Debito' },
  { codigo: '143005', nombre: 'Agrícolas y Forestales', nivel: 4, naturaleza: 'Debito' },
  { codigo: '1455', nombre: 'MATERIALES, REPUESTOS Y ACCESORIOS', nivel: 3, naturaleza: 'Debito' },
  { codigo: '15', nombre: 'PROPIEDADES, PLANTA Y EQUIPO', nivel: 2, naturaleza: 'Debito' },
  { codigo: '1504', nombre: 'TERRENOS', nivel: 3, naturaleza: 'Debito' },
  { codigo: '150405', nombre: 'Urbanos', nivel: 4, naturaleza: 'Debito' },
  { codigo: '150410', nombre: 'Rurales', nivel: 4, naturaleza: 'Debito' },
  { codigo: '1516', nombre: 'CONSTRUCCIONES Y EDIFICACIONES', nivel: 3, naturaleza: 'Debito' },
  { codigo: '1520', nombre: 'MAQUINARIA Y EQUIPO', nivel: 3, naturaleza: 'Debito' },
  { codigo: '1524', nombre: 'EQUIPO DE OFICINA', nivel: 3, naturaleza: 'Debito' },
  { codigo: '1540', nombre: 'FLOTA Y EQUIPO DE TRANSPORTE', nivel: 3, naturaleza: 'Debito' },
  { codigo: '1592', nombre: 'DEPRECIACIÓN ACUMULADA', nivel: 3, naturaleza: 'Credito' },
  
  // CLASE 2 - PASIVO
  { codigo: '2', nombre: 'PASIVO', nivel: 1, naturaleza: 'Credito' },
  { codigo: '21', nombre: 'OBLIGACIONES FINANCIERAS', nivel: 2, naturaleza: 'Credito' },
  { codigo: '2105', nombre: 'BANCOS NACIONALES', nivel: 3, naturaleza: 'Credito' },
  { codigo: '22', nombre: 'PROVEEDORES', nivel: 2, naturaleza: 'Credito' },
  { codigo: '2205', nombre: 'NACIONALES', nivel: 3, naturaleza: 'Credito' },
  { codigo: '23', nombre: 'CUENTAS POR PAGAR', nivel: 2, naturaleza: 'Credito' },
  { codigo: '2335', nombre: 'COSTOS Y GASTOS POR PAGAR', nivel: 3, naturaleza: 'Credito' },
  { codigo: '2365', nombre: 'RETENCIÓN EN LA FUENTE', nivel: 3, naturaleza: 'Credito' },
  { codigo: '2367', nombre: 'IMPUESTO A LAS VENTAS RETENIDO', nivel: 3, naturaleza: 'Credito' },
  { codigo: '2368', nombre: 'IMPUESTO DE INDUSTRIA Y COMERCIO RETENIDO', nivel: 3, naturaleza: 'Credito' },
  { codigo: '24', nombre: 'IMPUESTOS, GRAVÁMENES Y TASAS', nivel: 2, naturaleza: 'Credito' },
  { codigo: '2408', nombre: 'IMPUESTO SOBRE LAS VENTAS POR PAGAR', nivel: 3, naturaleza: 'Credito' },
  { codigo: '25', nombre: 'OBLIGACIONES LABORALES', nivel: 2, naturaleza: 'Credito' },
  { codigo: '2505', nombre: 'SALARIOS POR PAGAR', nivel: 3, naturaleza: 'Credito' },
  { codigo: '2510', nombre: 'CESANTÍAS CONSOLIDADAS', nivel: 3, naturaleza: 'Credito' },
  { codigo: '2515', nombre: 'INTERESES SOBRE CESANTÍAS', nivel: 3, naturaleza: 'Credito' },
  { codigo: '2520', nombre: 'PRIMA DE SERVICIOS', nivel: 3, naturaleza: 'Credito' },
  { codigo: '2525', nombre: 'VACACIONES CONSOLIDADAS', nivel: 3, naturaleza: 'Credito' },

  // CLASE 3 - PATRIMONIO
  { codigo: '3', nombre: 'PATRIMONIO', nivel: 1, naturaleza: 'Credito' },
  { codigo: '31', nombre: 'CAPITAL SOCIAL', nivel: 2, naturaleza: 'Credito' },
  { codigo: '3105', nombre: 'CAPITAL SUSCRITO Y PAGADO', nivel: 3, naturaleza: 'Credito' },
  { codigo: '3115', nombre: 'APORTES SOCIALES', nivel: 3, naturaleza: 'Credito' },
  { codigo: '36', nombre: 'RESULTADOS DEL EJERCICIO', nivel: 2, naturaleza: 'Credito' },
  { codigo: '3605', nombre: 'UTILIDAD DEL EJERCICIO', nivel: 3, naturaleza: 'Credito' },
  { codigo: '360505', nombre: 'Utilidad del Ejercicio', nivel: 4, naturaleza: 'Credito' },
  { codigo: '3610', nombre: 'PÉRDIDA DEL EJERCICIO', nivel: 3, naturaleza: 'Debito' },
  { codigo: '361005', nombre: 'Pérdida del Ejercicio', nivel: 4, naturaleza: 'Debito' },
  { codigo: '37', nombre: 'RESULTADOS DE EJERCICIOS ANTERIORES', nivel: 2, naturaleza: 'Credito' },
  { codigo: '3705', nombre: 'UTILIDADES ACUMULADAS', nivel: 3, naturaleza: 'Credito' },
  { codigo: '370505', fixedName: true, nombre: 'Utilidades o Excedentes Acumulados', nivel: 4, naturaleza: 'Credito' },
  { codigo: '3710', nombre: 'PÉRDIDAS ACUMULADAS', nivel: 3, naturaleza: 'Debito' },

  // CLASE 4 - INGRESOS
  { codigo: '4', nombre: 'INGRESOS', nivel: 1, naturaleza: 'Credito' },
  { codigo: '41', nombre: 'OPERACIONALES', nivel: 2, naturaleza: 'Credito' },
  { codigo: '4105', nombre: 'AGRICULTURA, GANADERÍA, CAZA Y SILVICULTURA', nivel: 3, naturaleza: 'Credito' },
  { codigo: '410505', nombre: 'Cultivo de Cereales', nivel: 4, naturaleza: 'Credito' },
  { codigo: '410515', nombre: 'Cultivos Frutales', nivel: 4, naturaleza: 'Credito' },
  { codigo: '410525', nombre: 'Otros Cultivos Agrícolas', nivel: 4, naturaleza: 'Credito' },
  { codigo: '42', nombre: 'NO OPERACIONALES', nivel: 2, naturaleza: 'Credito' },
  { codigo: '4210', nombre: 'FINANCIEROS', nivel: 3, naturaleza: 'Credito' },
  { codigo: '4220', nombre: 'ARRENDAMIENTOS', nivel: 3, naturaleza: 'Credito' },

  // CLASE 5 - GASTOS
  { codigo: '5', nombre: 'GASTOS', nivel: 1, naturaleza: 'Debito' },
  { codigo: '51', nombre: 'OPERACIONALES DE ADMINISTRACIÓN', nivel: 2, naturaleza: 'Debito' },
  { codigo: '5105', nombre: 'GASTOS DE PERSONAL', nivel: 3, naturaleza: 'Debito' },
  { codigo: '510506', nombre: 'Sueldos', nivel: 4, naturaleza: 'Debito' },
  { codigo: '510515', nombre: 'Horas Extras y Recargos', nivel: 4, naturaleza: 'Debito' },
  { codigo: '510527', nombre: 'Auxilio de Transporte', nivel: 4, naturaleza: 'Debito' },
  { codigo: '510530', nombre: 'Cesantías', nivel: 4, naturaleza: 'Debito' },
  { codigo: '510533', nombre: 'Intereses sobre Cesantías', nivel: 4, naturaleza: 'Debito' },
  { codigo: '510536', nombre: 'Prima de Servicios', nivel: 4, naturaleza: 'Debito' },
  { codigo: '510539', nombre: 'Vacaciones', nivel: 4, naturaleza: 'Debito' },
  { codigo: '5110', nombre: 'HONORARIOS', nivel: 3, naturaleza: 'Debito' },
  { codigo: '5115', nombre: 'IMPUESTOS', nivel: 3, naturaleza: 'Debito' },
  { codigo: '5120', nombre: 'ARRENDAMIENTOS', nivel: 3, naturaleza: 'Debito' },
  { codigo: '5135', nombre: 'SERVICIOS', nivel: 3, naturaleza: 'Debito' },
  { codigo: '5145', nombre: 'MANTENIMIENTO Y REPARACIONES', nivel: 3, naturaleza: 'Debito' },
  { codigo: '5160', nombre: 'DEPRECIACIONES', nivel: 3, naturaleza: 'Debito' },
  { codigo: '52', nombre: 'OPERACIONALES DE VENTAS', nivel: 2, naturaleza: 'Debito' },
  { codigo: '5205', nombre: 'GASTOS DE PERSONAL', nivel: 3, naturaleza: 'Debito' },
  { codigo: '53', nombre: 'NO OPERACIONALES', nivel: 2, naturaleza: 'Debito' },
  { codigo: '5305', nombre: 'FINANCIEROS', nivel: 3, naturaleza: 'Debito' },

  // CLASE 6 - COSTOS DE VENTAS
  { codigo: '6', nombre: 'COSTOS DE VENTAS', nivel: 1, naturaleza: 'Debito' },
  { codigo: '61', nombre: 'COSTO DE VENTAS Y DE PRESTACIÓN DE SERVICIOS', nivel: 2, naturaleza: 'Debito' },
  { codigo: '6105', nombre: 'AGRICULTURA, GANADERÍA, CAZA Y SILVICULTURA', nivel: 3, naturaleza: 'Debito' },
  { codigo: '610505', nombre: 'Cultivo de Cereales', nivel: 4, naturaleza: 'Debito' },
  { codigo: '610515', nombre: 'Cultivos Frutales', nivel: 4, naturaleza: 'Debito' },

  // CLASE 7 - COSTOS DE PRODUCCIÓN O DE OPERACIÓN (ESENCIAL PARA AGRICULTURA)
  { codigo: '7', nombre: 'COSTOS DE PRODUCCIÓN O DE OPERACIÓN', nivel: 1, naturaleza: 'Debito' },
  { codigo: '71', nombre: 'MATERIA PRIMA', nivel: 2, naturaleza: 'Debito' },
  { codigo: '7105', nombre: 'MATERIALES DIRECTOS AGRÍCOLAS', nivel: 3, naturaleza: 'Debito' },
  { codigo: '710505', nombre: 'Semillas y Almácigos', nivel: 4, naturaleza: 'Debito' },
  { codigo: '710510', nombre: 'Fertilizantes y Abonos', nivel: 4, naturaleza: 'Debito' },
  { codigo: '710515', nombre: 'Agroquímicos', nivel: 4, naturaleza: 'Debito' },
  { codigo: '72', nombre: 'MANO DE OBRA DIRECTA', nivel: 2, naturaleza: 'Debito' },
  { codigo: '7205', nombre: 'MANO DE OBRA AGRÍCOLA', nivel: 3, naturaleza: 'Debito' },
  { codigo: '720505', nombre: 'Sueldos Labor Agrícola', nivel: 4, naturaleza: 'Debito' },
  { codigo: '720510', nombre: 'Jornales y Contratistas', nivel: 4, naturaleza: 'Debito' },
  { codigo: '73', nombre: 'COSTOS INDIRECTOS', nivel: 2, naturaleza: 'Debito' },
  { codigo: '7305', nombre: 'COSTOS INDIRECTOS AGRÍCOLAS', nivel: 3, naturaleza: 'Debito' },
  { codigo: '730505', nombre: 'Combustibles y Lubricantes', nivel: 4, naturaleza: 'Debito' },
  { codigo: '730510', nombre: 'Mantenimiento de Maquinaria', nivel: 4, naturaleza: 'Debito' },
  { codigo: '730515', nombre: 'Depreciación Maquinaria Agrícola', nivel: 4, naturaleza: 'Debito' },
  { codigo: '74', nombre: 'CONTRATOS DE SERVICIOS', nivel: 2, naturaleza: 'Debito' },
  { codigo: '7405', nombre: 'SERVICIOS AGRÍCOLAS', nivel: 3, naturaleza: 'Debito' },
  { codigo: '740505', nombre: 'Cosecha Mecanizada', nivel: 4, naturaleza: 'Debito' }
];

async function seed() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("Conectado a la BD.");
    
    let inserted = 0;
    
    for (const cuenta of pucData) {
      // Check if it exists
      const [rows] = await connection.query('SELECT * FROM plan_contable WHERE codigo = ? AND id_tenant = 1', [cuenta.codigo]);
      if (rows.length === 0) {
        await connection.query(`
          INSERT INTO plan_contable 
          (id_tenant, codigo, nombre, nivel, naturaleza, requiere_centro_costo, requiere_tercero, activo)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          1, // tenantId = 1
          cuenta.codigo,
          cuenta.nombre,
          cuenta.nivel,
          cuenta.naturaleza,
          cuenta.codigo.startsWith('7') || cuenta.codigo.startsWith('5') || cuenta.codigo.startsWith('6') ? 1 : 0, // Por defecto requiere CC para P&G
          0, // Requiere tercero por defecto
          1
        ]);
        inserted++;
        console.log(`Insertado: ${cuenta.codigo} - ${cuenta.nombre}`);
      } else {
        // If it exists but it's a seed account (level 1-4), we might want to update the name, but let's be safe.
      }
    }

    console.log(`\n¡Semilla completada! Se inyectaron ${inserted} nuevas cuentas maestras del PUC.`);

  } catch (error) {
    console.error("Error inyectando PUC:", error);
  } finally {
    if (connection) await connection.end();
  }
}

seed();
