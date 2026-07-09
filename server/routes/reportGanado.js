import express from 'express';
import { generateReport } from '../services/pdfService.js';
import { sendPdfReport } from '../services/whatsappService.js';

const router = express.Router();

// GET /api/report/ganado?tenantId=...  -> returns base64 PDF
router.get('/ganado', async (req, res) => {
  const { tenantId } = req.query;
  if (!tenantId) return res.status(400).json({ error: 'tenantId requerido' });
  // Dummy data for report (replace with real data as needed)
  const data = { fecha: new Date().toLocaleDateString(), mensaje: 'Reporte Ganado/Herramientas' };
  try {
    const pdfBase64 = await generateReport(data, Number(tenantId));
    res.json({ pdfBase64 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error generando PDF' });
  }
});

// POST /api/report/ganado/send
// body: { tenantId, phone }
router.post('/ganado/send', async (req, res) => {
  const { tenantId, phone } = req.body;
  if (!tenantId || !phone) return res.status(400).json({ error: 'tenantId y phone requeridos' });
  const data = { fecha: new Date().toLocaleDateString(), mensaje: 'Reporte Ganado/Herramientas' };
  try {
    const pdfBase64 = await generateReport(data, Number(tenantId));
    await sendPdfReport(phone, pdfBase64, 'reporte_ganado.pdf');
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error enviando PDF' });
  }
});

export default router;
