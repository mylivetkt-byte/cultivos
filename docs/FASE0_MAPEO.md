# Diagnóstico del Esquema Existente - FASE 0

| Entidad Lógica | Tabla Existente Detectada | Acción a Tomar (Migración) |
| --- | --- | --- |
| **Drones (Equipos/Activos)** | `maquinaria` | Los drones se registrarán en esta tabla. Añadir: `ADD COLUMN categoria VARCHAR(30) DEFAULT 'MAQUINARIA'`. Se utilizará `categoria = 'DRON'` para identificarlos. |
| **Extensión 1:1 Drones** | N/A | **NUEVA TABLA**: `equipos_dron` vinculada con `equipo_id FK` a `maquinaria(id_maquinaria)`. |
| **Tenencia/Propiedad** | `maquinaria` | Añadir: `ADD COLUMN tenencia VARCHAR(20) DEFAULT 'PROPIO'`. |
| **Alquileres** | `taller_alquileres` | Reutilizar. Añadir: `ADD COLUMN costo_por_ha DECIMAL(12,2) COP`, `ADD COLUMN incluye_piloto TINYINT(1) DEFAULT 1`. |
| **Empleados** | `rrhh_empleados` | Reutilizar. Añadir: `ADD COLUMN whatsapp_numero VARCHAR(20) NULL`. |
| **Licencias de Piloto (1:1)** | N/A | **NUEVA TABLA**: `dron_licencias_pilotos` vinculada con `empleado_id FK` a `rrhh_empleados(id_empleado)`. |
| **Usuarios** | `usuarios` | Reutilizar. Añadir: `ADD COLUMN whatsapp_numero VARCHAR(20) NULL`. (Se confirmó que la columna `rol` ya existe). |
| **Lotes** | `lotes` | Reutilizar. Se confirmó que ya existe la columna `poligono_gps GEOMETRY`. No requiere alteración. |
| **Potreros** | `ganado_potreros` | Reutilizar. Añadir: `ADD COLUMN geometria GEOMETRY SRID 4326 NULL`. |
| **Lagos** | `acuicola_lagos` | Reutilizar. Se confirmó que ya existe con `geometria GEOMETRY`. |
| **Cultivos** | `cultivo_lotes` | Adaptaremos `cultivo_historial_etapas` para referenciar a `cultivo_lotes(id)`. |
| **Ubicaciones GPS** | N/A | **NUEVA TABLA**: `registro_ubicaciones`. |
| **Inventario/Insumos** | `insumos` / `movimientos_inventario` | Reutilizar para los descuentos de las misiones. |
| **Alertas** | `alertas` | Reutilizar para notificaciones. |

> **Nota:** La revisión de las tablas indicó que se utilizará el sistema existente (como `maquinaria` y `rrhh_empleados`) con las convenciones solicitadas (solo migraciones aditivas de `ADD COLUMN`).
