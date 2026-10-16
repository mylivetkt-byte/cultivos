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
  // Términos para otros módulos (Suelos, Riego, Cosecha)
  caudal: {
    titulo: 'Chorro de agua (Caudal)',
    icono: '🌊',
    ayuda: '¿Cuánta agua bota el tubo o la bomba?',
    ejemplo: 'Ejemplo: 10 litros por segundo o lo que marca el reloj.',
    audio: 'Este es el chorro de agua que bota la bomba por segundo.'
  },
  presion: {
    titulo: 'Fuerza del agua (Presión)',
    icono: '⏱️',
    ayuda: 'Lo que marca el relojito (manómetro) de la tubería.',
    ejemplo: 'Ejemplo: 35 en la aguja verde.',
    audio: 'Mire el relojito de la tubería y anote qué número marca la aguja.'
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
