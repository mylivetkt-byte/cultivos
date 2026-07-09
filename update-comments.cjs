const mysql = require('mysql2/promise');
(async () => {
  const pool = await mysql.createConnection({
    host: 'localhost', port: 3307, user: 'root', password: '12345', database: 'sas_agricolas'
  });
  const updates = [
    { t: 'categorias_insumos', c: 'Categoría Insumos' },
    { t: 'insumos', c: 'Insumos' },
    { t: 'inv_conversiones', c: 'Inv Conversiones' },
    { t: 'inv_documentos', c: 'Inv Documentos' },
    { t: 'inv_grupos', c: 'Inv Grupos' },
    { t: 'inv_subgrupos', c: 'Inv Subgrupos' },
    { t: 'inv_tipos_documento', c: 'Inv Tipos De Documentos' },
    { t: 'inv_unidades', c: 'Inv Unidades' }
  ];
  for (const u of updates) {
    try {
      await pool.query(`ALTER TABLE ${u.t} COMMENT = '${u.c}'`);
      console.log('Updated', u.t);
    } catch (e) {
      console.log('Error', u.t, e.message);
    }
  }
  process.exit(0);
})();
