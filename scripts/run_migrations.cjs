const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const mysqlPath = 'C:\\\\Program Files\\\\MySQL\\\\MySQL Server 8.0\\\\bin\\\\mysql.exe';
const dbOptions = '-h127.0.0.1 -P3307 -u root -p12345 sas_agricolas';
const migPath = path.join(__dirname, '..', 'migrations', 'produccion');

fs.readdirSync(migPath)
  .filter(f => f.endsWith('.sql'))
  .sort()
  .forEach(file => {
    const fullPath = path.join(migPath, file);
    console.log(`▶ Ejecutando ${file}`);
    try {
      execSync(`cmd /c ${mysqlPath} ${dbOptions} < '${fullPath}'`, { stdio: 'inherit' });
      console.log(`✅ ${file} ejecutado correctamente`);
    } catch (err) {
      console.error(`❌ Error al ejecutar ${file}: ${err.message}`);
      process.exit(1);
    }
  });

console.log('🎉 Todas las migraciones completadas');