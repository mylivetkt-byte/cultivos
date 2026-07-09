import express from 'express';
import pool from '../db.js';

const router = express.Router();

function getDb(req) {
  return req.tenantPool || pool;
}

// Copernicus CDSE OIDC Token Endpoint
const CDSE_TOKEN_URL = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';

// Default presentation connections are loaded by seed_presentacion_real.cjs.
async function seedSentinelConnections() {
  return true;
}

// Seed function is now only called on specific routes instead of on startup.

// GET /api/satellite/connections
router.get('/connections', async (req, res) => {
  try {
    await seedSentinelConnections();

    const [rows] = await getDb(req).query(
      `SELECT id_conexion, id_tenant, proveedor, api_key, endpoint_url, fecha_expiracion,
              email, token_type, access_token_expires
       FROM sat_api_conexiones`
    );
    const safeRows = rows.map(r => ({
      ...r,
      has_access_token: !!(r.access_token || r.access_token_expires)
    }));
    res.json(safeRows);
  } catch (err) {
    console.error('Error fetching satellite connections:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/satellite/save/:id
router.post('/save/:id', async (req, res) => {
  const { id } = req.params;
  const { api_key } = req.body;
  try {
    const defaultExp = new Date();
    defaultExp.setDate(defaultExp.getDate() + 30);
    const expStr = defaultExp.toISOString().slice(0, 10);

    await getDb(req).query(
      "UPDATE sat_api_conexiones SET api_key = ?, fecha_expiracion = ?, token_type = 'mock' WHERE id_conexion = ?",
      [api_key, api_key ? expStr : null, id]
    );

    const [rows] = await getDb(req).query(
      "SELECT id_conexion, id_tenant, proveedor, api_key, endpoint_url, fecha_expiracion, email, token_type, access_token_expires FROM sat_api_conexiones WHERE id_conexion = ?",
      [id]
    );

    res.json({ success: true, message: 'Token guardado correctamente.', connection: rows[0] });
  } catch (err) {
    console.error('Error saving satellite token:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/satellite/authenticate/:id
router.post('/authenticate/:id', async (req, res) => {
  const { id } = req.params;
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Se requieren email y password.' });
  }

  try {
    const [rows] = await getDb(req).query("SELECT * FROM sat_api_conexiones WHERE id_conexion = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Conexión no encontrada.' });

    const response = await fetch(CDSE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'password',
        username: email,
        password: password,
        client_id: 'cdse-public'
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(401).json({ success: false, error: data.error_description || 'Autenticación fallida.' });

    const now = Date.now();
    const accessTokenExpires = new Date(now + (data.expires_in || 300) * 1000);
    const refreshTokenExpires = new Date(now + (data.refresh_expires_in || 1800) * 1000);

    await getDb(req).query(
      `UPDATE sat_api_conexiones SET api_key = ?, fecha_expiracion = ?, email = ?, token_type = 'real', access_token = ?, access_token_expires = ? WHERE id_conexion = ?`,
      [data.refresh_token, refreshTokenExpires.toISOString().slice(0, 19).replace('T', ' '), email, data.access_token, accessTokenExpires.toISOString().slice(0, 19).replace('T', ' '), id]
    );

    const [updatedRows] = await getDb(req).query("SELECT * FROM sat_api_conexiones WHERE id_conexion = ?", [id]);
    res.json({ success: true, connection: updatedRows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/satellite/status/:id
router.get('/status/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await getDb(req).query("SELECT * FROM sat_api_conexiones WHERE id_conexion = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Conexión no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/satellite/refresh/:id
router.post('/refresh/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await getDb(req).query("SELECT * FROM sat_api_conexiones WHERE id_conexion = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Conexión no encontrada.' });

    const conn = rows[0];
    const apiKey = conn.api_key;
    
    let isMockKey = !apiKey || apiKey.startsWith('api_key_') || apiKey.startsWith('token_test_') || apiKey.startsWith('mock_session_token_');
    
    if (conn.token_type === 'mock' || isMockKey) {
      const expDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const autoToken = apiKey || `presentacion_real_session_${id}`;
      await getDb(req).query("UPDATE sat_api_conexiones SET api_key = ?, fecha_expiracion = ?, token_type = 'mock' WHERE id_conexion = ?", [autoToken, expDate, id]);
      const [updatedRows] = await getDb(req).query("SELECT * FROM sat_api_conexiones WHERE id_conexion = ?", [id]);
      return res.json({ success: true, message: 'Token de sesión autogenerado.', connection: updatedRows[0] });
    }

    try {
      const response = await fetch(CDSE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: apiKey, client_id: 'cdse-public' })
      });

      const data = await response.json();
      if (response.ok) {
        const expDate = new Date(Date.now() + (data.refresh_expires_in || 1800) * 1000).toISOString().slice(0, 19).replace('T', ' ');
        const accessExpDate = new Date(Date.now() + (data.expires_in || 600) * 1000).toISOString().slice(0, 19).replace('T', ' ');
        await getDb(req).query("UPDATE sat_api_conexiones SET api_key = ?, fecha_expiracion = ?, access_token = ?, access_token_expires = ? WHERE id_conexion = ?", [data.refresh_token, expDate, data.access_token, accessExpDate, id]);
        const [updatedRows] = await getDb(req).query("SELECT * FROM sat_api_conexiones WHERE id_conexion = ?", [id]);
        return res.json({ success: true, connection: updatedRows[0] });
      } else {
        throw new Error('Refresh failed');
      }
    } catch (err) {
      const expDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const autoToken = `presentacion_real_session_${id}`;
      await getDb(req).query("UPDATE sat_api_conexiones SET api_key = ?, fecha_expiracion = ?, token_type = 'mock' WHERE id_conexion = ?", [autoToken, expDate, id]);
      const [updatedRows] = await getDb(req).query("SELECT * FROM sat_api_conexiones WHERE id_conexion = ?", [id]);
      return res.json({ success: true, message: 'Fallback to mock.', connection: updatedRows[0] });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function getAccessToken(id) {
  const [rows] = await getDb(req).query("SELECT * FROM sat_api_conexiones WHERE id_conexion = ?", [id]);
  if (rows.length === 0) throw new Error('Conexión no encontrada.');
  const conn = rows[0];
  let apiKey = conn.api_key;

  const isMock = !apiKey || apiKey.startsWith('api_key_') || apiKey.startsWith('token_test_') || apiKey.startsWith('mock_session_token_');
  if (conn.token_type === 'mock' || isMock) return apiKey;
  
  if (conn.token_type === 'real' && conn.access_token && conn.access_token_expires) {
    if (new Date(conn.access_token_expires).getTime() - Date.now() > 60000) return conn.access_token;
  }

  const response = await fetch(CDSE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: apiKey, client_id: 'cdse-public' })
  });

  const data = await response.json();
  if (!response.ok) throw new Error('Fallo al refrescar token.');

  if (data.refresh_token) {
    const expDate = new Date(Date.now() + (data.refresh_expires_in || 1800) * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const accessExpDate = new Date(Date.now() + (data.expires_in || 600) * 1000).toISOString().slice(0, 19).replace('T', ' ');
    await getDb(req).query("UPDATE sat_api_conexiones SET api_key = ?, fecha_expiracion = ?, access_token = ?, access_token_expires = ? WHERE id_conexion = ?", [data.refresh_token, expDate, data.access_token, accessExpDate, id]);
  }
  return data.access_token;
}

// GET /api/satellite/:id/workflows
router.get('/:id/workflows', async (req, res) => {
  const { id } = req.params;
  try {
    const token = await getAccessToken(id);
    
    if (token.startsWith('mock_session_token_') || token.startsWith('api_key_') || token.startsWith('token_test_')) {
      const [rows] = await getDb(req).query(`
        SELECT workflow_id AS Id, name AS Name, display_name AS DisplayName, output_product_type AS OutputProductType
        FROM sat_workflows_presentacion
        WHERE id_conexion = ?
        ORDER BY id_workflow
      `, [id]);
      return res.json(rows);
    }

    const response = await fetch('https://odp.dataspace.copernicus.eu/odata/v1/Workflows', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    res.json(data.value || data);
  } catch (err) {
    console.error('[ODP] Error fetching workflows:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/satellite/:id/orders
router.get('/:id/orders', async (req, res) => {
  const { id } = req.params;
  try {
    const token = await getAccessToken(id);

    if (token.startsWith('mock_session_token_') || token.startsWith('api_key_') || token.startsWith('token_test_')) {
      const [orders] = await getDb(req).query(`
        SELECT order_id AS Id, workflow_name AS WorkflowName,
               DATE_FORMAT(submission_date, '%Y-%m-%dT%H:%i:%s.000Z') AS SubmissionDate,
               status AS Status
        FROM sat_orders_presentacion
        WHERE id_conexion = ?
        ORDER BY submission_date DESC
      `, [id]);
      return res.json(orders);
    }

    const response = await fetch('https://odp.dataspace.copernicus.eu/odata/v1/ProductionOrders', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    res.json(data.value || data);
  } catch (err) {
    console.error('[ODP] Error fetching production orders:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/satellite/:id/orders
router.post('/:id/orders', async (req, res) => {
  const { id } = req.params;
  const { workflowName, productReference } = req.body;
  
  if (!workflowName || !productReference) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: workflowName, productReference.' });
  }
  
  try {
    const token = await getAccessToken(id);

    if (token.startsWith('mock_session_token_') || token.startsWith('api_key_') || token.startsWith('token_test_')) {
      const orderId = `order-${Date.now()}`;
      await getDb(req).query(`
        INSERT INTO sat_orders_presentacion (id_conexion, order_id, workflow_name, submission_date, status)
        VALUES (?, ?, ?, NOW(), 'queued')
      `, [id, orderId, workflowName]);
      const [[newOrder]] = await getDb(req).query(`
        SELECT order_id AS Id, workflow_name AS WorkflowName,
               DATE_FORMAT(submission_date, '%Y-%m-%dT%H:%i:%s.000Z') AS SubmissionDate,
               status AS Status
        FROM sat_orders_presentacion
        WHERE id_conexion = ? AND order_id = ?
      `, [id, orderId]);
      return res.json(newOrder);
    }

    const response = await fetch('https://odp.dataspace.copernicus.eu/odata/v1/ProductionOrder/OData.CSC.Order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        WorkflowName: workflowName,
        InputProductReference: {
          Reference: productReference
        },
        Priority: 1,
        Name: `${workflowName}_order_${Date.now()}`
      })
    });
    
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    res.json(data.value || data);
  } catch (err) {
    console.error('[ODP] Error creating production order:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/satellite/:id/process
router.post('/:id/process', async (req, res) => {
  const { id } = req.params;
  const { geometry, layerType, dateFrom, dateTo } = req.body;
  
  if (!geometry) {
    return res.status(400).json({ error: 'Falta geometry' });
  }

  try {
    const token = await getAccessToken(id);
    
    // Evaluate evalscript based on layerType
    let evalscript = "";
    if (layerType === 'NDVI') {
      evalscript = `//VERSION=3
function setup() {
  return { input: ["B08", "B04", "dataMask"], output: { bands: 4 } };
}
function evaluatePixel(sample) {
  let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  if (ndvi < 0) return [0.8, 0.8, 0.8, sample.dataMask];
  if (ndvi < 0.2) return [0.8, 0.2, 0.2, sample.dataMask];
  if (ndvi < 0.4) return [0.8, 0.8, 0.2, sample.dataMask];
  if (ndvi < 0.6) return [0.2, 0.8, 0.2, sample.dataMask];
  return [0, 0.4, 0, sample.dataMask];
}`;
    } else if (layerType === 'NDMI') {
      evalscript = `//VERSION=3
function setup() {
  return { input: ["B08", "B11", "dataMask"], output: { bands: 4 } };
}
function evaluatePixel(sample) {
  let ndmi = (sample.B08 - sample.B11) / (sample.B08 + sample.B11);
  if (ndmi < -0.2) return [0.8, 0.2, 0.2, sample.dataMask];
  if (ndmi < 0.2) return [0.8, 0.8, 0.2, sample.dataMask];
  if (ndmi < 0.4) return [0.2, 0.8, 0.8, sample.dataMask];
  return [0.2, 0.2, 0.8, sample.dataMask];
}`;
    } else {
      // Default RGB
      evalscript = `//VERSION=3
function setup() {
  return { input: ["B04", "B03", "B02", "dataMask"], output: { bands: 4 } };
}
function evaluatePixel(sample) {
  return [2.5 * sample.B04, 2.5 * sample.B03, 2.5 * sample.B02, sample.dataMask];
}`;
    }

    const to = dateTo || new Date().toISOString();
    const from = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const payload = {
      input: {
        bounds: {
          geometry: geometry
        },
        data: [
          {
            type: "sentinel-2-l2a",
            dataFilter: {
              timeRange: {
                from: from,
                to: to
              }
            }
          }
        ]
      },
      output: {
        width: 512,
        height: 512,
        responses: [
          {
            identifier: "default",
            format: {
              type: "image/png"
            }
          }
        ]
      },
      evalscript: evalscript
    };

    const response = await fetch('https://sh.dataspace.copernicus.eu/api/v1/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: 'Process API error', details: errText });
    }

    const buffer = await response.arrayBuffer();
    res.set('Content-Type', 'image/png');
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Error in Process API:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
