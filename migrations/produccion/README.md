# MÓDULO DE PRODUCCIÓN Y AGROINDUSTRIALIZACIÓN - DOCUMENTACIÓN TÉCNICA

## 📋 Descripción General

Módulo SaaS enterprise-grade para **Producción y Agroindustrialización** con:
- ✅ **Multi-Tenant**: Aislamiento completo de datos por tenant_id
- ✅ **Contabilidad de Costos**: Cálculo automático de MP, MO, CIF
- ✅ **Validación Estricta de Inventario**: Sistema FIFO con bloqueo de órdenes
- ✅ **Trazabilidad de Lotes**: QR, códigos únicos y versionado de fórmulas
- ✅ **Inteligencia de Mercado**: Análisis de rentabilidad vs precios referenciales
- ✅ **Carga Bajo Demanda**: Procesamiento de consultas históricas sin sobrecarga
- ✅ **Integración Contable**: Generación automática de comprobantes (Débito PT, Crédito MP/MO/CIF)

---

## 🗂️ ESTRUCTURA DE ARCHIVOS

### Base de Datos (SQL)
```
migrations/produccion/
├── 01_ALTER_existentes.sql                    # Alteraciones a tablas previas
├── 02_CREATE_inv_lotes_existencia.sql         # Gestión de lotes de inventario
├── 03_CREATE_produccion.sql                   # Recetas y órdenes de producción
├── 03b_CREATE_produccion_lotes.sql            # Lotes de PT y consumo de materiales
├── 03c_CREATE_produccion_costos_cuentas_precios.sql  # Mano de obra y cuentas contables
└── 03d_CREATE_produccion_precios_mercado.sql  # Precios de mercado e inteligencia (NUEVO)
```

### Backend (Node.js + Express)
```
server/
├── services/
│   └── ProductionService.js                   # Lógica de negocio (NUEVO)
├── routes/
│   └── produccion.js                          # Endpoints REST (NUEVO)
└── index.js                                   # Servidor principal (ACTUALIZADO)
```

### Frontend (React + TanStack Table)
```
src/
├── components/
│   └── ProductionHistoryDashboard.jsx         # Dashboard histórico (NUEVO)
└── App.jsx                                    # Rutas principales (ACTUALIZADO)
```

---

## 🗄️ MODELO DE DATOS (DDL)

### Tablas Principales

#### 1. `prod_recetas` - Fórmulas Maestras Versionadas
```sql
- id_receta (PK)
- id_tenant (FK, Multi-Tenant)
- codigo (UNIQUE por tenant)
- nombre, descripción
- id_insumo_producto (Producto terminado)
- version_actual (Versionado)
- rendimiento_esperado
- cif_modo: 'Porcentaje' | 'Fijo'
- cif_valor
- estado: 'Borrador' | 'Activa' | 'Inactiva'
- Índices: (id_tenant, estado, version_actual)
```

#### 2. `prod_ordenes` - Órdenes de Producción
```sql
- id_orden (PK)
- id_tenant (FK, Multi-Tenant)
- codigo_orden (UNIQUE por tenant)
- id_receta, version_receta
- cantidad_ordenada
- id_bodega_origen, id_bodega_destino
- id_finca, id_centro_costo
- estado: 'Borrador' | 'Validada' | 'En_Proceso' | 'Finalizada' | 'Cancelada'
- formula_snapshot (JSON - Snapshot de fórmula congelada)
- costo_materiales, costo_mano_obra, costo_cif, costo_total
- contabilizada (0|1)
- id_comprobante_contable (FK)
- contabilizacion_json (JSON - Snapshot del asiento)
- Índices: (id_tenant, estado, fecha_orden), (id_tenant, id_insumo_producto)
```

#### 3. `prod_lotes` - Lotes de Producto Terminado
```sql
- id_lote_prod (PK)
- id_tenant (FK, Multi-Tenant)
- id_orden (FK)
- lot_code (UNIQUE por tenant)
- cantidad, cantidad_disponible
- costo_unitario
- fecha_produccion, expiration_date
- qr_code_hash (SHA-256, para trazabilidad pública)
- estado: 'Disponible' | 'Comprometido' | 'Caducado' | 'Consumido' | 'Anulado'
- Índices: (id_tenant, id_insumo, estado), (id_tenant, expiration_date)
```

