const mysql = require('mysql2/promise');
require('dotenv').config({path: '.env'});

(async () => {
  try {
    const pool = mysql.createPool({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: process.env.MYSQL_PORT || 3307,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sas_agricolas'
    });

    const updates = [
      { id: 1, ciudad: 'Bogotá', tel: '+573001111111', reg: 'REG-1001-MT', precio: 65000, cap: 25 },
      { id: 2, ciudad: 'Cali', tel: '+573102222222', reg: 'REG-1002-MT', precio: 72000, cap: 30 },
      { id: 3, ciudad: 'Medellín', tel: '+573203333333', reg: 'REG-1003-MT', precio: 85000, cap: 35 },
      { id: 4, ciudad: 'Barranquilla', tel: '+573154444444', reg: 'REG-1004-MT', precio: 90000, cap: 40 },
      { id: 5, ciudad: 'Cartagena', tel: '+573165555555', reg: 'REG-1005-MT', precio: 110000, cap: 50 },
      { id: 6, ciudad: 'Bucaramanga', tel: '+573176666666', reg: 'REG-1006-MT', precio: 68000, cap: 20 },
      { id: 7, ciudad: 'Santa Marta', tel: '+573187777777', reg: 'REG-1007-MT', precio: 95000, cap: 45 }
    ];

    for (const data of updates) {
      await pool.query(`
        UPDATE com_empresas_transportadoras
        SET telefono = ?,
            ciudad_base = ?,
            registro_nacional_carga = ?,
            precio_tonelada_promedio = ?,
            capacidad_toneladas = ?,
            tiene_whatsapp = 1
        WHERE id = ?
      `, [data.tel, data.ciudad, data.reg, data.precio, data.cap, data.id]);
    }

    console.log("Registros antiguos actualizados con éxito.");
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
})();
