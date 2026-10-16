// =====================================================================
// BOT DE WHATSAPP — PROCESO AISLADO
// ---------------------------------------------------------------------
// Arranca el socket de Baileys y expone una mini-API HTTP para que el
// API principal (server/index.js) le envíe mensajes y consulte estado.
// Escucha SOLO en 127.0.0.1 por defecto (WHATSAPP_BOT_HOST para docker).
// Uso:  npm run dev:whatsapp
// =====================================================================
import 'dotenv/config';
import express from 'express';
import {
  connectToWhatsApp,
  getStatus,
  logoutWhatsApp,
  sendTextMessage,
  sendDocumentMessage,
} from './services/whatsappBotCore.js';

const PORT = Number(process.env.WHATSAPP_BOT_PORT || 3004);
const HOST = process.env.WHATSAPP_BOT_HOST || '127.0.0.1';
const BOT_SECRET = process.env.WHATSAPP_BOT_SECRET || '';

const app = express();
app.use(express.json({ limit: '25mb' }));

// Clave interna compartida con el API (defensa en profundidad; opcional).
app.use((req, res, next) => {
  if (!BOT_SECRET) return next();
  if (req.headers['x-bot-secret'] !== BOT_SECRET) {
    return res.status(401).json({ success: false, error: 'Clave interna inválida.' });
  }
  next();
});

app.get('/health', (req, res) => {
  res.json({ ok: true, pid: process.pid });
});

app.post('/start', async (req, res) => {
  try {
    await connectToWhatsApp();
    res.json({ success: true, ...getStatus() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/status', (req, res) => {
  res.json({ success: true, ...getStatus() });
});

app.post('/logout', async (req, res) => {
  try {
    await logoutWhatsApp();
    res.json({ success: true, message: 'Sesión cerrada.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/send', async (req, res) => {
  try {
    const { phone, text } = req.body;
    if (!phone || !text) {
      return res.status(400).json({ success: false, error: 'Falta teléfono o texto.' });
    }
    let formattedPhone = String(phone).replace(/\D/g, '');
    if (formattedPhone.length === 10) formattedPhone = '57' + formattedPhone;

    await sendTextMessage(formattedPhone, text);
    res.json({ success: true, message: 'Mensaje enviado correctamente.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/send-document', async (req, res) => {
  try {
    const { phone, base64, filename, caption } = req.body;
    if (!phone || !base64) {
      return res.status(400).json({ success: false, error: 'Faltan datos (phone/base64).' });
    }
    let formattedPhone = String(phone).replace(/\D/g, '');
    if (formattedPhone.length === 10) formattedPhone = '57' + formattedPhone;

    const buffer = Buffer.from(base64, 'base64');
    await sendDocumentMessage(formattedPhone, buffer, filename || 'documento.pdf', caption || '');
    res.json({ success: true, message: 'Documento enviado correctamente.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`🤖 Bot de WhatsApp (proceso aislado) escuchando en http://${HOST}:${PORT}`);
  connectToWhatsApp().catch(err => console.error('Error iniciando WhatsApp:', err));
});