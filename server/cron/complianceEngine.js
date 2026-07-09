import pool from '../db.js';

/**
 * Motor de Reglas de Compliance
 * Analiza la BD y genera alertas en la tabla `alertas`
 */
export async function runComplianceEngine(tenantId) {
  console.log(`[Compliance] Ejecutando motor de reglas para tenant ${tenantId}...`);
  const alertsToInsert = [];

  try {
    // REGLA 1: Calidad de Datos (Empleados sin identificación o datos obligatorios)
    // Se asume que empleados que no tengan documento_identidad o nombres no cumplen la ley.
    const [empleadosSinDatos] = await pool.query(`
      SELECT id_empleado, nombre, nombres, apellidos 
      FROM empleados 
      WHERE id_tenant = ? AND (documento_identidad IS NULL OR nombres IS NULL)
    `, [tenantId]);

    if (empleadosSinDatos.length > 0) {
      alertsToInsert.push({
        tipo_alerta: 'Advertencia',
        titulo: 'Compliance Laboral: Datos Incompletos',
        mensaje: `Existen ${empleadosSinDatos.length} empleados sin documento de identidad o nombres registrados. Esto infringe normativas laborales.`,
        prioridad: 'Alta'
      });
    }

    // REGLA 2: Labores Incumplidas o Retrasadas
    // Labores con estado 'Asignada' o 'En Progreso' que debieron terminar hace más de 24h.
    const [laboresRetrasadas] = await pool.query(`
      SELECT id_labor, descripcion 
      FROM gps_labores_asignaciones
      WHERE id_tenant = ? 
        AND estado IN ('Asignada', 'En Progreso') 
        AND fecha_fin < DATE_SUB(NOW(), INTERVAL 1 DAY)
    `, [tenantId]);

    if (laboresRetrasadas.length > 0) {
      alertsToInsert.push({
        tipo_alerta: 'Advertencia',
        titulo: 'Compliance Operativo: Labores Retrasadas',
        mensaje: `Hay ${laboresRetrasadas.length} labores asignadas que ya superaron su fecha de finalización y siguen sin completarse.`,
        prioridad: 'Media'
      });
    }

    // REGLA 3: Control de Certificaciones Vencidas o Próximas a vencer
    // Chequea certificaciones_finca si existe
    try {
      const [certs] = await pool.query(`
        SELECT nombre_certificacion, fecha_vencimiento
        FROM certificaciones_finca
        WHERE id_tenant = ? AND fecha_vencimiento < DATE_ADD(NOW(), INTERVAL 30 DAY)
      `, [tenantId]);

      if (certs.length > 0) {
        alertsToInsert.push({
          tipo_alerta: 'Critica',
          titulo: 'Compliance Agrícola: Certificaciones Críticas',
          mensaje: `Tienes ${certs.length} certificaciones vencidas o por vencer en menos de 30 días.`,
          prioridad: 'Critica'
        });
      }
    } catch (err) {
      // Ignore if table doesn't exist
    }

    // Insertar todas las alertas recopiladas
    if (alertsToInsert.length > 0) {
      for (const alerta of alertsToInsert) {
        await pool.query(`
          INSERT INTO alertas (id_tenant, tipo_alerta, titulo, mensaje, prioridad)
          VALUES (?, ?, ?, ?, ?)
        `, [tenantId, alerta.tipo_alerta, alerta.titulo, alerta.mensaje, alerta.prioridad]);
      }
      console.log(`[Compliance] ${alertsToInsert.length} nuevas alertas generadas.`);
    } else {
      console.log(`[Compliance] Todo en orden. No hay alertas generadas.`);
    }

    return { success: true, alertsGenerated: alertsToInsert.length, alerts: alertsToInsert };
  } catch (error) {
    console.error('[Compliance] Error en motor de compliance:', error);
    return { success: false, error: error.message };
  }
}
