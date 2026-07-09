const mysql = require('mysql2/promise');

async function run() {
  const pool = mysql.createPool({host:'localhost',port:3307,user:'root',password:'12345',database:'sas_agricolas', multipleStatements: true});
  
  try {
    console.log("Limpiando y refactorizando esquema de empleados...");
    
    // Disable FK checks to safely alter
    await pool.query('SET FOREIGN_KEY_CHECKS=0');

    // Drop redundant empty table (handle task constraint)
    try {
        await pool.query('ALTER TABLE tasks DROP FOREIGN KEY tasks_ibfk_1');
    } catch(e) {}
    await pool.query('DROP TABLE IF EXISTS empleados');
    
    // Add id_tercero to rrhh_empleados
    try {
      await pool.query('ALTER TABLE rrhh_empleados ADD COLUMN id_tercero INT AFTER id_empleado');
    } catch(e) { console.log("id_tercero might already exist"); }

    // Since it only has 2 rows and we will generate massive data, let's just truncate it to avoid migration complex mapping for now
    // Wait, let's preserve the existing 2 rows by mapping them to terceros!
    const [existing] = await pool.query('SELECT * FROM rrhh_empleados');
    if (existing.length > 0) {
        for (const emp of existing) {
            if (!emp.id_tercero && emp.documento) {
                // Check if third party exists
                let [t] = await pool.query('SELECT id_tercero FROM terceros WHERE documento = ?', [emp.documento]);
                let t_id = null;
                if (t.length > 0) {
                    t_id = t[0].id_tercero;
                    await pool.query('UPDATE terceros SET es_empleado = 1 WHERE id_tercero = ?', [t_id]);
                } else {
                    // Create it
                    const [res] = await pool.query(`INSERT INTO terceros 
                        (id_tenant, tipo_persona, tipo_documento, documento, nombre_completo, direccion, telefono, email, es_empleado)
                        VALUES (1, 'Natural', 'CC', ?, ?, ?, ?, ?, 1)`,
                        [emp.documento, emp.nombres + ' ' + emp.apellidos, emp.direccion_residencia, emp.telefonos, emp.correo_electronico]);
                    t_id = res.insertId;
                }
                await pool.query('UPDATE rrhh_empleados SET id_tercero = ? WHERE id_empleado = ?', [t_id, emp.id_empleado]);
            }
        }
    }

    // Now drop the duplicated columns
    try {
        await pool.query(`
            ALTER TABLE rrhh_empleados 
            DROP COLUMN documento,
            DROP COLUMN nombres,
            DROP COLUMN apellidos,
            DROP COLUMN direccion_residencia,
            DROP COLUMN telefonos,
            DROP COLUMN correo_electronico
        `);
    } catch(e) { console.log("Columns already dropped"); }

    // Add FK
    try {
        await pool.query('ALTER TABLE rrhh_empleados ADD CONSTRAINT fk_rrhh_tercero FOREIGN KEY (id_tercero) REFERENCES terceros(id_tercero)');
    } catch(e) { console.log("FK already exists"); }

    await pool.query('SET FOREIGN_KEY_CHECKS=1');
    console.log("Esquema de RRHH actualizado exitosamente.");

    console.log("Generando empleados para las distintas áreas de la finca...");
    
    const nuevosEmpleados = [
        { doc: '100100100', nom: 'Carlos Ruiz', cargo: 'Director de Grupo', area: 'Administrativo', sal: 4500000 },
        { doc: '100100101', nom: 'Alberto Suarez', cargo: 'Jefe de Taller Mecánico', area: 'Logistica', sal: 3200000 },
        { doc: '100100102', nom: 'Miguel Vargas', cargo: 'Mecánico de Tractores', area: 'Logistica', sal: 1800000 },
        { doc: '100100103', nom: 'Luis Pineda', cargo: 'Mecánico de Maquinaria Pesada', area: 'Logistica', sal: 1900000 },
        { doc: '100100104', nom: 'Roberto Gómez', cargo: 'Jefe de Producción Aceites', area: 'Planta', sal: 3500000 },
        { doc: '100100105', nom: 'Jorge Martinez', cargo: 'Operario Planta Extractora', area: 'Planta', sal: 1500000 },
        { doc: '100100106', nom: 'Fernando Torres', cargo: 'Jefe de Recolección (Cosecha)', area: 'Campo', sal: 2800000 },
        { doc: '100100107', nom: 'Pedro Castaño', cargo: 'Recolector Fruta', area: 'Campo', sal: 1400000 },
        { doc: '100100108', nom: 'Juan Giraldo', cargo: 'Recolector Fruta', area: 'Campo', sal: 1400000 },
        { doc: '100100109', nom: 'Diego López', cargo: 'Recolector Fruta', area: 'Campo', sal: 1400000 },
        { doc: '100100110', nom: 'Andrés Felipe Muñoz', cargo: 'Supervisor Vivero', area: 'Campo', sal: 2000000 },
        { doc: '100100111', nom: 'Oscar Osorio', cargo: 'Operario Vivero', area: 'Campo', sal: 1300000 },
        { doc: '100100112', nom: 'Samuel Peña', cargo: 'Jefe de Despachos', area: 'Logistica', sal: 2500000 },
        { doc: '100100113', nom: 'Cristian Castro', cargo: 'Conductor Despacho', area: 'Logistica', sal: 1600000 }
    ];

    let creados = 0;
    for (const emp of nuevosEmpleados) {
        // Create in terceros
        const [t] = await pool.query(`INSERT IGNORE INTO terceros 
            (id_tenant, tipo_persona, tipo_documento, documento, nombre_completo, es_empleado, codigo_municipio, regimen_fiscal)
            VALUES (1, 'Natural', 'CC', ?, ?, 1, '30036', 'R-99-PN')`, 
            [emp.doc, emp.nom]
        );
        
        let t_id = t.insertId;
        if (t_id === 0) {
            // Ya existe
            const [ex] = await pool.query('SELECT id_tercero FROM terceros WHERE documento = ?', [emp.doc]);
            t_id = ex[0].id_tercero;
            await pool.query('UPDATE terceros SET es_empleado = 1 WHERE id_tercero = ?', [t_id]);
        }

        // Insert in rrhh_empleados
        await pool.query(`INSERT INTO rrhh_empleados 
            (id_tenant, id_finca, id_tercero, cargo, fecha_ingreso, salario_base, tipo_contrato, estado, area_asignada)
            VALUES (1, 1, ?, ?, '2023-01-15', ?, 'Indefinido', 'Activo', ?)`,
            [t_id, emp.cargo, emp.sal, emp.area]
        );
        creados++;
    }

    console.log(`¡Éxito! Se generaron y enlazaron ${creados} empleados a la tabla de Terceros.`);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}
run();
