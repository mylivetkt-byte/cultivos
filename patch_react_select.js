import fs from 'fs';
import path from 'path';

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('from \'react-select\'') && !content.includes('from \'react-select/async\'')) {
    return;
  }
  
  if (filePath.endsWith('PremiumSelect.jsx')) return;
  
  let modified = false;

  if (!content.includes('customStyles')) {
    const srcDir = path.resolve('./src');
    const premiumPath = path.join(srcDir, 'components', 'PremiumSelect');
    
    let relativePath = path.relative(path.dirname(filePath), premiumPath);
    if (!relativePath.startsWith('.')) {
      relativePath = './' + relativePath;
    }
    relativePath = relativePath.replace(/\\/g, '/');

    const importStatement = `import { customStyles } from '${relativePath}';\n`;
    
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const endOfLastImport = content.indexOf('\n', lastImportIndex);
      content = content.slice(0, endOfLastImport + 1) + importStatement + content.slice(endOfLastImport + 1);
      modified = true;
    }
  }

  const regex = /<(AsyncSelect|Select)([\s\S]*?)>/g;
  content = content.replace(regex, (match, p1, p2) => {
    if (match.includes('styles={')) return match; 
    return `<${p1} styles={customStyles}${p2}>`;
  });
  
  if (content !== fs.readFileSync(filePath, 'utf8')) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Patched:', filePath);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      processFile(fullPath);
    }
  }
}

walk(path.resolve('./src'));
