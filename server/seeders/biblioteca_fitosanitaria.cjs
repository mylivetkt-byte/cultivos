const mysql = require('mysql2/promise');

async function seed() {
  const p = mysql.createPool({host:'localhost',port:3307,user:'root',password:'12345',database:'sas_agricolas'});

  try {
    const conn = await p.getConnection();
    console.log("Iniciando seeder Biblioteca Fitosanitaria ICA (Palma de Aceite)...");

    const libreria = [
      {
        tipo: 'Enfermedad',
        cultivo: 'Palma de Aceite',
        nombre_comun: 'Pudrición del Cogollo (PC)',
        nombre_cientifico: 'Phytophthora palmivora',
        agente_causal: 'Oomiceto',
        sintomas: 'Amarillamiento y secamiento de las flechas jóvenes. Lesiones acuosas en la base de la flecha que avanzan pudriendo los tejidos en el meristemo apical. Mal olor en estados avanzados.',
        danos_ocasionados: 'Muerte de la palma por destrucción del meristemo apical. Pérdida total de producción si no se interviene a tiempo.',
        umbral_economico_pct: 1.00, // 1% de incidencia obliga a cuarentena/tratamiento intensivo
        medidas_preventivas: 'Drenajes adecuados, erradicación de palmas muertas (cirugía), buena nutrición (balance K/Mg).',
        control_biologico: 'Aplicación de Trichoderma spp. como preventivo en la base y corona.',
        control_quimico: 'Fosfitos de Potasio vía inyección o aspersión. Fungicidas sistémicos (Metalaxil) post-cirugía.',
        recomendaciones_ica: 'Enfermedad de control oficial (Resolución ICA 4170). Obligación de reporte. Tratamiento inmediato o erradicación.',
        nivel_riesgo: 'Alto'
      },
      {
        tipo: 'Enfermedad',
        cultivo: 'Palma de Aceite',
        nombre_comun: 'Marchitez Letal (ML)',
        nombre_cientifico: 'Desconocido / Complejo patogénico',
        agente_causal: 'Posible fitoplasma / virus vectorizado',
        sintomas: 'Amarillamiento repentino de hojas bajeras que avanza hacia el cogollo. Secamiento de inflorescencias y caída de frutos.',
        danos_ocasionados: 'Muerte rápida de la planta en 3 a 6 meses. Alta tasa de propagación por insectos vectores.',
        umbral_economico_pct: 0.50,
        medidas_preventivas: 'Control de gramíneas hospederas (Panicum maximum).',
        control_biologico: 'Manejo de coberturas vegetales para fomentar enemigos naturales.',
        control_quimico: 'Control estricto de insectos vectores (Myndus crudus o Haplaxius crudus) con insecticidas sistémicos.',
        recomendaciones_ica: 'Erradicación inmediata de la palma afectada mediante inyección de herbicida (glifosato) y quema o picado. Control oficial.',
        nivel_riesgo: 'Cuarentenario'
      },
      {
        tipo: 'Plaga',
        cultivo: 'Palma de Aceite',
        nombre_comun: 'Gusano Barrenador de las Raíces',
        nombre_cientifico: 'Sagalassa valida',
        agente_causal: 'Insecto (Lepidóptero)',
        sintomas: 'Amarillamiento progresivo, reducción en el tamaño de las hojas nuevas, caída de producción. Las raíces primarias muestran galerías barrenadas por la larva.',
        danos_ocasionados: 'Destrucción del sistema radicular. Volcamiento de palmas jóvenes y merma drástica en rendimiento.',
        umbral_economico_pct: 5.00,
        medidas_preventivas: 'Mantener rodales limpios. Eliminación de residuos de poda cerca al estípite.',
        control_biologico: 'Aplicación de nemátodos entomopatógenos (Steinernema spp.) o micoinsecticidas (Beauveria bassiana) al plato.',
        control_quimico: 'Aplicación de insecticidas granulares al plato (Ej. Carbofuran o Fipronil) bajo estricta supervisión.',
        recomendaciones_ica: 'Uso de cebos tóxicos. Monitoreo constante del sistema radicular en la corona.',
        nivel_riesgo: 'Alto'
      },
      {
        tipo: 'Plaga',
        cultivo: 'Palma de Aceite',
        nombre_comun: 'Picudo de la Palma',
        nombre_cientifico: 'Rhynchophorus palmarum',
        agente_causal: 'Insecto (Coleóptero)',
        sintomas: 'Galerías en el estípite y corona. Presencia de larvas grandes y blancas. Vector del nematodo causante del Anillo Rojo (Bursaphelenchus cocophilus).',
        danos_ocasionados: 'Destrucción mecánica del tallo. Infección letal por Anillo Rojo.',
        umbral_economico_pct: 2.00,
        medidas_preventivas: 'Evitar heridas en el estípite. Cortar pedúnculos florales correctamente.',
        control_biologico: 'Uso masivo de trampas con feromona de agregación (Rhynchophorol) y cebos (caña de azúcar/piña).',
        control_quimico: 'Insecticida en las trampas (Ej. Metomil).',
        recomendaciones_ica: 'Trampeo masivo obligatorio en plantaciones comerciales (Resolución ICA).',
        nivel_riesgo: 'Alto'
      }
    ];

    for (let r of libreria) {
      await conn.query(`
        INSERT INTO lib_fitosanitaria_ica 
        (tipo, cultivo, nombre_comun, nombre_cientifico, agente_causal, sintomas, danos_ocasionados, 
         umbral_economico_pct, medidas_preventivas, control_biologico, control_quimico, recomendaciones_ica, nivel_riesgo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        r.tipo, r.cultivo, r.nombre_comun, r.nombre_cientifico, r.agente_causal, r.sintomas, r.danos_ocasionados,
        r.umbral_economico_pct, r.medidas_preventivas, r.control_biologico, r.control_quimico, r.recomendaciones_ica, r.nivel_riesgo
      ]);
    }

    conn.release();
    console.log("Seeder ICA exitoso.");
  } catch (err) {
    console.error("Error en seeder:", err);
  }
  process.exit(0);
}
seed();
