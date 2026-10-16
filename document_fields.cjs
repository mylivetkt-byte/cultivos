const fs = require('fs');
let content = fs.readFileSync('c:/sas-app/src/components/Agriculture/SuperCultivosCatalogo.jsx', 'utf8');

const fieldsToLabel = {
  // Plagas
  'nombre_plaga': ['Nombre de la Plaga', 'Nombre común o científico de la plaga'],
  'etapa_ataque': ['Etapa de Ataque', 'Fase del cultivo donde ataca (ej. Floración)'],
  'umbral_dano': ['Umbral de Daño', 'Punto en el que se debe aplicar control (ej. 5%)'],
  
  // Enfermedades
  'nombre_enfermedad': ['Nombre de la Enf.', 'Nombre de la enfermedad'],
  'sintomas': ['Síntomas', 'Cómo identificarla visualmente'],
  'nivel_riesgo': ['Riesgo', 'Nivel de severidad para el cultivo'],
  
  // Abonos
  'fase_aplicacion': ['Fase de Aplicación', 'Momento en que se debe abonar (ej. Siembra)'],
  'dosis_npk': ['Fórmula N-P-K', 'Proporción de Nitrógeno, Fósforo y Potasio (ej. 15-15-15)'],
  'cantidad_por_planta_gr': ['Gramos / Planta', 'Cantidad en gramos a aplicar por cada planta'],
  
  // Fumigaciones
  'ingrediente_activo': ['Ingrediente Activo', 'Componente químico del producto (ej. Mancozeb)'],
  'dosis_cc_litro': ['Dosis (cc/L)', 'Centímetros cúbicos por litro de agua'],
  
  // Semillas
  'nombre_variedad': ['Variedad', 'Nombre específico de la semilla o clon'],
  'proveedor': ['Proveedor', 'Empresa o lugar recomendado para comprarla'],
  'tolerancia': ['Tolerancia', 'A qué es resistente (ej. Sequía, Plagas)'],
  
  // Riegos
  'etapa_fenologica': ['Etapa Fenológica', 'Fase de crecimiento de la planta'],
  'requerimiento_hidrico_mm': ['Agua (mm)', 'Milímetros de agua requeridos. 1 mm = 1 Litro por metro cuadrado.'],
  'frecuencia_dias': ['Frecuencia (Días)', 'Cada cuántos días se debe aplicar la acción'],
  'metodo_recomendado': ['Método Recomendado', 'Forma de aplicar el riego (ej. Goteo, Aspersión)'],
  
  // Siembra
  'sistema_siembra': ['Sistema', 'Patrón geométrico (ej. Tresbolillo, Cuadrado)'],
  'distancia_surcos_m': ['Dist. Surcos (m)', 'Metros de separación entre líneas o surcos'],
  'distancia_plantas_m': ['Dist. Plantas (m)', 'Metros de separación entre plantas de la misma línea'],
  'plantas_por_ha': ['Plantas / Ha', 'Cantidad total de plantas que caben en 1 Hectárea (10,000 m2)'],
  'instrucciones_especiales': ['Instrucciones', 'Recomendaciones para el hoyo o el terreno']
};

for (const [fieldName, [label, tooltip]] of Object.entries(fieldsToLabel)) {
  const regex = new RegExp(`(name=\\{\\[name, '${fieldName}'\\]\\})`, 'g');
  const replacement = `$1 label={<span>${label}&nbsp;<Tooltip title="${tooltip}"><QuestionCircleOutlined style={{color:'#177ddc'}}/></Tooltip></span>}`;
  content = content.replace(regex, replacement);
}

fs.writeFileSync('c:/sas-app/src/components/Agriculture/SuperCultivosCatalogo.jsx', content);
console.log('Fields documented successfully');
