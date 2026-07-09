import fetch from 'node-fetch';
(async () => {
  try {
    const res = await fetch('http://localhost:3002/api/gis/fincas_debug');
    const data = await res.json();
    console.log('🛠️ fincas_debug response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('❌ error:', err);
  }
})();
