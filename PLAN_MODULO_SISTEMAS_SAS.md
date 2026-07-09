# Plan de Trabajo: Módulo Sistemas SAS (DB por Tenant)

## Objetivo
Crear un módulo de administración centralizada para gestionar empresas (tenants), donde **cada empresa tenga su propia base de datos** aislada, incluyendo auto-registro desde la pantalla de login.

---

## 1. Arquitectura de Base de Datos

### 1.1 Base de Datos Principal: `sas_agricolas`
Almacena metadata global del sistema.

**Tablas globales (14):**
| Tabla | Descripción |
|-------|-------------|
| `tenants` | Empresas registradas |
| `usuarios` | Usuarios de todas las empresas |
| `sys_permisos_modulos` | Permisos por rol |
| `sys_unicidad_reglas` | Reglas de unicidad |
| `sys_audit_logs` | Logs de auditoría global |
| `sys_configuracion_pais` | Config por país |
| `sys_dian_conceptos` | Conceptos DIAN |
| `gen_municipios` | Catálogo municipios |
| `gen_tipos_documento` | Tipos de documento |
| `gen_regimen_fiscal` | Regímenes fiscales |

### 1.2 Base de Datos por Tenant: `sas_tenant_{id}`
Cada empresa tiene su propia BD con **284 tablas operativas**.

```
sas_tenant_1  → Empresa "PalmasCaribe"
sas_tenant_2  → Empresa "AgroMex"
sas_tenant_3  → Empresa "FincaVerde"
```

**Tablas en cada tenant DB (284):**
- `fincas`, `nucleos`, `lotes` - Geografía
- `insumos`, `movimientos_inventario` - Inventario
- `rrhh_empleados`, `rrhh_planillas_*` - Nómina
- `contab_*`, `plan_contable` - Contabilidad
- `documentos_comerciales`, `cartera_*` - Comercial
- `siembras`, `cosechas`, `labores_diarias` - Agronomía
- `ordenes_compra`, `solicitudes_pedido` - Compras
- Y 270 tablas más...

### 1.3 Esquema de la tabla `tenants` (modificada)
```sql
ALTER TABLE tenants ADD COLUMN db_name VARCHAR(64) NOT NULL AFTER id_tenant;
ALTER TABLE tenants ADD UNIQUE KEY uq_tenants_db_name (db_name);
```

Ejemplo:
| id_tenant | db_name | razon_social |
|-----------|---------|--------------|
| 1 | sas_tenant_1 | Palmas del Caribe S.A.S. |
| 2 | sas_tenant_2 | AgroMex S.A. |
| 3 | sas_tenant_3 | FincaVerde Ltda. |

---

## 2. Backend: Pool Manager Multi-Tenant

### 2.1 Nuevo archivo: `server/db-tenant.js`
```javascript
import mysql from 'mysql2/promise';

const pools = new Map(); // cache de pools por tenant

export async function getTenantPool(dbName) {
  if (pools.has(dbName)) return pools.get(dbName);
  
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: '12345',
    database: dbName,
    connectionLimit: 10,
  });
  
  pools.set(dbName, pool);
  return pool;
}

export async function createTenantDatabase(dbName, schemaSql) {
  // 1. Crear BD
  await mainPool.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  // 2. Ejecutar schema
  await mainPool.query(`USE \`${dbName}\``);
  await mainPool.query(schemaSql);
  // 3. Crear pool y cachear
  return getTenantPool(dbName);
}

export function invalidatePool(dbName) {
  const pool = pools.get(dbName);
  if (pool) {
    pool.end();
    pools.delete(dbName);
  }
}
```

### 2.2 Modificar: `server/db.js`
Agregar pool principal (ya existente) para operaciones globales.

### 2.3 Modificar: `server/utils/auth.js`
```javascript
// En authMiddleware:
req.tenantPool = await getTenantPool(req.user.db_name);
next();
```

### 2.4 Modificar: `server/routes/crud.js`
```javascript
// En buildTenantFilter y queries:
const db = req.tenantPool || pool;
const [rows] = await db.query(sql, params);
```

---

## 3. Backend: Creación de Tenant

### 3.1 Script de schema: `server/templates/tenant-schema.sql`
Archivo SQL con las 284 tablas que se copian al crear una nueva empresa.

### 3.2 Proceso de creación:
```
1. Recibir datos del tenant (razon_social, nit, etc.)
2. Generar db_name: sas_tenant_{next_id}
3. Crear BD con schema del template
4. Insertar registro en tenants (con db_name)
5. Crear usuario admin en la BD del tenant
6. Retornar token de autenticación
```

### 3.3 Endpoints:

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/auth/register-tenant` | Público | Auto-registro |
| `GET` | `/api/sistemas/tenants` | Super_Admin | Listar tenants |
| `GET` | `/api/sistemas/tenant/:id` | Super_Admin | Detalle tenant |
| `POST` | `/api/sistemas/tenant` | Super_Admin | Crear tenant |
| `PUT` | `/api/sistemas/tenant/:id` | Super_Admin | Editar tenant |
| `PUT` | `/api/sistemas/tenant/:id/estado` | Super_Admin | Activar/Desactivar |
| `GET` | `/api/sistemas/stats` | Super_Admin | Estadísticas |

---

## 4. Frontend

