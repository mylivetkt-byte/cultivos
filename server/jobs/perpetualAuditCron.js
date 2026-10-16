import cron from 'node-cron';
import pool from '../db.js';
import { Server } from 'socket.io'; // Asumiendo inyección de dependencias o instancia global

export function startPerpetualAudit(io) {
  // Ejecutar todos los días a las 23:59
  cron.schedule('59 23 * * *', async () => {
    console.log('🔍 Iniciando Watchdog: Motor de Auditoría Perpetua...');
    try {
      const [tenants] = await pool.query('SELECT DISTINCT id_tenant FROM periodos_contables WHERE estado = "Abierto"');
      
      for (const t of tenants) {
        const tenantId = t.id_tenant;
        
        // 1. Calcular Ecuación de Partida Doble
        const [sumRes] = await pool.query(`
          SELECT 
            SUM(debito) as total_deb, 
            SUM(credito) as total_cred
          FROM contab_detalles 
          WHERE id_tenant = ?
        `, [tenantId]);
        
        const debito = sumRes[0].total_deb || 0;
        const credito = sumRes[0].total_cred || 0;
        const descuadre = debito - credito;

        if (Math.abs(descuadre) > 0.01) {
          console.error(`🚨 ALERTA ROJA: Descuadre contable en Tenant ${tenantId} | Diferencia: ${descuadre}`);
          
          if (io) {
            io.emit('alerta_auditoria', {
              tenantId,
              mensaje: `ALERTA CRÍTICA: Descuadre detectado por $${Math.abs(descuadre)}`,
              tipo: 'descuadre_contable'
            });
          }

          await pool.query(`
            INSERT INTO rastro_auditoria 
            (id_tenant, modulo, accion, entidad, json_new, fecha_registro)
            VALUES (?, 'Auditoria_Cron', 'ALERTA', 'Periodo', ?, NOW())
          `, [tenantId, JSON.stringify({ error: 'Descuadre contable detectado', diferencia: descuadre })]);
        } else {
          console.log(`✅ Tenant ${tenantId}: Partida doble intacta.`);
        }
      }
    } catch (err) {
      console.error('Error en cron de auditoría:', err);
    }
  });
}
