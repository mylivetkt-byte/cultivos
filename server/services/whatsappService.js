import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';

let sock = null;
let currentQR = '';
let isConnected = false;

export async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    // Configurar pino para no saturar los logs
    const logger = pino({ level: 'silent' });
    
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            try {
                currentQR = await QRCode.toDataURL(qr);
                console.log('Nuevo QR generado para WhatsApp.');
            } catch (err) {
                console.error("Error generando QR", err);
            }
        }

        if (connection === 'close') {
            isConnected = false;
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Conexión de WhatsApp cerrada. Reconectando:', shouldReconnect);
            if (shouldReconnect) {
                setTimeout(connectToWhatsApp, 3000);
            } else {
                console.log('WhatsApp desconectado manualmente.');
                currentQR = '';
            }
        } else if (connection === 'open') {
            isConnected = true;
            currentQR = '';
            console.log('✅ Bot de WhatsApp conectado correctamente!');
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

export function getStatus() {
    return { connected: isConnected, qr: currentQR };
}

export async function logoutWhatsApp() {
    if (sock) {
        await sock.logout();
    }
}

export async function sendTextMessage(phone, text) {
    if (!isConnected || !sock) throw new Error("WhatsApp no está conectado.");
    const jid = `${phone}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text });
}

export async function sendDocumentMessage(phone, buffer, filename, caption) {
    if (!isConnected || !sock) throw new Error("WhatsApp no está conectado.");
    const jid = `${phone}@s.whatsapp.net`;
    await sock.sendMessage(jid, {
        document: buffer,
        mimetype: 'application/pdf',
        fileName: filename,
        caption: caption
    });
}

export async function sendPdfReport(phone, pdfBase64, filename, caption = '') {
  if (!isConnected || !sock) throw new Error('WhatsApp no está conectado.');
  const buffer = Buffer.from(pdfBase64, 'base64');
  await sendDocumentMessage(phone, buffer, filename, caption);
}
