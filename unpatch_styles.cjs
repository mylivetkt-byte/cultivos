const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components', 'Contabilidad_y_Finanzas');

const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

const replacements = [
  { search: /background:\s*'var\(--card-bg\)', color:\s*'var\(--text\)'/g, replace: "background: 'white'" },
  { search: /background:\s*'var\(--bg-main\)'/g, replace: "background: '#f8fafc'" },
  { search: /background:\s*'var\(--border\)'/g, replace: "background: '#e2e8f0'" },
  { search: /color:\s*'var\(--text\)'/g, replace: "color: '#334155'" },
  { search: /color:\s*'var\(--text-muted\)'/g, replace: "color: '#64748b'" },
  { search: /border:\s*'1px solid var\(--border\)'/g, replace: "border: '1px solid #cbd5e1'" },
  { search: /borderBottom:\s*'1px solid var\(--border\)'/g, replace: "borderBottom: '1px solid #e2e8f0'" },
  { search: /borderBottom:\s*'2px solid var\(--border\)'/g, replace: "borderBottom: '2px solid #cbd5e1'" }
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
    console.log(`Un-patched ${file}`);
    modifiedCount++;
  }
}

console.log(`Done. Un-patched ${modifiedCount} files.`);
