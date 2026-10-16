import pool from './server/db.js';
import { logAudit } from './server/utils/audit.js';

async function seedVRA() {
  try {
    console.log('--- Iniciando Seed Fase 5: Prescripciones VRA & Maquinaria ---');

    const [existentes] = await pool.query('SELECT COUNT(*) as count FROM vra_prescripciones_maquinaria');
    if (existentes[0].count > 0) {
      console.log(`Ya existen ${existentes[0].count} prescripciones VRA.`);
      return;
    }

    const zonasLote1 = [
      {
        id_zona: 1,
        nombre: 'Zona 1 - Dosis Alta (Bajo Vigor / Enmienda)',
        color: '#ef4444',
        dosis_kg_ha: 220.0,
        hectareas: 1.50,
        total_insumo_kg: 330.0,
        estrategia: 'Refuerzo de nitrógeno y fósforo en sector compactado'
      },
      {
        id_zona: 2,
        nombre: 'Zona 2 - Dosis Media (Vigor Equilibrado)',
        color: '#f59e0b',
        dosis_kg_ha: 160.0,
        hectareas: 2.20,
        total_insumo_kg: 352.0,
        estrategia: 'Dosis estándar de extracción foliar'
      },
      {
        id_zona: 3,
        nombre: 'Zona 3 - Dosis Reducida (Alto Vigor / Ahorro)',
        color: '#10b981',
        dosis_kg_ha: 100.0,
        hectareas: 1.10,
        total_insumo_kg: 110.0,
        estrategia: 'Ahorro de insumo por alta biomasa vegetativa'
      }
    ];

    const [resIns] = await pool.query(`
      INSERT INTO vra_prescripciones_maquinaria
      (id_tenant, id_finca, id_lote, codigo_prescripcion, nombre, tipo_insumo,
       producto_comercial, fuente_datos, formato_maquinaria, zonas_json,
       dosis_promedio_kg_ha, dosis_min_kg_ha, dosis_max_kg_ha, superficie_total_ha,
       estado, creado_por)
      VALUES
      (1, 1, 1, 'VRA-FERT-2026-01', 'Fertilización Variable NPK Lote 1 Plaza', 'Fertilizante_Solido',
       'YaraMila Complex NPK 12-11-18', 'Satelital_NDVI', 'ISO_XML_11783', ?,
       165.00, 100.00, 220.00, 4.80, 'Aprobada', 'Ing. Agrónomo Juan Carlos')
    `, [JSON.stringify(zonasLote1)]);

    await logAudit(pool, {
      id_tenant: 1,
      modulo: 'Prescripción VRA',
      accion: 'CREAR_PRESCRIPCION_VRA',
      registro_id: resIns.insertId,
      usuario: 'Ing. Agrónomo Juan Carlos',
      detalle: 'Prescripción VRA-FERT-2026-01 creada para John Deere / Trimble'
    });

    console.log('--- Seed Fase 5 completado exitosamente en MySQL ---');
    process.exit(0);
  } catch (err) {
    console.error('Error en seed VRA:', err);
    process.exit(1);
  }
}

seedVRA();
