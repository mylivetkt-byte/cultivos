# SAS Agrícolas - Sistema de Gestión Agropecuaria

Plataforma integral para la gestión de operaciones agrícolas, incluyendo planificación de cultivos, seguimiento de labores, monitoreo de rendimientos, integración con IA y funcionalidad offline para entornos rurales con conectividad limitada.

---

## Índice### ?? Características Principales (Sprints Completados)
- **Modo Offline First** (Service Worker + IndexedDB)
- **Sincronización Automática** (Cola local + resolución de conflictos)
- **Datos Limpios + KPIs de Impacto** (Costos/kg/ha/lote, Merma %, FCR)
- **IA Práctica** (ChatBot con OmniRoute+Claude, alertas climáticas)
- **Arquitectura Modular** (Feature folders organizados por dominio)
- **Preparación para Partners** (Export-ready, campos exportable)

---

## ?? Primeros Pasos (Entorno Local)
### 1. Clona el repositorio`ash
git clone https://github.com/tu-usuario/sas-agricolas.git
cd sas-agricolas
cp .env.example .env
`

### 2. Instala dependencias
`ash
npm install
`

### 3. Configura tu base de datos MySQL
Asegúrate de tener MySQL corriendo localmente:`ash
mysql -u root -p
CREATE DATABASE sas_agricolas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
`

### 4. Aplica migraciones de base de datos
`ash
npm run db:migrate
`

### 5. Inicia el servidor de desarrollo
`ash
npm run dev
`
- **API**: http://localhost:3002
- **Frontend React**: http://localhost:5173

---

## ?? Scripts y Comandos### Scripts de desarrollo
| Comando | Descripción |
|---------|-------------|
| 
pm run dev | Inicia servidor y cliente concurrentemente |
| 
pm run dev:server | Inicia solo el servidor Express |
| 
pm run dev:client | Inicia el servidor de desarrollo Vite |
| 
pm run build | Compila la aplicación para producción |
| 
pm run db:migrate | Ejecuta migraciones pendientes de la base de datos |
| 
pm run db:reset | Restablece la base de datos (?? Destructivo) |
| 
pm run lint | Verifica problemas en el código según ESLint |

---

## ?? Pruebas### Pruebas Unitarias (Jest)
`ash
npm test
npm run coverage # Para ver reporte de cobertura
`

### Pruebas End-to-End (k6)
Antes de desplegar, ejecuta las pruebas de carga para validar rendimiento:

`ash
cd scripts
k6 run load-test.k6.js --vus 100 --duration 30s
`

Resultado esperado:
- **Latencia (p95)** < **500ms**
- **Tasa de errores** < **1%**

---

## ?? Endpoints API Clave### Autenticación
- POST /api/auth/login - Iniciar sesión
- GET /api/auth/verify - Verificar token

### Producción y Análisis
- GET /api/kpis/produccion/:fincaId - Obtener KPIs de producción
- POST /api/kpis/costos-unitarios - Registrar costos unitarios (kg/ha/lote)
- POST /api/kpis/merma - Registrar métricas de merma
- POST /api/kpis/conversion-alimenticia - Registrar FCR (Feed Conversion Ratio)
- GET /api/kpis/exportar/:fincaId - Exportar reporte completo (CSV/PDF)

### Sincronización Offline
- GET /api/sync/pull - Descargar cambios desde el servidor
- POST /api/sync/push - Enviar operaciones realizadas offline

### IA y Notificaciones
- POST /api/ai-diagnosis/query - Consulta al asistente de IA
- GET /api/ai-diagnosis/dashboard/:fincaId - Widgets IA para dashboard

---

## ?? Despliegue### Entornos Disponibles
| Entorno | API Endpoint | Base de Datos |
|---------|--------------|---------------|
| Staging | https://api-staging.sas-agricolas.com | RDS MySQL (Staging) |
| Producción | https://api.sas-agricolas.com | RDS MySQL (Producción) |

### Despliegue Manual (Solo si CI/CD falla)
1. **Build Docker**:
   `ash
   docker build -t mi-usuario/sas-agricolas:latest .
   docker push mi-usuario/sas-agricolas:latest
   `
2. **Actualizar Task Definition**:
   `ash
   aws ecs register-task-definition --cli-input-json file://ecs/taskdef.json --region us-east-1
   `
3. **Forzar nuevo despliegue**:
   `ash
   aws ecs update-service --cluster mi-cluster --service sas-agricolas-service-prod --force-new-deployment --region us-east-1
   `

### Rollback de Emergencia (Script Automatizado)
`ash
./scripts/rollback.sh
`
El script:
1. Busca el **último snapshot automático** de la base de datos.
2. Restaura una nueva instancia a partir de ese snapshot.
3. Actualiza el servicio ECS para apuntar a la nueva instancia DB.

---

## ?? Seguridad### Variables Sensibles
- **NO versionar** archivos .env.staging y .env.prod.
- Usa **GitHub Secrets** para almacenar credenciales en pipelines.
- Mantén las claves de JWT, AWS, OmniRoute y OpenWeather actualizadas.

### Recomendaciones de Seguridad para Producción
- Cambiar JWT_SECRET a una cadena larga y aleatoria.
- Limitar acceso a Secrets Manager mediante roles de IAM.
- Validar y sanitizar todos los inputs en los endpoints.
- Habilitar HTTPS/TLS en todas las comunicaciones externas.

---

## ?? Exportación de Datos para Partners### Endpoints Disponibles
- GET /api/export/historico?tables[]=fincas,lotes,costos_unitarios&formato=csv - Exportar histórico
- API Documentada en OpenAPI Specification (adjunta en docs/export.schema.json)

### Formato de Exportación
Los datos pueden exportarse en:
- **CSV**: Compatible con Excel, Power BI, etc.
- **JSON**: Ideal para consumo programático

---

## ?? Soporte y Colaboradores
- **Documentación Oficial**: [docs.sas-agricolas.com](https://docs.sas-agricolas.com)
- **Canal de Emergencias (Slack)**: #sas-agricolas-dev
- **Reporte de Bugs**: Abrir un [issue](https://github.com/tu-usuario/sas-agricolas/issues) en GitHub.

---

# ?? Contacto
¿Listo para lanzar a producción? ¡Ejecuta el pipeline en GitHub Actions y notifica al equipo cuando esté todo verde!

> Última actualización: 2024
