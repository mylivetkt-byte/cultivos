const mysql = require('mysql2/promise');

async function seed() {
  const c = await mysql.createConnection({host:'localhost',port:3307,user:'root',password:'12345',database:'sas_agricolas'});
  
  try {
    await c.query('SET FOREIGN_KEY_CHECKS = 0');

    // Limpiar tablas
    await c.query('TRUNCATE TABLE ganado_compras');
    await c.query('TRUNCATE TABLE ganado_ventas');
    await c.query('TRUNCATE TABLE ganado_ventas_leche');
    await c.query('TRUNCATE TABLE ganado_vacunacion');
    await c.query('TRUNCATE TABLE ganado_sanidad');
    await c.query('TRUNCATE TABLE ganado_animales');
    await c.query('TRUNCATE TABLE ganado_potreros');
    await c.query('TRUNCATE TABLE ganado_hatos');
    await c.query('TRUNCATE TABLE ganado_razas');
    await c.query('TRUNCATE TABLE ganado_especies');

    // 0. Crear Especies, Razas y Hatos
    await c.query(`INSERT INTO ganado_especies (id_especie, nombre) VALUES (1, 'Bovino')`);

    await c.query(`INSERT INTO ganado_razas (id_raza, id_especie, nombre) VALUES
      (1, 1, 'Brahman Rojo'),
      (2, 1, 'Gyr Lechero'),
      (3, 1, 'Angus Negro'),
      (4, 1, 'Brahman Blanco')`);
      
    await c.query(`INSERT INTO ganado_hatos (id_hato, id_tenant, id_finca, codigo, nombre) VALUES
      (1, 1, 1, 'H001', 'Hato Élite Principal')`);

    // 1. Potreros VIP
    await c.query(`INSERT INTO ganado_potreros (id_potrero, id_finca, nombre, hectareas, tipo_pasto, capacidad_carga, estado) VALUES
      (1, 1, 'Potrero Esmeralda (Élite)', 50, 'Brachiaria Decumbens', 100, 'Óptimo'),
      (2, 1, 'Lote Maternidad VIP', 20, 'Estrella Africana', 30, 'Óptimo'),
      (3, 1, 'Descanso Sur', 10, 'Mombasa', 15, 'En Recuperación'),
      (4, 2, 'Ceba Premium Angus', 80, 'Angleton', 150, 'Óptimo')
    `);

    // 2. Animales de Exposición
    await c.query(`INSERT INTO ganado_animales (id_animal, id_hato, id_raza, arete_crotal, nombre, fecha_nacimiento, sexo, peso_actual_kg, estado, id_potrero, collar_gps_id) VALUES
      (1, 1, 1, '985120', 'Toro Relámpago', '2021-05-10', 'Macho', 950, 'Activo', 1, 'GPS-A001'),
      (2, 1, 2, '985121', 'Vaca Lucero', '2020-03-15', 'Hembra', 550, 'Activo', 2, 'GPS-A002'),
      (3, 1, 3, '985122', 'Semental Zeus', '2019-11-20', 'Macho', 1050, 'Activo', 1, 'GPS-A003'),
      (4, 1, 2, '985123', 'Ternero Rayo', '2025-08-05', 'Macho', 120, 'Activo', 2, 'GPS-A004'),
      (5, 1, 4, '985124', 'Novilla Aurora', '2024-01-10', 'Hembra', 350, 'Activo', 4, 'GPS-A005')
    `);

    // 3. Ventas de Leche (Datos asombrosos)
    await c.query(`INSERT INTO ganado_ventas_leche (fecha, litros, cliente, tipo_pago, valor_total) VALUES
      (CURDATE() - INTERVAL 1 DAY, 1500, 'Lácteos Alpina S.A.', 'Contado', 3000000),
      (CURDATE() - INTERVAL 2 DAY, 1450, 'Lácteos Colanta', 'Crédito', 2900000),
      (CURDATE() - INTERVAL 3 DAY, 1600, 'Quesos La Sabana', 'Contado', 3200000),
      (CURDATE() - INTERVAL 4 DAY, 1550, 'Lácteos Alpina S.A.', 'Contado', 3100000)
    `);

    // 4. Compras (Altos valores de genética)
    await c.query(`INSERT INTO ganado_compras (fecha, id_animal, procedencia, vendedor, valor, estado) VALUES
      ('2022-01-15', 1, 'Hacienda La Bendición', 'Genética Bovina SAS', 15000000, 'Completada'),
      ('2021-08-20', 2, 'Ganadería El Tesoro', 'Felipe Santos', 8000000, 'Completada')
    `);

    // 5. Historial Clínico
    await c.query(`INSERT INTO ganado_vacunacion (id_animal, tipo_vacuna, fecha, dosis, veterinario, proxima_fecha) VALUES
      (1, 'Fiebre Aftosa', '2025-11-10', '2ml', 'Dr. Carlos Ruiz', '2026-05-10'),
      (2, 'Brucelosis', '2025-10-05', '2ml', 'Dra. María Gómez', '2026-10-05'),
      (3, 'Carbón Sintomático', '2026-01-20', '3ml', 'Dr. Carlos Ruiz', '2027-01-20')
    `);

    await c.query(`INSERT INTO ganado_sanidad (id_animal, diagnostico, tratamiento, fecha) VALUES
      (2, 'Mastitis Leve', 'Antibiótico intramamario (3 días)', '2026-02-15'),
      (1, 'Control Podología', 'Recorte de pezuñas preventivo', '2026-03-01')
    `);

    await c.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('¡Base de datos sembrada con los mejores registros ganaderos VIP!');
  } catch(e) {
    console.error('Error inyectando datos demo:', e.message);
  }

  c.end();
}
seed();
