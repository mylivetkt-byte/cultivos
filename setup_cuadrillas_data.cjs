const mysql = require('mysql2/promise');

async function seedData() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3307,
    user: 'root',
    password: '12345',
    database: 'sas_agricolas'
  });

  try {
    console.log('--- Iniciando inyección de datos para Cuadrillas y Labores ---');

    // 1. Crear cuadrillas
    console.log('1. Creando cuadrillas (Agrícola, Ganadera, Acuícola)...');
    await connection.query(`
      INSERT INTO rrhh_cuadrillas (id_tenant, nombre, tipo, estado)
      VALUES 
        (1, 'Cuadrilla Cosecha Limón', 'Agricola', 'Activa'),
        (1, 'Cuadrilla Vaqueros', 'Ganadera', 'Activa'),
        (1, 'Cuadrilla Pesca', 'Acuicola', 'Activa')
    `);
    
    const [cuadrillas] = await connection.query('SELECT id_cuadrilla, tipo FROM rrhh_cuadrillas ORDER BY id_cuadrilla DESC LIMIT 3');
    const idCosecha = cuadrillas.find(c => c.tipo === 'Agricola').id_cuadrilla;
    const idVaqueros = cuadrillas.find(c => c.tipo === 'Ganadera').id_cuadrilla;
    const idPesca = cuadrillas.find(c => c.tipo === 'Acuicola').id_cuadrilla;

    // 2. Asegurar algunos conceptos de nómina y catálogo de labores
    console.log('2. Asegurando conceptos de nómina y labores...');
    await connection.query(`
      INSERT INTO rrhh_conceptos_nomina (codigo, nombre, tipo, naturaleza)
      VALUES 
        ('LAB-01', 'Jornal Agricola', 'Devengado', 'Variable'),
        ('LAB-02', 'Jornal Ganadero', 'Devengado', 'Variable'),
        ('LAB-03', 'Jornal Acuicola', 'Devengado', 'Variable')
      ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)
    `);

    const [conceptos] = await connection.query("SELECT id_concepto, codigo FROM rrhh_conceptos_nomina WHERE codigo IN ('LAB-01','LAB-02','LAB-03')");
    
    await connection.query(`
      INSERT INTO rrhh_catalogo_labores (id_tenant, codigo, nombre, categoria, unidad_medida, tarifa_base)
      VALUES 
        (1, 'C-LIMON', 'Cosecha de Limón Tahiti', 'Cosechas', 'Kg', 1500),
        (1, 'ORD-VACA', 'Ordeño', 'Ganaderas', 'Litros', 500),
        (1, 'PES-TILAPIA', 'Pesca de Tilapia', 'Piscícola', 'Kg', 1200)
      ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), tarifa_base = VALUES(tarifa_base)
    `);

    const [laboresCat] = await connection.query("SELECT id_labor_catalogo, codigo FROM rrhh_catalogo_labores WHERE codigo IN ('C-LIMON','ORD-VACA','PES-TILAPIA')");
    const idLaborLimon = laboresCat.find(l => l.codigo === 'C-LIMON').id_labor_catalogo;
    const idLaborVacas = laboresCat.find(l => l.codigo === 'ORD-VACA').id_labor_catalogo;
    const idLaborTilapia = laboresCat.find(l => l.codigo === 'PES-TILAPIA').id_labor_catalogo;

    // 3. Crear trabajadores y asignarlos a las cuadrillas
    console.log('3. Creando trabajadores...');
    await connection.query(`
      INSERT INTO rrhh_empleados (id_tenant, documento, nombres, apellidos, id_cuadrilla, cargo, fecha_ingreso, salario_base, tipo_contrato, estado)
      VALUES 
        (1, '10001001', 'Carlos', 'Perez', ?, 'Cosechero', CURDATE(), 1300000, 'Fijo', 'Activo'),
        (1, '10001002', 'Juan', 'Gomez', ?, 'Cosechero', CURDATE(), 1300000, 'Fijo', 'Activo'),
        (1, '10001003', 'Pedro', 'Martinez', ?, 'Vaquero', CURDATE(), 1300000, 'Fijo', 'Activo'),
        (1, '10001004', 'Luis', 'Rodriguez', ?, 'Pescador', CURDATE(), 1300000, 'Fijo', 'Activo')
      ON DUPLICATE KEY UPDATE nombres = VALUES(nombres)
    `, [idCosecha, idCosecha, idVaqueros, idPesca]);

    const [empleados] = await connection.query("SELECT id_empleado, documento FROM rrhh_empleados WHERE documento IN ('10001001','10001002','10001003','10001004')");
    const empCarlos = empleados.find(e => e.documento === '10001001').id_empleado;
    const empJuan = empleados.find(e => e.documento === '10001002').id_empleado;
    const empPedro = empleados.find(e => e.documento === '10001003').id_empleado;
    const empLuis = empleados.find(e => e.documento === '10001004').id_empleado;

    // 4. Crear labores diarias con esos trabajadores
    console.log('4. Registrando récord operativo (labores_diarias)...');
    await connection.query(`
      INSERT INTO labores_diarias (
        id_tenant, id_empleado, descripcion_labor, categoria, estado, 
        horas_trabajadas, cantidad_producida, fecha_planificada, fecha_completado,
        id_catalogo_labor
      ) VALUES 
        (1, ?, 'Cosecha de Limón Tahiti', 'Cosecha', 'Completada', 8, 150, DATE_SUB(CURDATE(), INTERVAL 1 DAY), DATE_SUB(CURDATE(), INTERVAL 1 DAY), ?),
        (1, ?, 'Cosecha de Limón Tahiti', 'Cosecha', 'Completada', 8, 160, DATE_SUB(CURDATE(), INTERVAL 1 DAY), DATE_SUB(CURDATE(), INTERVAL 1 DAY), ?),
        (1, ?, 'Ordeño', 'Ganaderia_Ordeno', 'Completada', 8, 200, DATE_SUB(CURDATE(), INTERVAL 1 DAY), DATE_SUB(CURDATE(), INTERVAL 1 DAY), ?),
        (1, ?, 'Pesca de Tilapia', 'Acuicola_Pesca', 'Completada', 8, 500, DATE_SUB(CURDATE(), INTERVAL 1 DAY), DATE_SUB(CURDATE(), INTERVAL 1 DAY), ?)
    `, [
      empCarlos, idLaborLimon,
      empJuan, idLaborLimon,
      empPedro, idLaborVacas,
      empLuis, idLaborTilapia
    ]);

    console.log('¡Datos de prueba inyectados exitosamente!');
  } catch (err) {
    console.error('Error inyectando datos:', err);
  } finally {
    await connection.end();
  }
}

seedData();
