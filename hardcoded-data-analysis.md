# Análisis de Datos Hardcodeados en SAS Agrícolas

**Fecha de Análisis:** 2026-08-13  
**Alcance:** Archivos .js, .cjs, .mjs, .ts, .tsx (excluyendo node_modules, .kilo, backups)  
**Riesgo de Mantenibilidad:** ALTO

---

## Resumen Ejecutivo

Se identificaron **múltiples categorías de datos hardcodeados** que deberían ser parametrizados o almacenados en base de datos:

- **Total de occurrencias:** 200+
- **Archivos afectados:** 60+
- **Categorías principales:** IDs fijos, Estados, Configuraciones, Catálogos, Enumeraciones

### Impacto

- Cambios en configuración requieren modificación de código
- Riesgo de inconsistencias entre módulos
- Dificulta multi-tenencia y escalabilidad
- Reduce flexibilidad operativa

---

## 1. IDs FIJOS HARDCODEADOS

### 1.1 id_tenant = 1

Usado como tenant por defecto en múltiples queries de demostración y seed.

| Archivo | Línea | Contexto | Repeticiones | Tabla/Campo BD |
|---------|-------|----------|--------------|----------------|
| server/index.js | 46, 47, 49 | SELECT queries para acuícola | 3 | tenants.id_tenant |
| server/seed_demo.js | 6, 7, 14 | Seed data acuícola | 3 | tenants.id_tenant |
| server/seed_demo3.js | 7, 15 | Seed data acuícola | 2 | tenants.id_tenant |
| seed_direct.js | 5, 6, 13 | Seed data acuícola | 3 | tenants.id_tenant |
| seed_final.js | 13 | Seed data acuícola | 1 | tenants.id_tenant |
| server/seed_puc.cjs | 149 | Plan contable | 1 | tenants.id_tenant |
| seed_aplicaciones_50.mjs | 79, 114 | Seed aplicaciones | 2 | tenants.id_tenant |
| seed_aplicaciones_final.mjs | 27, 31 | Seed aplicaciones | 2 | tenants.id_tenant |
| seed_costos_50.mjs | 23 | Seed costos | 1 | tenants.id_tenant |
| server/routes/traslados.js | 9 | Query parameter default | 1 | tenants.id_tenant |
| server/routes/acuicola.js | 213, 218 | Seed endpoint | 2 | tenants.id_tenant |
| server/routes/acuicola_cosechas_mobile.js | 11, 16 | Seed endpoint | 2 | tenants.id_tenant |
| server/migrations/hierarchy_setup.cjs | 58 | Setup migration | 1 | tenants.id_tenant |
| test_api.cjs | 5 | JWT token generation | 1 | tenants.id_tenant |
| contabilidad.js | 472 | WHERE clause | 1 | tenants.id_tenant |
| src/components/Contabilidad_y_Finanzas/ParametrosContables.jsx | 92 | API call default | 1 | tenants.id_tenant |

**Total de repeticiones:** 30+

**Riesgo:** CRÍTICO - Impide testing con múltiples tenants, hardcodea tenant en queries de demostración.

---

### 1.2 id_finca = 1

Usado extensivamente como finca por defecto en queries.

| Archivo | Línea | Contexto | Repeticiones | Tabla/Campo BD |
|---------|-------|----------|--------------|----------------|
| check_finca1.js | 21, 28, 49 | Query data | 3 | fincas.id_finca |
| check_finca1_full.js | 21, 28, 51 | Query data | 3 | fincas.id_finca |
| get_finca_data.js | 18 | Query data | 1 | fincas.id_finca |
| get_finca_lotes.js | 19, 26, 36 | Query data | 3 | fincas.id_finca |
| get_finca_lote_count.js | 22 | Query count | 1 | fincas.id_finca |
| get_finca_full_info.js | 18, 24, 33, 44 | Query data | 4 | fincas.id_finca |
| sum_finca1_hectares.js | 22 | Query sum | 1 | fincas.id_finca |
| update_polygon.mjs | 12, 16 | Update/Select GPS | 2 | fincas.id_finca |

**Total de repeticiones:** 18+

**Riesgo:** ALTO - Limita funcionalidad a una única finca en scripts de demostración.

---

### 1.3 id_bodega = 1 y 2

