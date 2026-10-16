import dotenv from 'dotenv';
dotenv.config();
import { pool } from './server/utils/db.js';

async function main() {
  try {
    const db = pool.promise ? pool.promise() : pool;
    console.log("Fetching insumos...");
    const [insumos] = await db.query('SELECT id_insumo, nombre FROM insumos');
    
    let count = 0;
    
    // Keywords indicating a hazardous substance
    const dangerKeywords = ['glifosato', 'fipronil', 'herbicida', 'insecticida', 'fungicida', 'paraquat', 'veneno', 'cipermetrina', 'clorpirifos', 'methomyl'];
    const potassiumKeywords = ['cloruro de potasio', 'kcl'];
    
    for (const insumo of insumos) {
      const nameLower = insumo.nombre.toLowerCase();
      
      const isDangerous = dangerKeywords.some(kw => nameLower.includes(kw));
      const isPotassium = potassiumKeywords.some(kw => nameLower.includes(kw));
      
      let updateSql = '';
      let params = [];
      
      if (isDangerous) {
        const text = '⚠️ ALTA PELIGROSIDAD: Producto químico tóxico. Uso obligatorio de Elementos de Protección Personal (EPP) incluyendo mascarilla con filtro, guantes de nitrilo, gafas selladas y traje impermeable. Leer etiqueta antes de usar.';
        const pdfUrl = 'https://www.quimica.es/data/hoja-seguridad-generica.pdf';
        
        await db.query(
          'UPDATE insumos SET es_nocivo = 1, anotacion_prevencion = ?, url_hoja_seguridad = ? WHERE id_insumo = ?',
          [text, pdfUrl, insumo.id_insumo]
        );
        count++;
      }
      
      if (isPotassium) {
          // Put a specific image of a white powder/salt to match what the user uploaded
          await db.query(
              'UPDATE insumos SET imagen_url = ? WHERE id_insumo = ?',
              ['https://images.unsplash.com/photo-1596557451458-755c3c0a5fa7?q=80&w=400&auto=format&fit=crop', insumo.id_insumo]
          );
      }
    }
    
    console.log(`Updated ${count} hazardous insumos.`);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
