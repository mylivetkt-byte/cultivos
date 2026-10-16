const fs = require('fs');

const files = [
  'src/components/POS/POSConsole.jsx',
  'src/components/Payroll/PlanillasManuales.jsx',
  'src/components/Payroll/ControlPermisos.jsx',
  'src/components/Payroll/LaborBoard.jsx',
  'src/components/DynamicCatalog.jsx',
  'src/components/Payroll/JefeCuadrillaApp.jsx'
];

for (const f of files) {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/<Select styles=\{customStyles\}/g, '<Select');
    content = content.replace(/<AsyncSelect styles=\{customStyles\}/g, '<AsyncSelect');
    
    // Also remove the import if it's no longer used
    if (!content.includes('styles={customStyles}')) {
      content = content.replace(/import \{ customStyles \} from '.*?';\n/, '');
    }
    
    fs.writeFileSync(f, content, 'utf8');
    console.log('Fixed:', f);
  }
}
