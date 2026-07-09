const mysql = require('mysql2/promise');

async function run() {
  const pool = mysql.createPool({host:'localhost',port:3307,user:'root',password:'12345',database:'sas_agricolas'});
  
  try {
    // We will assign all current test products to Grupo 1 (Agroquimicos) and Subgrupo 1 (Fertilizantes Edáficos) or similar based on name.
    // Let's get the mapping for Grupo 1
    const [s] = await pool.query('SELECT * FROM inv_subgrupos WHERE id_grupo = 1');
    const sgMap = {};
    for (const sub of s) {
      sgMap[sub.nombre] = sub;
    }
    
    // Group: 1 (Agroquímicos)
    // Subgroups for 1: 1 (Fertilizantes Edáficos), 2 (Fertilizantes Foliares), 3 (Herbicidas), 4 (Insecticidas), 5 (Fungicidas)
    
    const [insumos] = await pool.query('SELECT id_insumo, nombre FROM insumos');
    let counters = {}; // format: '1-1': 1, '1-3': 1
    
    for (const insumo of insumos) {
      let id_grupo = 1;
      let id_subgrupo = 1; // default to Fertilizantes Edáficos
      
      const n = insumo.nombre.toLowerCase();
      if (n.includes('glifosato')) {
        id_subgrupo = 3; // Herbicidas
      } else if (n.includes('clorpirifos') || n.includes('fipronil')) {
        id_subgrupo = 4; // Insecticidas
      } else if (n.includes('mancozeb') || n.includes('benomyl')) {
        id_subgrupo = 5; // Fungicidas
      }
      
      const key = `${id_grupo}-${id_subgrupo}`;
      if (!counters[key]) counters[key] = 1;
      
      // We need the codes
      const [gRes] = await pool.query('SELECT codigo FROM inv_grupos WHERE id_grupo = ?', [id_grupo]);
      const [sRes] = await pool.query('SELECT codigo FROM inv_subgrupos WHERE id_subgrupo = ?', [id_subgrupo]);
      
      const codG = gRes[0].codigo;
      const codS = sRes[0].codigo;
      const consec = String(counters[key]).padStart(3, '0');
      
      const newCodigo = `${codG}-${codS}-${consec}`;
      
      await pool.query('UPDATE insumos SET id_grupo = ?, id_subgrupo = ?, codigo = ? WHERE id_insumo = ?', [id_grupo, id_subgrupo, newCodigo, insumo.id_insumo]);
      console.log(`Updated ${insumo.nombre} -> ${newCodigo}`);
      
      counters[key]++;
    }
    console.log('Migration complete.');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
