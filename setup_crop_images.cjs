const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({path: '.env'});

const srcDir = 'C:\\Users\\USER\\.gemini\\antigravity-ide\\brain\\af1bed21-ebc3-4a3c-9324-16e8d89198b6';
const destDir = path.join(__dirname, 'public', 'crops');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Find files
const files = fs.readdirSync(srcDir);
const cropNames = ['cacao', 'platano', 'banano', 'palma', 'arroz', 'cafe', 'aguacate', 'maiz', 'soya', 'cana'];

const mappedCrops = {};

cropNames.forEach(crop => {
  const file = files.find(f => f.startsWith(`${crop}_`) && f.endsWith('.png'));
  if (file) {
    // copy if not already copied
    if (!fs.existsSync(path.join(destDir, `${crop}.png`))) {
      fs.copyFileSync(path.join(srcDir, file), path.join(destDir, `${crop}.png`));
      console.log(`Copied ${file} to ${crop}.png`);
    }
    mappedCrops[crop] = `/crops/${crop}.png`;
  }
});

(async () => {
  try {
    const pool = mysql.createPool({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: process.env.MYSQL_PORT || 3307,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sas_agricolas'
    });

    // Check if column exists
    const [cols] = await pool.query(`SHOW COLUMNS FROM cultivos_recetas_maestras LIKE 'imagen_url'`);
    if (cols.length === 0) {
      console.log('Adding imagen_url column to cultivos_recetas_maestras');
      await pool.query(`ALTER TABLE cultivos_recetas_maestras ADD COLUMN imagen_url VARCHAR(255) DEFAULT NULL`);
    }

    // Update database
    const [cultivos] = await pool.query(`SELECT id, nombre_cultivo FROM cultivos_recetas_maestras`);
    for (const c of cultivos) {
      const norm = c.nombre_cultivo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const key = cropNames.find(k => norm.includes(k));
      if (key && mappedCrops[key]) {
        await pool.query(`UPDATE cultivos_recetas_maestras SET imagen_url = ? WHERE id = ?`, [mappedCrops[key], c.id]);
        console.log(`Updated ${c.nombre_cultivo} with ${mappedCrops[key]}`);
      }
    }

    console.log('Done DB Update!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
