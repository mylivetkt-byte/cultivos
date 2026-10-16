const fs = require('fs');
const filePath = 'c:/sas-app/src/App.jsx';
let app = fs.readFileSync(filePath, 'utf8');

if (!app.includes('SuperCultivosCatalogo')) {
  // Import
  const importStr = "import SuperCultivosCatalogo from './components/Agriculture/SuperCultivosCatalogo.jsx';\\n";
  const lastImportIndex = app.lastIndexOf('import ');
  const endOfLastImport = app.indexOf('\\n', lastImportIndex);
  app = app.slice(0, endOfLastImport + 1) + importStr + app.slice(endOfLastImport + 1);

  // Route
  const routeStr = '          <Route path="/agricultura/catalogo-cultivos" element={<SuperCultivosCatalogo />} />\n';
  const marker = '<Route path="/agricultura/recetario"';
  app = app.replace(marker, routeStr + marker);

  fs.writeFileSync(filePath, app);
  console.log('App.jsx updated with SuperCultivosCatalogo route.');
} else {
  console.log('App.jsx already has SuperCultivosCatalogo.');
}
