module.exports = {
  apps: [
    {
      name: 'sas-backend',
      script: 'server/index.js',
      instances: 'max', // Utiliza todos los núcleos de CPU disponibles en DonWeb
      exec_mode: 'cluster', // Corre en modo cluster para balanceo de carga
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      time: true, // Agrega timestamps a los logs
      watch: false // Apagar reinicio automático por cambios de archivos en producción
    },
    {
      name: 'sas-whatsapp-bot',
      script: 'server/whatsapp-bot.js',
      instances: 1, // El bot de WA de Baileys SOLO puede tener 1 instancia por la sesión SQlite
      exec_mode: 'fork', // Modo normal
      env: {
        NODE_ENV: 'production',
        WHATSAPP_BOT_PORT: 3004
      },
      error_file: './logs/whatsapp-error.log',
      out_file: './logs/whatsapp-out.log',
      time: true,
      watch: false
    }
  ]
};
