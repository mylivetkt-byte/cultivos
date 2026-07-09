const m=require('mysql2/promise');
async function r(){
  const p=m.createPool({host:'127.0.0.1',port:3307,user:'root',password:'12345',database:'sas_agricolas'});
  await p.query("ALTER TABLE labores_diarias MODIFY COLUMN categoria ENUM('Personal','Cultivos','Lotes','Arboles','Riegos','Maquinas_Vehiculos','Talleres','Semilleros','Abonos','Cosecha','Viveros','Ganadería','Planta_Bioles','Acuicola','Bodegas','Produccion') NOT NULL DEFAULT 'Personal'");
  console.log('Enum updated');
  process.exit(0);
}
r().catch(e => console.error(e));
