import { config } from 'dotenv';
config();

/**
 * sendWaterRecord - Envía una notificación por WhatsApp con los datos del registro de agua.
 * Utiliza las variables de entorno:
 *   WHATSAPP_API_URL   – URL del endpoint de la API de WhatsApp.
 *   WHATSAPP_TOKEN     – Token de autorización (Bearer).
 *   ADMIN_NUMBERS      – Lista de números separados por coma (e.g., "+521234567890,+5210987654321").
 */
export async function sendWaterRecord(record) {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const token = process.env.WHATSAPP_TOKEN;
  const admins = (process.env.ADMIN_NUMBERS || '').split(',').filter(Boolean);
  if (!apiUrl || !token || admins.length === 0) {
    console.warn('[WhatsApp] Configuración incompleta, omitiendo envío.');
    return;
  }

  const payload = {
    to: admins,
    type: 'template',
    template: {
      name: 'water_record_notification',
      language: { code: 'es' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: record.waterOption },
            { type: 'text', text: record.fecha_inicio },
            { type: 'text', text: record.fecha_fin },
            { type: 'text', text: record.id_finca?.toString() || '' },
            { type: 'text', text: record.id_lote?.toString() || '' },
            { type: 'text', text: record.id_semillero?.toString() || '' },
            { type: 'text', text: record.observaciones || '' }
          ]
        }
      ]
    }
  };

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error('[WhatsApp] Error al enviar mensaje:', res.status, txt);
    } else {
      console.info('[WhatsApp] Notificación enviada correctamente.');
    }
  } catch (err) {
    console.error('[WhatsApp] Excepción al enviar mensaje:', err);
  }
}
