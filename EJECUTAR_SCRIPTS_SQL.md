# ⚡ INSTRUCCIONES PARA EJECUTAR LOS SCRIPTS SQL

## 🚀 OPCIÓN 1: Ejecutar Script Node.js (RECOMENDADO)

Abre una terminal en `c:\sas-app` y ejecuta:

```bash
node execute_all_scripts.js
```

Este script:
- ✅ Lee credenciales del .env
- ✅ Ejecuta 6 scripts SQL en orden
- ✅ Muestra progreso en tiempo real
- ✅ Maneja errores automáticamente
- ✅ Retorna resumen final

**Tiempo esperado:** ~1 minuto

---

## 🚀 OPCIÓN 2: Ejecutar Manualmente en MySQL Workbench

### Paso 1: Abrir MySQL Workbench
```
Inicio → MySQL Workbench
```

### Paso 2: Conectarse a la BD
```
Host: 127.0.0.1
Port: 3307
User: root
Password: 12345
Database: sas_agricolas
```

### Paso 3: Copiar y pegar cada script en orden

**Script 1:** Copiar contenido de:
```
migrations/produccion/01_ALTER_existentes.sql
```
→ Pegar en Workbench → Ejecutar (Ctrl+Enter)

**Script 2:** Copiar contenido de:
```
migrations/produccion/02_CREATE_inv_lotes_existencia.sql
```
→ Pegar en Workbench → Ejecutar

**Script 3:** Copiar contenido de:
```
migrations/produccion/03_CREATE_produccion.sql
```
→ Pegar en Workbench → Ejecutar

**Script 3b:** Copiar contenido de:
```
migrations/produccion/03b_CREATE_produccion_lotes.sql
```
→ Pegar en Workbench → Ejecutar

**Script 3c:** Copiar contenido de:
```
migrations/produccion/03c_CREATE_produccion_costos_cuentas_precios.sql
```
→ Pegar en Workbench → Ejecutar

**Script 3d:** Copiar contenido de:
```
migrations/produccion/03d_CREATE_produccion_precios_mercado.sql
```
→ Pegar en Workbench → Ejecutar

**Resultado esperado:**
```
✅ 10 tablas creadas
✅ 7+ índices creados
✅ Sin errores
```

---

## 🚀 OPCIÓN 3: Usar línea de comando (CMD/PowerShell)

Abre CMD o PowerShell en `c:\sas-app`:

```powershell
# Script 1
mysql -h 127.0.0.1 -P 3307 -u root -p12345 sas_agricolas < migrations/produccion/01_ALTER_existentes.sql

# Script 2
mysql -h 127.0.0.1 -P 3307 -u root -p12345 sas_agricolas < migrations/produccion/02_CREATE_inv_lotes_existencia.sql

# Script 3
mysql -h 127.0.0.1 -P 3307 -u root -p12345 sas_agricolas < migrations/produccion/03_CREATE_produccion.sql

# Script 3b
mysql -h 127.0.0.1 -P 3307 -u root -p12345 sas_agricolas < migrations/produccion/03b_CREATE_produccion_lotes.sql

# Script 3c
mysql -h 127.0.0.1 -P 3307 -u root -p12345 sas_agricolas < migrations/produccion/03c_CREATE_produccion_costos_cuentas_precios.sql

# Script 3d (PRINCIPAL)
mysql -h 127.0.0.1 -P 3307 -u root -p12345 sas_agricolas < migrations/produccion/03d_CREATE_produccion_precios_mercado.sql
```

---

## ✅ VERIFICAR QUE TODO FUNCIONÓ

Ejecuta esta consulta en MySQL Workbench:

```sql
-- Verificar tablas creadas
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'sas_agricolas' 
AND TABLE_NAME LIKE 'prod_%'
ORDER BY TABLE_NAME;
```

**Resultado esperado:**
```
✅ prod_analisis_rentabilidad
✅ prod_config_tenant
✅ prod_consultas_historico
✅ prod_cuentas
✅ prod_lotes
✅ prod_orden_materiales
✅ prod_orden_mano_obra
✅ prod_ordenes
✅ prod_precios_mercado
✅ prod_receta_componentes
✅ prod_recetas
```

---

## 📋 DESPUÉS DE EJECUTAR LOS SCRIPTS

### 1️⃣ Instalar Dependencias
```bash
npm install @tanstack/react-table uuid
```

### 2️⃣ Crear Datos de Prueba (Opcional)
```bash
node scripts/seed_produccion.cjs
```

### 3️⃣ Iniciar Servidor
```bash
npm run dev:server
```

### 4️⃣ Acceder al Dashboard
```
Browser: http://localhost:3002/produccion/historico
```

---

## 🆘 SI ALGO FALLA

### Error: "Access denied for user 'root'@'127.0.0.1'"
- Verifica credenciales en `.env`
- Asegúrate de que MySQL está corriendo
- Puerto debe ser 3307 (no 3306)

### Error: "Database 'sas_agricolas' doesn't exist"
- Crea la BD: `CREATE DATABASE sas_agricolas;`
- O asegúrate de que está creada: `SHOW DATABASES;`

### Error: "Table 'prod_recetas' already exists"
- Los scripts ya se ejecutaron
- Si necesitas resetear:
  ```sql
  DROP TABLE prod_precios_mercado;
  DROP TABLE prod_analisis_rentabilidad;
  DROP TABLE prod_consultas_historico;
  DROP TABLE prod_config_tenant;
  -- ... (drop todas las tablas prod_)
  ```
- Luego re-ejecuta los scripts

---

## ✨ RESUMEN

| Opción | Tiempo | Dificultad | Recomendado |
|--------|--------|-----------|------------|
| Script Node.js | 1 min | Muy fácil | ✅ SÍ |
| MySQL Workbench | 5 min | Fácil | ✅ SÍ |
| Línea de comando | 2 min | Media | ✅ SÍ |

**Elige la Opción 1 (Node.js)** es la más fácil y rápida.

---

## 📞 PRÓXIMO PASO

Una vez ejecutes los scripts:

1. ✅ Scripts SQL ejecutados
2. ➡️ `npm install @tanstack/react-table uuid`
3. ➡️ `node scripts/seed_produccion.cjs`
4. ➡️ `npm run dev:server`
5. ➡️ `http://localhost:3002/produccion/historico`

¡**~5 minutos total para estar operativo!**
