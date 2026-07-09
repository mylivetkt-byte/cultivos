const mysql = require('mysql2/promise');
async function run() {
  const pool = mysql.createPool({host:'localhost',port:3307,user:'root',password:'12345',database:'sas_agricolas'});
  
  // Get all duplicated groups
  const [grupos] = await pool.query('SELECT * FROM inv_grupos');
  const seenGroups = {};
  const groupMap = {}; // old_id -> new_id
  
  for (const g of grupos) {
    const key = g.codigo + '_' + g.nombre;
    if (!seenGroups[key]) {
      seenGroups[key] = g.id_grupo;
      groupMap[g.id_grupo] = g.id_grupo;
    } else {
      groupMap[g.id_grupo] = seenGroups[key];
    }
  }

  // Update subgroups to point to the primary group
  for (const [oldId, newId] of Object.entries(groupMap)) {
    if (oldId !== newId) {
      await pool.query('UPDATE inv_subgrupos SET id_grupo = ? WHERE id_grupo = ?', [newId, oldId]);
      await pool.query('UPDATE insumos SET id_grupo = ? WHERE id_grupo = ?', [newId, oldId]);
      await pool.query('DELETE FROM inv_grupos WHERE id_grupo = ?', [oldId]);
      console.log(`Deleted duplicate group ${oldId}, replaced with ${newId}`);
    }
  }

  // Do the same for subgroups
  const [subgrupos] = await pool.query('SELECT * FROM inv_subgrupos');
  const seenSubs = {};
  const subMap = {}; // old_id -> new_id

  for (const s of subgrupos) {
    const key = s.id_grupo + '_' + s.codigo + '_' + s.nombre;
    if (!seenSubs[key]) {
      seenSubs[key] = s.id_subgrupo;
      subMap[s.id_subgrupo] = s.id_subgrupo;
    } else {
      subMap[s.id_subgrupo] = seenSubs[key];
    }
  }

  for (const [oldId, newId] of Object.entries(subMap)) {
    if (oldId !== newId) {
      await pool.query('UPDATE insumos SET id_subgrupo = ? WHERE id_subgrupo = ?', [newId, oldId]);
      await pool.query('DELETE FROM inv_subgrupos WHERE id_subgrupo = ?', [oldId]);
      console.log(`Deleted duplicate subgroup ${oldId}, replaced with ${newId}`);
    }
  }
  
  console.log('Done cleaning duplicates');
  process.exit(0);
}
run();
