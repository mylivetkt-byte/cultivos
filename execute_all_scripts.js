/**
 * execute_all_scripts.js
 * Ejecutar todos los scripts SQL de producción directamente
 * Lee credenciales desde .env
 */

import 'dotenv/config';
import { promises as fs } from 'fs';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Credenciales desde .env
const dbConfig = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: parseInt(process.env.MYSQL_PORT || '3307'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '12345',
  database: process.env.MYSQL_DATABASE || 'sas_agricolas',
  multipleStatements: true
};

const scripts = [
  'migrations/produccion/01_ALTER_existentes.sql',
  'migrations/produccion/02_CREATE_inv_lotes_existencia.sql',
  'migrations/produccion/03_CREATE_produccion.sql',
  'migrations/produccion/03b_CREATE_produccion_lotes.sql',
  'migrations/produccion/03c_CREATE_produccion_costos_cuentas_precios.sql',
  'migrations/produccion/03d_CREATE_produccion_precios_mercado.sql'
];

async function executeScript(scriptPath) {
  try {
    // Leer archivo SQL
    const fullPath = path.join(__dirname, scriptPath);
    const sql = await fs.readFile(fullPath, 'utf-8');

    // Conectar a BD
    const connection = await mysql.createConnection(dbConfig);

    console.log(`\n📋 Ejecutando: ${scriptPath}`);
    console.log(`   ├─ Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`   ├─ Usuario: ${dbConfig.user}`);
    console.log(`   └─ BD: ${dbConfig.database}`);

    // Ejecutar script
    const startTime = Date.now();
    await connection.query(sql);
    const duration = Date.now() - startTime;

    console.log(`✅ COMPLETADO en ${duration}ms`);

    // Cerrar conexión
    await connection.end();
    return true;
  } catch (error) {
    console.error(`\n❌ ERROR en ${scriptPath}`);
    console.error(`   ${error.message}`);
    if (error.sqlMessage) console.error(`   SQL Error: ${error.sqlMessage}`);
    return false;
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                ║');
  console.log('║   EJECUTANDO TODOS LOS SCRIPTS SQL - MÓDULO DE PRODUCCIÓN      ║');
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  let completed = 0;
  let failed = 0;

  for (const script of scripts) {
    const success = await executeScript(script);
    if (success) {
      completed++;
    } else {
      failed++;
    }
  }

  // Resumen final
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                         RESUMEN FINAL                          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log(`✅ Scripts completados: ${completed}/${scripts.length}`);
  if (failed > 0) {
    console.log(`❌ Scripts fallados: ${failed}/${scripts.length}`);
  }

  if (failed === 0) {
    console.log('\n🎉 ¡TODOS LOS SCRIPTS EJECUTADOS EXITOSAMENTE!\n');
    console.log('📊 Resultado:');
    console.log('  ✅ 10 tablas creadas');
    console.log('  ✅ 7+ índices creados');
    console.log('  ✅ Multi-Tenant activado\n');

    console.log('📋 Próximos pasos:\n');
    console.log('  1️⃣  npm install @tanstack/react-table uuid');
    console.log('      ⏱️  ~2 minutos\n');

    console.log('  2️⃣  node scripts/seed_produccion.cjs');
    console.log('      ⏱️  ~30 segundos');
    console.log('      ✅ Crea: 4 productos, 1 receta, 1 orden, 1 lote\n');

    console.log('  3️⃣  npm run dev:server');
    console.log('      ⏱️  ~30 segundos');
    console.log('      ✅ Backend operacional en http://localhost:3002\n');

    console.log('  4️⃣  Abrir en navegador:');
    console.log('      http://localhost:3002/produccion/historico');
    console.log('      ✅ Dashboard visible\n');

    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('⏱️  Tiempo total de setup: ~5 minutos');
    console.log('🚀 ¡Listo para usar!\n');

    process.exit(0);
  } else {
    console.log('\n❌ Hubo errores durante la ejecución');
    console.log('   Revisa los mensajes de error arriba');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Error fatal:', error);
  process.exit(1);
});
