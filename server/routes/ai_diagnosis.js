import express from 'express';
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
    console.error("Error initializing GoogleGenAI:", err);
}

router.post('/diagnosticar-plaga', async (req, res) => {
    try {
        const { imageBase64 } = req.body;
        
        if (!ai) {
            return res.status(500).json({ success: false, error: 'GEMINI_API_KEY no configurada en el archivo .env del servidor.' });
        }
        
        if (!imageBase64) {
            return res.status(400).json({ success: false, error: 'Se requiere una imagen en formato base64.' });
        }

        // Determine mime type and clean base64 data
        let mimeType = 'image/jpeg';
        const matches = imageBase64.match(/^data:(image\/\w+);base64,/);
        if (matches) {
            mimeType = matches[1];
        }
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        const prompt = `
        Eres un experto ingeniero agrónomo y fitopatólogo.
        A continuación se te proporciona una imagen de una planta o cultivo que presenta síntomas.
        Por favor analiza la imagen y responde estrictamente en formato JSON con la siguiente estructura:
        {
          "diagnostico": "Nombre de la plaga, enfermedad o deficiencia (Ej: Sigatoka Negra, Pulgón, Deficiencia de Potasio)",
          "nivel_riesgo": "Bajo|Medio|Alto|Crítico",
          "accion_recomendada": "Recomendación breve para el tratamiento o manejo",
          "detalles": "Breve explicación de los síntomas observados"
        }
        Devuelve SOLO el objeto JSON, sin formato markdown adicional.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: base64Data
                            }
                        }
                    ]
                }
            ],
            config: {
                temperature: 0.2,
                responseMimeType: "application/json"
            }
        });

        let jsonStr = response.text;
        
        // Safety strip if API returns markdown
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
        } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
        }

        const data = JSON.parse(jsonStr);

        res.json({ success: true, data });

    } catch (error) {
        console.error('Error in AI diagnosis:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
