import pool from '../db.js';

/**
 * Registra un comprobante contable por partida doble
 */
async function registrarPartidaDoble(connection, id_tenant, descripcion, modulo_origen, doc_referencia, cuentas) {
  // cuentas es un array de { id_cuenta, id_centro_costo, tipo: 'debito'|'credito', monto: number }
  const totalDebito = cuentas.filter(c => c.tipo === 'debito').reduce((sum, c) => sum + c.monto, 0);
  const totalCredito = cuentas.filter(c => c.tipo === 'credito').reduce((sum, c) => sum + c.monto, 0);

  if (Math.abs(totalDebito - totalCredito) > 0.01) {
    throw new Error(`Descuadre contable: Débitos (${totalDebito}) != Créditos (${totalCredito})`);
  }

  const [asientoRes] = await connection.query(`
    INSERT INTO asientos_contables 
    (id_tenant, fecha_asiento, descripcion, documento_referencia, modulo_origen, total_debito, total_credito, estado)
    VALUES (?, NOW(), ?, ?, ?, ?, ?, 'Activo')
  `, [id_tenant, descripcion, doc_referencia, modulo_origen, totalDebito, totalCredito]);

  const id_asiento = asientoRes.insertId;

  const valoresDetalle = cuentas.map(c => [
    id_asiento, id_tenant, c.id_cuenta, c.id_centro_costo || null, 
    c.tipo === 'debito' ? c.monto : 0, 
    c.tipo === 'credito' ? c.monto : 0, 
    descripcion
  ]);

  await connection.query(`
    INSERT INTO contab_detalles 
    (id_asiento, id_tenant, id_cuenta, id_centro_costo, debito, credito, descripcion)
    VALUES ?
  `, [valoresDetalle]);

  return id_asiento;
}

export async function contabilizarNomina(connection, id_tenant, id_lote, monto, ref) {
  // Cuenta 51 (Gasto Personal) vs Cuenta 25 (Pasivo Laboral / Banco)
  return registrarPartidaDoble(connection, id_tenant, 'Cierre de Jornal - Nómina', 'Nómina', ref, [
    { id_cuenta: 510000, id_centro_costo: id_lote, tipo: 'debito', monto },
    { id_cuenta: 250000, id_centro_costo: null, tipo: 'credito', monto }
  ]);
}

export async function contabilizarInventario(connection, id_tenant, id_lote, monto, tipoMovimiento, ref) {
  if (tipoMovimiento === 'SALIDA') {
    // Cuenta 71 (Costo Producción) vs Cuenta 14 (Inventario)
    return registrarPartidaDoble(connection, id_tenant, 'Salida Insumo a Lote', 'Kardex', ref, [
      { id_cuenta: 710000, id_centro_costo: id_lote, tipo: 'debito', monto },
      { id_cuenta: 140000, id_centro_costo: null, tipo: 'credito', monto }
    ]);
  } else {
    // ENTRADA: Cuenta 14 vs Cuenta 22 (Proveedores)
    return registrarPartidaDoble(connection, id_tenant, 'Entrada de Inventario', 'Kardex', ref, [
      { id_cuenta: 140000, id_centro_costo: null, tipo: 'debito', monto },
      { id_cuenta: 220000, id_centro_costo: null, tipo: 'credito', monto }
    ]);
  }
}

export async function contabilizarAplicacionCultivo(connection, id_tenant, id_lote, monto, ref) {
  // Cuenta 71 (Costo Producción Agrícola) vs Cuenta 14 (Inventario)
  // Nota: Esto asume que el backend ya consolidó si fue materia prima (140000) o Biol (143000), aquí generalizamos a 140000 para salida estándar NIIF.
  return registrarPartidaDoble(connection, id_tenant, 'Aplicación de Insumos/Bioles a Lote', 'Aplicaciones Agrícolas', ref, [
    { id_cuenta: 710000, id_centro_costo: id_lote, tipo: 'debito', monto },
    { id_cuenta: 140000, id_centro_costo: null, tipo: 'credito', monto }
  ]);
}

export async function contabilizarCosecha(connection, id_tenant, id_lote, montoValorFeria, ref) {
  // Cuenta 14 (Inventario PT) vs Cuenta 41 (Ingresos / Activo Biológico)
  return registrarPartidaDoble(connection, id_tenant, 'Reconocimiento Cosecha', 'Produccion', ref, [
    { id_cuenta: 143000, id_centro_costo: null, tipo: 'debito', monto: montoValorFeria },
    { id_cuenta: 410000, id_centro_costo: id_lote, tipo: 'credito', monto: montoValorFeria }
  ]);
}

export async function contabilizarVenta(connection, id_tenant, montos, ref) {
  // montos = { total, iva, retencion, neto }
  return registrarPartidaDoble(connection, id_tenant, 'Venta POS / DIAN', 'Ventas', ref, [
    { id_cuenta: 110000, id_centro_costo: null, tipo: 'debito', monto: montos.neto },
    { id_cuenta: 135500, id_centro_costo: null, tipo: 'debito', monto: montos.retencion },
    { id_cuenta: 240800, id_centro_costo: null, tipo: 'credito', monto: montos.iva },
    { id_cuenta: 413500, id_centro_costo: null, tipo: 'credito', monto: montos.total }
  ]);
}


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
