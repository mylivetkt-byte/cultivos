const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function backup() {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            port: 3307,
            user: 'root',
            password: '12345',
            database: 'sas_agricolas'
        });

        const [tables] = await conn.query('SHOW TABLES');
        const dbBackup = {};

        for (let row of tables) {
            const tableName = Object.values(row)[0];
            const [data] = await conn.query(`SELECT * FROM \`${tableName}\``);
            dbBackup[tableName] = data;
        }

        await conn.end();

        const date = new Date().toISOString().slice(0, 10);
        const backupFile = path.join(__dirname, `sas_agricolas_db_backup_${date}.json`);
        
        fs.writeFileSync(backupFile, JSON.stringify(dbBackup, null, 2), 'utf8');
        console.log('Database backup created at:', backupFile);
    } catch (err) {
        console.error('Backup error:', err);
    }
}

backup();
