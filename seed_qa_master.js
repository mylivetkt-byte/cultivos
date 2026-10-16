import mysql from 'mysql2/promise';

async function run() {
    const conn = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3307,
        user: 'root',
        password: '12345',
        database: 'sas_tenant_test'
    });

    try {
        const [dbRows] = await conn.query('SELECT DATABASE() AS database_name');
        const dbName = dbRows[0].database_name;
        
        if (dbName !== 'sas_tenant_test') {
            console.error(`⛔ ABORT: DB is ${dbName}`);
            process.exit(1);
        }

        const TENANT_ID = 3;
        const stats = {
            created: 0,
            reused: 0,
            updated: 0,
            skipped: 0,
            errors: 0
        };

        const execUpsert = async (query, params, entityName, createMsg) => {
            try {
                const [res] = await conn.query(query, params);
                if (res.insertId || res.affectedRows === 1) {
                    stats.created++;
                    console.log(`[CREATE] ${entityName}`);
                } else if (res.affectedRows === 2) {
                    stats.updated++;
                    console.log(`[UPDATE] ${entityName}`);
                } else {
                    stats.reused++;
                    console.log(`[REUSE] ${entityName}`);
                }
                return res.insertId || params[params.length - 1]; 
            } catch (err) {
                stats.errors++;
                console.error(`[ERROR] ${entityName}: ${err.message}`);
                throw err;
            }
        };

        await conn.beginTransaction();

        try {
            // NIVEL 2 - TERCEROS
            await execUpsert(`
                INSERT INTO terceros (id_tenant, tipo_persona, tipo_documento, regimen_fiscal, documento, nombre_completo, es_proveedor, es_cliente, activo)
                VALUES (?, 'Juridica', NULL, NULL, 'QA-PROV-001', 'Proveedor Agro QA', 1, 0, 1)
                ON DUPLICATE KEY UPDATE nombre_completo = 'Proveedor Agro QA'
            `, [TENANT_ID], 'Proveedor Agro QA');

            await execUpsert(`
                INSERT INTO terceros (id_tenant, tipo_persona, tipo_documento, regimen_fiscal, documento, nombre_completo, es_proveedor, es_cliente, activo)
                VALUES (?, 'Juridica', NULL, NULL, 'QA-CLI-001', 'Cliente Agro QA', 0, 1, 1)
                ON DUPLICATE KEY UPDATE nombre_completo = 'Cliente Agro QA'
            `, [TENANT_ID], 'Cliente Agro QA');

            await execUpsert(`
                INSERT INTO terceros (id_tenant, tipo_persona, tipo_documento, regimen_fiscal, documento, nombre_completo, es_empleado, activo)
                VALUES (?, 'Natural', NULL, NULL, 'QA-EMP-001', 'Juan Perez QA', 1, 1)
                ON DUPLICATE KEY UPDATE nombre_completo = 'Juan Perez QA'
            `, [TENANT_ID], 'Juan Perez QA');
            const [tercerosEmp] = await conn.query("SELECT id_tercero FROM terceros WHERE id_tenant = ? AND documento = 'QA-EMP-001'", [TENANT_ID]);
            const idTerceroJuan = tercerosEmp[0].id_tercero;

            // NIVEL 3 - INFRAESTRUCTURA
            await execUpsert(`
                INSERT INTO fincas (id_tenant, codigo, nombre, hectareas_totales, poligono_gps)
                VALUES (?, 'FIN-QA-01', 'Finca El Eden QA', 100, ST_GeomFromText('POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))'))
                ON DUPLICATE KEY UPDATE nombre = 'Finca El Eden QA'
            `, [TENANT_ID], 'Finca El Eden QA');
            const [fincas] = await conn.query("SELECT id_finca FROM fincas WHERE id_tenant = ? AND codigo = 'FIN-QA-01'", [TENANT_ID]);
            const idFinca = fincas[0].id_finca;

            await execUpsert(`
                INSERT INTO nucleos (id_finca, codigo, nombre, hectareas)
                VALUES (?, 'NUC-QA-01', 'Nucleo Central QA', 50)
                ON DUPLICATE KEY UPDATE nombre = 'Nucleo Central QA'
            `, [idFinca], 'Nucleo Central QA');
            const [nucleos] = await conn.query("SELECT id_nucleo FROM nucleos WHERE id_finca = ? AND codigo = 'NUC-QA-01'", [idFinca]);
            const idNucleo = nucleos[0].id_nucleo;

            await execUpsert(`
                INSERT INTO lotes (id_nucleo, codigo, nombre, hectareas, poligono_gps)
                VALUES (?, 'LOT-QA-01', 'Lote Norte QA', 10, ST_GeomFromText('POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))'))
                ON DUPLICATE KEY UPDATE nombre = 'Lote Norte QA'
            `, [idNucleo], 'Lote Norte QA');
            const [lotes] = await conn.query("SELECT id_lote FROM lotes WHERE id_nucleo = ? AND codigo = 'LOT-QA-01'", [idNucleo]);
            const idLote = lotes[0].id_lote;

            await execUpsert(`
                INSERT INTO bod_bodegas (id_tenant, id_finca, nombre, tipo, es_principal)
                VALUES (?, ?, 'Bodega Principal QA', 'General', 1)
                ON DUPLICATE KEY UPDATE tipo = 'General'
            `, [TENANT_ID, idFinca], 'Bodega Principal QA');

            // NIVEL 5 - INSUMOS
            await execUpsert(`
                INSERT INTO inv_grupos (id_tenant, codigo, nombre) VALUES (?, 'GRP-QA-01', 'Insumos QA')
                ON DUPLICATE KEY UPDATE nombre = 'Insumos QA'
            `, [TENANT_ID], 'Grupo Insumos QA');
            const [grupos] = await conn.query("SELECT id_grupo FROM inv_grupos WHERE id_tenant = ? AND codigo = 'GRP-QA-01'", [TENANT_ID]);
            const idGrupo = grupos[0].id_grupo;

            await execUpsert(`
                INSERT INTO insumos (id_tenant, id_grupo, codigo, nombre, unidad_medida)
                VALUES (?, ?, 'INS-QA-01', 'Urea QA', 'Kg')
                ON DUPLICATE KEY UPDATE nombre = 'Urea QA'
            `, [TENANT_ID, idGrupo], 'Urea QA');
            
            await execUpsert(`
                INSERT INTO insumos (id_tenant, id_grupo, codigo, nombre, unidad_medida)
                VALUES (?, ?, 'INS-QA-02', 'Tijeras QA', 'Und')
                ON DUPLICATE KEY UPDATE nombre = 'Tijeras QA'
            `, [TENANT_ID, idGrupo], 'Tijeras QA');

            // NIVEL 7 - RRHH
            await execUpsert(`
                INSERT INTO rrhh_empleados (id_tenant, id_finca, id_tercero, documento, nombres, apellidos, cargo, fecha_ingreso, salario_base, tipo_contrato)
                VALUES (?, ?, ?, 'QA-EMP-001', 'Juan', 'Perez QA', 'Operario', CURDATE(), 1300000, 'Fijo')
                ON DUPLICATE KEY UPDATE nombres = 'Juan'
            `, [TENANT_ID, idFinca, idTerceroJuan], 'Empleado Juan Perez QA');
            const [empleados] = await conn.query("SELECT id_empleado FROM rrhh_empleados WHERE id_tenant = ? AND documento = 'QA-EMP-001'", [TENANT_ID]);
            const idEmpleadoJuan = empleados[0].id_empleado;

            // NIVEL 4 & 8 - AGRICULTURA Y LABORES
            const [cultivosExt] = await conn.query("SELECT id_cultivo FROM cultivos WHERE nombre = 'Café QA'");
            let idCultivoCafe;
            if (cultivosExt.length === 0) {
                const [res] = await conn.query("INSERT INTO cultivos (nombre, tipo) VALUES ('Café QA', 'Permanente')");
                idCultivoCafe = res.insertId;
                console.log("[CREATE] Cultivo Café QA");
                stats.created++;
            } else {
                idCultivoCafe = cultivosExt[0].id_cultivo;
                console.log("[REUSE] Cultivo Café QA");
                stats.reused++;
            }

            const [siembrasExt] = await conn.query("SELECT id_siembra FROM siembras WHERE id_tenant = ? AND id_lote = ? AND id_cultivo = ?", [TENANT_ID, idLote, idCultivoCafe]);
            let idSiembra;
            if (siembrasExt.length === 0) {
                const [res] = await conn.query("INSERT INTO siembras (id_tenant, id_lote, id_cultivo, fecha_siembra, hectareas_sembradas) VALUES (?, ?, ?, CURDATE(), 5)", [TENANT_ID, idLote, idCultivoCafe]);
                idSiembra = res.insertId;
                console.log("[CREATE] Siembra Café QA");
                stats.created++;
            } else {
                idSiembra = siembrasExt[0].id_siembra;
                console.log("[REUSE] Siembra Café QA");
                stats.reused++;
            }

            const [laboresExt] = await conn.query("SELECT id_labor FROM labores_diarias WHERE id_tenant = ? AND descripcion_labor = 'Mantenimiento QA'", [TENANT_ID]);
            if (laboresExt.length === 0) {
                await conn.query("INSERT INTO labores_diarias (id_tenant, categoria, descripcion_labor, fecha_planificada, id_empleado, id_lote) VALUES (?, 'Cultivos', 'Mantenimiento QA', CURDATE(), ?, ?)", [TENANT_ID, idEmpleadoJuan, idLote]);
                console.log("[CREATE] Labor Mantenimiento QA");
                stats.created++;
            } else {
                console.log("[REUSE] Labor Mantenimiento QA");
                stats.reused++;
            }

            // NIVEL 9 - GANADERIA
            const [especieBov] = await conn.query("SELECT id_especie FROM ganado_especies WHERE nombre = 'Bovino QA'");
            let idEspecieBov;
            if (especieBov.length === 0) {
                const [res] = await conn.query("INSERT INTO ganado_especies (nombre, tipo) VALUES ('Bovino QA', 'Bovino')");
                idEspecieBov = res.insertId;
                console.log("[CREATE] Especie Bovino QA");
                stats.created++;
            } else {
                idEspecieBov = especieBov[0].id_especie;
                console.log("[REUSE] Especie Bovino QA");
                stats.reused++;
            }

            const [razaHol] = await conn.query("SELECT id_raza FROM ganado_razas WHERE nombre = 'Holstein QA'");
            let idRazaHol;
            if (razaHol.length === 0) {
                const [res] = await conn.query("INSERT INTO ganado_razas (id_especie, nombre, proposito) VALUES (?, 'Holstein QA', 'Leche')", [idEspecieBov]);
                idRazaHol = res.insertId;
                console.log("[CREATE] Raza Holstein QA");
                stats.created++;
            } else {
                idRazaHol = razaHol[0].id_raza;
                console.log("[REUSE] Raza Holstein QA");
                stats.reused++;
            }

            await execUpsert(`
                INSERT INTO ganado_hatos (id_tenant, id_finca, codigo, nombre, proposito)
                VALUES (?, ?, 'HAT-QA-01', 'Hato Lechero QA', 'Lecheria')
                ON DUPLICATE KEY UPDATE nombre = 'Hato Lechero QA'
            `, [TENANT_ID, idFinca], 'Hato Lechero QA');
            const [hatos] = await conn.query("SELECT id_hato FROM ganado_hatos WHERE id_tenant = ? AND codigo = 'HAT-QA-01'", [TENANT_ID]);
            const idHato = hatos[0].id_hato;

            await execUpsert(`
                INSERT INTO ganado_animales (id_hato, id_raza, arete_crotal, nombre, sexo)
                VALUES (?, ?, 'QA-001-V', 'Vaca Lola QA', 'Hembra')
                ON DUPLICATE KEY UPDATE nombre = 'Vaca Lola QA'
            `, [idHato, idRazaHol], 'Vaca Lola QA');

            await execUpsert(`
                INSERT INTO ganado_animales (id_hato, id_raza, arete_crotal, nombre, sexo)
                VALUES (?, ?, 'QA-002-T', 'Toro Max QA', 'Macho')
                ON DUPLICATE KEY UPDATE nombre = 'Toro Max QA'
            `, [idHato, idRazaHol], 'Toro Max QA');

            // NIVEL 10 - ACUICULTURA
            const [especieTil] = await conn.query("SELECT id_especie_acui FROM acuicola_especies WHERE nombre = 'Tilapia QA'");
            let idEspecieTil;
            if (especieTil.length === 0) {
                const [res] = await conn.query("INSERT INTO acuicola_especies (nombre) VALUES ('Tilapia QA')");
                idEspecieTil = res.insertId;
                console.log("[CREATE] Especie Tilapia QA");
                stats.created++;
            } else {
                idEspecieTil = especieTil[0].id_especie_acui;
                console.log("[REUSE] Especie Tilapia QA");
                stats.reused++;
            }

            await execUpsert(`
                INSERT INTO acuicola_estanques (id_tenant, id_finca, codigo, area_m2, profundidad_m)
                VALUES (?, ?, 'EST-QA-01', 500, 2)
                ON DUPLICATE KEY UPDATE area_m2 = 500
            `, [TENANT_ID, idFinca], 'Estanque 1 QA');
            const [estanques] = await conn.query("SELECT id_estanque FROM acuicola_estanques WHERE id_tenant = ? AND codigo = 'EST-QA-01'", [TENANT_ID]);
            const idEstanque = estanques[0].id_estanque;

            const [siembraAcui] = await conn.query("SELECT id_siembra_acui FROM acuicola_siembras WHERE id_estanque = ? AND id_especie_acui = ?", [idEstanque, idEspecieTil]);
            if (siembraAcui.length === 0) {
                await conn.query("INSERT INTO acuicola_siembras (id_estanque, id_especie_acui, fecha_siembra, cantidad_alevines) VALUES (?, ?, CURDATE(), 5000)", [idEstanque, idEspecieTil]);
                console.log("[CREATE] Siembra Tilapia QA");
                stats.created++;
            } else {
                console.log("[REUSE] Siembra Tilapia QA");
                stats.reused++;
            }

            await conn.commit();
            console.log("\n--- RESULTADOS ---");
            console.log(`Created: ${stats.created}`);
            console.log(`Reused: ${stats.reused}`);
            console.log(`Updated: ${stats.updated}`);
            console.log(`Skipped: ${stats.skipped}`);
            console.log(`Errors: ${stats.errors}`);

        } catch (e) {
            await conn.rollback();
            console.error("Transacción abortada: " + e.message);
            throw e;
        }

    } finally {
        await conn.end();
    }
}

run().catch(console.error);
