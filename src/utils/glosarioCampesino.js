// src/utils/glosarioCampesino.js
/**
 * Diccionario y motor de voz para accesibilidad campesina en AgroPaccioli.
 * Traduce conceptos técnicos a explicaciones sencillas del campo
 * y provee síntesis de voz nativa del dispositivo (Web Speech API).
 */

export const GLOSARIO_CAMPESINO = {
  id_finca: {
    titulo: 'Finca o Hacienda',
    icono: '🏡',
    ayuda: '¿En cuál finca o hacienda de la empresa se hizo el trabajo?',
    ejemplo: 'Ejemplo: Palmera del Sol o Finca El Valle.',
    audio: 'Patrón, aquí debe escoger en cuál finca o hacienda de la empresa se hizo el trabajo hoy.'
  },
  id_lote: {
    titulo: 'Lote o Cuadro',
    icono: '📍',
    ayuda: '¿En qué pedazo de tierra o potrero estuvo regando o trabajando?',
    ejemplo: 'Ejemplo: Plaza PLZ-0001 o el cuadro del bajo.',
    audio: 'Aquí escoja el lote o cuadro donde anduvo regando. Si regó toda la finca y no hay un lote específico, déjelo en no aplica.'
  },
  id_semillero: {
    titulo: 'Vivero o Semillero',
    icono: '🌱',
    ayuda: 'Si el agua fue para matas chiquitas o bandejas, escoja el vivero.',
    ejemplo: 'Ejemplo: Vivero Principal Alfa o Pre-germinación.',
    audio: 'Si el agua se echó en las matas tiernas o en las bandejas del vivero, elija aquí el nombre del vivero.'
  },
  waterOption: {
    titulo: 'Clase de Agua o Destino',
    icono: '💧',
    ayuda: '¿Para qué se usó el agua? ¿Para regar cultivo, llenar tanques, o agua de pozo?',
    ejemplo: 'Ejemplo: "Riego" si fue al cultivo, o "Suministro" si fue para tanques y bebederos.',
    audio: 'Díganos qué tipo de agua utilizó. Por ejemplo riego para el cultivo, agua de lago, o suministro para llenar tanques y bebederos.'
  },
  fecha_inicio: {
    titulo: 'Día en que arrancó',
    icono: '📅',
    ayuda: 'El día en que se prendió la bomba o se empezó a echar el agua.',
    ejemplo: 'Ejemplo: Hoy o el día que se abrió la llave.',
    audio: 'Toque aquí y escoja el día en que se prendió la bomba o se empezó a regar.'
  },
  fecha_fin: {
    titulo: 'Día en que terminó',
    icono: '🏁',
    ayuda: 'El día en que se apagó el motor o se terminó el turno de riego.',
    ejemplo: 'Ejemplo: El mismo día o cuando se cerraron las compuertas.',
    audio: 'Aquí ponga el día en que se apagó el motor o se terminó de regar ese lote.'
  },
  nivel: {
    titulo: 'Nivel del agua',
    icono: '📏',
    ayuda: '¿Qué tan hondo o qué tan lleno está el pozo o lago?',
    ejemplo: 'Ejemplo: 85 metros o por la marca del poste.',
    audio: 'Escriba qué tan alto está el nivel del agua en el lago o reservorio.'
  },
  capacidad: {
    titulo: 'Capacidad o Tamaño',
    icono: '🛢️',
    ayuda: '¿Cuánta agua le cabe a ese reservorio o tanque?',
    ejemplo: 'Ejemplo: 400 metros cúbicos o medio pozo.',
    audio: 'Escriba cuánta agua le cabe a ese tanque o reservorio.'
  },
  ubicacion: {
    titulo: 'Dónde queda',
    icono: '🗺️',
    ayuda: 'Una seña o punto de referencia dentro de la finca.',
    ejemplo: 'Ejemplo: Al lado del establo o camino al río.',
    audio: 'Diga una seña de dónde queda el pozo o el lago, por ejemplo al lado del establo o cerca al río.'
  },
  observaciones: {
    titulo: 'Novedades del día',
    icono: '📝',
    ayuda: 'Cuente con sus palabras cualquier novedad: si hubo fuga, mangueras rotas o si faltó presión.',
    ejemplo: 'Ejemplo: Se rompió una llave en la entrada del callejón.',
    audio: 'Aquí puede escribir si vio alguna novedad, como una manguera rota, si el agua salió sucia o si la bomba sonó raro.'
  },
  // Términos para Riego de Precisión y Gestión Hídrica (Fase 2)
  caudal: {
    titulo: 'Chorro de agua (Caudal)',
    icono: '🌊',
    ayuda: '¿Cuánta agua bota el tubo o la motobomba?',
    ejemplo: 'Ejemplo: 10 litros por segundo o lo que marca el reloj de entrada.',
    audio: 'Este es el chorro o cantidad de agua que bota la bomba por segundo.'
  },
  presion: {
    titulo: 'Fuerza del agua (Presión)',
    icono: '⏱️',
    ayuda: 'Lo que marca el relojito (manómetro) de la tubería.',
    ejemplo: 'Ejemplo: 35 en la aguja verde o 2.5 bar.',
    audio: 'Mire el relojito de la tubería y anote qué número marca la aguja con la bomba prendida.'
  },
  codigo_turno: {
    titulo: 'Número de Turno',
    icono: '🔢',
    ayuda: 'La seña o código para identificar esta tanda de riego.',
    ejemplo: 'Ejemplo: TURNO-01 o Riego de la Mañana.',
    audio: 'Escriba cómo le dice usted a esta tanda de riego, por ejemplo Turno uno o Riego de la mañana.'
  },
  id_sector: {
    titulo: 'Sector o Bloque de Riego',
    icono: '🚰',
    ayuda: '¿A cuál bloque o válvula de la finca le va a mandar el agua?',
    ejemplo: 'Ejemplo: Sector Palma Alta o Bloque 4.',
    audio: 'Escoja aquí el bloque o sector donde van a abrir las llaves para que llegue el agua.'
  },
  responsable_nombre: {
    titulo: '¿Quién operó el riego?',
    icono: '👨‍🌾',
    ayuda: 'Nombre de la persona que prendió la bomba o abrió las llaves en campo.',
    ejemplo: 'Ejemplo: Don Pedro o Juan Pérez.',
    audio: 'Ponga aquí el nombre de la persona que se encargó de prender el motor o abrir las llaves en campo.'
  },
  hora_inicio_programada: {
    titulo: 'Hora en que arrancó el riego',
    icono: '⏰',
    ayuda: 'La hora en que se abrió la llave o se prendió el motor.',
    ejemplo: 'Ejemplo: 06:00 de la mañana.',
    audio: 'Ponga a qué hora de la mañana o de la tarde se arrancó a regar.'
  },
  hora_fin_programada: {
    titulo: 'Hora en que se cerró la llave',
    icono: '🛑',
    ayuda: 'La hora en que se apagó el motor o se terminó la tanda.',
    ejemplo: 'Ejemplo: 08:30 am.',
    audio: 'Ponga la hora en que se terminó de regar y se apagó el equipo.'
  },
  duracion_minutos_estimada: {
    titulo: 'Tiempo total regando (Minutos)',
    icono: '⏳',
    ayuda: '¿Cuántos minutos duró abierto el riego en ese cuadro?',
    ejemplo: 'Ejemplo: 120 minutos (2 horas) o 60 minutos.',
    audio: 'Escriba cuántos minutos duró el agua corriendo en ese pedazo de tierra.'
  },
  volumen_objetivo_m3: {
    titulo: 'Cantidad de agua total (Metros cúbicos)',
    icono: '💧',
    ayuda: '¿Cuánta agua en total le va a meter a ese cultivo?',
    ejemplo: 'Ejemplo: 50 metros cúbicos o lo que calculó el técnico.',
    audio: 'Anote cuántos metros cúbicos o tanques de agua le va a meter a ese sector.'
  },
  codigo_bomba: {
    titulo: 'Identificación de la Bomba',
    icono: '⚙️',
    ayuda: 'El nombre, número o placa de la motobomba o electrobomba.',
    ejemplo: 'Ejemplo: BOMBA-01 o Bomba Pozo Norte.',
    audio: 'Escriba el nombre o número de la motobomba o equipo que está usando.'
  },
  tipo_bomba: {
    titulo: 'Clase de Bomba',
    icono: '🔄',
    ayuda: '¿Es bomba sumergida dentro del pozo, o motobomba en tierra?',
    ejemplo: 'Ejemplo: Sumergible de pozo profundo o centrífuga en tierra.',
    audio: 'Indique si es una bomba que está metida en el fondo del pozo o si está arriba en la caseta de bombeo.'
  },
  potencia_hp: {
    titulo: 'Fuerza del motor (Caballos HP)',
    icono: '🐎',
    ayuda: '¿De cuántos caballos de fuerza es el motor de la bomba?',
    ejemplo: 'Ejemplo: 15 HP, 20 HP o lo que dice la placa del motor.',
    audio: 'Mire la placa del motor y escriba cuántos caballos de fuerza tiene.'
  },
  codigo_valvula: {
    titulo: 'Código de la Válvula o Llave',
    icono: '🚰',
    ayuda: 'La llave de paso o solenoide que abre el agua a ese cuadro.',
    ejemplo: 'Ejemplo: VALV-01 o Llave del Callejón 3.',
    audio: 'Ponga el número o nombre de la llave que abre el paso de agua a ese lote.'
  },
  diametro_pulgadas: {
    titulo: 'Grosor del tubo (Pulgadas)',
    icono: '📏',
    ayuda: '¿De cuántas pulgadas es el tubo donde va la llave?',
    ejemplo: 'Ejemplo: 2 pulgadas, 3 pulgadas o 4 pulgadas.',
    audio: 'Indique el grosor del tubo, por ejemplo dos pulgadas o tres pulgadas.'
  },
  metodo_riego: {
    titulo: 'Forma de regar el cultivo',
    icono: '🌱',
    ayuda: '¿Se riega por manguera de goteo, aspersores o por gravedad?',
    ejemplo: 'Ejemplo: Goteo con cinta negra o microaspersión.',
    audio: 'Seleccione cómo se le echa el agua a las matas, si es por manguera de goteo, por aspersores o por surcos.'
  },
  fertilizante_abono: {
    titulo: 'Abono en el agua (Fertirriego)',
    icono: '🧪',
    ayuda: 'El abono o sal disuelta que se le inyecta al agua de riego.',
    ejemplo: 'Ejemplo: Urea disuelta, Nitrato de Calcio o Sulfato.',
    audio: 'Aquí indique qué abono o fertilizante va a disolver en el tanque para mandárselo a la raíz.'
  },
  codigo_sector: {
    titulo: 'Código del Sector',
    icono: '🏷️',
    ayuda: 'La seña o número con el que se identifica este cuadro o bloque de riego.',
    ejemplo: 'Ejemplo: SEC-01 o VÁLVULA-02.',
    audio: 'Escriba cómo identifican este sector de riego, por ejemplo SEC 01 o Bloque Norte.'
  },
  nombre: {
    titulo: 'Nombre Descriptivo',
    icono: '📛',
    ayuda: 'Un nombre claro para que cualquier trabajador sepa de cuál equipo o cuadro se trata.',
    ejemplo: 'Ejemplo: Bomba Pozo Secundario o Sector Vivero Goteo.',
    audio: 'Escriba un nombre claro para que todos sepan de qué equipo o cuadro de tierra estamos hablando.'
  },
  area_sector_ha: {
    titulo: 'Tamaño del Sector (Hectáreas)',
    icono: '📐',
    ayuda: '¿De cuántas hectáreas o plazas es este cuadro de tierra regado?',
    ejemplo: 'Ejemplo: 1.25 hectáreas (unas dos cuadras).',
    audio: 'Anote el tamaño del sector en hectáreas. Una hectárea son diez mil metros cuadrados.'
  },
  espaciamiento_emisores_m: {
    titulo: 'Distancia entre Goteros (Metros)',
    icono: '📏',
    ayuda: '¿A cuántos centímetros o metros está cada gotero en la manguera?',
    ejemplo: 'Ejemplo: 0.50 m (cada 50 centímetros).',
    audio: 'Ponga a qué distancia está un gotero del siguiente en la misma manguera.'
  },
  espaciamiento_lineas_m: {
    titulo: 'Distancia entre Mangueras (Metros)',
    icono: '🌱',
    ayuda: '¿A cuántos metros de distancia va una manguera de la otra entre los surcos?',
    ejemplo: 'Ejemplo: 1.50 metros entre surcos.',
    audio: 'Indique la distancia que hay entre una línea de manguera y la otra.'
  },
  caudal_emisor_lph: {
    titulo: 'Chorro de cada Gotero (Litros por hora)',
    icono: '💧',
    ayuda: '¿Cuántos litros de agua echa cada gotero en una hora de riego?',
    ejemplo: 'Ejemplo: 2.0 litros por hora.',
    audio: 'Escriba cuántos litros bota cada gotero en una hora de trabajo.'
  },
  caudal_nominal_lps: {
    titulo: 'Chorro de la Bomba (Litros por segundo)',
    icono: '🌊',
    ayuda: '¿Cuántos baldes o litros de agua bota la bomba por segundo?',
    ejemplo: 'Ejemplo: 20.0 litros por segundo.',
    audio: 'Escriba cuántos litros por segundo es capaz de bombear este motor.'
  },
  presion_nominal_bar: {
    titulo: 'Presión de Trabajo (Bares)',
    icono: '⏱️',
    ayuda: 'La fuerza con la que debe trabajar la tubería para no reventar mangueras.',
    ejemplo: 'Ejemplo: 3.5 a 4.5 bar (lo marcado en verde en el reloj).',
    audio: 'Ponga la presión en bares a la que debe trabajar la bomba para regar parejo sin dañar mangueras.'
  },
  tipo_actuador: {
    titulo: 'Tipo de Llave o Solenoide',
    icono: '🔌',
    ayuda: '¿Cómo se abre la llave: manual a mano, o con cable eléctrico (solenoide)?',
    ejemplo: 'Ejemplo: Solenoide 24V si abre sola con programador, o Manual de esfera.',
    audio: 'Escoja si la llave se abre a mano o si es automática con cable eléctrico y solenoide.'
  },
  nombre_receta: {
    titulo: 'Nombre del Caldo de Abono',
    icono: '🥣',
    ayuda: '¿Cómo le llaman a esta mezcla de fertilizante para el cultivo?',
    ejemplo: 'Ejemplo: Caldo para floración o Engorde de fruto.',
    audio: 'Escriba cómo le llaman a este preparado de abono disuelto.'
  },
  ce_objetivo_ms_cm: {
    titulo: 'Concentración de Sales (Conductividad CE)',
    icono: '⚡',
    ayuda: 'Qué tan cargado de abono va el agua. Si es muy alto quema la raíz, si es bajo la mata no come.',
    ejemplo: 'Ejemplo: 1.80 mS/cm.',
    audio: 'Este número indica qué tan cargada de abono está el agua para alimentar bien la raíz sin quemarla.'
  },
  ph_objetivo: {
    titulo: 'Acidez del Agua (pH)',
    icono: '🧪',
    ayuda: 'Qué tan ácida o dulce está el agua. Entre 5.5 y 6.2 la planta come bien y no se tapan los goteros.',
    ejemplo: 'Ejemplo: 5.80 (nivel ideal para que coma la raíz).',
    audio: 'El pH mide la acidez del agua para evitar que el sarro tape los goteros y para que la mata coma bien.'
  },
  tanque_a_formula: {
    titulo: 'Mezcla del Tanque A (Calcio y Nitratos)',
    icono: '🅰️',
    ayuda: 'Aquí van los abonos con Calcio y Nitratos. ¡Ojo! Nunca mezclar Calcio con Sulfatos en el mismo tanque porque se corta y forma sarro.',
    ejemplo: 'Ejemplo: Nitrato de Calcio 50 kg + Nitrato de Potasio 25 kg.',
    audio: 'En el tanque A disuelva los nitratos y el calcio. Recuerde que el calcio no se debe mezclar con sulfato en el mismo tanque porque se corta.'
  },
  tanque_b_formula: {
    titulo: 'Mezcla del Tanque B (Sulfatos, Fósforo y Menores)',
    icono: '🅱️',
    ayuda: 'Aquí van los abonos con Fósforo, Sulfatos y Micronutrientes (hierro, zinc, magnesio).',
    ejemplo: 'Ejemplo: Sulfato de Magnesio 20 kg + MAP 15 kg + Hierro.',
    audio: 'En el tanque B disuelva los abonos con sulfatos, fósforo y los minerales menores.'
  },
  lecturas_texto: {
    titulo: 'Medición de los Vasitos (Pluviómetros)',
    icono: '🥤',
    ayuda: 'Anote cuántos mililitros de agua recogió en cada vasito que puso en el suelo debajo de los goteros.',
    ejemplo: 'Ejemplo: 120, 118, 125, 112, 130, 115 (separados por coma).',
    audio: 'Mire el agua recogida en cada vasito que puso en el campo y copie aquí los números separados por coma.'
  },
  fecha_ensayo: {
    titulo: 'Día de la Prueba de Vasitos',
    icono: '📅',
    ayuda: 'El día en que fue al campo a poner los vasitos para medir si riega parejo.',
    ejemplo: 'Ejemplo: Hoy o la fecha de la prueba.',
    audio: 'Indique la fecha en que se hizo la prueba con los vasitos en el campo.'
  },
  evaluador: {
    titulo: '¿Quién hizo la prueba?',
    icono: '👷',
    ayuda: 'Nombre del operario o técnico que midió el agua de los vasitos.',
    ejemplo: 'Ejemplo: Don Carlos o Ing. Rodríguez.',
    audio: 'Escriba el nombre de la persona que puso los vasitos y midió el agua.'
  }
};

