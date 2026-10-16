import http from 'http';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'dev-only-secret-cambiar-en-produccion-new-12345';
const token = jwt.sign({
  id_usuario: 1,
  username: 'admin',
  id_tenant: 1,
  db_name: 'sas_agricolas'
}, JWT_SECRET, { expiresIn: '24h' });

async function authFetch(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3002,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data.substring(0, 100) }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function test() {
  const reqs = [
    '/api/tables/modules',
    '/api/table/fincas/data',
    '/api/table/nucleos/data',
    '/api/table/finca',
    '/api/table/lotes/data',
    '/api/table/viveros/data',
    '/api/water'
  ];
  
  console.log('Sending requests with token...');
  try {
    const results = await Promise.all(reqs.map(path => authFetch(path).catch(e => ({ error: e.message }))));
    console.log(results);
  } catch (err) {
    console.error(err);
  }
}

test();
