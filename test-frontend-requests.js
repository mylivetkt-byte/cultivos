import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'sas-agricolas-dev-only-insecure-secret';
const token = jwt.sign({
  id_usuario: 1,
  username: 'admin',
  id_tenant: 1,
  rol: 'Super_Admin',
  tenant_nombre: 'SAS Agricolas',
  db_name: 'sas_agricolas'
}, JWT_SECRET, { expiresIn: '24h' });

const HEADERS = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

const BASE = 'http://localhost:3002/api';

const reqs = [
  fetch(`${BASE}/tables/modules`, { headers: HEADERS }),
  fetch(`${BASE}/table/finca?tenantId=1`, { headers: HEADERS }),
  fetch(`${BASE}/table/lotes/data`, { headers: HEADERS }),
  fetch(`${BASE}/table/viveros/data?tenantId=1`, { headers: HEADERS }),
  fetch(`${BASE}/water/options`, { headers: HEADERS }),
  fetch(`${BASE}/water?tenantId=1`, { headers: HEADERS }),
];

Promise.all(reqs).then(async (responses) => {
  for (let i = 0; i < responses.length; i++) {
    const res = responses[i];
    console.log(`Req ${i} status:`, res.status);
    const text = await res.text();
    console.log(`Req ${i} body preview:`, text.substring(0, 100));
  }
}).catch(console.error);
