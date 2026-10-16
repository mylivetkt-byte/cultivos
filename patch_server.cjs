const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

// Imports
code = code.replace("import logoRouter", "import { createServer } from 'http';\nimport { Server } from 'socket.io';\nimport logoRouter");
code = code.replace("import gisRouter from './routes/gis.js';", "import gisRouter from './routes/gis.js';\nimport iaRouter from './routes/ia.js';");

// App and Socket creation
code = code.replace("const app = express();", "const app = express();\nconst httpServer = createServer(app);\nconst io = new Server(httpServer, { cors: { origin: '*' } });\n\nio.on('connection', (socket) => {\n  console.log('⚡ Nuevo cliente conectado:', socket.id);\n  socket.on('gps_update', (data) => io.emit('gps_location_update', data));\n});");

// Routes
code = code.replace("app.use('/api/gis', auth, gisRouter);", "app.use('/api/gis', auth, gisRouter);\napp.use('/api/ia', auth, iaRouter);");

// Listen
code = code.replace("app.listen(PORT,", "httpServer.listen(PORT,");

fs.writeFileSync('server/index.js', code);
console.log('server/index.js patched successfully');
