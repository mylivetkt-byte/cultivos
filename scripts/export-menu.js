import fs from 'fs';
import path from 'path';
import expressListEndpoints from 'express-list-endpoints';
import app from '../server/index.js';

(async () => {
  try {
    const endpoints = expressListEndpoints(app);
    const routes = endpoints.map(e => ({ method: e.methods.join(','), path: e.path }));
    const outPath = path.resolve('backup', 'menu-snapshot.json');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(routes, null, 2), 'utf-8');
    console.log('Menu snapshot saved to', outPath);
  } catch (err) {
    console.error('Error exporting menu', err);
  }
})();