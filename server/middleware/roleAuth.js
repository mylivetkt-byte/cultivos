// roleAuth.js
// Middleware to restrict access to specific roles (admin, gerencia, jefes de sección)
// Assumes req.user.role is set by previous authentication middleware.

export function requireRoles(allowedRoles) {
  return function (req, res, next) {
    const userRole = req.user && req.user.role;
    if (!userRole) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }
    if (allowedRoles.includes(userRole)) {
      return next();
    }
    return res.status(403).json({ message: 'Acceso denegado' });
  };
}

// Convenience preset for the required roles
export const adminGerenciaJefe = requireRoles([
  'admin',
  'gerencia',
  'jefe_seccion'
]);