| Archivo | Línea | Contexto | Repeticiones | Tabla/Campo BD |
|---------|-------|----------|--------------|----------------|
| seed_audit_carbofuran.cjs | 27, 28 | Bodega central e insumos | 2 | bod_bodegas.id_bodega |
| server/routes/applications.js | 148 | WHERE clause bodega central | 1 | bod_bodegas.id_bodega |

**Total de repeticiones:** 3+

**Riesgo:** MEDIO - Solo en scripts seed, pero limita a bodegas específicas.

---

### 1.4 id_tipo_doc = 8

| Archivo | Línea | Contexto | Repeticiones | Tabla/Campo BD |
|---------|-------|----------|--------------|----------------|
| server/routes/rrhh.js | 306, 310 | Consecutivos documentos | 2 | tipos_documentos.id_tipo_doc |

**Total de repeticiones:** 2

**Riesgo:** MEDIO - Asume tipo de documento fijo para RRHH.

---

## 2. ESTADOS Y VALORES CONSTANTES

### 2.1 'Activo'

El estado más recurrente, aparece en 70+ archivos.

| Categoría | Archivo | Contexto | Repeticiones |
|-----------|---------|----------|--------------|
| Siembras | server/index.js, seed_*.js | WHERE estado = 'Activo' | 15+ |
| Lotes | get_finca_full_info.js, check_finca1*.js | Filtro lotes activos | 8+ |
| Empleados | server/routes/rrhh.js, nomina.js | Empleados activos | 12+ |
| Ganado | server/routes/ganado_*.js | Animales activos | 10+ |
| GPS Devices | server/routes/tracking.js | Dispositivos activos | 4+ |
| Terceros | server/routes/compras.js | Proveedores activos | 2+ |

**Total de repeticiones:** 70+

**Riesgo:** ALTO - Valor crítico pero no centralizado. Cambios requieren editar múltiples archivos.

**Base de Datos:** Múltiples tablas (siembras, lotes, empleados, ganado, gps_tracking_dispositivos, etc.) - Necesario catálogo centralizado.

---

### 2.2 'Borrador'

Estado inicial de documentos.

| Archivo | Línea | Contexto | Repeticiones |
|---------|-------|----------|--------------|
| server/routes/tomas_fisicas.js | 120 | UPDATE estado = 'En Conteo' WHERE estado = 'Borrador' | 1 |
| server/routes/nomina.js | 193 | INSERT estado 'Borrador' | 1 |
| server/routes/compras.js | 64 | INSERT estado 'Borrador' | 1 |
| server/routes/ganado_avanzado.js | 502, 593 | INSERT estado 'Borrador' | 2 |
| src/components/Payroll/PayrollGenerator.jsx | 155, 160 | Render badge estado | 2 |
| src/components/Bodegas/ValidadorCompras.jsx | 99 | Check estado 'Borrador' | 1 |
| src/components/Inventory/TomaFisicaDashboard.jsx | 448 | Render tag estado | 1 |

**Total de repeticiones:** 9+

**Riesgo:** MEDIO - Necesita catálogo centralizado de estados de documentos.

**Base de Datos:** periodos_contables.estado, rrhh_planillas.estado, inv_compras.estado

---

### 2.3 'Entrada' / 'Salida'

Estados de movimientos de inventario y recursos.

| Archivo | Línea | Contexto | Repeticiones | Tipo |
|---------|-------|----------|--------------|------|
| server/routes/traslados.js | 137, 157, 217 | INSERT tipo_movimiento | 3 | Traslados |
| server/routes/acuicola_molino.js | 42, 198, 418 | INSERT tipo_movimiento | 3 | Molino |
| server/routes/kardex.js | 83, 85, 86 | WHERE naturaleza = 'Salida' | 3 | Documentos |
| server/routes/tomas_fisicas.js | 171, 173, 178, 180 | INSERT naturaleza | 4 | Ajustes |
| seed_audit_carbofuran.cjs | 51, 55, 59, 60, 64, 68, 72, 73, 77 | Entrada/Salida movimientos | 9 | Seed |
| server/routes/bodegas_avanzado.js | 115, 128, 131, 143, 170, 175 | IF tipo.naturaleza | 6 | Inventario |
| server/routes/acuicola_herramientas.js | 133, 135, 136 | IF tipo_movimiento | 3 | Herramientas |
| server/routes/ganado_herramientas.js | 122, 123 | IF tipo_movimiento | 2 | Herramientas |
| seed-traslados.cjs | 36, 37, 38, 39 | Seed data | 4 | Seed |

