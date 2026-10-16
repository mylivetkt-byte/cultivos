import { generateToken } from './server/utils/auth.js';
import fetch from 'node-fetch';

async function testModules() {
  try {
    const token = generateToken({
      id_usuario: 1,
      username: 'admin',
      id_tenant: 1,
      db_name: 'sas_agricolas_db',
      rol: 'admin'
    });
    
    console.log('Fetching modules...');
    const res = await fetch('http://localhost:3002/api/tables/modules', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response:', text.substring(0, 100) + '...');
  } catch (err) {
    console.error('Error:', err);
  }
}

testModules();
