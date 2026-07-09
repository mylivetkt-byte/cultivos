const m=require('mysql2/promise');
async function r(){
  const p=m.createPool({host:'127.0.0.1',port:3307,user:'root',password:'12345',database:'sas_agricolas'});
  const q = "ALTER TABLE labores_diarias MODIFY COLUMN categoria ENUM('Personal','Cultivos','Lotes','Arboles','Riegos','Maquinas_Vehiculos','Talleres','Semilleros','Abonos','Cosecha','Viveros','Ganadería','Planta_Bioles','Acuicola','Bodegas','Produccion','Preparacion_Suelos','Siembra','Riego','Abono','Fumigacion','Poda','Ganaderia_Alimentacion','Ganaderia_Sanidad','Ganaderia_Pasturas','Ganaderia_Ordeno','Ganaderia_Reproduccion','Acuicola_Alimentacion','Acuicola_Agua','Acuicola_Pesca','Acuicola_Estanques') NOT NULL DEFAULT 'Personal'";
  await p.query(q);
  console.log('Enum updated with new detailed categories');
  process.exit(0);
}
r().catch(e => { console.error(e); process.exit(1); });