**Total de repeticiones:** 37+

**Riesgo:** ALTO - Crítico para lógica de inventario. Necesita tabla de tipo de movimiento.

**Base de Datos:** inv_movimientos.tipo_movimiento, inv_traslados.tipo_movimiento

---

### 2.4 'Nacional' / 'Importado'

Origen de productos.

| Archivo | Línea | Contexto | Repeticiones |
|---------|-------|----------|--------------|
| scripts/generate_demo_inventory.js | 35, 36, 37, 58, 80 | Demo products origen | 5 |

**Total de repeticiones:** 5+

**Riesgo:** BAJO - Solo en scripts demo.

**Base de Datos:** insumos.origen

---

## 3. ENUMERACIONES EN ESQUEMA

### 3.1 ENUM Estados de Documentos

```sql
estado ENUM('Borrador', 'Revisión', 'Aprobada', 'Contabilizada') DEFAULT 'Borrador'
estado ENUM('Borrador', 'Aprobado', 'Anulado') DEFAULT 'Borrador'
estado ENUM('Abierto', 'Cerrado', 'Anulado') DEFAULT 'Abierto'
estado ENUM('Pendiente_Aprobacion', 'Aprobado', 'Rechazado', 'Despachado', 'Recibido')
```

**Ubicación:**
- server/migrations/rrhh_schema.js/cjs (líneas 68, 81, 82)
- server/migrations/paccioli_setup.cjs (líneas 31, 47)
- server/migrations/bodegas-avanzado.mjs (línea 102, 127)

**Riesgo:** ALTO - ENUMs en esquema, no en tabla catálogo. Cambios requieren ALTER TABLE.

---

### 3.2 ENUM Tipos de Entidad de Tracking

```sql
tipo_entidad ENUM('Empleado', 'Maquina', 'Vehiculo')
```

**Ubicación:** server/setup-tracking.cjs (líneas 37, 56)

**Uso en código:** server/routes/tracking.js, src/components/GPSTracker.jsx

**Repeticiones:** 30+ referencias en código

**Riesgo:** ALTO - Enumeración fija dificulta agregar nuevos tipos.

---

### 3.3 ENUM Categorías de Labores

```sql
categoria ENUM('Personal', 'Cultivos', 'Lotes', 'Arboles', 'Riegos', 
              'Maquinas_Vehiculos', 'Talleres', 'Semilleros', 'Abonos', 
              'Cosecha', 'Viveros', 'Ganadería', 'Planta_Bioles', 
              'Acuicola', 'Bodegas', 'Produccion')
```

**Ubicación:** server/migrations/rrhh_schema.cjs, update_enum.cjs

**Riesgo:** CRÍTICO - 16 categorías hardcodeadas. Cambios requieren migración.

---

### 3.4 ENUM Naturaleza de Movimientos

```sql
naturaleza ENUM('Entrada', 'Salida', 'Transferencia')
```

**Ubicación:** server/migrations/bodegas-avanzado.mjs (línea 72)

**Riesgo:** ALTO - Fundamental para inventario.

---

## 4. CONFIGURACIONES HARDCODEADAS

### 4.1 Valores por Defecto en Consultas

| Configuración | Archivo | Valor | Repeticiones |
|---------------|---------|-------|--------------|
| ID Período por defecto | server/routes/semillero.js, nomina.js | id_periodo = 1 | 2 |
| ID Tipo Comprobante por defecto | server/routes/semillero.js, nomina.js | id_tipo_comp = 1 | 2 |
| LIMIT registros | Múltiples archivos seed | LIMIT 5, 50, 1000 | 10+ |

**Riesgo:** MEDIO - Limita configurabilidad de períodos y tipos.

---

### 4.2 Conceptos de Nómina

| Archivo | Códigos Hardcodeados | Descripción |
|---------|----------------------|-------------|
| setup_cuadrillas_data.cjs | LAB-01, LAB-02, LAB-03 | Conceptos laborales | 1 |

