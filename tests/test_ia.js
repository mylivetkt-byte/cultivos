import fetch from 'node-fetch';

const BASE_URL = 'http://127.0.0.1:3002/api';

async function testWebChat(mensaje) {
  console.log(`\n🗣️ Usuario: "${mensaje}"`);
  try {
    const res = await fetch(`${BASE_URL}/ia/tools`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: mensaje, history: [] })
    });
    const data = await res.json();
    console.log(`🤖 IA: ${data.respuesta || data.error}`);
  } catch (err) {
    console.error('❌ Error de conexión:', err.message);
  }
}

async function runTests() {
  console.log('Iniciando tests del Agente IA de la Finca...');
  
  // 1. Pregunta general que debería invocar get_resumen_finca
  await testWebChat('¿Cómo va la finca hoy? Dame un resumen.');
  
  // 2. Pregunta de ubicación de empleados
  await testWebChat('¿Dónde están ubicados los empleados en este momento?');
  
  // 3. Pregunta de inventario
  await testWebChat('¿Cuánto fertilizante nos queda en inventario?');
  
  // 4. Pregunta de clima
  await testWebChat('¿Cómo está el clima para hoy?');

  console.log('\n✅ Tests completados.');
}

runTests();
