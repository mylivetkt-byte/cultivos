const mysql = require('mysql2/promise');

async function migrate() {
  const p = mysql.createPool({host:'localhost',port:3307,user:'root',password:'12345',database:'sas_agricolas'});

  try {
    const conn = await p.getConnection();
    await conn.query("SET FOREIGN_KEY_CHECKS=0;");

    // 1. Biblioteca ICA
    await conn.query(`
      CREATE TABLE IF NOT EXISTS lib_fitosanitaria_ica (
        id_enfermedad_plaga INT AUTO_INCREMENT PRIMARY KEY,
        tipo ENUM('Plaga', 'Enfermedad') NOT NULL,
        cultivo VARCHAR(100) NOT NULL,
        nombre_comun VARCHAR(150) NOT NULL,
        nombre_cientifico VARCHAR(150),
        agente_causal VARCHAR(150),
        sintomas TEXT,
        danos_ocasionados TEXT,
        umbral_economico_pct DECIMAL(5,2),
        medidas_preventivas TEXT,
        control_biologico TEXT,
        control_quimico TEXT,
        recomendaciones_ica TEXT,
        imagen_url VARCHAR(255),
        nivel_riesgo ENUM('Bajo', 'Medio', 'Alto', 'Cuarentenario') DEFAULT 'Medio',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Recetas
    await conn.query(`
      CREATE TABLE IF NOT EXISTS app_recetas (
        id_receta BIGINT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL,
        nombre_receta VARCHAR(150) NOT NULL,
        tipo ENUM('Fertilización', 'Fitosanitario') NOT NULL,
        id_cultivo INT,
        id_enfermedad_plaga INT, -- FK to lib_fitosanitaria_ica
        autor_tecnico VARCHAR(150),
        fecha_creacion DATE,
        instrucciones_preparacion TEXT,
        recomendaciones_seguridad TEXT,
        estado ENUM('Activa', 'Inactiva') DEFAULT 'Activa'
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS app_recetas_detalle (
        id_detalle BIGINT AUTO_INCREMENT PRIMARY KEY,
        id_receta BIGINT NOT NULL,
        id_insumo INT NOT NULL,
        dosis_recomendada DECIMAL(10,2) NOT NULL,
        unidad_medida VARCHAR(20) NOT NULL,
        notas VARCHAR(255)
      )
    `);

    // 3. Programación
    await conn.query(`
      CREATE TABLE IF NOT EXISTS app_programacion (
        id_programacion BIGINT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL,
        id_finca INT NOT NULL,
        id_lote INT NOT NULL,
        id_receta BIGINT, -- puede ser null si es formula al vuelo
        fecha_programada DATE NOT NULL,
        fecha_ejecucion DATETIME,
        metodo_aplicacion ENUM('Manual', 'Dron', 'Avión', 'Tractor', 'Fertirriego', 'Otro') NOT NULL,
        id_maquinaria INT,
        responsable_aplicacion VARCHAR(150),
        condiciones_climaticas TEXT,
        estado ENUM('Programada', 'En Proceso', 'Completada', 'Cancelada') DEFAULT 'Programada',
        observaciones TEXT
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS app_programacion_insumos (
        id_prog_insumo BIGINT AUTO_INCREMENT PRIMARY KEY,
        id_programacion BIGINT NOT NULL,
        id_insumo INT NOT NULL,
        cantidad_proyectada DECIMAL(10,2) NOT NULL,
        cantidad_real_aplicada DECIMAL(10,2),
        costo_total DECIMAL(15,2)
      )
    `);

    // 4. Control BPA (Envases)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS app_control_envases (
        id_control BIGINT AUTO_INCREMENT PRIMARY KEY,
        id_programacion BIGINT NOT NULL,
        id_insumo INT NOT NULL,
        cantidad_envases_vacios INT NOT NULL,
        lavado_triple_realizado BOOLEAN DEFAULT FALSE,
        perforado_inutilizado BOOLEAN DEFAULT FALSE,
        entregado_centro_acopio BOOLEAN DEFAULT FALSE,
        fecha_entrega DATE,
        notas_disposicion TEXT
      )
    `);

    await conn.query("SET FOREIGN_KEY_CHECKS=1;");
    conn.release();
    console.log("Migración de tablas de Aplicaciones Agrícolas exitosa.");
  } catch (err) {
    console.error("Error migrando tablas:", err);
  }
  process.exit(0);
}
migrate();