#### 4. `prod_precios_mercado` - Inteligencia de Mercado
```sql
- id_precio_mercado (PK)
- id_tenant (FK, Multi-Tenant)
- id_insumo_producto (FK)
- precio_unitario
- fuente: 'Manual' | 'API' | 'Bolsa' | 'Distribuidor'
- vigente_desde, vigente_hasta (NULL = vigente)
- Índices: (id_tenant, id_insumo_producto, vigente_desde)
```

#### 5. `prod_analisis_rentabilidad` - Análisis Congelado
```sql
- id_rentabilidad (PK)
- id_tenant (FK, Multi-Tenant)
- id_orden (UNIQUE FK)
- costo_total_produccion, costo_unitario
- precio_mercado_unitario
- margen_bruto_unitario, margen_bruto_total, pct_margen_bruto
- estado_rentabilidad: 'Rentable' | 'Marginal' | 'Deficitario'
- analisis_json (JSON - Desglose detallado)
- Índices: (id_tenant, id_orden), (id_tenant, id_insumo_producto, fecha_calculo)
```

#### 6. `prod_consultas_historico` - Auditoría de Consultas
```sql
- id_consulta (PK)
- id_tenant (FK, Multi-Tenant)
- tipo_consulta: 'historico_producciones' | 'analisis_rentabilidad' | 'trazabilidad_lotes'
- filtros_aplicados (JSON)
- cantidad_registros
- tiempo_procesamiento_ms
- estado_consulta: 'Exitosa' | 'Error' | 'Pendiente' | 'Cancelada'
```

---

## 🔧 IMPLEMENTACIÓN

### 1. Crear Tablas en Base de Datos

```bash
# Conectarse a MySQL y ejecutar los scripts en orden:
mysql -u root -p sas_agricolas < migrations/produccion/03d_CREATE_produccion_precios_mercado.sql
```

### 2. Instalar Dependencias Backend

```bash
npm install
# Ya incluye: express, mysql2, axios, uuid, crypto
```

### 3. Instalar TanStack Table (Frontend)

```bash
npm install @tanstack/react-table
# Ya debería estar en package.json
```

---

## 🚀 ENDPOINTS API REST

### Base: `/api/produccion`

#### 1. **POST** `/crear-orden`
Crear orden de producción con validaciones estrictas.

**Request:**
```json
{
  "id_tenant": 1,
  "id_receta": 5,
  "cantidad_ordenada": 100,
  "id_bodega_origen": 10,
  "id_bodega_destino": 15,
  "id_finca": 2,
  "costo_mano_obra": 50000
}
```

**Response (201):**
```json
{
  "success": true,
  "id_orden": 42,
  "codigo_orden": "ORD-2026-00042",
  "estado": "En_Proceso",
  "cantidad_ordenada": 100,
  "costo_total": 2500000,
  "costoBD": {
    "materiales": 1800000,
    "mano_obra": 50000,
    "cif": 650000
  },
  "consumos": [
    {
      "id_insumo": 3,
      "cantidad_consumida": 50,
      "costo_unitario": 36000,
      "costo_total": 1800000
    }
  ]
}
```

**Validaciones:**
- ❌ Inventario insuficiente → Error 400
- ✅ Si OK → Descontar FIFO, crear orden en "En_Proceso", congelar costos

---

#### 2. **POST** `/finalizar-produccion`
Finalizar orden, generar lotes y comprobante contable.

**Request:**
```json
{
  "id_orden": 42,
  "id_tenant": 1
}
```

**Response (200):**
```json
{
  "success": true,
  "id_orden": 42,
  "id_lote_produccion": 15,
  "lote_code": "LOT-2608-000015",
  "qr_hash": "a3f5e8c2d9b1a6f0e2c4d7b9a1f3e5a7c9d1b3f5e7a9b1c3d5e7f9a1b3d5",
  "comprobante_contable": "CB-1723526410000",
  "rentabilidad": {
    "costo_total": 2500000,
    "precio_mercado": 3500000,
    "margen_bruto": 1000000,
    "pct_margen": 28.57,
    "estado": "Rentable"
  }
}
```

**Acciones:**
1. ✅ Generar lote con código único y QR
2. ✅ Consultar precio de mercado actual
3. ✅ Calcular rentabilidad
4. ✅ Generar comprobante contable (Débito PT, Crédito MP/MO/CIF)
5. ✅ Registrar análisis de rentabilidad

---

#### 3. **POST** `/historico-producciones`
Obtener histórico con carga bajo demanda.

