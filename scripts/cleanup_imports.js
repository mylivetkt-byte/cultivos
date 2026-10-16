// Análisis y limpieza de imports sin uso en src/App.jsx (post Paso 4).
// Uso:
//   node scripts/cleanup_imports.js          → modo reporte (dry-run)
//   node scripts/cleanup_imports.js --apply  → elimina los imports sin uso
// Orden sugerido: npm run cleanup:legacy → npm run cleanup:imports -- --apply → npm run build
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, '..', 'src', 'App.jsx');
const APPLY = process.argv.includes('--apply');

let code = fs.readFileSync(file, 'utf8');

// 1) Quitar el bloque legacy comentado si aún existe (misma estrategia que cleanup_legacy.js)
const startMark = '{/* legacy_removido:';
const endMark = '--fin_legacy */}';
let removedLegacy = 0;
{
  const s = code.indexOf(startMark);
  const e = code.indexOf(endMark, s);
  if (s !== -1 && e > s) {
    removedLegacy = code.slice(s, e + endMark.length).split('\n').length;
    code = code.slice(0, s) + code.slice(e + endMark.length);
  }
}

const lines = code.split('\n');

// 2) Parsear imports de una sola línea (default, named y namespace)
const imports = [];
lines.forEach((line, i) => {
  if (/^\s*import\s+['"]/.test(line)) return; // import '...' (side-effect) → no tocar
  if (!/^\s*import\s/.test(line)) return;

  const body = line.match(/^\s*import\s+([^=]+?)\s+from\s+['"][^'"]+['"]/);
  if (!body) return;

  const spec = body[1].trim();
  const names = [];

  if (spec.startsWith('*')) {
    const m = spec.match(/^\*\s+as\s+(\w+)/);
    if (m) names.push(m[1]);
  } else if (spec.startsWith('{')) {
    const inner = spec.replace(/^\{/, '').replace(/\}$/, '').trim();
    if (inner) {
      inner.split(',').forEach((part) => {
        const pm = part.trim().match(/(\w+)\s*(?:\s+as\s+(\w+))?$/);
        if (pm) names.push(pm[2] || pm[1]);
      });
    }
  } else {
    names.push(spec.trim());
  }

  if (names.length) imports.push({ index: i, line, names });
});

// 3) Detectar usos fuera de las líneas de import
const unused = imports
  .filter(({ index, names }) => {
    // React se conserva por seguridad del entorno JSX/refactor
    if (names.length === 1 && names[0] === 'React') return false;

    return names.every((n) => {
      const re = new RegExp(`\\b${n}\\b`, 'g');
      let count = 0;
      lines.forEach((l, i) => {
        if (i === index) return; // su propia línea de import no cuenta
        if (/^\s*import\s/.test(l)) return; // otras líneas de import no cuentan
        const matches = l.match(re);
        if (matches) count += matches.length;
      });
      return count === 0;
    });
  })
  .map(({ index, line, names }) => ({ index, line, names }));

// 4) Reporte y/o aplicación
if (!unused.length) {
  console.log('✅ No se detectaron imports sin uso en src/App.jsx.');
} else {
  console.log(`⚠️ Se detectaron ${unused.length} imports sin uso:`);
  unused.forEach((u) => console.log(`   ${u.line.trim()}`));
}

if (removedLegacy) {
  console.log(`(se eliminó además el bloque legacy: ${removedLegacy} líneas)`);
}

if (APPLY && unused.length) {
  const indices = new Set(unused.map((u) => u.index));
  const newLines = lines.filter((_, i) => !indices.has(i));
  fs.writeFileSync(file, newLines.join('\n'), 'utf8');
  console.log(`✅ Aplicado: ${unused.length} imports eliminados de src/App.jsx.`);
  console.log('👉 Ejecuta "npm run build" para validar.');
}