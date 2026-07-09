const mysql = require('mysql2/promise');

async function run() {
  try {
    const pool = mysql.createPool({
      host: '127.0.0.1',
      port: 3307,
      user: 'root',
      password: '12345',
      database: 'sas_agricolas'
    });

    console.log("Creando tabla rrhh_cuadrillas...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rrhh_cuadrillas (
        id_cuadrilla INT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL DEFAULT 1,
        id_finca INT NULL,
        nombre VARCHAR(150) NOT NULL,
        tipo ENUM('Agricola', 'Ganadera', 'Acuicola', 'Bioles', 'Produccion', 'Mantenimiento', 'Otra') DEFAULT 'Agricola',
        estado ENUM('Activa', 'Inactiva') DEFAULT 'Activa',
        fecha_creacion DATE DEFAULT (CURRENT_DATE),
        FOREIGN KEY (id_finca) REFERENCES fincas(id_finca) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
    `);

    console.log("Agregando id_cuadrilla a rrhh_empleados...");
    try {
      await pool.query(`ALTER TABLE rrhh_empleados ADD COLUMN id_cuadrilla INT NULL`);
      await pool.query(`ALTER TABLE rrhh_empleados ADD CONSTRAINT fk_empleado_cuadrilla FOREIGN KEY (id_cuadrilla) REFERENCES rrhh_cuadrillas(id_cuadrilla) ON DELETE SET NULL`);
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log("La columna id_cuadrilla ya existe.");
      } else {
        console.error("Error agregando columna:", e.message);
      }
    }

    console.log("Migrando datos existentes a rrhh_cuadrillas...");
    const [empleados] = await pool.query(`SELECT DISTINCT cuadrilla_nombre, id_tenant FROM rrhh_empleados WHERE cuadrilla_nombre IS NOT NULL AND cuadrilla_nombre != ''`);
    for (let emp of empleados) {
      const [existing] = await pool.query(`SELECT id_cuadrilla FROM rrhh_cuadrillas WHERE nombre = ? AND id_tenant = ?`, [emp.cuadrilla_nombre, emp.id_tenant]);
      let newId;
      if (existing.length === 0) {
        const [result] = await pool.query(`INSERT INTO rrhh_cuadrillas (id_tenant, nombre) VALUES (?, ?)`, [emp.id_tenant, emp.cuadrilla_nombre]);
        newId = result.insertId;
      } else {
        newId = existing[0].id_cuadrilla;
      }
      await pool.query(`UPDATE rrhh_empleados SET id_cuadrilla = ? WHERE cuadrilla_nombre = ? AND id_tenant = ?`, [newId, emp.cuadrilla_nombre, emp.id_tenant]);
    }
    
    console.log("Proceso completado.");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

run();