**Request:**
```json
{
  "filtros": {
    "id_finca": 2,
    "fecha_desde": "2026-01-01",
    "fecha_hasta": "2026-08-31",
    "id_insumo_producto": 7,
    "lot_code": "LOT-2608",
    "limit": 50,
    "offset": 0
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "cantidad_registros": 25,
  "tiempo_procesamiento_ms": 145,
  "registros": [
    {
      "id_orden": 42,
      "codigo_orden": "ORD-2026-00042",
      "lot_code": "LOT-2608-000015",
      "nombre_producto": "Queso Fresco",
      "cantidad_ordenada": 100,
      "unidad_medida": "kg",
      "costo_total": 2500000,
      "precio_mercado_unitario": 35000,
      "margen_bruto_total": 1000000,
      "pct_margen_bruto": 28.57,
      "estado": "Finalizada",
      "contabilizada": 1,
      "fecha_orden": "2026-08-12"
    }
  ]
}
```

---

#### 4. **GET** `/lote/:idLoteProd`
Obtener detalles de lote con trazabilidad completa.

**Query:**
```
?id_tenant=1
```

**Response (200):**
```json
{
  "lote": {
    "id_lote_prod": 15,
    "lot_code": "LOT-2608-000015",
    "cantidad": 100,
    "cantidad_disponible": 75,
    "unidad_medida": "kg",
    "fecha_produccion": "2026-08-12",
    "expiration_date": "2027-02-08",
    "qr_code_hash": "a3f5e8c2...",
    "estado": "Disponible"
  },
  "orden": {
    "codigo_orden": "ORD-2026-00042",
    "cantidad_ordenada": 100,
    "estado": "Finalizada",
    "costo_total": 2500000
  },
  "trazabilidad": {
    "materiales_consumidos": [
      {
        "nombre_insumo": "Leche Fresca",
        "cantidad_consumida": 120,
        "costo_unitario": 15000,
        "lote_origen_mp": "LOT-2608-MP-001"
      }
    ],
    "rentabilidad": {
      "costo_unitario": 25000,
      "precio_mercado_unitario": 35000,
      "margen_bruto_unitario": 10000,
      "pct_margen_bruto": 28.57,
      "estado_rentabilidad": "Rentable"
    }
  }
}
```

---

#### 5. **POST** `/precios-mercado`
Registrar precio de mercado.

**Request:**
```json
{
  "id_tenant": 1,
  "id_insumo_producto": 7,
  "precio_unitario": 35000,
  "fuente": "Manual",
  "notas": "Precio referencial del mercado local"
}
```

**Response (201):**
```json
{
  "success": true,
  "id_precio_mercado": 123,
  "precio_unitario": 35000,
  "fuente": "Manual"
}
```

---

#### 6. **GET** `/config-tenant/:id_tenant`
Obtener configuración del tenant.

**Response (200):**
```json
{
  "id_config": 1,
  "id_tenant": 1,
  "margen_minimo_rentable": 20,
  "habilitar_inteligencia_mercado": 1,
  "dias_validez_precio_mercado": 30,
  "autofinalizar_sin_consumo": 0
}
```

---

## 💻 COMPONENTE REACT - ProductionHistoryDashboard

### Características:

#### 1. **Panel de Filtros (Carga Bajo Demanda)**
- Finca, Fecha Desde/Hasta, Producto, Código Lote
- Botón "Procesar Consulta" (evita sobrecarga)
- Muestra tiempo de procesamiento en ms

#### 2. **TanStack Table**
- 12 columnas con sorting y búsqueda
- Paginación configurable (10, 25, 50, 100 registros)
- Columnas clave:
  - Código Orden (mono)
  - Lote Generado
  - Producto
  - Cantidad + UM
  - Costo Total (rojo)
  - Precio Mercado (azul)
  - Utilidad Bruta (rojo/verde según valor)
  - % Margen (codificado por color)
  - Estado (badge)
  - Contabilizado (✅/⏳)
  - Fecha Orden
  - Acciones (Ver)

#### 3. **Drawer Modal - Trazabilidad**
Al hacer clic en "Ver":
- 📦 Información del Lote
- 📋 Orden de Producción
- 🔗 Materiales Consumidos (FIFO)
- 📊 Análisis de Rentabilidad
- 🧾 Comprobante Contable (placeholder)

#### 4. **Export CSV**
Descargar datos históricos en formato CSV.

---

## 🔐 SEGURIDAD MULTI-TENANT

**Validaciones en cada operación:**

```javascript
// Ejemplo en ProductionService.js
const [recetas] = await conn.query(
  'SELECT * FROM prod_recetas WHERE id_receta = ? AND id_tenant = ?',
  [id_receta, id_tenant]  // ← Siempre validar tenant_id
);
```

