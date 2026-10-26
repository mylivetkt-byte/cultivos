// =====================================================================
// ADAPTADOR UNIVERSAL DE WHATSAPP (AGROPACCIOLI)
// ---------------------------------------------------------------------
// Permite alternar mediante variable de entorno en .env:
//   - WHATSAPP_PROVIDER=baileys    -> Bot local QR (desarrollo / demo)
//   - WHATSAPP_PROVIDER=meta_cloud -> Meta WhatsApp Cloud API (producción oficial)
// =====================================================================
import fetch from 'node-fetch';
import 'dotenv/config';
import {
  getMetaStatus,
  sendMetaTextMessage,
  sendMetaDocumentMessage,
  sendMetaTemplateMessage
} from './metaWhatsAppService.js';

const PROVIDER = (process.env.WHATSAPP_PROVIDER || 'baileys').toLowerCase().trim();
const BOT_URL = (process.env.WHATSAPP_BOT_URL || 'http://127.0.0.1:3004').replace(/\/+$/, '');
const BOT_SECRET = process.env.WHATSAPP_BOT_SECRET || '';

export function getActiveProvider() {
  return PROVIDER === 'meta_cloud' || PROVIDER === 'meta' ? 'meta_cloud' : 'baileys';
}

// ---------------------------------------------------------------------
// COMUNICACIÓN CON EL BOT LOCAL (BAILEYS)
// ---------------------------------------------------------------------
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

// ---------------------------------------------------------------------
// INTERFAZ UNIFICADA
// ---------------------------------------------------------------------
export async function connectToWhatsApp() {
  if (getActiveProvider() === 'meta_cloud') {
    const status = await getMetaStatus();
    return { connected: status.connected, qr: '', provider: 'meta_cloud', details: status };
  }
  const data = await botFetch('/start', { method: 'POST', body: JSON.stringify({}) });
  return { connected: data.connected, qr: data.qr, provider: 'baileys' };
}

export async function getStatus() {
  if (getActiveProvider() === 'meta_cloud') {
    const metaStatus = await getMetaStatus();
    return {
      provider: 'meta_cloud',
      connected: metaStatus.connected,
      configured: metaStatus.configured,
      qr: '',
      phone: metaStatus.phone,
      verifiedName: metaStatus.verifiedName,
      error: metaStatus.error || null
    };
  }
  const data = await botFetch('/status');
  return {
    provider: 'baileys',
    connected: data.connected,
    qr: data.qr,
    phone: data.phone || null
  };
}

export async function logoutWhatsApp() {
  if (getActiveProvider() === 'meta_cloud') {
    return { success: true, message: 'Meta Cloud API no requiere logout físico (gestión en Meta Business).' };
  }
  await botFetch('/logout', { method: 'POST', body: JSON.stringify({}) });
}

export async function sendTextMessage(phone, text) {
  if (!phone || !text) throw new Error('Faltan teléfono o texto.');
  if (getActiveProvider() === 'meta_cloud') {
    return await sendMetaTextMessage(phone, text);
  }
  await botFetch('/send', { method: 'POST', body: JSON.stringify({ phone, text }) });
}

export async function sendDocumentMessage(phone, buffer, filename, caption = '') {
  if (!phone || !buffer) throw new Error('Faltan datos para enviar el documento.');
  if (getActiveProvider() === 'meta_cloud') {
    return await sendMetaDocumentMessage(phone, buffer, filename, caption);
  }
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

export async function sendTemplateMessage(phone, templateName, languageCode = 'es', components = []) {
  if (getActiveProvider() === 'meta_cloud') {
    return await sendMetaTemplateMessage(phone, templateName, languageCode, components);
  }
  throw new Error('El envío de plantillas oficiales HSM requiere WHATSAPP_PROVIDER=meta_cloud');
}
