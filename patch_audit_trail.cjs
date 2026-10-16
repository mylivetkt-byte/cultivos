const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

if (!code.includes('auditTrailMiddleware')) {
  code = code.replace("import { authMiddleware, tenantPoolMiddleware } from './utils/auth.js';", 
    "import { authMiddleware, tenantPoolMiddleware } from './utils/auth.js';\nimport { auditTrailMiddleware } from './middlewares/auditTrail.js';");
  
  code = code.replace("const auth = [authMiddleware, tenantPoolMiddleware];", 
    "const auth = [authMiddleware, tenantPoolMiddleware, auditTrailMiddleware];");
    
  fs.writeFileSync('server/index.js', code);
  console.log('server/index.js patched successfully for auditTrailMiddleware');
} else {
  console.log('Already patched');
}
