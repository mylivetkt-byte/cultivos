const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: __dirname + '/../.env' });

const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: '12345',
  database: 'sas_agricolas',
  port: 3307,
};

const certificacionesFincaTipos = [
  { tipo: 'RSPO (Roundtable on Sustainable Palm Oil)', entidad: 'Control Union' },
  { tipo: 'ISCC (International Sustainability & Carbon Certification)', entidad: 'SGS' },
  { tipo: 'ISO 14001:2015 (Gestión Ambiental)', entidad: 'Bureau Veritas' },
  { tipo: 'ISO 45001:2018 (Seguridad y Salud en el Trabajo)', entidad: 'ICONTEC' },
  { tipo: 'Rainforest Alliance', entidad: 'NaturaCert' },
  { tipo: 'Global GAP', entidad: 'SGS' }
];

const auditoriasTemas = [
  { tipo: 'Externa', auditor: 'SGS Colombia', hallazgos: 'Se evidencia excelente trazabilidad en bodega de agroquímicos. Oportunidad de mejora en señalización de lote 4.', nc: 1, estado: 'En_Plan_Accion' },
  { tipo: 'Interna', auditor: 'Comité de Sostenibilidad Interno', hallazgos: 'Cumplimiento del 95% en los estándares P&C de RSPO. Falta actualizar matriz de riesgos ambientales.', nc: 2, estado: 'Cerrada' },
  { tipo: 'Externa', auditor: 'Control Union', hallazgos: 'Auditoría de recertificación RSPO exitosa. Cero no conformidades mayores. Excelente gestión de altos valores de conservación (HCV).', nc: 0, estado: 'Cerrada' },
  { tipo: 'Interna', auditor: 'Área SST y Calidad', hallazgos: 'Uso correcto de EPP por parte del 98% del personal de cosecha. Dos trabajadores sin gafas de seguridad.', nc: 1, estado: 'En_Plan_Accion' },
  { tipo: 'Externa', auditor: 'Bureau Veritas', hallazgos: 'Manejo adecuado de residuos peligrosos. Se requiere ajustar el tiempo de retención en trampas de grasa del casino.', nc: 1, estado: 'Abierta' }
];

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

async function seedCertificaciones() {
  let connection;
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database successfully.');

    const [tenants] = await connection.query('SELECT id_tenant FROM tenants LIMIT 1');
    if (tenants.length === 0) throw new Error('No tenants found.');
    const tenantId = tenants[0].id_tenant;

    const [fincas] = await connection.query('SELECT id_finca FROM fincas WHERE id_tenant = ?', [tenantId]);
    if (fincas.length === 0) throw new Error('No fincas found.');
    
    const [cultivos] = await connection.query('SELECT id_cultivo FROM cultivos LIMIT 1');
    const cultivoId = cultivos.length > 0 ? cultivos[0].id_cultivo : null;

    console.log('Clearing existing Certificaciones data...');
    await connection.query('DELETE FROM auditorias');
    await connection.query('DELETE FROM certificaciones_finca');
    await connection.query('DELETE FROM certificaciones_cultivo');

    for (let finca of fincas) {
      console.log(`Seeding certifications for finca ${finca.id_finca}...`);

      // 1. Certificaciones de Finca (RSPO, ISCC, etc.)
      const numCerts = Math.floor(Math.random() * 25) + 15; // 15 to 40 certifications over time
      for (let i = 0; i < numCerts; i++) {
        const cert = certificacionesFincaTipos[Math.floor(Math.random() * certificacionesFincaTipos.length)];
        const fechaEmision = randomDate(new Date(2018, 0, 1), new Date());
        const fechaVencimiento = new Date(fechaEmision.getTime());
        fechaVencimiento.setFullYear(fechaVencimiento.getFullYear() + (Math.random() > 0.5 ? 3 : 1));
        
        let estado = 'Vigente';
        if (fechaVencimiento < new Date()) estado = 'Vencida';
        else if (new Date(fechaVencimiento.getTime() - 60*24*60*60*1000) < new Date()) estado = 'En_Proceso';

        const numeroCert = `CERT-${Math.floor(Math.random() * 900000) + 100000}-${fechaEmision.getFullYear()}`;
        
        await connection.query(
          'INSERT INTO certificaciones_finca (id_finca, tipo_certificacion, entidad_certificadora, numero_certificado, fecha_emision, fecha_vencimiento, estado, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [finca.id_finca, cert.tipo, cert.entidad, numeroCert, fechaEmision, fechaVencimiento, estado, 'Proceso documentado y trazabilidad comprobada. Área: ' + randomItem(['Planta Extractora', 'Campo', 'Compostaje Orgánico'])]
        );
      }

      // 2. Certificaciones de Cultivo
      if (cultivoId) {
        for (let i = 0; i < 20; i++) {
          const fechaEmisionCult = randomDate(new Date(2018, 0, 1), new Date());
          const fechaVencCult = new Date(fechaEmisionCult.getTime());
          fechaVencCult.setFullYear(fechaVencCult.getFullYear() + 2);
          
          let estadoC = 'Vigente';
          if (fechaVencCult < new Date()) estadoC = 'Vencida';
          
          const tipoCult = randomItem(['BPA (Buenas Prácticas Agrícolas) - ICA', 'Certificación Producción Orgánica', 'Global GAP Cultivo']);
          await connection.query(
            'INSERT INTO certificaciones_cultivo (id_tenant, id_finca, id_cultivo, tipo_certificacion, fecha_obtencion, vigencia_hasta, auditor, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [tenantId, finca.id_finca, cultivoId, tipoCult, fechaEmisionCult, fechaVencCult, 'Auditor Regional ' + Math.floor(Math.random()*10), estadoC]
          );
        }
      }

      // 3. Auditorías
      const numAudits = Math.floor(Math.random() * 60) + 40; // 40 to 100 audits
      for (let i = 0; i < numAudits; i++) {
        const audit = auditoriasTemas[Math.floor(Math.random() * auditoriasTemas.length)];
        const fecha = randomDate(new Date(2018, 0, 1), new Date());
        
        // Randomize the findings a bit to make it look diverse
        const scope = randomItem(['Planta Extractora de Aceite', 'Planta de Compostaje Orgánico', 'Cultivo Palmas Jóvenes', 'Cultivo Palmas Adultas', 'Bodegas y Talleres']);
        const hallazgoModificado = `[Alcance: ${scope}] ` + audit.hallazgos;
        
        await connection.query(
          'INSERT INTO auditorias (id_tenant, id_finca, tipo, fecha, auditor, hallazgos, no_conformidades, estado_cierre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [tenantId, finca.id_finca, audit.tipo, fecha, audit.auditor, hallazgoModificado, audit.nc, audit.estado]
        );
      }
    }

    console.log('Certificaciones module data seeded successfully!');

  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seedCertificaciones();
