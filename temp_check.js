import pool from "./server/db.js";
(async () => {
  const [tables] = await pool.query(`SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = DATABASE();`);
  const tableNames = tables.map(t=>t.TABLE_NAME);
  console.log('Tables:', tableNames);
  
  const reglas = [
    {tabla:'comer_clientes', columnas:['codigoCliente'], alcance:'por_tenant'},
    {tabla:'comer_clientes', columnas:['cif'], alcance:'por_tenant'},
    {tabla:'comer_clientes', columnas:['rfc'], alcance:'por_tenant'},
    {tabla:'fincas', columnas:['codigo'], alcance:'por_tenant'},
    {tabla:'fincas', columnas:['nombre'], alcance:'por_tenant'},
    {tabla:'nucleos', columnas:['codigo'], alcance:'por_finca'},
    {tabla:'nucleos', columnas:['nombre'], alcance:'por_finca'}
  ];
  
  for (const r of reglas) {
    const exists = tableNames.includes(r.tabla);
    if (!exists) { console.log(`Tabla ${r.tabla} NO EXISTE`); continue; }
    
    const [cols] = await pool.query(`SELECT COLUMN_NAME FROM information_schema.columns WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`, [r.tabla]);
    const colNames = cols.map(c=>c.COLUMN_NAME);
    const missingCols = r.columnas.filter(c => !colNames.includes(c));
    if (missingCols.length > 0) {
      console.log(`${r.tabla}: columnas ${missingCols.join(',')} NO EXISTEN (falta ALTER TABLE)`);
      continue;
    }
    
    const [idx] = await pool.query(`SELECT INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columnas FROM information_schema.statistics WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? GROUP BY INDEX_NAME, NON_UNIQUE;`, [r.tabla]);
    
    let needCols;
    if (r.alcance === 'por_tenant') {
      needCols = ['id_tenant', ...r.columnas];
    } else if (r.alcance === 'por_finca') {
      needCols = ['id_finca', ...r.columnas];
    } else {
      needCols = r.columnas;
    }
    
    const ok = idx.find(i => i.NON_UNIQUE === 0 && i.columnas.split(',').sort().join(',') === needCols.sort().join(','));
    console.log(`${r.tabla}: ${r.columnas.join(',')} (${r.alcance}) -> ${ok ? 'YA TIENE UNIQUE' : 'FALTA UNIQUE'} (necesita: ${needCols.join(',')})`);
  }
  process.exit();
})();
