const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const token = jwt.sign({ id_usuario: 1, id_tenant: 1 }, process.env.JWT_SECRET || 'sas_agricolas_secret_2026', { expiresIn: '1h' });

const options = {
  hostname: 'localhost',
  port: 3002,
  path: '/api/rrhh-cuadrillas?tenantId=1',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

const req = http.request(options, res => {
  console.log(`STATUS: ${res.statusCode}`);
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('Result length:', Array.isArray(parsed) ? parsed.length : 'Not array');
      console.log('Sample:', Array.isArray(parsed) ? parsed[0] : parsed);
    } catch (e) {
      console.log('Raw data:', data);
    }
  });
});

req.on('error', error => {
  console.error(error);
});

req.end();
