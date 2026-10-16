const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components', 'Contabilidad_y_Finanzas');

const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx') || f.endsWith('.css'));

const replacements = [
  { search: /color\s*=\s*'#0f172a'/g, replace: "color = '#38bdf8'" },
  { search: /color\s*:\s*'#0f172a'/g, replace: "color: '#38bdf8'" },
  { search: /color\s*:\s*#0f172a/g, replace: "color: #38bdf8" },
  
  { search: /color\s*=\s*'#1e293b'/g, replace: "color = '#7dd3fc'" },
  { search: /color\s*:\s*'#1e293b'/g, replace: "color: '#7dd3fc'" },
  
  { search: /color\s*=\s*'#334155'/g, replace: "color = 'var(--text-primary)'" },
  { search: /color\s*:\s*'#334155'/g, replace: "color: 'var(--text-primary)'" },
  { search: /color\s*:\s*#334155/g, replace: "color: var(--text-primary)" },
  
  { search: /color\s*=\s*'#475569'/g, replace: "color = 'var(--text-muted)'" },
  { search: /color\s*:\s*'#475569'/g, replace: "color: 'var(--text-muted)'" },
  
  { search: /borderBottom:\s*'1px solid #f1f5f9'/g, replace: "borderBottom: '1px solid var(--border)'" }
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
    console.log(`Patched row colors ${file}`);
    modifiedCount++;
  }
}

console.log(`Done. Patched row colors in ${modifiedCount} files.`);
