// db_backup.cjs
// Generates a MySQL dump and compresses it into a ZIP file.
// Usage: `node db_backup.cjs`

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Config – adjust if needed
const DB_HOST = process.env.MYSQL_HOST || 'localhost';
const DB_PORT = process.env.MYSQL_PORT || '3307';
const DB_USER = process.env.MYSQL_USER || 'sas_user';
const DB_PASSWORD = process.env.MYSQL_PASSWORD || 'sas_pass';
const DB_NAME = process.env.MYSQL_DATABASE || 'sas_agricolas';

// Ensure backup directory exists
const backupDir = path.resolve(__dirname, 'backup');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().slice(0, 10);
const sqlFile = path.join(backupDir, `${timestamp}.sql`);
const zipFile = path.join(backupDir, `${timestamp}.zip`);

// Build mysqldump command
const dumpCmd = `mysqldump -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} > "${sqlFile}"`;

console.log('Starting MySQL dump...');
exec(dumpCmd, (error, stdout, stderr) => {
  if (error) {
    console.error('mysqldump error:', error.message);
    process.exit(1);
  }
  console.log('Dump created at', sqlFile);
  // Now create zip
  const output = fs.createWriteStream(zipFile);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => {
    console.log('Backup zip created at', zipFile, `(${archive.pointer()} total bytes)`);
    // Optional: remove the raw .sql after zipping
    // fs.unlinkSync(sqlFile);
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(output);
  archive.file(sqlFile, { name: path.basename(sqlFile) });
  archive.finalize();
});