### 4.1 Componentes a crear

| Archivo | Descripción |
|---------|-------------|
| `src/components/Sistemas/TenantManager.jsx` | Lista de tenants |
| `src/components/Sistemas/TenantForm.jsx` | Formulario crear/editar |
| `src/components/Sistemas/TenantDetail.jsx` | Detalle con stats |
| `src/components/Sistemas/GlobalStats.jsx` | Dashboard global |
| `src/components/RegisterPage.jsx` | Auto-registro público |

### 4.2 LoginPage.jsx
- Agregar enlace "Crear mi empresa" → RegisterPage

### 4.3 Sidebar.jsx
- Módulo "Sistemas SAS" visible solo para `Super_Admin` (del sistema global)

---

## 5. Flujo Auto-Registro

```
1. LoginPage → "Crear mi empresa"
2. RegisterPage → formulario:
   - Empresa: Razón Social, NIT, País, Moneda
   - Admin: Username, Email, Password
3. Backend:
   a. Crear BD: sas_tenant_{id}
   b. Ejecutar schema (284 tablas)
   c. Insertar en tenants (plan Free, estado Pendiente)
   d. Insertar usuario admin en BD del tenant
4. Redirige a login: "Empresa creada, espere activación"
5. Super_Admin activa → usuario puede loguearse
```

---

## 6. Flujo Login (multi-tenant)

```
1. Usuario ingresa credentials
2. Backend busca en sas_agricolas.usuarios → obtiene db_name
3. Conecta a sas_tenant_{id} → obtiene datos del usuario
4. Genera JWT con: id_usuario, id_tenant, db_name, rol
5. Frontend envía token en Authorization header
6. Backend extrae db_name del JWT → usa pool correcto
7. Todas las queries van a la BD del tenant correcto
```

---

## 7. Flujo Administración (Super_Admin)

```
1. Super_Admin del sistema se loguea
2. Ve módulo "Sistemas SAS"
3. Puede:
   - Ver todos los tenants con su estado
   - Crear tenant manualmente
   - Activar/Desactivar
   - Ver stats globales
   - Resetear passwords
   - Ver estructura de cada tenant
```

---

## 8. Estadísticas Globales

```json
{
  "totalTenants": 15,
  "tenantsActivos": 12,
  "tenantsPendientes": 3,
  "totalUsuarios": 150,
  "distribucionPlanes": {
    "Free": 5,
    "Basic": 4,
    "Professional": 3,
    "Enterprise": 3
  }
}
```

---

## 9. Archivos a Modificar/Crear

### Backend (nuevos)
| Archivo | Descripción |
|---------|-------------|
| `server/db-tenant.js` | Pool manager multi-tenant |
| `server/routes/sistemas.js` | Endpoints de administración |
| `server/templates/tenant-schema.sql` | Schema template (284 tablas) |

### Backend (modificar)
| Archivo | Cambio |
|---------|--------|
| `server/db.js` | Exportar pool principal |
| `server/utils/auth.js` | Agregar db_name al JWT, attach tenantPool |
| `server/routes/auth.js` | Endpoint register-tenant |
| `server/routes/crud.js` | Usar req.tenantPool |
| `server/index.js` | Registrar sistemasRouter |

### Frontend (nuevos)
| Archivo | Descripción |
|---------|-------------|
| `src/components/Sistemas/TenantManager.jsx` | Gestión de tenants |
| `src/components/Sistemas/TenantForm.jsx` | Formulario |
| `src/components/Sistemas/TenantDetail.jsx` | Detalle |
| `src/components/Sistemas/GlobalStats.jsx` | Stats |
| `src/components/RegisterPage.jsx` | Auto-registro |

### Frontend (modificar)
| Archivo | Cambio |
|---------|--------|
| `src/components/LoginPage.jsx` | Enlace "Crear empresa" |
| `src/components/Sidebar.jsx` | Módulo Sistemas SAS |
| `src/utils/api.js` | Funciones de API |
| `src/App.jsx` | Rutas y componentes |

---

## 10. Orden de Ejecución

1. Modificar `tenants` → agregar columna `db_name`
2. Crear `server/db-tenant.js` → pool manager
3. Crear `server/templates/tenant-schema.sql` → schema template
4. Crear `server/routes/sistemas.js` → endpoints admin
5. Actualizar `server/routes/auth.js` → register-tenant
6. Actualizar `server/utils/auth.js` → JWT con db_name
7. Actualizar `server/routes/crud.js` → usar tenantPool
8. Actualizar `server/index.js` → registrar rutas
9. Crear componentes frontend (Sistemas/)
10. Crear RegisterPage.jsx
11. Actualizar LoginPage.jsx
12. Actualizar api.js
13. Actualizar Sidebar.jsx
14. Actualizar App.jsx
15. Probar: crear tenant → verificar BD creada → login → datos aislados

---

## 11. Verificación

Al crear un tenant nuevo debe:
1. ✅ Crearse BD `sas_tenant_{id}` con 284 tablas
2. ✅ Insertarse registro en `tenants` con `db_name`
3. ✅ Crearse usuario admin en la BD del tenant
4. ✅ Al loguearse, solo ve datos de SU tenant
5. ✅ No puede ver datos de otros tenants
6. ✅ Super_Admin ve todos los tenants en Sistemas SAS
