# Asistente IA de la Finca (Multi-Canal)

El asistente IA es capaz de conectarse a la base de datos MySQL para responder preguntas operativas en tiempo real (estado de cultivos, maquinaria, ubicaciones, clima, etc.) usando el LLM Gemini 2.5 Flash y la técnica de *Function Calling*.

## Canales Soportados

1. **Web Chat (React Frontend)**: Widget burbuja integrado en toda la plataforma.
2. **WhatsApp (Baileys Local Bot)**: Procesamiento vía el bot local, filtrando por `usuarios.whatsapp_numero`.
3. **Telegram**: Webhook disponible para integraciones rápidas y desarrollo.

## Variables de Entorno Necesarias (`.env`)

Asegúrese de configurar estas variables en el archivo `.env` de la raíz del servidor:

```env
# Obligatorio para la IA
GEMINI_API_KEY="AIzaSy..."
GEMINI_MODEL="gemini-2.5-flash"

# Para usar el clima
OPENWEATHER_API_KEY="su_api_key_aqui"

# Para Telegram (Opcional)
TELEGRAM_BOT_TOKEN="su_token_aqui"
```

## Ejecución y Pruebas
1. Inicie los servicios:
   ```bash
   npm run dev
   ```
2. Inicie el bot de WhatsApp (necesario para el webhook interno de Baileys):
   ```bash
   npm run dev:whatsapp
   ```
3. Ejecute las pruebas End-to-End:
   ```bash
   node tests/test_ia.js
   ```

## Arquitectura (Idempotencia y Tools)
El flujo en WhatsApp intercepta el `messages.upsert` de Baileys y realiza un POST a `http://127.0.0.1:3002/api/ia/baileys_webhook`. Para evitar loops infinitos, se utiliza un `Set` en caché LRU que almacena el `messageId` de los últimos 1000 mensajes.

Las **Tools** (definidas en `server/services/tools.js`) limitan a la IA a consultar funciones estrictas de Solo Lectura. La IA NUNCA ejecuta SQL directo.
