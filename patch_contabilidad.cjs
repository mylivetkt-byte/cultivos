const fs = require('fs');
let code = fs.readFileSync('server/services/contabilidadSync.js', 'utf8');

const additionalMethods = `
export async function contabilizarProduccionBiol(connection, id_tenant, id_centro_costo, costoTotal, ref) {
  // Cuenta 140000 (Inventario MP) sale, y Cuenta 143000 (Inventario PT) entra.
  return registrarPartidaDoble(connection, id_tenant, 'Producción Biol (Receta)', 'Biofabrica', ref, [
    { id_cuenta: 143000, id_centro_costo: id_centro_costo, tipo: 'debito', monto: costoTotal },
    { id_cuenta: 140000, id_centro_costo: null, tipo: 'credito', monto: costoTotal }
  ]);
}

export async function contabilizarConsumoTaller(connection, id_tenant, id_maquina, costoTotal, ref) {
  // Cuenta 51 (Gasto Mantenimiento) vs Cuenta 14 (Repuestos)
  return registrarPartidaDoble(connection, id_tenant, 'Consumo OT Mantenimiento', 'Taller', ref, [
    { id_cuenta: 514500, id_centro_costo: id_maquina, tipo: 'debito', monto: costoTotal },
    { id_cuenta: 140000, id_centro_costo: null, tipo: 'credito', monto: costoTotal }
  ]);
}

export async function contabilizarVivero(connection, id_tenant, id_vivero, costoInsumos, ref) {
  // Activo Biológico en desarrollo (41) vs Inventario (14)
  return registrarPartidaDoble(connection, id_tenant, 'Consumo Vivero / Semillero', 'Viveros', ref, [
    { id_cuenta: 410000, id_centro_costo: id_vivero, tipo: 'debito', monto: costoInsumos },
    { id_cuenta: 140000, id_centro_costo: null, tipo: 'credito', monto: costoInsumos }
  ]);
}

export async function contabilizarGanaderia(connection, id_tenant, id_animal, tipoOperacion, monto, ref) {
  if (tipoOperacion === 'NACIMIENTO') {
    // Activo Biológico (Alta) vs Ingresos por Valoración
    return registrarPartidaDoble(connection, id_tenant, 'Alta Ganado (Nacimiento)', 'Ganaderia', ref, [
      { id_cuenta: 410000, id_centro_costo: id_animal, tipo: 'debito', monto: monto },
      { id_cuenta: 420000, id_centro_costo: null, tipo: 'credito', monto: monto }
    ]);
  } else if (tipoOperacion === 'MUERTE') {
    // Pérdida (Gasto) vs Activo Biológico (Baja)
    return registrarPartidaDoble(connection, id_tenant, 'Baja Ganado (Mortalidad)', 'Ganaderia', ref, [
      { id_cuenta: 519900, id_centro_costo: id_animal, tipo: 'debito', monto: monto },
      { id_cuenta: 410000, id_centro_costo: id_animal, tipo: 'credito', monto: monto }
    ]);
  } else if (tipoOperacion === 'LECHE') {
    // Inventario PT (Leche) vs Activo Biológico / Ingreso
    return registrarPartidaDoble(connection, id_tenant, 'Producción Leche', 'Ganaderia', ref, [
      { id_cuenta: 143000, id_centro_costo: null, tipo: 'debito', monto: monto },
      { id_cuenta: 410000, id_centro_costo: id_animal, tipo: 'credito', monto: monto }
    ]);
  }
}

export async function contabilizarAcuicultura(connection, id_tenant, id_lago, tipoOperacion, monto, ref) {
  if (tipoOperacion === 'ALIMENTO') {
    // Costo Biomasa vs Inventario Alimento
    return registrarPartidaDoble(connection, id_tenant, 'Alimentación Acuícola', 'Acuicultura', ref, [
      { id_cuenta: 410000, id_centro_costo: id_lago, tipo: 'debito', monto: monto },
      { id_cuenta: 140000, id_centro_costo: null, tipo: 'credito', monto: monto }
    ]);
  } else if (tipoOperacion === 'COSECHA') {
    // Inventario Pescado (PT) vs Costo Biomasa Acumulada
    return registrarPartidaDoble(connection, id_tenant, 'Cosecha Acuícola', 'Acuicultura', ref, [
      { id_cuenta: 143000, id_centro_costo: null, tipo: 'debito', monto: monto },
      { id_cuenta: 410000, id_centro_costo: id_lago, tipo: 'credito', monto: monto }
    ]);
  }
}

export async function contabilizarMermaDonacion(connection, id_tenant, monto, esDonacion, ref) {
  // Gasto Operacional (Merma 51) o Gasto Representación (Donacion 52) vs Inventario
  const cuentaGasto = esDonacion ? 520000 : 519900;
  return registrarPartidaDoble(connection, id_tenant, esDonacion ? 'Donación / Regalo' : 'Merma / Ajuste', 'Inventario', ref, [
    { id_cuenta: cuentaGasto, id_centro_costo: null, tipo: 'debito', monto: monto },
    { id_cuenta: 140000, id_centro_costo: null, tipo: 'credito', monto: monto }
  ]);
}
`;

if (!code.includes('contabilizarProduccionBiol')) {
  fs.writeFileSync('server/services/contabilidadSync.js', code + '\n' + additionalMethods);
  console.log('contabilidadSync.js patched successfully');
} else {
  console.log('Already patched');
}
