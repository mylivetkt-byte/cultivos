import fetch from 'node-fetch';
import FormData from 'form-data';
import 'dotenv/config';

const GRAPH_VERSION = process.env.META_WA_API_VERSION || 'v20.0';
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

/**
 * Normaliza el número de teléfono eliminando caracteres no numéricos y
 * asegurando el prefijo de país para Colombia (57).
 */
export function formatPhoneNumber(phone) {
  if (!phone) return '';
  let clean = String(phone).replace(/\D/g, '');
  if (clean.length === 10) {
    clean = '57' + clean;
  }
  return clean;
}

/**
 * Obtiene las credenciales activas de Meta Cloud API
 */
function getMetaConfig() {
  const token = process.env.META_WA_ACCESS_TOKEN || '';
  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID || '';
  const wabaId = process.env.META_WA_WABA_ID || '';
  return { token, phoneNumberId, wabaId };
}

/**
 * Verifica el estado de la conexión con Meta Cloud API consultando el Phone Number ID
 */
export async function getMetaStatus() {
  const { token, phoneNumberId, wabaId } = getMetaConfig();

  if (!token || !phoneNumberId) {
    return {
      connected: false,
      provider: 'meta_cloud',
      configured: false,
      error: 'Faltan META_WA_ACCESS_TOKEN o META_WA_PHONE_NUMBER_ID en el archivo .env',
      phone: null
    };
  }

  try {
    const res = await fetch(`${GRAPH_BASE_URL}/${phoneNumberId}?fields=verified_name,display_phone_number,quality_rating,code_verification_status`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      return {
        connected: false,
        provider: 'meta_cloud',
        configured: true,
        error: data.error?.message || `Error HTTP ${res.status}`,
        phone: null
      };
    }

    return {
      connected: true,
      provider: 'meta_cloud',
      configured: true,
      phone: data.display_phone_number || phoneNumberId,
      verifiedName: data.verified_name || 'Línea AgroPaccioli Oficial',
      qualityRating: data.quality_rating || 'GREEN',
      wabaId: wabaId || null
    };
  } catch (err) {
    return {
      connected: false,
      provider: 'meta_cloud',
      configured: true,
      error: err.message,
      phone: null
    };
  }
}

/**
 * Envía un mensaje de texto libre por Meta Cloud API
 */
export async function sendMetaTextMessage(phone, text) {
  const { token, phoneNumberId } = getMetaConfig();
  if (!token || !phoneNumberId) {
    throw new Error('Meta Cloud API no configurada: defina META_WA_ACCESS_TOKEN y META_WA_PHONE_NUMBER_ID en .env');
  }

  const formattedPhone = formatPhoneNumber(phone);
  if (!formattedPhone || !text) {
    throw new Error('Faltan teléfono o texto para el envío por WhatsApp.');
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formattedPhone,
    type: 'text',
    text: {
      preview_url: false,
      body: text
    }
  };

  const res = await fetch(`${GRAPH_BASE_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    const msg = data.error?.message || `Error ${res.status}`;
    console.error('Error enviando texto por Meta Cloud API:', data.error);
    throw new Error(`Meta Cloud API Error: ${msg}`);
  }

  return { success: true, messageId: data.messages?.[0]?.id };
}

/**
 * Sube un archivo multimedia a Meta Cloud API y devuelve el Media ID
 */
export async function uploadMetaMedia(buffer, filename, mimeType = 'application/pdf') {
  const { token, phoneNumberId } = getMetaConfig();
  if (!token || !phoneNumberId) {
    throw new Error('Meta Cloud API no configurada para subir multimedia.');
  }

  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('file', buffer, { filename, contentType: mimeType });
  form.append('type', mimeType);

  const res = await fetch(`${GRAPH_BASE_URL}/${phoneNumberId}/media`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      ...form.getHeaders()
    },
    body: form
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || 'Error al subir documento a Meta Cloud Media');
  }

  return data.id; // Media ID
}

/**
 * Envía un documento PDF o archivo por Meta Cloud API
 */
export async function sendMetaDocumentMessage(phone, bufferOrBase64, filename, caption = '') {
  const { token, phoneNumberId } = getMetaConfig();
  if (!token || !phoneNumberId) {
    throw new Error('Meta Cloud API no configurada.');
  }

  const formattedPhone = formatPhoneNumber(phone);
  const buffer = Buffer.isBuffer(bufferOrBase64)
    ? bufferOrBase64
    : Buffer.from(bufferOrBase64, 'base64');

  // Subir primero el media a Meta
  const mediaId = await uploadMetaMedia(buffer, filename, 'application/pdf');

  // Enviar mensaje con el media ID
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formattedPhone,
    type: 'document',
    document: {
      id: mediaId,
      filename: filename || 'Reporte_AgroPaccioli.pdf',
      caption: caption || ''
    }
  };

  const res = await fetch(`${GRAPH_BASE_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || 'Error enviando documento por Meta Cloud API');
  }

  return { success: true, messageId: data.messages?.[0]?.id };
}

/**
 * Envía una plantilla oficial aprobada por Meta (Template / HSM)
 */
export async function sendMetaTemplateMessage(phone, templateName, languageCode = 'es', components = []) {
  const { token, phoneNumberId } = getMetaConfig();
  if (!token || !phoneNumberId) {
    throw new Error('Meta Cloud API no configurada.');
  }

  const formattedPhone = formatPhoneNumber(phone);

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formattedPhone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: components
    }
  };

  const res = await fetch(`${GRAPH_BASE_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || 'Error enviando plantilla Meta');
  }

  return { success: true, messageId: data.messages?.[0]?.id };
}
