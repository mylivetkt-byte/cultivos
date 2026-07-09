const mysql = require('mysql2/promise');
async function run() {
  const c = await mysql.createConnection({host:'localhost',port:3307,user:'root',password:'12345',database:'sas_agricolas'});
  
  try {
    await c.query(`CREATE TABLE IF NOT EXISTS ganado_compras (
      id_compra INT AUTO_INCREMENT PRIMARY KEY,
      fecha DATE NOT NULL,
      id_animal INT NOT NULL,
      procedencia VARCHAR(255) NOT NULL,
      vendedor VARCHAR(255),
      valor DECIMAL(15,2) NOT NULL,
      estado VARCHAR(50) DEFAULT 'Completada',
      observaciones TEXT
    )`);
    console.log('Tabla ganado_compras creada.');

    await c.query(`CREATE TABLE IF NOT EXISTS ganado_ventas (
      id_venta INT AUTO_INCREMENT PRIMARY KEY,
      fecha DATE NOT NULL,
      id_animal INT NOT NULL,
      comprador VARCHAR(255) NOT NULL,
      valor DECIMAL(15,2) NOT NULL,
      peso_venta_kg DECIMAL(10,2),
      estado VARCHAR(50) DEFAULT 'Completada',
      observaciones TEXT
    )`);
    console.log('Tabla ganado_ventas creada.');

    await c.query(`CREATE TABLE IF NOT EXISTS ganado_ventas_leche (
      id_venta_leche INT AUTO_INCREMENT PRIMARY KEY,
      fecha DATE NOT NULL,
      litros DECIMAL(10,2) NOT NULL,
      cliente VARCHAR(255) NOT NULL,
      tipo_pago ENUM('Contado', 'Crédito') NOT NULL,
      valor_total DECIMAL(15,2) NOT NULL,
      estado VARCHAR(50) DEFAULT 'Pagado'
    )`);
    console.log('Tabla ganado_ventas_leche creada.');

  } catch(e) {
    console.error('Error:', e);
  }

  c.end();
}
run();