/**
 * Obtiene la ayuda campesina para un campo
 */
export function getAyudaCampesina(nombreCampo) {
  return GLOSARIO_CAMPESINO[nombreCampo] || {
    titulo: nombreCampo,
    icono: '💡',
    ayuda: 'Ingrese la información correspondiente a este campo.',
    ejemplo: '',
    audio: `Complete el campo ${nombreCampo}.`
  };
}

/**
 * Reproduce en voz alta la explicación usando Web Speech API nativa.
 * Funciona offline en Android, iPhone, Windows y Mac sin gastar datos.
 */
let vozActual = null;

export function hablarEnVozCampesina(texto) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('La síntesis de voz no está soportada en este navegador.');
    return;
  }

  try {
    // Si ya está hablando, cancelamos la anterior
    window.speechSynthesis.cancel();

    if (!texto) return;

    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = 'es-CO'; // Prioridad español de Colombia
    utterance.rate = 0.92;    // Un poco más pausado para máxima claridad
    utterance.pitch = 1.0;

    // Intentar buscar una voz en español disponible en el teléfono/PC
    const voces = window.speechSynthesis.getVoices();
    const vozEsp = voces.find(v => v.lang.startsWith('es-CO')) ||
                   voces.find(v => v.lang.startsWith('es-419')) ||
                   voces.find(v => v.lang.startsWith('es-MX')) ||
                   voces.find(v => v.lang.startsWith('es-US')) ||
                   voces.find(v => v.lang.startsWith('es'));

    if (vozEsp) {
      utterance.voice = vozEsp;
    }

    vozActual = utterance;
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.error('Error al reproducir voz campesina:', error);
  }
}

export function pararVozCampesina() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
