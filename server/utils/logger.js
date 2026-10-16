import pino from 'pino';

// 1. Configuración de Sentry (Esqueleto)
// Cuando decidas instalar Sentry, solo debes correr: npm install @sentry/node @sentry/profiling-node
// y habilitar estas líneas. Por ahora, si pasas SENTRY_DSN en tu .env, simplemente imprimirá que está activo.
export const initSentry = (app) => {
  if (process.env.SENTRY_DSN) {
    console.log('✅ [Sentry] DSN detectado. (Preparado para tracking de errores remoto)');
    // require('@sentry/node').init({
    //   dsn: process.env.SENTRY_DSN,
    //   integrations: [ ... ],
    //   tracesSampleRate: 1.0,
    // });
  } else {
    console.log('⚠️ [Sentry] No DSN. Operando únicamente con Logger Local.');
  }
};

// 2. Configuración de Pino Logger
const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // En producción, JSON puro para Datadog/CloudWatch.
  // En desarrollo, texto plano pero sin usar dependencias complejas extra (como pino-pretty) para mantenerlo simple ahora.
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Middleware para inyectar logger y Trace ID en cada petición (req.log, req.traceId)
 */
export const loggerMiddleware = (req, res, next) => {
  req.traceId = req.headers['x-request-id'] || Date.now().toString(36) + Math.random().toString(36).substring(2);
  req.log = logger.child({ traceId: req.traceId, url: req.url, method: req.method, ip: req.ip });
  next();
};
