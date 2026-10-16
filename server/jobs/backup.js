import cron from 'node-cron';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger.js';
import 'dotenv/config';

// Crear carpeta de backups si no existe
const backupDir = path.join(process.cwd(), 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

// Tarea programada: Todos los días a las 2:00 AM
export const startBackupCron = () => {
  cron.schedule('0 2 * * *', () => {
    logger.info('Iniciando respaldo automático de la base de datos...');

    const date = new Date().toISOString().split('T')[0];
    const fileName = `backup_${date}.sql`;
    const filePath = path.join(backupDir, fileName);

    const { MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, MYSQL_HOST } = process.env;

    if (!MYSQL_USER || !MYSQL_DATABASE) {
      logger.error('No se configuraron las credenciales MYSQL para el backup.');
      return;
    }

    // Comando mysqldump
    const dumpCmd = `mysqldump -h ${MYSQL_HOST || '127.0.0.1'} -u ${MYSQL_USER} ${MYSQL_PASSWORD ? `-p${MYSQL_PASSWORD}` : ''} ${MYSQL_DATABASE} > "${filePath}"`;

    exec(dumpCmd, (error, stdout, stderr) => {
      if (error) {
        logger.error(`Error generando backup: ${error.message}`);
        return;
      }
      if (stderr && !stderr.includes('Warning')) {
        // mysqldump a veces arroja warnings en stderr
        logger.warn(`Backup stderr: ${stderr}`);
      }
      logger.info(`✅ Respaldo exitoso: ${fileName}`);

      // Limpieza: borrar archivos de más de 7 días
      cleanOldBackups(7);
    });
  });
};

function cleanOldBackups(daysKept) {
  fs.readdir(backupDir, (err, files) => {
    if (err) return logger.error(`Error leyendo dir de backups: ${err}`);

    const now = Date.now();
    files.forEach(file => {
      if (file.endsWith('.sql')) {
        const filePath = path.join(backupDir, file);
        fs.stat(filePath, (err, stats) => {
          if (err) return;
          const daysOld = (now - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
          if (daysOld > daysKept) {
            fs.unlink(filePath, err => {
              if (err) logger.error(`Error borrando backup antiguo ${file}: ${err}`);
              else logger.info(`🗑️ Backup antiguo eliminado: ${file}`);
            });
          }
        });
      }
    });
  });
}