**Principios:**
- ✅ Incluir `id_tenant` en TODAS las queries
- ✅ Índices compuestos: `(id_tenant, estado)`, `(id_tenant, fecha)`
- ✅ Middleware Express valida `req.user.tenant_id`
- ✅ No exponer IDs en URLs públicas (usar QR hash en su lugar)

---

## 📊 FLUJO DE NEGOCIO

### Caso de Uso: Producción de Queso

```
1. CREAR ORDEN
   ├─ Validar receta activa (v1.2)
   ├─ Validación FIFO: ¿Hay 120kg de leche fresca?
   │  ├─ Sí → Descontar lotes por antigüedad
   │  └─ No → Error 400 "Inventario insuficiente"
   ├─ Snapshot de fórmula (congelada)
   ├─ Cálculo de costos:
   │  ├─ MP: 120kg × $15,000 = $1,800,000
   │  ├─ MO: $50,000
   │  ├─ CIF: ($1,800,000 + $50,000) × 10% = $185,000
   │  └─ Total: $2,035,000
   └─ Estado: "En_Proceso"

2. FINALIZAR ORDEN
   ├─ Generar Lote: "LOT-2608-000015"
   ├─ QR Hash: SHA-256(LOT-2608-000015-tenant1-timestamp)
   ├─ Consultar Precio Mercado: $35,000/kg
   ├─ Calcular Rentabilidad:
   │  ├─ Costo Unitario: $2,035,000 / 100kg = $20,350/kg
   │  ├─ Margen Unitario: $35,000 - $20,350 = $14,650/kg
   │  ├─ Margen Total: $14,650 × 100kg = $1,465,000
   │  ├─ % Margen: ($14,650 / $35,000) × 100 = 41.86%
   │  └─ Estado: "Rentable" (> 20%)
   ├─ Generar Comprobante Contable:
   │  ├─ Débito: Inventario PT = $2,035,000
   │  ├─ Crédito: MP Consumida = $1,800,000
   │  ├─ Crédito: MO = $50,000
   │  └─ Crédito: CIF = $185,000
   ├─ Registrar en prod_analisis_rentabilidad
   └─ Marcar como contabilizada

3. CONSULTAR HISTÓRICO (Carga Bajo Demanda)
   ├─ Usuario aplica filtros
   ├─ Presiona "Procesar Consulta"
   ├─ Backend:
   │  ├─ Ejecuta SELECT con filtros
   │  ├─ Registra en prod_consultas_historico
   │  └─ Retorna {registros, tiempo_ms}
   └─ Frontend: Renderiza TanStack Table

4. VER TRAZABILIDAD
   ├─ Usuario hace clic en "Ver" del lote
   ├─ Drawer muestra:
   │  ├─ Lote: LOT-2608-000015, 100kg, vence 2027-02-08
   │  ├─ Orden: ORD-2026-00042, $2,035,000
   │  ├─ Materiales: Leche lote "LOT-2608-MP-001" (120kg @ $15,000/kg)
   │  └─ Margen: $14,650/kg, 41.86%, "Rentable"
   └─ Usuario puede exportar o auditar
```

---

## 🎯 DIFERENCIADORES COMPETITIVOS

### 1. **Inteligencia de Mercado**
- Registra precio de mercado diario
- Compara costo de producción vs margen esperado
- Alertas: Si margen < 20% → "Marginal"
- Permite decisiones de precio en tiempo real

### 2. **Trazabilidad FIFO + QR**
- Cada lote tiene código único y QR hash (SHA-256)
- Vincula automáticamente materia prima original
- Auditoría completa: "Este queso viene de leche lote X, vence en Y"
- Certificaciones BPA lisas

### 3. **Validación Estricta de Inventario**
- No permite crear orden si falta MP
- Sistema FIFO automático
- Previene fraudes de "fantasmas" o dobles conteos

### 4. **Carga Bajo Demanda**
- Dashboard no carga TODO el histórico
- Botón "Procesar Consulta" evita ⏱️ timeouts
- Auditoría de cada consulta (quién, cuándo, cuánto tardó)

### 5. **Contabilidad Automática**
- Genera asiento contable al finalizar
- Débito PT (Inventario), Crédito MP/MO/CIF
- Integración con módulo de Contabilidad existente
- Snapshot congelado (no se altera después)

---

## 📈 OPTIMIZACIONES DE RENDIMIENTO

