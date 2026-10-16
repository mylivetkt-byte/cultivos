const fs = require('fs');

try {
  let content = fs.readFileSync('c:/sas-app/server/index.js', 'utf8');
  
  if (!content.includes('catalogo_cultivos_super.js')) {
    const importStr = "import catalogoCultivosSuperRouter from './routes/catalogo_cultivos_super.js';\\n";
    const useStr = "app.use('/api/catalogo_cultivos_super', auth, catalogoCultivosSuperRouter);\\n";
    
    // insert import
    const lastImportIndex = content.lastIndexOf('import ');
    const endOfLastImport = content.indexOf('\\n', lastImportIndex);
    content = content.slice(0, endOfLastImport + 1) + importStr + content.slice(endOfLastImport + 1);
    
    // insert app.use
    const lastUseIndex = content.lastIndexOf('app.use(');
    const endOfLastUse = content.indexOf('\\n', lastUseIndex);
    content = content.slice(0, endOfLastUse + 1) + useStr + content.slice(endOfLastUse + 1);
    
    fs.writeFileSync('c:/sas-app/server/index.js', content);
    console.log('Successfully updated server/index.js');
  } else {
    console.log('Router already mounted.');
  }
} catch (e) {
  console.error(e);
}