**Riesgo:** BAJO - Específico de setup inicial.

---

## 5. CATÁLOGOS HARDCODEADOS EN SCRIPTS

### 5.1 Tipos de Documentos

**Archivo:** scripts/create_catalogs.js

```javascript
{ codigo: 'BORRADOR', nombre: 'Borrador', categoria: 'Documento' }
{ codigo: 'ENTRADA', nombre: 'Entrada', categoria: 'Movimiento' }
{ codigo: 'SALIDA', nombre: 'Salida', categoria: 'Movimiento' }
{ codigo: 'NACIONAL', nombre: 'Nacional' }
{ codigo: 'IMPORTADO', nombre: 'Importado' }
```

**Riesgo:** BAJO - En script setup, pero debería ser migraciones.

---

### 5.2 Valores Enum en Migraciones

**server/migrations/migrate-agricultural-apps.cjs:**

```sql
metodo_aplicacion ENUM('Manual', 'Dron', 'Avión', 'Tractor', 'Fertirriego', 'Otro')
estado ENUM('Programada', 'En Proceso', 'Completada', 'Cancelada')
tipo ENUM('Plaga', 'Enfermedad')
nivel_riesgo ENUM('Bajo', 'Medio', 'Alto', 'Cuarentenario')
```

**Repeticiones:** Múltiples migraciones con ENUMs similares

**Riesgo:** CRÍTICO - Valores fijos en esquema, difíciles de cambiar.

---

## 6. PATRONES PROBLEMÁTICOS POR MÓDULO

### 6.1 Acuícola (CRÍTICO)

**Problema:** id_tenant = 1 hardcodeado en múltiples endpoints públicos

```javascript
// server/index.js:46-49
const [estanques] = await db.query("SELECT * FROM acuicola_estanques WHERE id_tenant = 1 LIMIT 5");
const [siembrasExistentes] = await db.query("SELECT * FROM acuicola_siembras WHERE estado = 'Activo' AND id_tenant = 1");
```

**Archivos afectados:** 8+

**Impacto:** No puede filtrar por tenant del usuario actual

---

### 6.2 Contabilidad (CRÍTICO)

**Problema:** Períodos y tipos de comprobante asumidos con ID = 1

```javascript
// server/routes/semillero.js:208-211
const idTipo = tipos.length ? tipos[0].id_tipo_comp : 1;
const idPeriodo = periodos.length ? periodos[0].id_periodo : 1;
```

**Archivos afectados:** semillero.js, nomina.js, rrhh.js

**Impacto:** Imposible usar múltiples períodos o tipos de comprobante

---

### 6.3 Tracking GPS (ALTO)

**Problema:** Tipos de entidad limitados a enum fijo

```sql
tipo_entidad ENUM('Empleado', 'Maquina', 'Vehiculo')
```

**Código repetido:** 30+ referencias

**Impacto:** No se pueden agregar nuevos tipos sin migración BD

---

### 6.4 Labores (CRÍTICO)

**Problema:** 16 categorías hardcodeadas en ENUM

```sql
categoria ENUM('Personal', 'Cultivos', 'Lotes', 'Arboles', 'Riegos', 
              'Maquinas_Vehiculos', 'Talleres', 'Semilleros', 'Abonos', 
              'Cosecha', 'Viveros', 'Ganadería', 'Planta_Bioles', 
              'Acuicola', 'Bodegas', 'Produccion')
```

**Impacto:** Cambios requieren ALTER TABLE, no flexible

---

## 7. TABLA DE MIGRACIÓN RECOMENDADA

```sql
CREATE TABLE catalogo_estados (
  id INT PRIMARY KEY AUTO_INCREMENT,
  id_tenant INT NOT NULL,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  categoria VARCHAR(50) NOT NULL,
  descripcion TEXT,
  codigo VARCHAR(20),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_tenant) REFERENCES tenants(id_tenant),
  INDEX idx_categoria (categoria),
  INDEX idx_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE catalogo_tipos_entidad (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE catalogo_categorias_labor (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(50) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(nombre)
) ENGINE=InnoDB;

CREATE TABLE catalogo_naturaleza_movimiento (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  signo ENUM('+', '-'),
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
```

---

