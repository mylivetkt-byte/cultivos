const fs = require('fs');

const files = [
  'src/components/Payroll/ProgramadorVacaciones.jsx',
  'src/components/TreeManager.jsx',
  'src/components/Ganado/EstudioFotografico.jsx',
  'src/components/Payroll/ControlContratos.jsx',
  'src/components/Payroll/EmployeeFormModal.jsx',
  'src/components/QuickAddModal.jsx',
  'src/components/Inventory/FichaTecnicaEditor.jsx'
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
