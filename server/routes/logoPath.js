import express from 'express';
import { getConfig, setLogoPath } from '../models/configEmpresa.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// GET logo path for the current tenant (uses auth middleware to set req.tenantId)
router.get('/', async (req, res) => {
  const tenantId = req.tenantId || req.query.tenantId;
  if (!tenantId) return res.status(400).json({ error: 'tenantId requerido' });
  try {
    const config = await getConfig(tenantId);
    res.json({ logo_path: config.logo_path || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST to set logo path
router.post('/', async (req, res) => {
  const tenantId = req.tenantId || req.body.tenantId;
  const { logoPath, base64 } = req.body;
  
  if (!tenantId) return res.status(400).json({ error: 'tenantId requerido' });
  
  try {
    let finalPath = logoPath;
    
    // If base64 is provided, save it to disk
    if (base64) {
      const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const ext = matches[1].split('/')[1] === 'jpeg' ? 'jpg' : 'png';
        const buffer = Buffer.from(matches[2], 'base64');
        const filename = `logo_${tenantId}_${Date.now()}.${ext}`;
        const uploadsDir = path.join(process.cwd(), 'uploads');
        
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        fs.writeFileSync(path.join(uploadsDir, filename), buffer);
        finalPath = `/uploads/${filename}`;
      }
    }
    
    if (!finalPath) return res.status(400).json({ error: 'logoPath o base64 requerido' });

    await setLogoPath(tenantId, finalPath);
    res.json({ success: true, logo_path: finalPath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

export default router;
