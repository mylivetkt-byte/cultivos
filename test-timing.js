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
  `${BASE}/tables/modules`,
  `${BASE}/tables/finca?tenantId=1`,
  `${BASE}/table/lotes/data`,
  `${BASE}/table/viveros/data?tenantId=1`,
  `${BASE}/water/options`,
  `${BASE}/water?tenantId=1`
];

async function run() {
  for (let i = 0; i < reqs.length; i++) {
    const url = reqs[i];
    console.log(`[${new Date().toISOString()}] Starting req ${i}: ${url}`);
    const start = Date.now();
    try {
      const res = await fetch(url, { headers: HEADERS });
      const text = await res.text();
      console.log(`[${new Date().toISOString()}] Finished req ${i} in ${Date.now() - start}ms. Status: ${res.status}. Output length: ${text.length}`);
    } catch (e) {
      console.log(`[${new Date().toISOString()}] Failed req ${i} in ${Date.now() - start}ms. Error: ${e.message}`);
    }
  }
}
run();
