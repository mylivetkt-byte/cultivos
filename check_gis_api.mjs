import fetch from 'node-fetch';

async function main() {
  try {
    const res = await fetch('http://localhost:3002/api/gis/fincas');
    const data = await res.json();
    console.log('🛰️ GIS API response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('❌ Error fetching GIS API:', err);
    process.exit(1);
  }
}

main();
