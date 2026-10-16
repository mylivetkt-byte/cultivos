const mysql = require('mysql2/promise');
require('dotenv').config();
const axios = require('axios');

const EXPERT_DATA = {
  'Palma de Aceite Híbrida': {
    especie_biologica: 'Elaeis guineensis',
    familia_botanica: 'Arecaceae',
    imagen_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Elaeis_guineensis_-_K%C3%B6hler%E2%80%93s_Medizinal-Pflanzen-283.jpg/300px-Elaeis_guineensis_-_K%C3%B6hler%E2%80%93s_Medizinal-Pflanzen-283.jpg',
    resumen_cientifico_api: 'La palma de aceite es el cultivo oleaginoso más productivo del mundo. Los híbridos OxG (Oleifera x Guineensis) son populares en Colombia por su resistencia a la Pudrición del Cogollo.',
    distancia_siembra_m: 9,
    densidad_ha: 143,
    dias_ciclo: 150,
    plagas: [{ nombre_plaga: 'Picudo de la palma', etapa_ataque: 'Todas', umbral_dano: '1 picudo por trampa/mes' }],
    enfermedades: [{ nombre_enfermedad: 'Pudrición del Cogollo (PC)', sintomas: 'Amarillamiento y pudrición de las flechas jóvenes.', nivel_riesgo: 'Crítico' }],
    abonos: [{ fase_aplicacion: 'Mantenimiento (Semestral)', dosis_npk: 'K-Mag / Cloruro de Potasio', cantidad_por_planta_gr: 2000 }],
    fumigaciones: [{ ingrediente_activo: 'Aceite Agrícola + Insecticida', dosis_cc_litro: 2.0, frecuencia_dias: 45 }],
    semillas: [{ nombre_variedad: 'Híbrido OxG Coari x La Mé', proveedor: 'Cenipalma', tolerancia: 'Resistente a Pudrición del Cogollo' }],
    riegos: [{ etapa_fenologica: 'Producción', requerimiento_hidrico_mm: 150, frecuencia_dias: 15, metodo_recomendado: 'Gravedad o Aspersión' }],
    siembra: [{ sistema_siembra: 'Triángulo equilátero', distancia_surcos_m: 7.8, distancia_plantas_m: 9.0, plantas_por_ha: 143, instrucciones_especiales: 'Trazado topográfico. Establecer leguminosas de cobertura (Kudzu) antes de sembrar.' }]
  },
  'Cacao CCN51': {
    especie_biologica: 'Theobroma cacao',
    familia_botanica: 'Malvaceae',
    imagen_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Theobroma_cacao_-_K%C3%B6hler%E2%80%93s_Medizinal-Pflanzen-137.jpg/300px-Theobroma_cacao_-_K%C3%B6hler%E2%80%93s_Medizinal-Pflanzen-137.jpg',
    resumen_cientifico_api: 'El cacao (Theobroma cacao) es un árbol de clima tropical. Requiere sombrío en sus primeros años. Es altamente valorado por sus semillas utilizadas para el chocolate. Los clones modernos como el CCN51 ofrecen alta productividad pero requieren excelente nutrición.',
    distancia_siembra_m: 3,
    densidad_ha: 1111,
    dias_ciclo: 180,
    plagas: [
      { nombre_plaga: 'Monalonion (Chinche)', etapa_ataque: 'Desarrollo de mazorcas', umbral_dano: '3-5% de mazorcas picadas' },
      { nombre_plaga: 'Xyleborus spp. (Barrenador)', etapa_ataque: 'Tallo y ramas', umbral_dano: 'Presencia de aserrín' }
    ],
    enfermedades: [
      { nombre_enfermedad: 'Moniliasis (Moniliophthora roreri)', sintomas: 'Mancha marrón en la mazorca, esporas blancas.', nivel_riesgo: 'Crítico' },
      { nombre_enfermedad: 'Escoba de bruja (Moniliophthora perniciosa)', sintomas: 'Proliferación anormal de brotes vegetativos.', nivel_riesgo: 'Alto' }
    ],
    abonos: [
      { fase_aplicacion: 'Producción (Inicio lluvias)', dosis_npk: 'Urea + DAP + KCl', cantidad_por_planta_gr: 300 }
    ],
    fumigaciones: [
      { ingrediente_activo: 'Óxido de Cobre', dosis_cc_litro: 3.0, frecuencia_dias: 30 }
    ],
    semillas: [
      { nombre_variedad: 'Clon CCN-51 (Patrón IMC67)', proveedor: 'Fedecacao', tolerancia: 'Alta productividad, susceptible a Monilia' }
    ],
    riegos: [
      { etapa_fenologica: 'Establecimiento', requerimiento_hidrico_mm: 100, frecuencia_dias: 7, metodo_recomendado: 'Microaspersión' }
    ],
    siembra: [
      { sistema_siembra: 'Cuadrado', distancia_surcos_m: 3.0, distancia_plantas_m: 3.0, plantas_por_ha: 1111, instrucciones_especiales: 'Sembrar plátano como sombrío transitorio a 3x3.' }
    ]
  },
  'Plátano Hartón': {
    especie_biologica: 'Musa paradisiaca',
    familia_botanica: 'Musaceae',
    imagen_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Musa_paradisiaca_Blanco1.218.png/220px-Musa_paradisiaca_Blanco1.218.png',
    resumen_cientifico_api: 'El plátano Hartón (Musa paradisiaca) es una planta herbácea gigante originaria de Asia. En Colombia es fundamental para la seguridad alimentaria. Requiere climas cálidos y húmedos, suelos profundos y bien drenados. El ciclo vegetativo hasta la cosecha dura aproximadamente 9 a 12 meses.',
    distancia_siembra_m: 3,
    densidad_ha: 1111,
    dias_ciclo: 360,
    plagas: [
      { nombre_plaga: 'Picudo negro (Cosmopolites sordidus)', etapa_ataque: 'Desarrollo vegetativo', umbral_dano: '3 picudos por trampa/semana' },
      { nombre_plaga: 'Gusano tornillo (Castniomera humboldti)', etapa_ataque: 'Crecimiento', umbral_dano: 'Presencia visual en tallo' }
    ],
    enfermedades: [
      { nombre_enfermedad: 'Sigatoka Negra (Mycosphaerella fijiensis)', sintomas: 'Estrías marrones en el envés de la hoja, necrosis.', nivel_riesgo: 'Crítico' },
      { nombre_enfermedad: 'Moko (Ralstonia solanacearum)', sintomas: 'Marchitamiento rápido, amarillamiento.', nivel_riesgo: 'Alto' }
    ],
    abonos: [
      { fase_aplicacion: 'Establecimiento (Mes 1)', dosis_npk: '10-30-10', cantidad_por_planta_gr: 100 },
      { fase_aplicacion: 'Crecimiento (Mes 4)', dosis_npk: '15-15-15', cantidad_por_planta_gr: 150 },
      { fase_aplicacion: 'Pre-floración (Mes 7)', dosis_npk: 'KCI (Potasio)', cantidad_por_planta_gr: 200 }
    ],
    fumigaciones: [
      { ingrediente_activo: 'Mancozeb (Preventivo)', dosis_cc_litro: 2.5, frecuencia_dias: 14 },
      { ingrediente_activo: 'Propiconazol (Curativo)', dosis_cc_litro: 1.0, frecuencia_dias: 21 }
    ],
    semillas: [
      { nombre_variedad: 'Hartón Dominico (Cormos certificados)', proveedor: 'Agrosavia', tolerancia: 'Tolerancia media a Sigatoka' }
    ],
    riegos: [
      { etapa_fenologica: 'Desarrollo vegetativo', requerimiento_hidrico_mm: 120, frecuencia_dias: 7, metodo_recomendado: 'Goteo o microaspersión' },
      { etapa_fenologica: 'Floración y llenado', requerimiento_hidrico_mm: 150, frecuencia_dias: 5, metodo_recomendado: 'Goteo' }
    ],
    siembra: [
      { sistema_siembra: 'Tresbolillo', distancia_surcos_m: 3.0, distancia_plantas_m: 3.0, plantas_por_ha: 1283, instrucciones_especiales: 'Ahoyado de 40x40x40cm. Aplicar materia orgánica y cal dolomita.' }
    ]
  },
  'Banano Cavendish': {
    especie_biologica: 'Musa acuminata',
    familia_botanica: 'Musaceae',
    imagen_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Bananas.jpg/320px-Bananas.jpg',
    resumen_cientifico_api: 'El banano Cavendish es el más cultivado para exportación a nivel mundial. Es una planta exigente en nutrientes y agua.',
    distancia_siembra_m: 2.5,
    densidad_ha: 1600,
    dias_ciclo: 300,
    plagas: [{ nombre_plaga: 'Cochinilla algodonosa', etapa_ataque: 'Racimo', umbral_dano: 'Presencia en frutos' }],
    enfermedades: [{ nombre_enfermedad: 'Mal de Panamá Raza 4 Tropical (Foc R4T)', sintomas: 'Marchitamiento vascular', nivel_riesgo: 'Crítico' }],
    abonos: [{ fase_aplicacion: 'Desarrollo del racimo', dosis_npk: '15-4-30', cantidad_por_planta_gr: 200 }],
    fumigaciones: [{ ingrediente_activo: 'Clorotalonil', dosis_cc_litro: 2.0, frecuencia_dias: 10 }],
    semillas: [{ nombre_variedad: 'Gran Enano / Valery (In vitro)', proveedor: 'Viveros Certificados', tolerancia: 'Susceptible a R4T' }],
    riegos: [{ etapa_fenologica: 'Crecimiento activo', requerimiento_hidrico_mm: 180, frecuencia_dias: 5, metodo_recomendado: 'Subfoliar' }],
    siembra: [{ sistema_siembra: 'Doble surco', distancia_surcos_m: 3.5, distancia_plantas_m: 1.5, plantas_por_ha: 1900, instrucciones_especiales: 'Control estricto de malezas.' }]
  },
  'Café Arábica': {
    especie_biologica: 'Coffea arabica',
    familia_botanica: 'Rubiaceae',
    imagen_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Roasted_coffee_beans.jpg/320px-Roasted_coffee_beans.jpg',
    resumen_cientifico_api: 'El café arábica representa la mayor parte de la producción mundial de café de alta calidad. En Colombia se cultiva en las laderas andinas.',
    distancia_siembra_m: 1.5,
    densidad_ha: 5000,
    dias_ciclo: 240,
    plagas: [{ nombre_plaga: 'Broca del café (Hypothenemus hampei)', etapa_ataque: 'Formación del grano', umbral_dano: '2% de infestación en cerezas' }],
    enfermedades: [{ nombre_enfermedad: 'Roya del cafeto (Hemileia vastatrix)', sintomas: 'Polvillo amarillo-naranja en envés de hojas.', nivel_riesgo: 'Alto' }],
    abonos: [{ fase_aplicacion: 'Pre-floración y llenado', dosis_npk: '17-6-18', cantidad_por_planta_gr: 120 }],
    fumigaciones: [{ ingrediente_activo: 'Ciproconazol', dosis_cc_litro: 1.5, frecuencia_dias: 45 }],
    semillas: [{ nombre_variedad: 'Castillo / Cenicafé 1', proveedor: 'Comité de Cafeteros', tolerancia: 'Resistente a la Roya' }],
    riegos: [{ etapa_fenologica: 'Secano', requerimiento_hidrico_mm: 0, frecuencia_dias: 0, metodo_recomendado: 'Lluvias naturales en Colombia' }],
    siembra: [{ sistema_siembra: 'Contorno (Laderas)', distancia_surcos_m: 1.5, distancia_plantas_m: 1.2, plantas_por_ha: 5555, instrucciones_especiales: 'Trazado con nivel A. Barreras vivas.' }]
  }
};

