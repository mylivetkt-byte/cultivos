import fetch from 'node-fetch'; // Requiere 'node-fetch' o usar Node 18+ (que ya lo trae nativo)
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Cargar variables de entorno
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const PORT = process.env.PORT || 3002;
const BASE_URL = `http://localhost:${PORT}/api`;
const JWT_SECRET = process.env.JWT_SECRET || 'secret-inseguro-para-desarrollo';

// Generar un token válido de Administrador para que el middleware auth no nos bloquee
const mockToken = jwt.sign(
  {
    userId: 1,
    username: 'admin_tests',
    rol: 'Administrador',
    tenantId: 1
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${mockToken}`
};

// Lista de endpoints críticos a auditar
const endpoints = [
  // Generales
  { method: 'GET', url: '/health' },
  { method: 'GET', url: '/basculas?tenantId=1' },
  
  // Tablas / CRUD básicas
  { method: 'GET', url: '/table/fincas/data?tenantId=1' },
  
  // POS y Ventas
  { method: 'GET', url: '/pos/ventas/historial?desde=2024-01-01&hasta=2026-12-31' },
  { method: 'GET', url: '/pos/arqueo/historial' },
  { method: 'GET', url: '/pos/cajas' },
  
  // Reportes Complejos y Dashboards (¡El que se rompió hoy!)
  {
    method: 'POST',
    url: '/sistemas/dashboard-finca-auditoria',
    body: {
      id_finca: 1, // Probamos con la Finca ID 1
      fechaInicio: '2025-01-01',
      fechaFin: '2026-12-31'
    }
  },
  {
    method: 'POST',
    url: '/sistemas/dashboard-finca-auditoria',
    body: {
      id_finca: 2, // Probamos con la Finca ID 2
      fechaInicio: '2025-01-01',
      fechaFin: '2026-12-31'
    }
  }
];

async function runSmokeTests() {
  console.log(`\n======================================================`);
  console.log(`🛡️  INICIANDO PRUEBAS AUTOMÁTICAS (SMOKE TESTS) 🛡️`);
  console.log(`======================================================\n`);
  
  let passed = 0;
  let failed = 0;

  for (const ep of endpoints) {
    const fullUrl = `${BASE_URL}${ep.url}`;
    try {
      const options = {
        method: ep.method,
        headers: headers
      };

      if (ep.body) {
        options.body = JSON.stringify(ep.body);
      }

      const start = Date.now();
      const res = await fetch(fullUrl, options);
      const time = Date.now() - start;

      let isError = !res.ok;
      let errorMsg = res.statusText;
      let json = null;
      try {
        json = await res.json();
        if (json && json.error) {
          isError = true;
          errorMsg = json.error;
        }
      } catch(e) {}

      // Si el status no es 200 (OK), consideramos que falló
      if (isError) {
        console.log(`❌ [FALLÓ] ${ep.method} ${ep.url}`);
        console.log(`   -> Status: ${res.status}`);
        console.log(`   -> Error: ${errorMsg}\n`);
        failed++;
      } else {
        console.log(`✅ [OK] ${ep.method} ${ep.url} (${time}ms)`);
        passed++;
      }
    } catch (err) {
      console.log(`💥 [CRASH] ${ep.method} ${ep.url}`);
      console.log(`   -> Mensaje de Excepción: ${err.message}\n`);
      failed++;
    }
  }

  console.log(`\n======================================================`);
  console.log(`📊 RESULTADOS FINALES`);
  console.log(`======================================================`);
  console.log(`Total Endpoints: ${endpoints.length}`);
  console.log(`✅ Exitosos: ${passed}`);
  console.log(`❌ Fallidos: ${failed}`);

  if (failed > 0) {
    console.log(`\n⚠️  ADVERTENCIA: Tienes rutas rotas. Revisa los errores arriba antes de presentar.`);
    process.exit(1);
  } else {
    console.log(`\n🎉 ¡TODO ESTÁ PERFECTO! Puedes presentar con total tranquilidad.`);
    process.exit(0);
  }
}

runSmokeTests();
