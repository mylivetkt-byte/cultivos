const mysql = require('mysql2/promise');

async function run() {
  const c = await mysql.createConnection({host:'localhost',port:3307,user:'root',password:'12345',database:'sas_agricolas'});
  const tables = ['ganado_especies', 'ganado_razas', 'ganado_hatos', 'ganado_potreros', 'ganado_animales', 'ganado_vacunacion', 'ganado_sanidad'];
  for (let t of tables) {
    try {
      const [cols] = await c.query('SHOW COLUMNS FROM ' + t);
      console.log(t + ':', cols.map(x => x.Field).join(', '));
    } catch(e) {
      console.log(t + ' MISSING');
    }
  }
  c.end();
}
run();
