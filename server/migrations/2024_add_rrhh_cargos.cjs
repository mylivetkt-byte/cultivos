// Migration to add rrhh_cargos table and replace cargo column with id_cargo
// This script uses the project's migration infrastructure (e.g., db.query).
// Adjust as needed for your specific migration runner.

module.exports = async function up(db) {
  // 1. Create rrhh_cargos table
  await db.query(`
    CREATE TABLE IF NOT EXISTS rrhh_cargos (
      id_cargo int NOT NULL AUTO_INCREMENT,
      id_tenant int NOT NULL,
      codigo varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      nombre varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      descripcion text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      activo tinyint(1) DEFAULT '1',
      PRIMARY KEY (id_cargo),
      UNIQUE KEY uq_rrhh_cargos_codigo_tenant (id_tenant, codigo),
      KEY id_tenant (id_tenant),
      CONSTRAINT fk_rrhh_cargos_tenant FOREIGN KEY (id_tenant) REFERENCES tenants (id_tenant)
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 2. Add temporary column to hold old cargo values
  await db.query(`ALTER TABLE rrhh_empleados ADD COLUMN cargo_tmp varchar(100) COLLATE utf8mb4_unicode_ci;`);
  await db.query(`UPDATE rrhh_empleados SET cargo_tmp = cargo;`);

  // 3. Add id_cargo column (already added in schema, but ensure existence)
  await db.query(`ALTER TABLE rrhh_empleados ADD COLUMN id_cargo int NOT NULL;`);

  // 4. Populate rrhh_cargos with distinct cargo names per tenant
  await db.query(`INSERT INTO rrhh_cargos (id_tenant, codigo, nombre)
    SELECT DISTINCT id_tenant,
      LOWER(REPLACE(cargo_tmp, ' ', '_')) AS codigo,
      cargo_tmp AS nombre
    FROM rrhh_empleados;
  `);

  // 5. Update rrhh_empleados.id_cargo based on cargo_tmp
  await db.query(`UPDATE rrhh_empleados e
    JOIN rrhh_cargos c ON e.id_tenant = c.id_tenant AND e.cargo_tmp = c.nombre
    SET e.id_cargo = c.id_cargo;
  `);

  // 6. Drop old cargo column and temporary column
  await db.query(`ALTER TABLE rrhh_empleados DROP COLUMN cargo;`);
  await db.query(`ALTER TABLE rrhh_empleados DROP COLUMN cargo_tmp;`);

  // 7. Add foreign key constraint (if not already present via schema)
  await db.query(`ALTER TABLE rrhh_empleados ADD CONSTRAINT fk_rrhh_cargo FOREIGN KEY (id_cargo) REFERENCES rrhh_cargos (id_cargo);`);
};

module.exports.down = async function down(db) {
  // Reverse migration: add back cargo column and drop new structures
  await db.query(`ALTER TABLE rrhh_empleados ADD COLUMN cargo varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;`);
  await db.query(`UPDATE rrhh_empleados e
    JOIN rrhh_cargos c ON e.id_cargo = c.id_cargo
    SET e.cargo = c.nombre;
  `);
  await db.query(`ALTER TABLE rrhh_empleados DROP FOREIGN KEY fk_rrhh_cargo;`);
  await db.query(`ALTER TABLE rrhh_empleados DROP COLUMN id_cargo;`);
  await db.query(`DROP TABLE IF EXISTS rrhh_cargos;`);
};
