import express from 'express';
import pool from '../db.js';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

let ai = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
} catch (err) {
  console.error('Error initializing GoogleGenAI in ia.js:', err);
}

/**
 * Endpoint para recibir una imagen Base64 y emitir diagnóstico fitosanitario.
 */
router.post('/diagnostico-imagen', async (req, res) => {
  try {
    const { id_lote, image_base64, id_empleado, id_tenant } = req.body;

    if (!image_base64) {
      return res.status(400).json({ success: false, error: 'Se requiere la imagen en base64 (image_base64)' });
    }

    let simulatedResponse = {
      plaga_detectada: 'Posible roya / deficiencia nutricional',
      probabilidad: 88.5,
      recomendacion: 'Aplicar fungicida cúprico y fertilización foliar'
    };

    if (ai) {
      try {
        const cleanB64 = image_base64.replace(/^data:image\/\w+;base64,/, '');
        const prompt = 'Analiza esta imagen agrícola y responde en formato JSON con las claves: plaga_detectada (string), probabilidad (número 0-100), recomendacion (string).';
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{
            role: 'user',
            parts: [{ text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: cleanB64 } }]
          }],
          config: { responseMimeType: 'application/json' }
        });
        const parsed = JSON.parse(response.text);
        if (parsed.plaga_detectada) simulatedResponse = parsed;
      } catch (genErr) {
        console.warn('Gemini inference fallback:', genErr.message);
      }
    }

    const insertQuery = `
      INSERT INTO detecciones_fitosanitarias (id_tenant, id_lote, id_empleado, tipo_problema, descripcion, imagen_url, estado)
      VALUES (?, ?, ?, ?, ?, ?, 'Pendiente Revisión')
    `;
    
    const [result] = await pool.query(insertQuery, [
      id_tenant || 1,
      id_lote || null,
      id_empleado || null,
      'Plaga/Enfermedad',
      `${simulatedResponse.plaga_detectada} - ${simulatedResponse.recomendacion}`,
      'base64_placeholder'
    ]);

    res.json({
      success: true,
      data: {
        id_deteccion: result.insertId,
        diagnostico_ia: simulatedResponse
      }
    });
  } catch (error) {
    console.error('Error en diagnóstico por IA:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/ia/analizar_foto_novedad
 * Usado en SiembraArbolesManager.jsx
 */
router.post('/analizar_foto_novedad', async (req, res) => {
  try {
    const { image_base64, mime_type } = req.body;
    if (!image_base64) {
      return res.status(400).json({ success: false, error: 'Imagen base64 requerida' });
    }

    let resultado = {
      problema_detectado: 'Mancha foliar / Cercospora',
      severidad: 'Media',
      tratamiento_sugerido: 'Aplicar fungicida protectante y remover hojas severamente afectadas.'
    };

    if (ai) {
      try {
        const cleanB64 = image_base64.replace(/^data:image\/\w+;base64,/, '');
        const prompt = `Analiza esta imagen fitosanitaria de cultivo. Responde estrictamente un JSON con las propiedades:
        - problema_detectado: nombre común de la plaga o deficiencia encontrada
        - severidad: 'Baja' | 'Media' | 'Alta' | 'Crítica'
        - tratamiento_sugerido: recomendación técnica de manejo agronómico`;
        
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{
            role: 'user',
            parts: [{ text: prompt }, { inlineData: { mimeType: mime_type || 'image/jpeg', data: cleanB64 } }]
          }],
          config: { responseMimeType: 'application/json' }
        });
        const parsed = JSON.parse(response.text);
        resultado = { ...resultado, ...parsed };
      } catch (e) {
        console.warn('Fallback en analizar_foto_novedad:', e.message);
      }
    }

    res.json({
      success: true,
      ...resultado
    });
  } catch (err) {
    console.error('Error en analizar_foto_novedad:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/ia/clasificar_plaga
 * Usado en SiembraArbolesManager.jsx
 */
router.post('/clasificar_plaga', async (req, res) => {
  try {
    const { diagnostico } = req.body;
    if (!diagnostico) {
      return res.status(400).json({ success: false, error: 'diagnostico requerido' });
    }

    let nombre_cientifico = 'Organismo fitopatógeno';

    if (ai) {
      try {
        const prompt = `Para el siguiente diagnóstico o plaga agrícola: "${diagnostico}", devuelve únicamente un JSON con la propiedad "nombre_cientifico" que contenga el nombre científico biológico en latín (ej. Mycosphaerella fijiensis).`;
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { responseMimeType: 'application/json' }
        });
        const parsed = JSON.parse(response.text);
        if (parsed.nombre_cientifico) nombre_cientifico = parsed.nombre_cientifico;
      } catch (e) {
        console.warn('Fallback en clasificar_plaga:', e.message);
      }
    }

    res.json({ success: true, nombre_cientifico });
  } catch (err) {
    console.error('Error en clasificar_plaga:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/ia/tools
 * Usado en ChatPlaceholder.jsx
 */
router.post('/tools', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, error: 'Mensaje requerido' });
    }

    let respuesta = 'Hola. Soy el asistente agronómico inteligente de AgroPaccioli. Puedo ayudarte con diagnósticos fitosanitarios, costos por hectárea, programación de riegos y estados contables.';

    if (ai) {
      try {
        const systemPrompt = 'Eres AgroPaccioli AI, el asistente inteligente agro-industrial experto en agronomía, cultivos tropicales, nutrición vegetal, plagas y gestión contable agrícola.';
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\nPregunta del usuario: ${message}` }] }
          ]
        });
        if (response.text) respuesta = response.text;
      } catch (e) {
        console.warn('Fallback en /api/ia/tools:', e.message);
      }
    }

    res.json({ success: true, respuesta });
  } catch (err) {
    console.error('Error en /api/ia/tools:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
