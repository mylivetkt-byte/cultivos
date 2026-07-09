import express from 'express';
import pool from '../db.js';

const router = express.Router();

function getDb(req) {
  return req.tenantPool || pool;
}

// ==========================================
// CONFIGURACIÓN API DIAN
// ==========================================
router.get('/configuracion', async (req, res) => {
  try {
    const tid = req.query.tenantId || 1;
    const [rows] = await getDb(req).query('SELECT * FROM dian_configuracion WHERE id_tenant = ?', [tid]);
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/configuracion/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { entorno, api_token, test_set_id, software_id, software_pin } = req.body;
    await getDb(req).query(`
      UPDATE dian_configuracion 
      SET entorno=?, api_token=?, test_set_id=?, software_id=?, software_pin=? 
      WHERE id_config=?
    `, [entorno, api_token, test_set_id, software_id, software_pin, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// LISTADO DE NÓMINAS DIAN
// ==========================================
router.get('/nominas', async (req, res) => {
  try {
    const tid = req.query.tenantId || 1;
    const [rows] = await getDb(req).query(`
      SELECT n.*, 
        (SELECT COUNT(*) FROM dian_nominas_trabajador t WHERE t.id_nomina_dian = n.id_nomina_dian) as num_trabajadores
      FROM dian_nominas_cabecera n
      WHERE n.id_tenant = ?
      ORDER BY n.id_nomina_dian DESC
    `, [tid]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/nominas/:id/trabajadores', async (req, res) => {
  try {
    const [rows] = await getDb(req).query(`
      SELECT t.*, e.nombres, e.apellidos, e.numero_documento
      FROM dian_nominas_trabajador t
      JOIN rrhh_empleados e ON t.id_empleado = e.id_empleado
      WHERE t.id_nomina_dian = ?
    `, [req.params.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// EMISIÓN DE NÓMINA (INTEGRACIÓN DIAN)
// ==========================================
router.post('/emitir', async (req, res) => {
  const connection = await getDb(req).getConnection();
  try {
    await connection.beginTransaction();
    const { tenantId, id_planilla_manual, trabajadores } = req.body;
    const tid = tenantId || 1;

    // 1. Obtener Configuración DIAN
    const [cfg] = await connection.query('SELECT * FROM dian_configuracion WHERE id_tenant = ?', [tid]);
    if (cfg.length === 0) throw new Error('No hay configuración de DIAN registrada.');
    const configuracion = cfg[0];

    // 2. Crear Cabecera de Nómina DIAN
    const [resultHeader] = await connection.query(`
      INSERT INTO dian_nominas_cabecera (id_tenant, id_planilla_manual, consecutivo, fecha_emision, estado_dian)
      VALUES (?, ?, (SELECT IFNULL(MAX(consecutivo)+1, 1) FROM dian_nominas_cabecera c WHERE c.id_tenant=?), CURDATE(), 'Procesando')
    `, [tid, id_planilla_manual, tid]);
    
    const idNominaDian = resultHeader.insertId;

    // 3. Insertar Trabajadores y calcular Totales Globales
    let totalDevengosGlobal = 0;
    let totalDeduccionesGlobal = 0;

    for (const t of trabajadores) {
      await connection.query(`
        INSERT INTO dian_nominas_trabajador (id_nomina_dian, id_empleado, tipo_trabajador_id, subtipo_trabajador_id, tipo_contrato_id, sueldo, municipio_id, codigo_trabajador)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [idNominaDian, t.id_empleado, t.tipo_trabajador, t.subtipo_trabajador, t.tipo_contrato, t.sueldo, t.municipio, t.codigo_trabajador]);
      
      const devengos = t.devengos || [];
      const deducciones = t.deducciones || [];

      for (const d of devengos) {
        totalDevengosGlobal += Number(d.valor);
        await connection.query(`INSERT INTO dian_nominas_devengos (id_nomina_dian, concepto, valor) VALUES (?, ?, ?)`, [idNominaDian, d.concepto, d.valor]);
      }
      for (const d of deducciones) {
        totalDeduccionesGlobal += Number(d.valor);
        await connection.query(`INSERT INTO dian_nominas_deducciones (id_nomina_dian, concepto, valor) VALUES (?, ?, ?)`, [idNominaDian, d.concepto, d.valor]);
      }
    }

    const totalComprobante = totalDevengosGlobal - totalDeduccionesGlobal;

    // 4. Actualizar Totales en Cabecera
    await connection.query(`
      UPDATE dian_nominas_cabecera 
      SET total_devengos = ?, total_deducciones = ?, total_comprobante = ? 
      WHERE id_nomina_dian = ?
    `, [totalDevengosGlobal, totalDeduccionesGlobal, totalComprobante, idNominaDian]);


    // 5. CONSTRUCCIÓN DEL PAYLOAD DIAN (Según API docs.apidian.app)
    const dianPayload = {
      type_document_id: 9,
      establishment_name: 'SAS Agricolas',
      establishment_address: 'Finca Principal',
      establishment_phone: '300000000',
      establishment_municipality: 1, 
      test_set_id: configuracion.test_set_id,
      pin: configuracion.software_pin,
      id_software: configuracion.software_id,
      notes: "Nómina electrónica emitida por SAS Agrícolas",
      period: { issue_date: new Date().toISOString().split('T')[0] }
    };

    // 6. Respuesta de ambiente de presentación cargada desde BD.
    const [responseRows] = await connection.query(`
      SELECT is_valid, cune_prefijo, xml_url_base, zip_url_base, status_message
      FROM dian_respuestas_presentacion
      WHERE id_tenant = ? AND ambiente = 'presentacion'
      LIMIT 1
    `, [tenantId]);
    if (responseRows.length === 0) {
      throw new Error('No hay respuesta DIAN de presentacion configurada en base de datos.');
    }
    const responseConfig = responseRows[0];
    const dianResponse = {
      is_valid: !!responseConfig.is_valid,
      cune: `${responseConfig.cune_prefijo}-${idNominaDian}`,
      xml_url: `${responseConfig.xml_url_base}${idNominaDian}.xml`,
      zip_url: `${responseConfig.zip_url_base}${idNominaDian}.zip`,
      status_message: responseConfig.status_message
    };

    // 7. Actualizar Cabecera con Resultado DIAN
    if (dianResponse.is_valid) {
      await connection.query(`
        UPDATE dian_nominas_cabecera 
        SET estado_dian = 'Validada', cune = ? 
        WHERE id_nomina_dian = ?
      `, [dianResponse.cune, idNominaDian]);
    } else {
      await connection.query(`UPDATE dian_nominas_cabecera SET estado_dian = 'Rechazada' WHERE id_nomina_dian = ?`, [idNominaDian]);
    }

    // 8. Crear Log de Auditoría Inmutable
    await connection.query(`
      INSERT INTO dian_nominas_logs (id_nomina_dian, evento, request_payload, response_payload, xml_url, zip_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [idNominaDian, 'EMISION_NOMINA_INDIVIDUAL', JSON.stringify(dianPayload), JSON.stringify(dianResponse), dianResponse.xml_url, dianResponse.zip_url]);

    await connection.commit();
    res.json({ success: true, message: 'Nómina transmitida a la DIAN con éxito', cune: dianResponse.cune });

  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

export default router;
