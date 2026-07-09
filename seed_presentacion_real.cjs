const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: '12345',
  database: 'sas_agricolas',
  multipleStatements: false
};

async function firstId(conn, sql, params = []) {
  const [rows] = await conn.query(sql, params);
  return rows[0] ? Object.values(rows[0])[0] : null;
}

async function ensureTables(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS gerencia_kpis (
      id_kpi INT AUTO_INCREMENT PRIMARY KEY,
      id_tenant INT NOT NULL,
      periodo CHAR(7) NOT NULL,
      liquidez_corriente DECIMAL(10,4) NOT NULL DEFAULT 0,
      prueba_acida DECIMAL(10,4) NOT NULL DEFAULT 0,
      endeudamiento DECIMAL(10,4) NOT NULL DEFAULT 0,
      margen_ebitda DECIMAL(10,4) NOT NULL DEFAULT 0,
      roe DECIMAL(10,4) NOT NULL DEFAULT 0,
      roa DECIMAL(10,4) NOT NULL DEFAULT 0,
      costo_hectarea_promedio DECIMAL(15,2) NOT NULL DEFAULT 0,
      ingresos_totales DECIMAL(15,2) NOT NULL DEFAULT 0,
      costos_operativos DECIMAL(15,2) NOT NULL DEFAULT 0,
      variacion_ingresos_pct DECIMAL(10,4) NOT NULL DEFAULT 0,
      variacion_ebitda_pct DECIMAL(10,4) NOT NULL DEFAULT 0,
      variacion_costo_ha_pct DECIMAL(10,4) NOT NULL DEFAULT 0,
      fuente VARCHAR(100) NOT NULL DEFAULT 'Presentacion real',
      UNIQUE KEY uq_gerencia_kpis (id_tenant, periodo)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS gerencia_abonos_produccion (
      id_registro INT AUTO_INCREMENT PRIMARY KEY,
      id_tenant INT NOT NULL,
      periodo CHAR(7) NOT NULL,
      compost_ton DECIMAL(12,2) NOT NULL DEFAULT 0,
      humus_ton DECIMAL(12,2) NOT NULL DEFAULT 0,
      biol_lt DECIMAL(12,2) NOT NULL DEFAULT 0,
      UNIQUE KEY uq_abonos_periodo (id_tenant, periodo)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS gerencia_semillas_inventario (
      id_registro INT AUTO_INCREMENT PRIMARY KEY,
      id_tenant INT NOT NULL,
      categoria VARCHAR(80) NOT NULL,
      valor INT NOT NULL DEFAULT 0,
      orden INT NOT NULL DEFAULT 0,
      UNIQUE KEY uq_semillas_categoria (id_tenant, categoria)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS estados_patrimonio_movimientos (
      id_registro INT AUTO_INCREMENT PRIMARY KEY,
      id_tenant INT NOT NULL,
      anio INT NOT NULL,
      codigo VARCHAR(30) NOT NULL,
      nombre VARCHAR(200) NOT NULL,
      saldo_inicial DECIMAL(15,2) NOT NULL DEFAULT 0,
      aumentos DECIMAL(15,2) NOT NULL DEFAULT 0,
      disminuciones DECIMAL(15,2) NOT NULL DEFAULT 0,
      UNIQUE KEY uq_patrimonio_anio (id_tenant, anio, codigo)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS sat_workflows_presentacion (
      id_workflow INT AUTO_INCREMENT PRIMARY KEY,
      id_conexion INT NOT NULL,
      workflow_id VARCHAR(80) NOT NULL,
      name VARCHAR(150) NOT NULL,
      display_name VARCHAR(255) NOT NULL,
      output_product_type VARCHAR(80) NOT NULL,
      UNIQUE KEY uq_sat_workflow (id_conexion, workflow_id)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS sat_orders_presentacion (
      id_order INT AUTO_INCREMENT PRIMARY KEY,
      id_conexion INT NOT NULL,
      order_id VARCHAR(80) NOT NULL,
      workflow_name VARCHAR(150) NOT NULL,
      submission_date DATETIME NOT NULL,
      status ENUM('queued','running','completed','failed') NOT NULL DEFAULT 'queued',
      UNIQUE KEY uq_sat_order (id_conexion, order_id)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS dian_respuestas_presentacion (
      id_respuesta INT AUTO_INCREMENT PRIMARY KEY,
      id_tenant INT NOT NULL,
      ambiente VARCHAR(30) NOT NULL DEFAULT 'presentacion',
      is_valid TINYINT(1) NOT NULL DEFAULT 1,
      cune_prefijo VARCHAR(80) NOT NULL,
      xml_url_base VARCHAR(255) NOT NULL,
      zip_url_base VARCHAR(255) NOT NULL,
      status_message VARCHAR(255) NOT NULL,
      UNIQUE KEY uq_dian_respuesta (id_tenant, ambiente)
    )
  `);
}

async function seedManagement(conn, tenantId) {
  const periodo = '2026-05';
  await conn.query(
    `INSERT INTO gerencia_kpis
      (id_tenant, periodo, liquidez_corriente, prueba_acida, endeudamiento, margen_ebitda, roe, roa,
       costo_hectarea_promedio, ingresos_totales, costos_operativos, variacion_ingresos_pct,
       variacion_ebitda_pct, variacion_costo_ha_pct)
     VALUES (?, ?, 1.85, 1.12, 0.42, 0.28, 0.15, 0.11, 15400000, 850000000, 480000000, 0.125, 0.021, -0.015)
     ON DUPLICATE KEY UPDATE
       liquidez_corriente=VALUES(liquidez_corriente), prueba_acida=VALUES(prueba_acida),
       endeudamiento=VALUES(endeudamiento), margen_ebitda=VALUES(margen_ebitda), roe=VALUES(roe), roa=VALUES(roa),
       costo_hectarea_promedio=VALUES(costo_hectarea_promedio), ingresos_totales=VALUES(ingresos_totales),
       costos_operativos=VALUES(costos_operativos), variacion_ingresos_pct=VALUES(variacion_ingresos_pct),
       variacion_ebitda_pct=VALUES(variacion_ebitda_pct), variacion_costo_ha_pct=VALUES(variacion_costo_ha_pct)`,
    [tenantId, periodo]
  );

  const abonos = [
    ['2025-12', 32, 16, 1800],
    ['2026-01', 39, 18, 2200],
    ['2026-02', 44, 21, 2600],
    ['2026-03', 41, 23, 3100],
    ['2026-04', 52, 27, 3800],
    ['2026-05', 56, 31, 4200]
  ];
  for (const row of abonos) {
    await conn.query(
      `INSERT INTO gerencia_abonos_produccion (id_tenant, periodo, compost_ton, humus_ton, biol_lt)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE compost_ton=VALUES(compost_ton), humus_ton=VALUES(humus_ton), biol_lt=VALUES(biol_lt)`,
      [tenantId, ...row]
    );
  }

  const semillas = [
    ['Semillas en Banco', 250000, 1],
    ['Semillas Germinando', 45000, 2],
    ['Plantulas de Vivero', 38000, 3],
    ['Plantulas Descartadas', 2500, 4],
    ['Plantadas en Lote', 35500, 5]
  ];
  for (const row of semillas) {
    await conn.query(
      `INSERT INTO gerencia_semillas_inventario (id_tenant, categoria, valor, orden)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE valor=VALUES(valor), orden=VALUES(orden)`,
      [tenantId, ...row]
    );
  }
}

async function seedPatrimony(conn, tenantId) {
  const rows = [
    [2026, '31', 'Capital Social', 250000000, 50000000, 0],
    [2026, '33', 'Reservas Obligatorias', 25000000, 5000000, 0],
    [2026, '37', 'Resultados Ejercicios Anteriores', 85000000, 45000000, 15000000],
    [2026, '38', 'Superavit por Valorizacion NIC 41 / NIC 16', 15000000, 25000000, 0]
  ];
  for (const r of rows) {
    await conn.query(
      `INSERT INTO estados_patrimonio_movimientos
       (id_tenant, anio, codigo, nombre, saldo_inicial, aumentos, disminuciones)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), saldo_inicial=VALUES(saldo_inicial),
         aumentos=VALUES(aumentos), disminuciones=VALUES(disminuciones)`,
      [tenantId, ...r]
    );
  }
}

async function seedAgronomy(conn, tenantId) {
  const [siembras] = await conn.query('SELECT id_siembra, id_lote, hectareas_sembradas FROM siembras WHERE id_tenant = ? LIMIT 6', [tenantId]);
  for (let i = 0; i < siembras.length; i += 1) {
    const s = siembras[i];
    const month = i + 1;
    const fecha = `2026-${String(month).padStart(2, '0')}-15`;
    const realHa = 18800 + (i * 950);
    const total = Number(s.hectareas_sembradas || 1) * realHa;
    const [existing] = await conn.query(
      'SELECT id_cosecha FROM cosechas WHERE id_siembra = ? AND fecha_cosecha = ?',
      [s.id_siembra, fecha]
    );
    if (existing.length === 0) {
      await conn.query(
        `INSERT INTO cosechas
         (id_siembra, fecha_cosecha, hectareas_cosechadas, rendimiento_estimado_ha, rendimiento_real_ha,
          produccion_total_kg, calidad_cosecha, perdidas_porcentaje, observaciones)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [s.id_siembra, fecha, Number(s.hectareas_sembradas || 0), realHa + 1200, realHa, total, i % 2 ? 'Buena' : 'Excelente', 2.5 + i, 'Registro cargado para presentacion real']
      );
    }
  }

  const [lotes] = await conn.query('SELECT id_lote FROM lotes LIMIT 4');
  for (let i = 0; i < lotes.length; i += 1) {
    const loteId = lotes[i].id_lote;
    for (const estado of ['Sano', 'Sano', 'Sano', i % 2 ? 'Tratamiento' : 'Enfermo']) {
      const codigo = `PR-${loteId}-${estado}-${i}`;
      const [exists] = await conn.query('SELECT id_arbol FROM siembra_arboles WHERE codigo_arbol = ?', [codigo]);
      if (exists.length === 0) {
        await conn.query(
          `INSERT INTO siembra_arboles
           (id_tenant, id_lote, codigo_arbol, gps_punto, fecha_siembra, estado_salud, variedad, ano_siembra)
           VALUES (?, ?, ?, ST_GeomFromText('POINT(-72.745 4.426)'), '2020-04-01', ?, 'Elaeis guineensis', 2020)`,
          [tenantId, loteId, codigo, estado]
        );
      }
    }
  }
}

async function seedSatellite(conn, tenantId) {
  await conn.query(
    `INSERT INTO sat_api_conexiones (id_tenant, proveedor, api_key, endpoint_url, fecha_expiracion, token_type)
     VALUES (?, 'Sentinel-2', 'token_test_presentacion_real', 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token', '2026-12-31', 'mock')
     ON DUPLICATE KEY UPDATE endpoint_url=VALUES(endpoint_url)`,
    [tenantId]
  );

  const connId = await firstId(conn, "SELECT id_conexion FROM sat_api_conexiones WHERE proveedor = 'Sentinel-2' ORDER BY id_conexion LIMIT 1");
  if (!connId) return;

  const workflows = [
    ['wf-s2-l2a', 'Sentinel-2 L2A Processor', 'Procesamiento Sentinel-2 L2A (Atmospheric Correction)', 'S2MSI2A'],
    ['wf-s1-grd', 'Sentinel-1 GRD Backscatter', 'Procesamiento Sentinel-1 GRD (Calibration & Terrain Correction)', 'S1_GRD'],
    ['wf-s3-olci', 'Sentinel-3 OLCI Water Color', 'Procesamiento Sentinel-3 OLCI (Water Quality Index)', 'S3_OLCI']
  ];
  for (const w of workflows) {
    await conn.query(
      `INSERT INTO sat_workflows_presentacion (id_conexion, workflow_id, name, display_name, output_product_type)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), display_name=VALUES(display_name), output_product_type=VALUES(output_product_type)`,
      [connId, ...w]
    );
  }

  const orders = [
    ['order-pr-8234', 'Sentinel-2 L2A Processor', '2026-06-08 08:30:00', 'completed'],
    ['order-pr-9121', 'Sentinel-1 GRD Backscatter', '2026-06-08 09:10:00', 'running']
  ];
  for (const o of orders) {
    await conn.query(
      `INSERT INTO sat_orders_presentacion (id_conexion, order_id, workflow_name, submission_date, status)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE workflow_name=VALUES(workflow_name), submission_date=VALUES(submission_date), status=VALUES(status)`,
      [connId, ...o]
    );
  }
}

async function seedDian(conn, tenantId) {
  await conn.query(
    `INSERT INTO dian_respuestas_presentacion
     (id_tenant, ambiente, is_valid, cune_prefijo, xml_url_base, zip_url_base, status_message)
     VALUES (?, 'presentacion', 1, 'CUNE-PRESENTACION-REAL', 'https://test.apidian.app/xml/', 'https://test.apidian.app/zip/', 'Procesado Correctamente')
     ON DUPLICATE KEY UPDATE is_valid=VALUES(is_valid), cune_prefijo=VALUES(cune_prefijo),
       xml_url_base=VALUES(xml_url_base), zip_url_base=VALUES(zip_url_base), status_message=VALUES(status_message)`,
    [tenantId]
  );
}

async function main() {
  const conn = await mysql.createConnection(dbConfig);
  try {
    await ensureTables(conn);
    const tenantId = await firstId(conn, 'SELECT id_tenant FROM tenants ORDER BY id_tenant LIMIT 1') || 1;
    await seedManagement(conn, tenantId);
    await seedPatrimony(conn, tenantId);
    await seedAgronomy(conn, tenantId);
    await seedSatellite(conn, tenantId);
    await seedDian(conn, tenantId);
    console.log('Datos de presentacion real cargados en la base de datos.');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
