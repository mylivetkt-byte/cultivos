// Cliente HTTP del bot de WhatsApp (proceso separado `server/whatsapp-bot.js`).
// Mantiene la MISMA interfaz que el servicio original (connectToWhatsApp, getStatus,
// logoutWhatsApp, sendTextMessage, sendDocumentMessage, sendPdfReport) para que todos
// los routers existentes sigan funcionando sin cambios: las llamadas se reenvían a la
// mini-API local del bot a través de WHATSAPP_BOT_URL.
import fetch from 'node-fetch';
import 'dotenv/config';

const BOT_URL = (process.env.WHATSAPP_BOT_URL || 'http://127.0.0.1:3004').replace(/\/+$/, '');
const BOT_SECRET = process.env.WHATSAPP_BOT_SECRET || '';

async function botFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (BOT_SECRET) headers['X-Bot-Secret'] = BOT_SECRET;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 15000);
  try {
    const res = await fetch(`${BOT_URL}${path}`, { ...options, headers, signal: controller.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `El bot de WhatsApp respondió con estado ${res.status}`);
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Tiempo de espera agotado al comunicarse con el bot de WhatsApp.');
    }
    throw new Error(`Bot de WhatsApp no disponible (${err.message}). Ejecuta "npm run dev:whatsapp" en un proceso aparte.`);
  } finally {
    clearTimeout(timeout);
  }
}

export async function connectToWhatsApp() {
  const data = await botFetch('/start', { method: 'POST', body: JSON.stringify({}) });
  return { connected: data.connected, qr: data.qr };
}

export async function getStatus() {
  const data = await botFetch('/status');
  return { connected: data.connected, qr: data.qr, phone: data.phone };
}

export async function logoutWhatsApp() {
  await botFetch('/logout', { method: 'POST', body: JSON.stringify({}) });
}

export async function sendTextMessage(phone, text) {
  if (!phone || !text) throw new Error('Faltan teléfono o texto.');
  await botFetch('/send', { method: 'POST', body: JSON.stringify({ phone, text }) });
}

export async function sendDocumentMessage(phone, buffer, filename, caption = '') {
  if (!phone || !buffer) throw new Error('Faltan datos para enviar el documento.');
  const base64 = Buffer.isBuffer(buffer) ? buffer.toString('base64') : buffer;
  await botFetch('/send-document', {
    method: 'POST',
    body: JSON.stringify({ phone, base64, filename, caption }),
    timeout: 30000,
  });
}

export async function sendPdfReport(phone, pdfBase64, filename, caption = '') {
  await sendDocumentMessage(phone, pdfBase64, filename, caption);
}
