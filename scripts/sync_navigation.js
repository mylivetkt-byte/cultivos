import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function sync() {
  console.log('Iniciando sincronización...');
  
  // Leer el archivo de navegación
  const navPath = path.join(__dirname, '../src/config/navigation.jsx');
  let navContent = fs.readFileSync(navPath, 'utf-8');
  
  // Extraer el array STATIC_NAVIGATION con regex (aproximación)
  // Removeremos las líneas de icon: <...> para poder evaluarlo
  navContent = navContent.replace(/icon:\s*<[^>]+>,?/g, '');
  navContent = navContent.replace(/icon:\s*<[^>]+>\s*<\/[^>]+>,?/g, ''); // Por si acaso
  
  // Encontrar el inicio y el fin del array
  const startIndex = navContent.indexOf('export const STATIC_NAVIGATION = [');
  const arrContent = navContent.substring(startIndex + 'export const STATIC_NAVIGATION = '.length);
  
  // Para evaluar, necesitamos convertirlo a un script válido temporal
  const tempScriptPath = path.join(__dirname, 'temp_nav.js');
  fs.writeFileSync(tempScriptPath, `export default ${arrContent}`);
  
  const { default: STATIC_NAVIGATION } = await import('./temp_nav.js');
  fs.unlinkSync(tempScriptPath);
  
  let modulosAgregados = 0;
  let formulariosAgregados = 0;
  
  for (let i = 0; i < STATIC_NAVIGATION.length; i++) {
    const modulo = STATIC_NAVIGATION[i];
    
    // Insertar o actualizar módulo
    let idModulo;
    const [existingMod] = await db.query('SELECT id_modulo FROM sas_agricolas.sys_modulos WHERE nombre = ?', [modulo.name]);
    
    if (existingMod.length > 0) {
      idModulo = existingMod[0].id_modulo;
      await db.query('UPDATE sas_agricolas.sys_modulos SET orden = ? WHERE id_modulo = ?', [(i+1)*10, idModulo]);
    } else {
      const [result] = await db.query('INSERT INTO sas_agricolas.sys_modulos (nombre, orden, activo) VALUES (?, ?, 1)', [modulo.name, (i+1)*10]);
      idModulo = result.insertId;
      modulosAgregados++;
    }
    
    // Recorrer items (pueden ser formularios directos o submenús)
    let formOrder = 10;
    for (const item of modulo.items || []) {
      if (item.isSubmenu) {
        // Es un grupo (submenú)
        const grupo = item.name;
        for (const subItem of item.items || []) {
          // Guardar formulario
          await saveForm(idModulo, grupo, subItem, formOrder);
          formOrder += 10;
        }
      } else {
        // Es un formulario directo
        await saveForm(idModulo, null, item, formOrder);
        formOrder += 10;
      }
    }
  }
  
  console.log(`¡Sincronización completada!`);
  console.log(`Nuevos Módulos agregados: ${modulosAgregados}`);
  console.log(`Nuevos Formularios agregados/actualizados. (Revisa la DB para confirmar exactitud)`);
}

async function saveForm(idModulo, grupo, formItem, orden) {
  // Ignoramos si es un target dinámico (como las tablas de BD que se inyectan dinámicamente)
  // Pero sí guardamos los explícitos.
  if (!formItem.id || formItem.id.includes('-dashboard') === false && !formItem.name) return; // Validación básica
  
  const ruta = formItem.id; // Usamos el ID como identificador interno (ruta en DB)
  const nombre = formItem.name;
  
  const [existing] = await db.query('SELECT id_formulario FROM sas_agricolas.sys_formularios WHERE ruta = ? AND id_modulo = ?', [ruta, idModulo]);
  
  if (existing.length > 0) {
    await db.query('UPDATE sas_agricolas.sys_formularios SET nombre = ?, grupo = ?, orden = ? WHERE id_formulario = ?', 
      [nombre, grupo, orden, existing[0].id_formulario]);
  } else {
    await db.query('INSERT INTO sas_agricolas.sys_formularios (id_modulo, grupo, nombre, ruta, orden, activo) VALUES (?, ?, ?, ?, ?, 1)', 
      [idModulo, grupo, nombre, ruta, orden]);
  }
}

sync().catch(console.error).finally(() => process.exit(0));
