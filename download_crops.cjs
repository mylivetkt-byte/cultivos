const fs = require('fs');
const https = require('https');
const path = require('path');

const CROP_IMAGES = {
  'cacao': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Cacao_pod_on_tree.jpg/320px-Cacao_pod_on_tree.jpg',
  'platano': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Plantains.jpg/320px-Plantains.jpg',
  'banano': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Bananas.jpg/320px-Bananas.jpg',
  'palma': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Oil_Palm_Plantation.jpg/320px-Oil_Palm_Plantation.jpg',
  'arroz': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Rice_Plantation.jpg/320px-Rice_Plantation.jpg',
  'cafe': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Roasted_coffee_beans.jpg/320px-Roasted_coffee_beans.jpg',
  'aguacate': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Avocado_Hass_-_single_and_halved.jpg/320px-Avocado_Hass_-_single_and_halved.jpg',
  'maiz': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Corn.jpg/320px-Corn.jpg',
  'soya': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Soybean.USDA.jpg/320px-Soybean.USDA.jpg',
  'cana': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Sugar_cane_plantation.jpg/320px-Sugar_cane_plantation.jpg'
};

const dir = path.join(__dirname, 'public', 'crops');
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

Object.entries(CROP_IMAGES).forEach(([key, url]) => {
  const dest = path.join(dir, `${key}.jpg`);
  const options = {
    headers: {
      'User-Agent': 'AgroPaccioli/1.0 (test@example.com)'
    }
  };
  https.get(url, options, (res) => {
    if (res.statusCode === 200) {
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close());
    } else {
      console.log(`Failed to download ${key}: ${res.statusCode}`);
    }
  }).on('error', (err) => {
    console.error(`Error downloading ${key}:`, err.message);
  });
});
