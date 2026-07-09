// server/setup-semilleros.cjs
// Run with: node server/setup-semilleros.cjs
// Creates tables for the semillero (nursery) inventory module.

const pool = require('./db');

async function run() {
  try {
    // semilla (seed catalog)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS semilla (
        id_semilla INT AUTO_INCREMENT PRIMARY KEY,
        variedad VARCHAR(255) NOT NULL,
        fuente VARCHAR(255),
        fecha_registro DATE DEFAULT CURRENT_DATE,
        id_tenant VARCHAR(64) NOT NULL,
        INDEX (id_tenant)
      ) ENGINE=InnoDB;
    `);

    // camada (seedling batch)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS camada (
        id_camada INT AUTO_INCREMENT PRIMARY KEY,
        id_semilla INT NOT NULL,
        fecha_germinacion DATE NOT NULL,
        cantidad_total INT NOT NULL,
        ubicacion_actual VARCHAR(255),
        estado ENUM('EnProduccion','Listo','Vendido','Cancelado') DEFAULT 'EnProduccion',
        id_tenant VARCHAR(64) NOT NULL,
        FOREIGN KEY (id_semilla) REFERENCES semilla(id_semilla) ON DELETE RESTRICT,
        INDEX (id_tenant)
      ) ENGINE=InnoDB;
    `);

    // inventario_movimientos (entries, exits, transfers)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventario_movimientos (
        id_mov INT AUTO_INCREMENT PRIMARY KEY,
        tipo ENUM('entrada','salida','traslado') NOT NULL,
        id_camada INT NOT NULL,
        cantidad INT NOT NULL,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        origen VARCHAR(255),
        destino VARCHAR(255),
        motivo VARCHAR(255),
        id_tenant VARCHAR(64) NOT NULL,
        FOREIGN KEY (id_camada) REFERENCES camada(id_camada) ON DELETE RESTRICT,
        INDEX (id_tenant),
        INDEX (tipo)
      ) ENGINE=InnoDB;
    `);

    // inventario_stock (materialized view) – we use a table refreshed by a trigger or procedure.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventario_stock (
        id_camada INT PRIMARY KEY,
        edad_dias INT NOT NULL,
        cantidad_actual INT NOT NULL,
        ubicacion VARCHAR(255),
        id_tenant VARCHAR(64) NOT NULL,
        FOREIGN KEY (id_camada) REFERENCES camada(id_camada) ON DELETE RESTRICT,
        INDEX (id_tenant)
      ) ENGINE=InnoDB;
    `);

    // Trigger to update stock after each movement
    await pool.query(`
      DROP TRIGGER IF EXISTS trg_update_stock;
    `);
    await pool.query(`
      CREATE TRIGGER trg_update_stock AFTER INSERT ON inventario_movimientos
      FOR EACH ROW BEGIN
        DECLARE cur_qty INT;
        SELECT COALESCE(cantidad_actual,0) INTO cur_qty FROM inventario_stock WHERE id_camada = NEW.id_camada;
        IF NEW.tipo = 'entrada' THEN
          SET cur_qty = cur_qty + NEW.cantidad;
        ELSEIF NEW.tipo = 'salida' THEN
          SET cur_qty = GREATEST(cur_qty - NEW.cantidad,0);
        ELSEIF NEW.tipo = 'traslado' THEN
          -- No quantity change, just location update
          UPDATE inventario_stock SET ubicacion = NEW.destino WHERE id_camada = NEW.id_camada;
        END IF;
        IF EXISTS (SELECT 1 FROM inventario_stock WHERE id_camada = NEW.id_camada) THEN
          UPDATE inventario_stock SET cantidad_actual = cur_qty, edad_dias = DATEDIFF(CURDATE(), (SELECT fecha_germinacion FROM camada WHERE id_camada = NEW.id_camada)), ubicacion = IFNULL(NEW.destino, ubicacion) WHERE id_camada = NEW.id_camada;
        ELSE
          INSERT INTO inventario_stock (id_camada, edad_dias, cantidad_actual, ubicacion, id_tenant)
          SELECT NEW.id_camada, DATEDIFF(CURDATE(), fecha_germinacion), NEW.cantidad, NEW.destino, NEW.id_tenant FROM camada WHERE id_camada = NEW.id_camada;
        END IF;
      END;
    `);

    // labores_semillero (labors linked to movements)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS labores_semillero (
        id_labor INT AUTO_INCREMENT PRIMARY KEY,
        id_mov INT NOT NULL,
        tipo_labor VARCHAR(255) NOT NULL,
        fecha_planificada DATE,
        estado ENUM('Planificada','En Progreso','Completada','Incumplida') DEFAULT 'Planificada',
        observaciones TEXT,
        id_tenant VARCHAR(64) NOT NULL,
        FOREIGN KEY (id_mov) REFERENCES inventario_movimientos(id_mov) ON DELETE RESTRICT,
        INDEX (id_tenant)
      ) ENGINE=InnoDB;
    `);

    // ventas_semillero (sales)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ventas_semillero (
        id_venta INT AUTO_INCREMENT PRIMARY KEY,
        id_camada INT NOT NULL,
        cliente_id VARCHAR(64),
        cantidad INT NOT NULL,
        precio_unitario DECIMAL(10,2) NOT NULL,
        fecha_venta DATE DEFAULT CURRENT_DATE,
        id_tenant VARCHAR(64) NOT NULL,
        FOREIGN KEY (id_camada) REFERENCES camada(id_camada) ON DELETE RESTRICT,
        INDEX (id_tenant)
      ) ENGINE=InnoDB;
    `);

    console.log('Semillero tables created/updated successfully');
  } catch (err) {
    console.error('Error creating semillero tables:', err);
  } finally {
    process.exit();
  }
}

run();
