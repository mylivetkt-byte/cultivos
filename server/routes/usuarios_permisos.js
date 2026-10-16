import express from 'express';
import { getDb } from '../utils/db.js';

const router = express.Router();

// 1. Obtener la lista de usuarios del tenant
router.get('/', async (req, res) => {
  const tid = req.query.tenantId || 1;
  try {
    const db = getDb(req);
    const [usuarios] = await db.query(`
      SELECT id_usuario, nombres, apellidos, username, email, activo, rol 
      FROM usuarios 
      WHERE id_tenant = ?
    `, [tid]);
    
    // Obtener fincas asignadas para cada uno
    const [fincas] = await db.query(`
      SELECT uf.id_usuario, f.id_finca, f.nombre 
      FROM sys_usuarios_fincas uf
      JOIN fincas f ON uf.id_finca = f.id_finca
      WHERE f.id_tenant = ?
    `, [tid]);

    const usersWithFincas = usuarios.map(u => ({
      ...u,
      fincas: fincas.filter(f => f.id_usuario === u.id_usuario)
    }));

    res.json(usersWithFincas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 1.5 Crear nuevo usuario
router.post('/nuevo', async (req, res) => {
  const { username, email, password, nombres, apellidos, rol } = req.body;
  const tid = req.tenantId; // From authMiddleware

  try {
    const db = getDb(req);
    const bcrypt = await import('bcrypt');
    
    // Check if user exists
    const [existing] = await db.query('SELECT id_usuario FROM usuarios WHERE username = ? OR email = ?', [username, email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'El nombre de usuario o email ya existe.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await db.query(`
      INSERT INTO usuarios (username, email, password_hash, id_tenant, nombres, apellidos, rol, activo)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `, [username, email, passwordHash, tid, nombres, apellidos, rol || 'Operario']);

    res.json({ success: true, id_usuario: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Obtener la matriz de permisos completa (Modulos -> Formularios -> Permisos del usuario)
router.get('/:id/matriz', async (req, res) => {
  const idUsuario = parseInt(req.params.id);
  try {
    const db = getDb(req);
    
    // Obtener todos los módulos activos
    const [modulos] = await db.query('SELECT * FROM sys_modulos WHERE activo = 1 ORDER BY orden ASC');
    // Obtener todos los formularios activos
    const [formularios] = await db.query('SELECT * FROM sys_formularios WHERE activo = 1 ORDER BY orden ASC');
    // Obtener los permisos guardados del usuario
    const [permisosGuardados] = await db.query('SELECT * FROM sys_permisos_usuarios WHERE id_usuario = ?', [idUsuario]);

    // Obtener el rol del usuario consultado
    const [userRows] = await db.query('SELECT rol FROM usuarios WHERE id_usuario = ?', [idUsuario]);
    const isSuperAdmin = userRows.length > 0 && userRows[0].rol === 'Super_Admin';

    // Construir el árbol
    const matriz = modulos.map(mod => {
      const forms = formularios.filter(f => f.id_modulo === mod.id_modulo).map(form => {
        const perm = permisosGuardados.find(p => p.id_formulario === form.id_formulario) || {
          acceder: 0, consultar: 0, nuevo: 0, editar: 0, eliminar: 0, imprimir: 0, excel: 0, pdf: 0, whatsapp: 0
        };
        return {
          id_formulario: form.id_formulario,
          grupo: form.grupo,
          nombre: form.nombre,
          ruta: form.ruta,
          permisos: {
            acceder: isSuperAdmin ? true : !!perm.acceder,
            consultar: isSuperAdmin ? true : !!perm.consultar,
            nuevo: isSuperAdmin ? true : !!perm.nuevo,
            editar: isSuperAdmin ? true : !!perm.editar,
            eliminar: isSuperAdmin ? true : !!perm.eliminar,
            imprimir: isSuperAdmin ? true : !!perm.imprimir,
            excel: isSuperAdmin ? true : !!perm.excel,
            pdf: isSuperAdmin ? true : !!perm.pdf,
            whatsapp: isSuperAdmin ? true : !!perm.whatsapp
          }
        };
      });

      return {
        id_modulo: mod.id_modulo,
        nombre: mod.nombre,
        icono: mod.icono,
        formularios: forms
      };
    });

    res.json(matriz);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Guardar permisos de un usuario
router.post('/:id/matriz', async (req, res) => {
  const idUsuario = parseInt(req.params.id);
  const { formularios } = req.body; // Un array plano con { id_formulario, acceder, consultar... }
  
  try {
    const db = getDb(req);
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Borrar permisos anteriores
      await connection.query('DELETE FROM sys_permisos_usuarios WHERE id_usuario = ?', [idUsuario]);

      // Insertar nuevos
      if (formularios && formularios.length > 0) {
        const values = formularios.map(f => [
          idUsuario, 
          f.id_formulario, 
          f.permisos.acceder ? 1 : 0, 
          f.permisos.consultar ? 1 : 0, 
          f.permisos.nuevo ? 1 : 0, 
          f.permisos.editar ? 1 : 0, 
          f.permisos.eliminar ? 1 : 0, 
          f.permisos.imprimir ? 1 : 0, 
          f.permisos.excel ? 1 : 0, 
          f.permisos.pdf ? 1 : 0, 
          f.permisos.whatsapp ? 1 : 0
        ]);

        await connection.query(`
          INSERT INTO sys_permisos_usuarios 
          (id_usuario, id_formulario, acceder, consultar, nuevo, editar, eliminar, imprimir, excel, pdf, whatsapp)
          VALUES ?
        `, [values]);
      }

      await connection.commit();
      res.json({ success: true, message: 'Permisos guardados correctamente' });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Asignar Fincas a un usuario
router.post('/:id/fincas', async (req, res) => {
  const idUsuario = parseInt(req.params.id);
  const { ids_fincas } = req.body; // Array de IDs
  
  try {
    const db = getDb(req);
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      await connection.query('DELETE FROM sys_usuarios_fincas WHERE id_usuario = ?', [idUsuario]);
      
      if (ids_fincas && ids_fincas.length > 0) {
        const values = ids_fincas.map(id => [idUsuario, id]);
        await connection.query('INSERT INTO sys_usuarios_fincas (id_usuario, id_finca) VALUES ?', [values]);
      }

      await connection.commit();
      res.json({ success: true, message: 'Fincas asignadas correctamente' });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Inactivar o Activar usuario
router.put('/:id/estado', async (req, res) => {
  const idUsuario = parseInt(req.params.id);
  const { activo } = req.body;
  
  try {
    const db = getDb(req);
    await db.query('UPDATE usuarios SET activo = ? WHERE id_usuario = ?', [activo ? 1 : 0, idUsuario]);
    res.json({ success: true, message: `Usuario ${activo ? 'activado' : 'inactivado'} correctamente` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
