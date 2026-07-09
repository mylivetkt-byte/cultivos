# Plan Maestro Unificado: Sistema Integral de Preparación y Aplicación de Insumos (Químicos y Orgánicos)

Tienes toda la razón. Tanto los químicos (venenos, fertilizantes sintéticos) como los abonos orgánicos (violes, compost) tienen un mismo fin: **Ser aplicados a los cultivos**. Este plan unifica ambos mundos en un solo motor de trazabilidad, costeo y notificaciones, sin dejar ningún proceso por fuera.

## 1. El Flujo Unificado (De la Receta al Cultivo)

El agrónomo o técnico emite una receta médica (Fitosanitaria o de Fertilización) para un lote. Esta receta puede contener químicos, orgánicos, o una mezcla de ambos. El sistema activa un **motor inteligente de abastecimiento**:

### Paso A: Notificación de la Receta (Vía WhatsApp)
Se notifica a **Gerencia** y al **Encargado de Zona**: 
*"⚠️ ALERTA: Receta emitida para Lote 5. Revise el sistema para preparación."*

### Paso B: Auditoría de Inventarios y Bifurcación Inteligente
El sistema lee los ingredientes de la receta y separa el trabajo:

- **Ruta 1: Insumos Químicos y Venenos (Bodega Central)**
  - Revisa el stock en `inv_existencias`.
  - *Si hay stock*: WhatsApp al bodeguero para que prepare el despacho.
  - *Si falta stock*: **Crea una solicitud de pedido automática** (`solicitudes_pedido`) y envía WhatsApp al Jefe de Compras.

- **Ruta 2: Insumos Orgánicos y Violes (Bio-Fábrica)**
  - Revisa el stock en los tanques de la Bio-Fábrica.
  - *Si hay stock*: WhatsApp al Jefe de Violes para que bombee el producto.
  - *Si falta stock*: **Crea una Orden de Producción Interna** y envía WhatsApp al Jefe de Violes: *"♻️ Urgente: Producir 500L de Biol Ancestral"*.

### Paso C: La Aplicación Final (Donde convergen ambas rutas)
Una vez que el Químico se mezcló o el Biol se produjo, el tractorista o piloto del drone reporta la aplicación en campo a través del **Diario de Aplicación**. Aquí el sistema descuenta el producto preparado del inventario y lo carga al cultivo.

---

## 2. El Motor Unificado de Costos (Contabilidad 360°)

El sistema inyectará a la contabilidad (`contab_comprobantes` y `costos_produccion`) el valor exacto de la aplicación:

1. **Costo de la Sustancia Aplicada**:
   - *Si es Veneno/Químico*: Precio de compra en factura (promediado).
   - *Si es Biol/Orgánico*: (Costo de materia prima comprada + Jornales de recolección de estiércol/hojarasca + Tiempo de preparación del Jefe de Violes).
2. **Costo de la Operación en Campo**:
   - Costo por hora del Tractor / Drone (Combustible y depreciación).
   - Costo del Jornal del operario que aplicó el producto.

> **Costo Final Inyectado al Lote** = Costo de la Sustancia + Costo de la Operación.

---

## 3. Modificaciones a la Base de Datos (Estructura Exacta)

1. **`app_recetas` e `insumos`**: 
   - `tipo_receta`: Químico, Orgánico, Mixto.
   - `origen_insumo`: Compra Externa, Producción Interna, Recolectado.
2. **Tablas de Preparación**:
   - `app_preparaciones_mezcla` (Para diluir venenos y agroquímicos antes de aplicar).
   - `app_produccion_organica` (Para registrar la creación diaria de Violes desde cero).
3. **`registro_aplicaciones`**:
   - `ALTER TABLE` para recibir la sustancia final (ya sea la mezcla química o el biol), enlazando al lote, empleado y maquinaria.

---

## 4. Integración en el Menú Principal (Frontend)

Todo vivirá armoniosamente bajo `Agricultura y Cultivos`:

📂 **Agricultura y Cultivos** 
 ┣ 📈 Tablero Avanzado (Gerencial)
 ┣ 🌱 Gestión de Cultivos
 ┣ 🚜 Tareas y Movimientos
 ┣ 🔬 Sanidad Vegetal
 ┗ 💧 **Formulación y Aplicaciones** *(¡EL GRAN MÓDULO UNIFICADO!)*
    ┣ 🧪 **Recetario General** (Agrónomo crea recetas químicas, orgánicas o ancestrales).
    ┣ 🏭 **Bio-Fábrica (Abonos y Violes)** (El jefe de violes registra su producción diaria valorizada).
    ┣ ⚗️ **Centro de Mezclas (Químicos)** (El bodeguero despacha y mezcla los venenos).
    ┣ 🚜 **Registro Diario de Aplicación** (El operario reporta el rociado en el Lote).
    ┗ 📊 **Tablero de Control y Costos** (Auditoría de inventarios, mapas GIS y costos por hectárea).
