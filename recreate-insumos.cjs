const mysql = require('mysql2/promise');

async function run() {
  const pool = mysql.createPool({host:'localhost',port:3307,user:'root',password:'12345',database:'sas_agricolas'});
  
  try {
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    await pool.query('TRUNCATE TABLE inv_grupos');
    await pool.query('TRUNCATE TABLE inv_subgrupos');
    await pool.query('TRUNCATE TABLE insumos');
    
    // GRUPOS
    const grupos = [
      [1, 1, 'AGRO', 'Agroquímicos y Fertilizantes', 'Productos químicos para el cultivo'],
      [2, 1, 'HERR', 'Herramientas y Equipos', 'Herramientas manuales y equipos menores'],
      [3, 1, 'MANT', 'Mantenimiento y Repuestos', 'Repuestos para maquinaria y planta extractora'],
      [4, 1, 'COMB', 'Combustibles y Lubricantes', 'Para tractores y maquinaria pesada'],
      [5, 1, 'EPP',  'Protección Personal', 'Elementos de seguridad para trabajadores'],
      [6, 1, 'SERV', 'Servicios', 'Servicios prestados por terceros']
    ];
    
    for (const g of grupos) {
      await pool.query('INSERT INTO inv_grupos (id_grupo, id_tenant, codigo, nombre, descripcion) VALUES (?, ?, ?, ?, ?)', g);
    }

    // SUBGRUPOS
    const subgrupos = [
      // Para AGRO (1)
      [1, 1, 1, 'FERT', 'Fertilizantes Edáficos', null],
      [2, 1, 1, 'FOLI', 'Fertilizantes Foliares', null],
      [3, 1, 1, 'HERB', 'Herbicidas', null],
      [4, 1, 1, 'INSE', 'Insecticidas', null],
      [5, 1, 1, 'FUNG', 'Fungicidas', null],
      // Para HERR (2)
      [6, 2, 1, 'MANU', 'Herramientas Manuales', 'Palines, machetes, etc.'],
      [7, 2, 1, 'COSE', 'Herramientas de Cosecha', 'Cuchillos malayos, varas'],
      // Para MANT (3)
      [8, 3, 1, 'TRACT', 'Repuestos Tractores', null],
      [9, 3, 1, 'EXTR', 'Repuestos Extractora', null],
      // Para COMB (4)
      [10, 4, 1, 'COMB', 'Combustibles', null],
      [11, 4, 1, 'LUBR', 'Lubricantes y Grasas', null],
      // Para EPP (5)
      [12, 5, 1, 'ROPA', 'Ropa de Trabajo', null],
      [13, 5, 1, 'PROT', 'Protección Visual y Auditiva', null],
      // Para SERV (6)
      [14, 6, 1, 'TRAN', 'Transporte', 'Transporte de fruta'],
      [15, 6, 1, 'CONT', 'Labores Contratadas', 'Poda, cosecha, etc.']
    ];

    for (const s of subgrupos) {
      await pool.query('INSERT INTO inv_subgrupos (id_subgrupo, id_grupo, id_tenant, codigo, nombre, descripcion) VALUES (?, ?, ?, ?, ?, ?)', s);
    }

    // INSUMOS
    const insumosData = [
      // Fertilizantes (id_grupo=1, id_subgrupo=1)
      { nombre: 'Cloruro de Potasio (KCl)', grupo: 1, subgrupo: 1, u: 'Kilogramo' },
      { nombre: 'Urea Agrícola 46%', grupo: 1, subgrupo: 1, u: 'Kilogramo' },
      { nombre: 'Kieserita (Magnesio)', grupo: 1, subgrupo: 1, u: 'Kilogramo' },
      { nombre: 'Borato de Sodio (Granubor)', grupo: 1, subgrupo: 1, u: 'Kilogramo' },
      // Herbicidas (id_grupo=1, id_subgrupo=3)
      { nombre: 'Glifosato 480', grupo: 1, subgrupo: 3, u: 'Litro' },
      { nombre: 'Glufosinato de Amonio', grupo: 1, subgrupo: 3, u: 'Litro' },
      { nombre: 'Metsulfuron Metil', grupo: 1, subgrupo: 3, u: 'Kilogramo' },
      // Insecticidas (id_grupo=1, id_subgrupo=4) -> Para Sagalassa, Rhynchophorus, etc.
      { nombre: 'Fipronil 200 SC', grupo: 1, subgrupo: 4, u: 'Litro' },
      { nombre: 'Carbofuran 3% GR', grupo: 1, subgrupo: 4, u: 'Kilogramo' },
      // Fungicidas (id_grupo=1, id_subgrupo=5) -> Para PC (Pudrición de Cogollo)
      { nombre: 'Fosetil Aluminio 80 WP', grupo: 1, subgrupo: 5, u: 'Kilogramo' },
      // Herramientas Cosecha (id_grupo=2, id_subgrupo=7)
      { nombre: 'Cuchillo Malayo (Egrek)', grupo: 2, subgrupo: 7, u: 'Unidad' },
      { nombre: 'Vara de Aluminio (Pértiga) 6m', grupo: 2, subgrupo: 7, u: 'Unidad' },
      { nombre: 'Machete Collin 22"', grupo: 2, subgrupo: 7, u: 'Unidad' },
      { nombre: 'Carreta Metálica (Búfalo)', grupo: 2, subgrupo: 7, u: 'Unidad' },
      // Combustibles (id_grupo=4, id_subgrupo=10)
      { nombre: 'ACPM / Diesel', grupo: 4, subgrupo: 10, u: 'Galón' },
      { nombre: 'Gasolina Corriente', grupo: 4, subgrupo: 10, u: 'Galón' },
      // Lubricantes (id_grupo=4, id_subgrupo=11)
      { nombre: 'Aceite Motor 15W40', grupo: 4, subgrupo: 11, u: 'Galón' },
      { nombre: 'Grasa Multipropósito Litio', grupo: 4, subgrupo: 11, u: 'Caneca' },
      // EPP (id_grupo=5, id_subgrupo=13)
      { nombre: 'Gafas de Seguridad Transparentes', grupo: 5, subgrupo: 13, u: 'Unidad' },
      { nombre: 'Guantes de Vaqueta', grupo: 5, subgrupo: 13, u: 'Par' },
      { nombre: 'Botas de Caucho Punta de Acero', grupo: 5, subgrupo: 13, u: 'Par' },
      // Servicios (id_grupo=6, id_subgrupo=14)
      { nombre: 'Flete Transporte RFF a Planta', grupo: 6, subgrupo: 14, u: 'Tonelada' }
    ];

    let insumoCount = 1;
    let counters = {};

    for (const item of insumosData) {
      const gObj = grupos.find(x => x[0] === item.grupo);
      const sObj = subgrupos.find(x => x[0] === item.subgrupo);
      
      const gCod = gObj[2];
      const sCod = sObj[3];
      
      const key = `${item.grupo}-${item.subgrupo}`;
      if (!counters[key]) counters[key] = 1;
      
      const consec = String(counters[key]).padStart(3, '0');
      const codigo = `${gCod}-${sCod}-${consec}`;
      
      await pool.query(
        `INSERT INTO insumos (id_insumo, id_tenant, id_grupo, id_subgrupo, codigo, nombre, unidad_medida, costo_unitario, stock_actual) 
         VALUES (?, 1, ?, ?, ?, ?, ?, 0, 0)`,
        [insumoCount, item.grupo, item.subgrupo, codigo, item.nombre, item.u]
      );
      
      insumoCount++;
      counters[key]++;
    }

    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Se pobló la tabla de insumos, grupos y subgrupos con datos de palma de aceite.');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
