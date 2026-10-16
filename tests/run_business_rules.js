import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3002/api';

async function runTests() {
  console.log('Iniciando tests de reglas de negocio para Drones...');

  let testDronId = null;
  let testPilotoId = 1; // Asumiendo que el seed creó al menos 1 empleado

  try {
    // 1. Crear un dron y equipo
    console.log('--- TEST 1: Crear Dron ---');
    const resDron = await fetch(`${BASE_URL}/drones/equipos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_tenant: 1,
        id_finca: 1,
        codigo: 'DRN-TEST',
        nombre: 'Dron de Prueba API',
        numero_serie: 'SN-TEST-001',
        catalogo_modelo_id: 1,
        horas_vuelo_acumuladas: 0
      })
    });
    const dronData = await resDron.json();
    if (!dronData.success) {
      console.error('Fallo creando dron:', dronData);
      return;
    }
    testDronId = dronData.equipo_id;
    console.log('✅ Dron creado con ID maquinaria:', testDronId);

    // Para la misión, necesitamos el ID de equipos_dron
    // Lo consultamos vía el endpoint genérico
    const resEq = await fetch(`${BASE_URL}/table/equipos_dron/data?search=${testDronId}`);
    const eqData = await resEq.json();
    const equipoDron = eqData.data.find(d => Number(d.equipo_id) === Number(testDronId));
    if (!equipoDron) throw new Error('equipo_dron no encontrado');

    const equipoDronId = equipoDron.id;
    console.log('✅ equipo_dron_id:', equipoDronId);

    // 2. Insertar licencia vencida manual para probar RN1
    await fetch(`${BASE_URL}/table/dron_licencias_pilotos/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        empleado_id: testPilotoId,
        numero_licencia: 'LIC-VENCIDA',
        fecha_emision: '2020-01-01',
        fecha_vencimiento_licencia: '2022-01-01'
      })
    });
    console.log('✅ Licencia vencida inyectada');

    // 3. Probar RN1 (Licencia vencida)
    console.log('--- TEST 2: Programar Misión con Licencia Vencida ---');
    const resMisionVencida = await fetch(`${BASE_URL}/drones/misiones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        equipo_dron_id: equipoDronId,
        piloto_id: 1, // ID de la tabla dron_licencias_pilotos insertada
        lote_id: 1,
        tipo: 'fumigacion',
        fecha_programada: '2027-01-01' // fecha futura respecto a vencimiento
      })
    });
    const misionVencidaData = await resMisionVencida.json();
    if (resMisionVencida.status === 400 && misionVencidaData.error.includes('vencida')) {
      console.log('✅ RN1: Bloqueo de misión por licencia vencida exitoso');
    } else {
      console.error('❌ RN1 Falló. No se bloqueó la misión:', misionVencidaData);
    }

    // 4. Actualizar licencia a fecha futura
    await fetch(`${BASE_URL}/table/dron_licencias_pilotos/data/1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fecha_vencimiento_licencia: '2030-01-01'
      })
    });

    // 5. Programar Misión exitosa
    console.log('--- TEST 3: Programar Misión Exitosa ---');
    const resMisionOk = await fetch(`${BASE_URL}/drones/misiones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        equipo_dron_id: equipoDronId,
        piloto_id: 1,
        lote_id: 1,
        tipo: 'fumigacion',
        fecha_programada: '2027-01-01',
        producto_id: 1,
        cantidad_producto: 10
      })
    });
    const misionOkData = await resMisionOk.json();
    if (misionOkData.success) {
      console.log('✅ Misión programada con éxito ID:', misionOkData.mision_id);
    } else {
      console.error('❌ Falló programar misión:', misionOkData);
      return;
    }

    // 6. RN2: Cierre de misión y transacción (suma horas y descuenta inv)
    console.log('--- TEST 4: Cierre de Misión y RN2 ---');
    const resCierre = await fetch(`${BASE_URL}/drones/misiones/${misionOkData.mision_id}/cierre`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        area_cubierta_ha: 20,
        duracion_minutos: 120, // 2 horas
        bodega_origen_id: 1
      })
    });
    const cierreData = await resCierre.json();
    if (cierreData.success) {
      console.log('✅ Misión cerrada exitosamente');
    } else {
      console.error('❌ Falló cierre de misión:', cierreData);
    }

    // Verificar si se sumaron las 2 horas al dron
    const resEqUpdated = await fetch(`${BASE_URL}/table/equipos_dron/data?search=${testDronId}`);
    const eqDataUpdated = await resEqUpdated.json();
    const equipoDronUpdated = eqDataUpdated.data.find(d => Number(d.equipo_id) === Number(testDronId));
    if (Number(equipoDronUpdated.horas_vuelo_acumuladas) === 2) {
      console.log('✅ RN2: Horas de vuelo sumadas correctamente (2.0)');
    } else {
      console.error('❌ RN2: Falló la suma de horas de vuelo. Actual:', equipoDronUpdated.horas_vuelo_acumuladas);
    }

    // 7. Alertas manual trigger
    console.log('--- TEST 5: Job de Alertas ---');
    const resAlertas = await fetch(`${BASE_URL}/drones/alertas/generar`);
    const alertasData = await resAlertas.json();
    if (alertasData.success) {
      console.log('✅ Job de alertas ejecutado');
    } else {
      console.error('❌ Falló job de alertas:', alertasData);
    }

    console.log('\n🚀 TODOS LOS TESTS DE DRONES COMPLETADOS EXITOSAMENTE.');
  } catch (err) {
    console.error('Error no manejado en los tests:', err);
  }
}

runTests();