(async () => {
  try {
    const pool = mysql.createPool({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: process.env.MYSQL_PORT || 3307,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sas_db'
    });

    const [crops] = await pool.query('SELECT id_catalogo, nombre_oficial FROM cultivos_catalogo');

    for (const crop of crops) {
      const expert = EXPERT_DATA[crop.nombre_oficial];
      if (!expert) continue;

      const id = crop.id_catalogo;

      // Update parent
      await pool.query(
        'UPDATE cultivos_catalogo SET especie_biologica=?, familia_botanica=?, imagen_url=?, resumen_cientifico_api=?, distancia_siembra_m=?, densidad_ha=?, dias_ciclo=? WHERE id_catalogo=?',
        [expert.especie_biologica, expert.familia_botanica, expert.imagen_url, expert.resumen_cientifico_api, expert.distancia_siembra_m, expert.densidad_ha, expert.dias_ciclo, id]
      );

      // Delete existing children
      await pool.query('DELETE FROM catalogo_plagas_cultivo WHERE id_catalogo=?', [id]);
      await pool.query('DELETE FROM catalogo_enfermedades WHERE id_catalogo=?', [id]);
      await pool.query('DELETE FROM catalogo_abonos_formulas WHERE id_catalogo=?', [id]);
      await pool.query('DELETE FROM catalogo_fumigacion_formulas WHERE id_catalogo=?', [id]);
      await pool.query('DELETE FROM catalogo_semillas_variedades WHERE id_catalogo=?', [id]);
      await pool.query('DELETE FROM catalogo_riegos WHERE id_catalogo=?', [id]);
      await pool.query('DELETE FROM catalogo_siembra_patrones WHERE id_catalogo=?', [id]);

      // Insert Plagas
      for (const p of expert.plagas) {
        await pool.query('INSERT INTO catalogo_plagas_cultivo (id_catalogo, nombre_plaga, etapa_ataque, umbral_dano) VALUES (?, ?, ?, ?)', [id, p.nombre_plaga, p.etapa_ataque, p.umbral_dano]);
      }
      // Insert Enfermedades
      for (const e of expert.enfermedades) {
        await pool.query('INSERT INTO catalogo_enfermedades (id_catalogo, nombre_enfermedad, sintomas, nivel_riesgo) VALUES (?, ?, ?, ?)', [id, e.nombre_enfermedad, e.sintomas, e.nivel_riesgo]);
      }
      // Insert Abonos
      for (const a of expert.abonos) {
        await pool.query('INSERT INTO catalogo_abonos_formulas (id_catalogo, fase_aplicacion, dosis_npk, cantidad_por_planta_gr) VALUES (?, ?, ?, ?)', [id, a.fase_aplicacion, a.dosis_npk, a.cantidad_por_planta_gr]);
      }
      // Insert Fumigaciones
      for (const f of expert.fumigaciones) {
        await pool.query('INSERT INTO catalogo_fumigacion_formulas (id_catalogo, ingrediente_activo, dosis_cc_litro, frecuencia_dias) VALUES (?, ?, ?, ?)', [id, f.ingrediente_activo, f.dosis_cc_litro, f.frecuencia_dias]);
      }
      // Insert Semillas
      for (const s of expert.semillas) {
        await pool.query('INSERT INTO catalogo_semillas_variedades (id_catalogo, nombre_variedad, proveedor, tolerancia) VALUES (?, ?, ?, ?)', [id, s.nombre_variedad, s.proveedor, s.tolerancia]);
      }
      // Insert Riegos
      for (const r of expert.riegos) {
        await pool.query('INSERT INTO catalogo_riegos (id_catalogo, etapa_fenologica, requerimiento_hidrico_mm, frecuencia_dias, metodo_recomendado) VALUES (?, ?, ?, ?, ?)', [id, r.etapa_fenologica, r.requerimiento_hidrico_mm, r.frecuencia_dias, r.metodo_recomendado]);
      }
      // Insert Siembra
      for (const sp of expert.siembra) {
        await pool.query('INSERT INTO catalogo_siembra_patrones (id_catalogo, sistema_siembra, distancia_surcos_m, distancia_plantas_m, plantas_por_ha, instrucciones_especiales) VALUES (?, ?, ?, ?, ?, ?)', [id, sp.sistema_siembra, sp.distancia_surcos_m, sp.distancia_plantas_m, sp.plantas_por_ha, sp.instrucciones_especiales]);
      }
    }
    console.log('Seeded expert data successfully.');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
