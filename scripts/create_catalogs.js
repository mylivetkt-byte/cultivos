import mysql from 'mysql2/promise';
import 'dotenv/config';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT) || 3307,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'sas_agricolas',
});

async function createCatalogs() {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    console.log('🚀 Iniciando creación de catálogos...\n');

    // 1️⃣ TABLA: sys_estados_documentos
    console.log('1️⃣  Creando tabla: sys_estados_documentos');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS sys_estados_documentos (
        id INT PRIMARY KEY AUTO_INCREMENT,
        codigo VARCHAR(30) UNIQUE NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT,
        categoria ENUM('Documento','Movimiento','General','Inventario','Contable') DEFAULT 'General',
        activo TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_codigo (codigo),
        KEY idx_categoria (categoria)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const estadosDocumentos = [
      { codigo: 'ACTIVO', nombre: 'Activo', categoria: 'General', descripcion: 'Estado activo' },
      { codigo: 'BORRADOR', nombre: 'Borrador', categoria: 'Documento', descripcion: 'Documento en borrador' },
      { codigo: 'APLICADO', nombre: 'Aplicado', categoria: 'Documento', descripcion: 'Documento aplicado' },
      { codigo: 'ABIERTO', nombre: 'Abierto', categoria: 'Contable', descripcion: 'Período abierto' },
      { codigo: 'CERRADO', nombre: 'Cerrado', categoria: 'Contable', descripcion: 'Período cerrado' },
      { codigo: 'ENTRADA', nombre: 'Entrada', categoria: 'Movimiento', descripcion: 'Movimiento de entrada' },
      { codigo: 'SALIDA', nombre: 'Salida', categoria: 'Movimiento', descripcion: 'Movimiento de salida' },
      { codigo: 'AJUSTE', nombre: 'Ajuste', categoria: 'Inventario', descripcion: 'Ajuste de inventario' },
      { codigo: 'DEVOLUCION', nombre: 'Devolución', categoria: 'Movimiento', descripcion: 'Devolución de material' },
      { codigo: 'COMPLETADA', nombre: 'Completada', categoria: 'General', descripcion: 'Tarea completada' },
      { codigo: 'EN_PROCESO', nombre: 'En Proceso', categoria: 'General', descripcion: 'En proceso de ejecución' },
      { codigo: 'CANCELADA', nombre: 'Cancelada', categoria: 'General', descripcion: 'Cancelada' },
      { codigo: 'SUSPENDIDO', nombre: 'Suspendido', categoria: 'General', descripcion: 'Estado suspendido' },
      { codigo: 'ELIMINADO', nombre: 'Eliminado', categoria: 'General', descripcion: 'Eliminado lógicamente' },
      { codigo: 'ANULADO', nombre: 'Anulado', categoria: 'Documento', descripcion: 'Documento anulado' },
    ];

    for (const estado of estadosDocumentos) {
      await conn.query(
        `INSERT IGNORE INTO sys_estados_documentos (codigo, nombre, categoria, descripcion) VALUES (?, ?, ?, ?)`,
        [estado.codigo, estado.nombre, estado.categoria, estado.descripcion]
      );
    }
    console.log(`   ✓ ${estadosDocumentos.length} estados insertados\n`);

    // 2️⃣ TABLA: sys_origenes_insumos
    console.log('2️⃣  Creando tabla: sys_origenes_insumos');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS sys_origenes_insumos (
        id INT PRIMARY KEY AUTO_INCREMENT,
        codigo VARCHAR(30) UNIQUE NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT,
        activo TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_codigo (codigo)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const origenes = [
      { codigo: 'NACIONAL', nombre: 'Nacional', descripcion: 'Producto nacional' },
      { codigo: 'IMPORTADO', nombre: 'Importado', descripcion: 'Producto importado' },
      { codigo: 'PRODUCCION_PROPIA', nombre: 'Producción Propia', descripcion: 'Producto de producción propia' },
      { codigo: 'DONACION', nombre: 'Donación', descripcion: 'Producto recibido por donación' },
      { codigo: 'INTERCAMBIO', nombre: 'Intercambio', descripcion: 'Producto por intercambio' },
    ];

    for (const origen of origenes) {
      await conn.query(
        `INSERT IGNORE INTO sys_origenes_insumos (codigo, nombre, descripcion) VALUES (?, ?, ?)`,
        [origen.codigo, origen.nombre, origen.descripcion]
      );
    }
    console.log(`   ✓ ${origenes.length} orígenes insertados\n`);

    // 3️⃣ TABLA: sys_tipos_movimientos_inventario
    console.log('3️⃣  Creando tabla: sys_tipos_movimientos_inventario');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS sys_tipos_movimientos_inventario (
        id INT PRIMARY KEY AUTO_INCREMENT,
        codigo VARCHAR(30) UNIQUE NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT,
        signo ENUM('+','-') DEFAULT '+',
        activo TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_codigo (codigo)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const tiposMovimientos = [
      { codigo: 'ENTRADA', nombre: 'Entrada', signo: '+', descripcion: 'Entrada de material' },
      { codigo: 'SALIDA', nombre: 'Salida', signo: '-', descripcion: 'Salida de material' },
      { codigo: 'AJUSTE', nombre: 'Ajuste', signo: '+', descripcion: 'Ajuste de inventario' },
      { codigo: 'DEVOLUCION', nombre: 'Devolución', signo: '+', descripcion: 'Devolución de material' },
      { codigo: 'CONSUMO', nombre: 'Consumo', signo: '-', descripcion: 'Consumo en producción' },
      { codigo: 'TRANSFERENCIA', nombre: 'Transferencia', signo: '+', descripcion: 'Transferencia entre bodegas' },
    ];

    for (const tipo of tiposMovimientos) {
      await conn.query(
        `INSERT IGNORE INTO sys_tipos_movimientos_inventario (codigo, nombre, signo, descripcion) VALUES (?, ?, ?, ?)`,
        [tipo.codigo, tipo.nombre, tipo.signo, tipo.descripcion]
      );
    }
    console.log(`   ✓ ${tiposMovimientos.length} tipos de movimientos insertados\n`);

    // 4️⃣ TABLA: sys_tipos_items_insumos
    console.log('4️⃣  Creando tabla: sys_tipos_items_insumos');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS sys_tipos_items_insumos (
        id INT PRIMARY KEY AUTO_INCREMENT,
        codigo VARCHAR(30) UNIQUE NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT,
        activo TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_codigo (codigo)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const tiposItems = [
      { codigo: 'PRODUCTO', nombre: 'Producto', descripcion: 'Producto físico' },
      { codigo: 'SERVICIO', nombre: 'Servicio', descripcion: 'Servicio (no físico)' },
      { codigo: 'BIOFERTILIZANTE', nombre: 'Biofertilizante', descripcion: 'Biofertilizante o agente biológico' },
      { codigo: 'MATERIA_PRIMA', nombre: 'Materia Prima', descripcion: 'Materia prima para producción' },
      { codigo: 'PRODUCTO_TERMINADO', nombre: 'Producto Terminado', descripcion: 'Producto terminado' },
      { codigo: 'SEMILLA', nombre: 'Semilla', descripcion: 'Material de siembra' },
    ];

    for (const tipo of tiposItems) {
      await conn.query(
        `INSERT IGNORE INTO sys_tipos_items_insumos (codigo, nombre, descripcion) VALUES (?, ?, ?)`,
        [tipo.codigo, tipo.nombre, tipo.descripcion]
      );
    }
    console.log(`   ✓ ${tiposItems.length} tipos de items insertados\n`);

    // 5️⃣ TABLA: sys_unidades_medida
    console.log('5️⃣  Creando tabla: sys_unidades_medida');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS sys_unidades_medida (
        id INT PRIMARY KEY AUTO_INCREMENT,
        codigo VARCHAR(10) UNIQUE NOT NULL,
        nombre VARCHAR(50) NOT NULL,
        simbolo VARCHAR(5),
        descripcion TEXT,
        tipo ENUM('Peso','Volumen','Cantidad','Longitud','Area') DEFAULT 'Cantidad',
        activo TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_codigo (codigo)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const unidades = [
      { codigo: 'LITRO', nombre: 'Litro', simbolo: 'L', tipo: 'Volumen', descripcion: 'Unidad de volumen' },
      { codigo: 'KILO', nombre: 'Kilogramo', simbolo: 'kg', tipo: 'Peso', descripcion: 'Unidad de peso' },
      { codigo: 'GRAMO', nombre: 'Gramo', simbolo: 'g', tipo: 'Peso', descripcion: 'Unidad de peso' },
      { codigo: 'UNIDAD', nombre: 'Unidad', simbolo: 'un', tipo: 'Cantidad', descripcion: 'Cantidad unitaria' },
      { codigo: 'METRO', nombre: 'Metro', simbolo: 'm', tipo: 'Longitud', descripcion: 'Unidad de longitud' },
      { codigo: 'HECTAREA', nombre: 'Hectárea', simbolo: 'ha', tipo: 'Area', descripcion: 'Unidad de área' },
      { codigo: 'TONELADA', nombre: 'Tonelada', simbolo: 't', tipo: 'Peso', descripcion: 'Unidad de peso (1000 kg)' },
      { codigo: 'MILILITRO', nombre: 'Mililitro', simbolo: 'ml', tipo: 'Volumen', descripcion: 'Unidad de volumen' },
    ];

    for (const unidad of unidades) {
      await conn.query(
        `INSERT IGNORE INTO sys_unidades_medida (codigo, nombre, simbolo, tipo, descripcion) VALUES (?, ?, ?, ?, ?)`,
        [unidad.codigo, unidad.nombre, unidad.simbolo, unidad.tipo, unidad.descripcion]
      );
    }
    console.log(`   ✓ ${unidades.length} unidades de medida insertadas\n`);

    // 6️⃣ TABLA: sys_configuracion_aplicacion
    console.log('6️⃣  Creando tabla: sys_configuracion_aplicacion');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS sys_configuracion_aplicacion (
        id INT PRIMARY KEY AUTO_INCREMENT,
        id_tenant INT NOT NULL,
        clave VARCHAR(100) UNIQUE NOT NULL,
        valor VARCHAR(500),
        tipo ENUM('STRING','INTEGER','DECIMAL','BOOLEAN','JSON') DEFAULT 'STRING',
        descripcion TEXT,
        activo TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_tenant_clave (id_tenant, clave),
        CONSTRAINT fk_config_tenant FOREIGN KEY (id_tenant) REFERENCES tenants(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log(`   ✓ Tabla de configuración creada\n`);

    await conn.commit();
    console.log('✅ Todos los catálogos se han creado exitosamente');
    console.log('\n📊 Resumen:');
    console.log(`   - ${estadosDocumentos.length} estados de documentos`);
    console.log(`   - ${origenes.length} orígenes de insumos`);
    console.log(`   - ${tiposMovimientos.length} tipos de movimientos`);
    console.log(`   - ${tiposItems.length} tipos de items`);
    console.log(`   - ${unidades.length} unidades de medida`);
    console.log(`   - Tabla de configuración`);

  } catch (error) {
    await conn.rollback();
    console.error('❌ Error al crear catálogos:', error.message);
    process.exit(1);
  } finally {
    await conn.end();
    process.exit(0);
  }
}

createCatalogs();
