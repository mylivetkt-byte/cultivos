const fs = require('fs');
const filePath = 'c:/sas-app/src/config/navigation.jsx';
let nav = fs.readFileSync(filePath, 'utf8');
nav = nav.replace(
  "{ id: 'cultivos_catalogo', name: 'Catálogo de Cultivos' },",
  "{ id: 'cultivos_catalogo', name: 'Catálogo de Cultivos (Súper)', path: '/agricultura/catalogo-cultivos-super' },"
);
fs.writeFileSync(filePath, nav);