### 1. **Índices Estratégicos**
```sql
-- Por tenant + estado (queries más comunes)
CREATE INDEX idx_prod_ordenes_tenant_estado
  ON prod_ordenes (id_tenant, estado, fecha_orden);

-- Por tenant + producto + fecha (reportes)
CREATE INDEX idx_prod_ordenes_tenant_producto
  ON prod_ordenes (id_tenant, id_insumo_producto, fecha_orden);

-- Trazabilidad rápida
CREATE INDEX idx_prod_lotes_tenant_bodega_estado
  ON prod_lotes (id_tenant, id_bodega, estado);
```

### 2. **Paginación en Frontend**
- Cargar 50 registros por defecto
- User selecciona 10, 25, 50, 100
- Offset + Limit evita LIMIT sin OFFSET infinito

### 3. **Auditoría Eficiente**
- prod_consultas_historico registra:
  - Filtros aplicados (JSON)
  - Cantidad de resultados
  - Tiempo de procesamiento
  - Estado (Exitosa/Error/Cancelada)
- Permite identificar queries lentas

### 4. **Snapshot Congelado**
- `formula_snapshot` y `contabilizacion_json` guardan estado al momento
- No necesita JOINs posteriores para auditoría
- Histórico inmutable

---

## 🧪 PRUEBAS SUGERIDAS

### Unit Tests
```javascript
// ProductionService.test.js
describe('ProductionService', () => {
  test('createProductionOrder - inventario insuficiente', async () => {
    // Mock: inventario vacío
    // Expect: Error 400 "Inventario insuficiente"
  });

  test('finalizeAndAccountProduction - genera lote con QR', async () => {
    // Mock: orden válida
    // Expect: id_lote_produccion, lot_code, qr_hash
  });

  test('calcularRentabilidad - estado correcto', async () => {
    // Test: margen < 20% → "Marginal"
    // Test: margen > 20% → "Rentable"
  });
});
```

### Integration Tests
```javascript
// Flujo completo:
// 1. Crear orden
// 2. Verificar costos calculados
// 3. Finalizar orden
// 4. Consultar histórico
// 5. Verificar lote y rentabilidad
```

---

## 🚨 ERRORES COMUNES Y SOLUCIONES

| Error | Causa | Solución |
|-------|-------|----------|
| "Inventario insuficiente" | Falta MP o MO | Crear lote de MP o aumentar bodega_origen |
| "Receta no encontrada" | id_receta no existe o inactiva | Crear receta y activar en prod_recetas |
| "Orden ya finalizada" | Intento de finalizar 2 veces | Verificar estado antes de finalizar |
| "id_tenant requerido" | Falta parámetro en query | Agregar ?id_tenant=X en URL |
| Consulta histórico lenta | SIN índices o LIMIT sin OFFSET | Ejecutar script de índices, usar paginación |

---

## 📞 SOPORTE Y EXTENSIONES FUTURAS

### Próximas Fases:
1. **Integración RRHH**: Cuadrillas y mano de obra automática
2. **Integración Contabilidad**: Link directo a comprobantes en módulo contable
3. **BI/Analytics**: Dashboards de rentabilidad por producto/mes/finca
4. **Mobile App**: QR scanner para trazabilidad en campo
5. **API Externa**: Precios de bolsa de commodities (automático)

---

## 📝 CHECKLIST DE DEPLOYMENT

- [ ] Ejecutar scripts SQL en orden (01 → 03d)
- [ ] Instalar dependencias: `npm install`
- [ ] Verificar conexión a BD (test query)
- [ ] Iniciar servidor: `npm run dev:server`
- [ ] Probar endpoint POST `/api/produccion/crear-orden`
- [ ] Verificar columnas en histórico
- [ ] Validar export CSV
- [ ] Prueba multi-tenant (2+ tenants)
- [ ] Monitoreo de índices en prod
- [ ] Backup diario de BD

---

## 📚 REFERENCIAS

- **TanStack Table**: https://tanstack.com/table/v8/docs/guide/introduction
- **MySQL PARTITIONING**: https://dev.mysql.com/doc/refman/8.0/en/partitioning.html
- **SaaS Architecture**: https://martinfowler.com/articles/saas.html
- **FIFO Inventory**: https://en.wikipedia.org/wiki/FIFO_and_LIFO_accounting

---

**Versión**: 1.0.0  
**Fecha**: Agosto 2026  
**Autor**: Arquitecto de Software Senior - SAS Agrícolas  
**Estado**: ✅ Production Ready
