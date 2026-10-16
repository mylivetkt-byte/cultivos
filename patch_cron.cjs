const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

if (!code.includes('startPerpetualAudit')) {
  code = code.replace("import { auditTrailMiddleware } from './middlewares/auditTrail.js';", 
    "import { auditTrailMiddleware } from './middlewares/auditTrail.js';\nimport { startPerpetualAudit } from './jobs/perpetualAuditCron.js';");
  
  code = code.replace("io.on('connection', (socket) => {", 
    "startPerpetualAudit(io);\n\nio.on('connection', (socket) => {");
    
  fs.writeFileSync('server/index.js', code);
  console.log('server/index.js patched successfully for perpetualAuditCron');
} else {
  console.log('Already patched');
}
