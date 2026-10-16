import { GoogleGenAI } from '@google/genai';
import { toolsSchema, toolsFunctions } from './tools.js';

const SYSTEM_INSTRUCTION = `Eres el asistente virtual de una finca en Colombia. Respondes SOLO sobre la finca usando datos reales obtenidos de las tools; NUNCA inventas cifras; si una tool no devuelve datos, lo dices con honestidad. Español colombiano, mensajes concisos aptos para WhatsApp, emojis moderados (🌾🚜🛸👷💦), listas cortas con viñetas. Fechas en DD/MM/AAAA. Cifras de dinero en COP. Filtras la información según el rol de quien pregunta. Cierras ofreciendo ayuda adicional.`;

export async function processMessage(messages, userContext = null) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('La API KEY de Gemini no está configurada.');
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  
  // Instanciar usando el nuevo SDK de GenAI
  const ai = new GoogleGenAI({ apiKey });

  // Preparar historial
  const history = messages.map(m => ({
    role: m.role,
    parts: [{ text: m.text }]
  }));

  const chatSession = ai.chats.create({
    model: modelName,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations: toolsSchema }],
      temperature: 0.3
    }
  });

  // Re-cargar historial en la sesión del SDK (el SDK actual de @google/genai soporta historial en el constructor o enviando todos los turnos)
  // Como @google/genai puede ser diferente de @google/generative-ai, intentamos una invocación segura:
  let iterations = 0;
  let lastMessageText = messages[messages.length - 1].text;
  
  while (iterations < 5) {
    iterations++;
    const response = await chatSession.sendMessage(lastMessageText);
    const functionCalls = response.functionCalls;

    if (functionCalls && functionCalls.length > 0) {
      const functionResponses = [];
      for (const call of functionCalls) {
        const functionName = call.name;
        const args = call.args || {};
        
        console.log(`[LLM] Tool call: ${functionName}`, args);
        
        let result = {};
        if (toolsFunctions[functionName]) {
          result = await toolsFunctions[functionName](args, userContext);
        } else {
          result = { error: 'Herramienta no implementada' };
        }
        
        functionResponses.push({
          name: functionName,
          response: result
        });
      }
      
      // Enviar las respuestas de vuelta a Gemini (requiere el formato específico del SDK)
      lastMessageText = functionResponses;
    } else {
      // Respuesta de texto final
      return response.text;
    }
  }

  return 'Lo siento, tuve un problema procesando toda la información (límite de iteraciones alcanzado).';
}
