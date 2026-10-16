// Limpieza del código legacy comentado en src/App.jsx (refactor del Paso 4).
// Elimina el bloque entre las anclas generadas durante el refactor:
//      {/* legacy_removido:  →  --fin_legacy */}
// Uso:  npm run cleanup:legacy    (luego: npm run build)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, '..', 'src', 'App.jsx');

let code = fs.readFileSync(file, 'utf8');
const startMark = '{/* legacy_removido:';
const endMark = '--fin_legacy */}';

const start = code.indexOf(startMark);
const end = code.indexOf(endMark, start);

if (!code.includes('SelectedTableContent')) {
  console.error('❌ src/App.jsx no usa SelectedTableContent. Abortando por seguridad.');
  process.exit(1);
}

if (start === -1 || end === -1) {
  console.error('✅ No se encontraron las anclas legacy: nada que limpiar.');
  process.exit(0);
}
if (start > end) {
  console.error('❌ Orden de anclas invertido. Revisa src/App.jsx. Nada se modificó.');
  process.exit(1);
}

const clean = code.slice(0, start) + code.slice(end + endMark.length);
fs.writeFileSync(file, clean, 'utf8');

const removedLines = code.slice(start, end + endMark.length).split('\n').length;
console.log(`✅ Bloque legacy eliminado de src/App.jsx (${removedLines} líneas menos).`);
console.log('👉 Ejecuta "npm run build" para validar.');