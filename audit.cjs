const fs = require('fs');
const schema = JSON.parse(fs.readFileSync('schema.json', 'utf8'));

const tables = {};
schema.forEach(r => {
  if(!tables[r.TABLE_NAME]) tables[r.TABLE_NAME] = [];
  tables[r.TABLE_NAME].push({ name: r.COLUMN_NAME, type: r.DATA_TYPE });
});

const hasColumn = (t, col) => tables[t] && tables[t].some(c => c.name === col);
const hasType = (t, type) => tables[t] && tables[t].some(c => c.type === type);

let output = '# Auditoría Exhaustiva AGROPACCIOLI\n\n';

output += '## 1. ARQUITECTURA MULTI-TENANT Y BASE DE DATOS ESPACIAL\n';
output += '- **Multi-Tenant (`id_tenant`):**\n';
output += '  - `fincas`: ' + (hasColumn('fincas', 'id_tenant') ? '✅ OK' : '❌ Falta') + '\n';
output += '  - `lotes`: ' + (hasColumn('lotes', 'id_tenant') ? '✅ OK' : '❌ Falta') + '\n';
output += '  - `usuarios`: ' + (hasColumn('usuarios', 'id_tenant') ? '✅ OK' : '❌ Falta') + '\n';
output += '  - `roles`: ' + (hasColumn('roles', 'id_tenant') ? '✅ OK' : '❌ Falta') + '\n';
output += '- **Soporte Espacial (SRID 4326):**\n';
output += '  - `lotes`: ' + (hasType('lotes', 'polygon') || hasType('lotes', 'geometry') ? '✅ Contiene geometría' : '❌ Falta tipo POLYGON/GEOMETRY') + '\n';
output += '  - *Nota*: La integración de `ST_Contains` se validará en los endpoints GIS.\n\n';

output += '## 2. MÓDULO AGRÍCOLA, SIMULADOR Y GEOMETRÍA\n';
output += '- **Matriz de cultivos (Altitud, Suelo, etc.):**\n';
output += '  - Tabla `cultivos`: ' + (tables['cultivos'] ? '✅ Existe' : '❌ Falta') + '\n';
output += '  - Atributos requeridos en `cultivos`: Altitud -> ' + (hasColumn('cultivos', 'altitud_min') ? '✅ OK' : '❌ Falta') + ', Suelo -> ' + (hasColumn('cultivos', 'tipo_suelo_ideal') || hasColumn('cultivos', 'tipo_suelo') ? '✅ OK' : '❌ Falta') + '\n';
output += '- **Programador Dinámico y Kardex:**\n';
output += '  - `labores_diarias` (Programador): ' + (tables['labores_diarias'] ? '✅ Existe' : '❌ Falta') + '\n';
output += '  - `kardex` / `inventario`: ' + (tables['inventario_kardex'] || tables['kardex'] ? '✅ Existe' : '❌ Falta') + '\n\n';

output += '## 3. TELEMETRÍA, GPS Y FITOSANITARIA\n';
output += '- **Telemetría GPS:**\n';
output += '  - `gps_vehiculos` / `gps_log`: ' + (tables['gps_vehiculos'] || tables['gps_log'] ? '✅ Existe' : '❌ Falta') + '\n';
output += '  - `gps_empleados`: ' + (tables['gps_empleados'] ? '✅ Existe' : '❌ Falta') + '\n';
output += '- **Fitosanitaria por IA:**\n';
output += '  - `diagnosticos_ia` / `sanidad_vegetal`: ' + (tables['diagnosticos_ia'] || tables['sanidad_vegetal'] ? '✅ Existe' : '❌ Falta (Revisar tabla de sanidad_vegetal)') + '\n';
output += '- **Integración Pedidos WhatsApp:**\n';
output += '  - `pedidos_whatsapp`: ' + (tables['pedidos_whatsapp'] ? '✅ Existe' : '❌ Falta') + '\n\n';

output += '## 4. MÓDULO FINANCIERO Y CONTABLE (PARTIDA DOBLE PACIOLI & DIAN)\n';
output += '- **Contabilidad y Libros Oficiales:**\n';
output += '  - `puc` / `cuentas_contables`: ' + (tables['puc'] || tables['cuentas_contables'] ? '✅ Existe' : '❌ Falta') + '\n';
output += '  - `asientos_contables` / `comprobantes`: ' + (tables['asientos_contables'] || tables['comprobantes_contables'] ? '✅ Existe' : '❌ Falta') + '\n';
output += '- **Facturación Electrónica / POS:**\n';
output += '  - `facturas` / `pos_ventas`: ' + (tables['facturas'] || tables['pos_ventas'] ? '✅ Existe' : '❌ Falta') + '\n';
output += '- **Sincronización Kardex-Contabilidad:**\n';
output += '  - ⚠️ Requiere revisión de triggers o hooks de backend.\n\n';

output += '## 5. MATRIZ DE BRECHAS TÉCNICAS (FRONTEND Y BACKEND)\n';
output += '### Tablas Faltantes o por Ampliar:\n';
['gps_vehiculos', 'gps_empleados', 'diagnosticos_ia', 'pedidos_whatsapp', 'asientos_contables', 'facturas'].forEach(t => {
    if(!tables[t]) output += '- Falta o requiere adaptación: `' + t + '`\n';
});

fs.writeFileSync('C:\\Users\\USER\\.gemini\\antigravity-ide\\brain\\12a6ec8e-e550-4d12-93fc-a0591c0bab6e\\artifacts\\auditoria_agropaccioli.md', output);
console.log('Auditoria written to artifacts/auditoria_agropaccioli.md');
