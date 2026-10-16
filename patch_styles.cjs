const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components', 'Contabilidad_y_Finanzas');

const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

const replacements = [
  { search: /background:\s*'white'/g, replace: "background: 'var(--card-bg)', color: 'var(--text)'" },
  { search: /background:\s*'#f8fafc'/g, replace: "background: 'var(--bg-main)'" },
  { search: /background:\s*'#f1f5f9'/g, replace: "background: 'var(--bg-main)'" },
  { search: /background:\s*'#e2e8f0'/g, replace: "background: 'var(--border)'" },
  { search: /color:\s*'#334155'/g, replace: "color: 'var(--text)'" },
  { search: /color:\s*'#475569'/g, replace: "color: 'var(--text-muted)'" },
  { search: /color:\s*'#64748b'/g, replace: "color: 'var(--text-muted)'" },
  { search: /color:\s*'#0f172a'/g, replace: "color: 'var(--text)'" },
  { search: /border:\s*'1px solid #cbd5e1'/g, replace: "border: '1px solid var(--border)'" },
  { search: /border:\s*'1px solid #e2e8f0'/g, replace: "border: '1px solid var(--border)'" },
  { search: /borderBottom:\s*'1px solid #e2e8f0'/g, replace: "borderBottom: '1px solid var(--border)'" },
  { search: /borderBottom:\s*'2px solid #cbd5e1'/g, replace: "borderBottom: '2px solid var(--border)'" }
];

let modifiedCount = 0;

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  for (const { search, replace } of replacements) {
    content = content.replace(search, replace);
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Patched ${file}`);
    modifiedCount++;
  }
}

console.log(`Done. Patched ${modifiedCount} files.`);
