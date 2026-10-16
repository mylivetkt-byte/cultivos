// NUCLEO DEL BOT DE WHATSAPP (Baileys).
// Este módulo SOLO se importa desde `server/whatsapp-bot.js` (proceso aislado).
// La comunicación con el API principal se hace vía mini-API HTTP en 127.0.0.1.
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import fetch from 'node-fetch';

let sock = null;
let currentQR = '';
let isConnected = false;

export async function connectToWhatsApp() {
    if (sock) return; // ya conectado/started
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
                sock = null;
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

    // Escuchar mensajes entrantes para IA
    sock.ev.on('messages.upsert', async (m) => {
        if (m.type === 'notify') {
            for (const msg of m.messages) {
                if (!msg.key.fromMe && msg.message) {
                    const from = msg.key.remoteJid.split('@')[0];
                    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
                    const messageId = msg.key.id;
                    
                    if (text) {
                        try {
                            const API_URL = process.env.VITE_API_URL || 'http://127.0.0.1:3002';
                            await fetch(`${API_URL}/api/ia/baileys_webhook`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ phone: from, text, messageId })
                            });
                        } catch (err) {
                            console.error('Error enviando a IA webhook:', err);
                        }
                    }
                }
            }
        }
    });
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