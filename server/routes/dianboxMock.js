import express from 'express';
const router = express.Router();

// Mock API for DianBox ping
router.get('/ping', (req, res) => {
  const apiKey = req.headers['authorization'];
  if (!apiKey || apiKey !== 'Bearer mock-api-key-12345') {
    return res.status(401).json({ success: false, error: 'Credenciales inválidas en DianBox (Mock)' });
  }
  res.json({ success: true, message: 'Conexión exitosa con DianBox Sandbox (Mock)', environment: 'Sandbox' });
});

// Mock API for sending electronic invoice
router.post('/emitir', (req, res) => {
  const apiKey = req.headers['authorization'];
  if (!apiKey || apiKey !== 'Bearer mock-api-key-12345') {
    return res.status(401).json({ success: false, error: 'No autorizado' });
  }

  const { emisor, cliente, items, totales } = req.body;
  
  // Basic validation to simulate DIAN strictness
  if (!cliente || !cliente.email) {
    return res.status(400).json({ success: false, error: 'Rechazo DIAN: El cliente debe tener un correo electrónico válido (Regla 1.2.3)' });
  }
  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, error: 'Rechazo DIAN: La factura debe contener al menos un ítem' });
  }

  // Generate mock CUFE (SHA384 hex simulation)
  const mockCufe = Array.from({length: 96}, () => Math.floor(Math.random()*16).toString(16)).join('');
  const qrData = `NumFac: ${emisor?.prefijo}1\nFecFac: ${new Date().toISOString().substring(0,10)}\nNitFac: ${emisor?.nit}\nDocAdq: ${cliente?.documento}\nValFac: ${totales?.total}\nValIva: ${totales?.iva}\nCUFE: ${mockCufe}`;

  // Simulate delay
  setTimeout(() => {
    res.json({
      success: true,
      message: 'Documento validado y aprobado por la DIAN (Mock)',
      cufe: mockCufe,
      qr_code: qrData,
      status: 'Aprobado',
      pdf_url: `https://dianbox-mock.local/downloads/${mockCufe}.pdf`,
      xml_url: `https://dianbox-mock.local/downloads/${mockCufe}.xml`
    });
  }, 800); // 800ms to feel real
});

export default router;
