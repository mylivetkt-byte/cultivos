import pool from './server/db.js';

async function fixDates() {
  try {
    console.log('Fetching lotes and their siembras...');
    const [lotes] = await pool.query(`
      SELECT s.id_lote, s.fecha_siembra, 
        (SELECT MAX(fecha_cosecha) FROM cosechas c WHERE c.id_siembra = s.id_siembra) as fecha_cosecha 
      FROM siembras s
    `);

    console.log('Fetching labores sin fecha...');
    const [labores] = await pool.query(`
      SELECT id_labor, id_lote, fecha_planificada, fecha_completado
      FROM labores_diarias
      WHERE estado = 'Completada' AND (fecha_completado IS NULL OR fecha_planificada IS NULL)
    `);

    console.log(`Found ${labores.length} labores to fix.`);

    for (const labor of labores) {
      const lote = lotes.find(l => l.id_lote === labor.id_lote);
      if (!lote) continue;

      const siembraDate = lote.fecha_siembra ? new Date(lote.fecha_siembra) : new Date('2025-01-01');
      const cosechaDate = lote.fecha_cosecha ? new Date(lote.fecha_cosecha) : new Date();

      // Random date between siembra and cosecha
      const minTime = siembraDate.getTime();
      const maxTime = cosechaDate.getTime();
      
      // If we already have a fecha_planificada, we can just use it (or slightly after it)
      let targetDate;
      if (labor.fecha_planificada && labor.fecha_planificada !== '0000-00-00 00:00:00') {
          targetDate = new Date(labor.fecha_planificada);
          // Add 1-3 days to planificada to make it realistic
          targetDate.setDate(targetDate.getDate() + Math.floor(Math.random() * 3));
      } else {
          const randomTime = minTime + Math.random() * (maxTime - minTime);
          targetDate = new Date(randomTime);
      }
      
      // Ensure it doesn't exceed current date if harvest is in the future
      if (targetDate.getTime() > Date.now()) {
          targetDate = new Date();
      }

      await pool.query(
        'UPDATE labores_diarias SET fecha_completado = ?, fecha_planificada = COALESCE(fecha_planificada, ?) WHERE id_labor = ?',
        [targetDate, targetDate, labor.id_labor]
      );
    }

    console.log('Fix completed successfully.');
  } catch (error) {
    console.error('Error fixing dates:', error);
  } finally {
    process.exit(0);
  }
}

fixDates();