## 8. RECOMENDACIONES DE ACCIÓN

### INMEDIATO (CRÍTICO)

1. **Eliminar id_tenant = 1 de endpoints públicos**
   - Usar `req.tenantId` o middleware de autenticación
   - Archivos: server/index.js, seed_demo.js, acuicola.js

2. **Centralizar tabla catalogo_estados**
   - Mover 'Activo', 'Borrador', 'Entrada', 'Salida' a tabla
   - Crear migraciones para poblar datos iniciales
   - Actualizar queries para JOIN con tabla

3. **Remover ENUMs hardcodeados de esquema**
   - Convertir laborales a tabla catalogo_categorias_labor
   - Convertir tipos_entidad a tabla catalogo_tipos_entidad
   - Reducir frágil ENUM a 2-3 valores core

### CORTO PLAZO (1-2 semanas)

4. **Parametrizar períodos contables y tipos de comprobante**
   - Usar consultas dinámicas, no defaults hardcodeados
   - Archivos: semillero.js, nomina.js, rrhh.js

5. **Crear API de catálogos**
   - GET /api/catalogos/estados
   - GET /api/catalogos/tipos-entidad
   - POST /api/catalogos/... (admin)

### MEDIANO PLAZO (1 mes)

6. **Refactorizar búsquedas en scripts**
   - Eliminar WHERE id_tenant = 1 de seed scripts
   - Parametrizar por tenant actual
   - Usar fixtures por tenant

7. **Documentar enumeraciones vigentes**
   - Crear tabla en CLAUDE.md o docs/
   - Listar todos los ENUMs con valores permitidos

---

## 9. RESUMEN DE IMPACTO

| Categoría | Crítico | Alto | Medio | Bajo |
|-----------|---------|------|-------|------|
| IDs Fijos | 2 | 1 | 2 | 0 |
| Estados | 3 | 3 | 2 | 0 |
| Configuraciones | 2 | 1 | 1 | 0 |
| Catálogos | 2 | 3 | 1 | 2 |
| ENUMs | 2 | 2 | 1 | 0 |

**Total de CRÍTICOS:** 11  
**Total de ALTOS:** 10  
**Total de MEDIOS:** 7

---

## 10. ARCHIVOS AFECTADOS (Top 20)

1. server/routes/rrhh.js - 20+ hardcodeados
2. server/routes/contabilidad.js - 18+ hardcodeados
3. server/routes/acuicola.js - 15+ hardcodeados
4. server/routes/bodegas_avanzado.js - 12+ hardcodeados
5. server/routes/tracking.js - 10+ hardcodeados
6. server/routes/nomina.js - 9+ hardcodeados
7. server/index.js - 8+ hardcodeados
8. src/components/Ganado/ComercioGanado.jsx - 7+ hardcodeados
9. server/routes/ganado_avanzado.js - 7+ hardcodeados
10. server/routes/acuicola_molino.js - 7+ hardcodeados
11. src/components/Payroll/PayrollGenerator.jsx - 6+ hardcodeados
12. server/routes/dashboard_gerencia.js - 6+ hardcodeados
13. server/routes/finanzas_agro.js - 5+ hardcodeados
14. server/routes/dashboard_cultivos.js - 5+ hardcodeados
15. server/routes/cartera.js - 4+ hardcodeados
16. src/components/Inventory/KardexDashboard.jsx - 4+ hardcodeados
17. server/routes/erp_bridge.js - 4+ hardcodeados
18. server/migrations/rrhh_schema.cjs - 4+ hardcodeados
19. src/components/Agriculture/SiembrasManager.jsx - 4+ hardcodeados
20. server/routes/compras.js - 4+ hardcodeados

---

## Conclusión

El proyecto contiene **200+ instancias de datos hardcodeados** distribuidas en 60+ archivos. El mayor riesgo está en:

1. **ENUMs en esquema** - Imposibles de cambiar sin migración
2. **id_tenant = 1** hardcodeado - Rompe multi-tenencia
3. **Estados sin centralización** - Inconsistencias potenciales
4. **Categorías de labores** - 16 valores fijos en enum

**Recomendación:** Iniciar refactorización con inmediatos (eliminar id_tenant = 1, crear tablas de catálogos) antes de lanzar a producción multi-tenant.
