import pool from './db.js';

async function seed() {
  try {
    const tenantId = 1;
    
    try {
      await pool.query(`
        ALTER TABLE acuicola_cosechas_recursos 
        ADD COLUMN hora_inicio DATETIME DEFAULT CURRENT_TIMESTAMP, 
        ADD COLUMN hora_fin DATETIME NULL, 
        ADD COLUMN estado VARCHAR(20) DEFAULT 'Activo'
      `);
    } catch(e) {}
    
    // 1. Insertar Empleados de prueba si no existen
    console.log("Insertando empleados...");
    const empleados = [
      { num: '100000001', nombres: 'Carlos', apellidos: 'Pescador Demo 1' },
      { num: '100000002', nombres: 'Juan', apellidos: 'Pescador Demo 2' },
      { num: '100000003', nombres: 'Pedro', apellidos: 'Pescador Demo 3' },
    ];
    for (const emp of empleados) {
      await pool.query(`
        INSERT IGNORE INTO rrhh_empleados (id_tenant, documento, nombres, apellidos, estado, cargo, fecha_ingreso, salario_base, tipo_contrato) 
        VALUES (?, ?, ?, ?, 'Activo', 'Pescador', '2023-01-01', 1000000, 'Fijo')
      `, [tenantId, emp.num, emp.nombres, emp.apellidos]);
    }
    
    // Obtener empleados
    const [emps] = await pool.query("SELECT id_empleado FROM rrhh_empleados WHERE estado = 'Activo' AND id_tenant = ?", [tenantId]);
    if (emps.length === 0) throw new Error("No hay empleados");

    // 2. Buscar o crear siembras activas y lagos
    console.log("Creando datos de cosecha...");
    const [estanques] = await pool.query("SELECT * FROM acuicola_estanques WHERE id_tenant = ? LIMIT 2", [tenantId]);
    const [especies] = await pool.query("SELECT * FROM acuicola_especies LIMIT 1");
    
    if (estanques.length > 0 && especies.length > 0) {
      for (const estanque of estanques) {
        // Crear siembra activa si no hay
        const [siembras] = await pool.query("SELECT * FROM acuicola_siembras WHERE id_estanque = ? AND estado = 'Activo'", [estanque.id_estanque]);
        let id_siembra_acui;
        if (siembras.length === 0) {
          const [res] = await pool.query(`
            INSERT INTO acuicola_siembras 
            (id_tenant, id_estanque, id_especie_acui, fecha_siembra, cantidad_alevines, peso_promedio_ingreso_g, estado, notas)
            VALUES (?, ?, ?, DATE_SUB(NOW(), INTERVAL 180 DAY), 5000, 5, 'Activo', 'Demo Siembra')
          `, [tenantId, estanque.id_estanque, especies[0].id_especie_acui]);
          id_siembra_acui = res.insertId;
        } else {
          id_siembra_acui = siembras[0].id_siembra_acui;
        }

        // Crear Lote de Cosecha En Progreso
        const [lotes] = await pool.query("SELECT * FROM acuicola_lotes_cosecha WHERE id_siembra_acui = ? AND estado = 'En Progreso'", [id_siembra_acui]);
        let id_lote_cosecha;
        if (lotes.length === 0) {
          const [res] = await pool.query(`
            INSERT INTO acuicola_lotes_cosecha (id_tenant, id_finca, id_estanque, id_siembra_acui, id_especie, fecha_inicio, estado, total_capturado_kg)
            VALUES (?, ?, ?, ?, ?, NOW(), 'En Progreso', 0)
          `, [tenantId, estanque.id_finca, estanque.id_estanque, id_siembra_acui, especies[0].id_especie_acui]);
          id_lote_cosecha = res.insertId;
        } else {
          id_lote_cosecha = lotes[0].id_lote_cosecha;
        }

        // Asignar Empleados a la Cosecha
        for (const emp of emps) {
          await pool.query(`
            INSERT IGNORE INTO acuicola_cosechas_recursos (id_tenant, id_lote_cosecha, tipo_recurso, id_entidad, estado) 
            VALUES (?, ?, 'Empleado', ?, 'Activo')
          `, [tenantId, id_lote_cosecha, emp.id_empleado]);
        }

        // Registrar Pesadas (solo si no hay)
        const [pesadas] = await pool.query("SELECT * FROM acuicola_capturas_pesajes WHERE id_lote_cosecha = ?", [id_lote_cosecha]);
        if (pesadas.length === 0) {
          await pool.query(`
            INSERT INTO acuicola_capturas_pesajes (id_tenant, id_lote_cosecha, peso_bruto_kg, peso_tara_kg, peso_neto_kg, promedio_talla_g, fecha_captura, id_empleado_pesador, notas)
            VALUES (?, ?, 25, 2.5, 22.5, 450, DATE_SUB(NOW(), INTERVAL 1 HOUR), ?, 'Pesada demo 1')
          `, [tenantId, id_lote_cosecha, emps[0].id_empleado]);
  
          await pool.query(`
            INSERT INTO acuicola_capturas_pesajes (id_tenant, id_lote_cosecha, peso_bruto_kg, peso_tara_kg, peso_neto_kg, promedio_talla_g, fecha_captura, id_empleado_pesador, notas)
            VALUES (?, ?, 26, 2.5, 23.5, 460, DATE_SUB(NOW(), INTERVAL 30 MINUTE), ?, 'Pesada demo 2')
          `, [tenantId, id_lote_cosecha, emps[0].id_empleado]);
        }

        // Actualizar total capturado
        await pool.query(`
          UPDATE acuicola_lotes_cosecha 
          SET total_capturado_kg = (SELECT COALESCE(SUM(peso_neto_kg), 0) FROM acuicola_capturas_pesajes WHERE id_lote_cosecha = ?)
          WHERE id_lote_cosecha = ?
        `, [id_lote_cosecha, id_lote_cosecha]);
      }
    }
    console.log("Demo data successfully created.");
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
seed();
