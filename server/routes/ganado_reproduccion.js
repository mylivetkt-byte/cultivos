import express from 'express';
import pool from '../db.js';

const router = express.Router();

// 1. Dashboard (Kanban / Líneas de Tiempo)
router.get('/dashboard', async (req, res) => {
  try {
    const [registros] = await pool.query(`
      SELECT 
        r.id_reproduccion, r.tipo_evento, r.fecha, r.metodo_servicio, r.pajilla_ia, 
        r.resultado_diagnostico, r.fecha_probable_parto, r.estado_gestacion,
        a.id_animal, a.arete_crotal, a.nombre, a.numero_partos,
        TIMESTAMPDIFF(MONTH, a.fecha_nacimiento, CURDATE()) as edad_meses,
        t.arete_crotal as toro_arete, t.nombre as toro_nombre,
        p.nombre as potrero_nombre
      FROM ganado_reproduccion r
      JOIN ganado_animales a ON r.id_animal = a.id_animal
      LEFT JOIN ganado_animales t ON r.id_toro = t.id_animal
      LEFT JOIN ganado_potreros p ON a.id_potrero = p.id_potrero
      WHERE a.estado = 'Activo'
        AND a.sexo = 'Hembra'
        AND r.estado_gestacion IN ('En Espera', 'Preñada', 'Vacía')
      ORDER BY r.fecha DESC
    `);

    // Organizar en carriles (Kanban)
    const kanban = {
      enEspera: registros.filter(r => r.estado_gestacion === 'En Espera'),
      prenadas: registros.filter(r => r.estado_gestacion === 'Preñada').sort((a,b) => new Date(a.fecha_probable_parto) - new Date(b.fecha_probable_parto)),
      vacias: registros.filter(r => r.estado_gestacion === 'Vacía')
    };

    // Métricas
    const totalServidas = registros.length;
    const prenadas = kanban.prenadas.length;
    const tasaPrenez = totalServidas > 0 ? ((prenadas / totalServidas) * 100).toFixed(1) : 0;
    const proximas_a_parir = kanban.prenadas.filter(r => {
      const diff = new Date(r.fecha_probable_parto) - new Date();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return days <= 30; // Pariendo en los próximos 30 días
    }).length;

    res.json({ kanban, metricas: { tasaPrenez, prenadas, proximas_a_parir, totalServidas } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Hembras Candidatas (Filtro > 14 meses y sin gestación actual)
router.get('/candidatas', async (req, res) => {
  try {
    const [candidatas] = await pool.query(`
      SELECT a.id_animal, a.arete_crotal, a.nombre, a.numero_partos,
        TIMESTAMPDIFF(MONTH, a.fecha_nacimiento, CURDATE()) as edad_meses,
        p.nombre as potrero_nombre
      FROM ganado_animales a
      LEFT JOIN ganado_potreros p ON a.id_potrero = p.id_potrero
      WHERE a.sexo = 'Hembra' 
        AND a.estado = 'Activo'
        AND TIMESTAMPDIFF(MONTH, a.fecha_nacimiento, CURDATE()) >= 14
        AND a.id_animal NOT IN (
          SELECT id_animal FROM ganado_reproduccion 
          WHERE estado_gestacion IN ('En Espera', 'Preñada')
        )
      ORDER BY a.numero_partos ASC, edad_meses DESC
    `);
    res.json(candidatas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Toros (Para Inseminación Natural)
router.get('/toros', async (req, res) => {
  try {
    const [toros] = await pool.query(`
      SELECT id_animal, arete_crotal, nombre FROM ganado_animales WHERE sexo = 'Macho' AND estado = 'Activo'
    `);
    res.json(toros);
  } catch(e) {
    res.status(500).json({error: e.message});
  }
});

// 4. Registrar Nuevo Evento Reproductivo (Servicio, Diagnostico, Parto)
router.post('/evento', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id_animal, tipo_evento, fecha, metodo_servicio, id_toro, pajilla_ia, resultado_diagnostico, observaciones } = req.body;

    let nuevoEstado = null;
    let fechaProbable = null;

    if (tipo_evento === 'Servicio') {
      nuevoEstado = 'En Espera';
    } else if (tipo_evento === 'Diagnostico_Gestacion') {
      nuevoEstado = resultado_diagnostico === 'Positivo' ? 'Preñada' : 'Vacía';
      // Si es positivo, calculamos la fecha de parto asumiendo 283 días desde la fecha de último servicio
      if (resultado_diagnostico === 'Positivo') {
        const [ultimoServicio] = await conn.query('SELECT fecha FROM ganado_reproduccion WHERE id_animal = ? AND tipo_evento = "Servicio" ORDER BY fecha DESC LIMIT 1', [id_animal]);
        if (ultimoServicio.length > 0) {
          const fs = new Date(ultimoServicio[0].fecha);
          fs.setDate(fs.getDate() + 283);
          fechaProbable = fs.toISOString().split('T')[0];
        } else {
          // Fallback, asume hoy como diagnóstico de aprox 2 meses
          const fs = new Date(fecha);
          fs.setDate(fs.getDate() + 223); // 283 - 60 dias de preñez ya
          fechaProbable = fs.toISOString().split('T')[0];
        }
      }
    } else if (tipo_evento === 'Parto') {
      nuevoEstado = 'Parida';
      // Sumar +1 al record de partos de la madre
      await conn.query('UPDATE ganado_animales SET numero_partos = IFNULL(numero_partos, 0) + 1 WHERE id_animal = ?', [id_animal]);
    } else if (tipo_evento === 'Aborto') {
      nuevoEstado = 'Aborto';
    }

    // Cerrar los anteriores registros de la vaca (marcar como histórico)
    await conn.query(`UPDATE ganado_reproduccion SET estado_gestacion = 'Histórico' WHERE id_animal = ? AND estado_gestacion IN ('En Espera', 'Preñada', 'Vacía')`, [id_animal]);

    // Insertar el nuevo evento
    await conn.query(`
      INSERT INTO ganado_reproduccion 
      (id_animal, tipo_evento, fecha, metodo_servicio, id_toro, pajilla_ia, resultado_diagnostico, fecha_probable_parto, estado_gestacion, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id_animal, tipo_evento, fecha, metodo_servicio || null, id_toro || null, pajilla_ia || null, 
      resultado_diagnostico || null, fechaProbable, nuevoEstado, observaciones || ''
    ]);

    await conn.commit();
    res.json({ message: 'Evento registrado con éxito', estado: nuevoEstado });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    conn.release();
  }
});

export default router;
