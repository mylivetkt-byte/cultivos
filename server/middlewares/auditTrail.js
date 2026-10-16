import pool from '../db.js';

/**
 * Middleware para registrar automáticamente el rastro de auditoría
 * de peticiones HTTP modificadoras (POST, PUT, DELETE, PATCH).
 */
export const auditTrailMiddleware = async (req, res, next) => {
  // Solo interceptamos métodos que modifican estado
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    // Interceptar la respuesta para saber si fue exitosa antes de guardar el log
    const originalSend = res.send;
    
    res.send = function (body) {
      res.send = originalSend;
      
      // Si la petición fue exitosa (2xx), registramos el audit trail
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const id_tenant = req.user?.id_tenant || req.body?.id_tenant || 1; // Fallback for dev
          const id_usuario = req.user?.id || null;
          
          // Extraer el módulo basado en la URL base
          const urlParts = req.originalUrl.split('/');
          const modulo = urlParts[2] || 'general'; // /api/modulo/...
          
          const accion = req.method;
          const entidad = urlParts[3] || 'recurso';
          const ip_address = req.ip || req.connection.remoteAddress;
          const user_agent = req.headers['user-agent'];
          
          const json_new = req.body ? JSON.stringify(req.body) : null;

          pool.query(`
            INSERT INTO rastro_auditoria 
            (id_tenant, id_usuario, modulo, accion, entidad, json_new, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [id_tenant, id_usuario, modulo, accion, entidad, json_new, ip_address, user_agent])
          .catch(err => console.error('Error asíncrono guardando Audit Trail:', err));
          
        } catch (error) {
          console.error('Error en auditTrailMiddleware:', error);
        }
      }
      
      return res.send(body);
    };
  }
  
  next();
};
