const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const imports = `
import RegistroProduccionBiol from './components/Agriculture/RegistroProduccionBiol';
import FormularioAlimentacionLagos from './components/Acuicola/FormularioAlimentacionLagos';
`;

const routes = `
        {/* Rutas inyectadas para Kardex UI */}
        <Route path="/agricultura/bio-fabrica" element={<RegistroProduccionBiol />} />
        <Route path="/acuicola/alimentacion" element={<FormularioAlimentacionLagos />} />
`;

if (!code.includes('RegistroProduccionBiol')) {
  code = code.replace("import { AuthProvider } from './context/AuthContext';", imports + "import { AuthProvider } from './context/AuthContext';");
  code = code.replace('<Route path="/agricultura/ejecucion" element={<ApplicationExecution />} />', '<Route path="/agricultura/ejecucion" element={<ApplicationExecution />} />\n' + routes);
  fs.writeFileSync('src/App.jsx', code);
  console.log('App.jsx patched successfully');
} else {
  console.log('Already patched');
}
