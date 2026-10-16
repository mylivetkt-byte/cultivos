const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function executeSqlFile(connection, filePath) {
    const sql = fs.readFileSync(filePath, 'utf8');
    // Split by semicolons for basic execution, but handle comments safely if needed.
    // Better yet, just use connection.query with multipleStatements if enabled.
}

async function main() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST || '127.0.0.1',
            port: process.env.MYSQL_PORT || 3307,
            user: process.env.MYSQL_USER || 'root',
            password: process.env.MYSQL_PASSWORD || '12345',
            database: process.env.MYSQL_DATABASE || 'sas_agricolas',
            multipleStatements: true
        });

        console.log("Conectado a MySQL.");

        const migSql = fs.readFileSync('migrations/produccion/06_CREATE_drones_agtech.sql', 'utf8');
        console.log("Ejecutando 06_CREATE_drones_agtech.sql...");
        await connection.query(migSql);
        console.log("Migraciones creadas con éxito.");

        const seedSql = fs.readFileSync('migrations/produccion/07_SEED_drones_agtech.sql', 'utf8');
        console.log("Ejecutando 07_SEED_drones_agtech.sql...");
        await connection.query(seedSql);
        console.log("Seeds cargados con éxito.");

        await connection.end();
    } catch(err) {
        console.error("Error:", err);
    }
}
main();
