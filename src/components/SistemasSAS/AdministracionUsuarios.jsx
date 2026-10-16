import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../utils/api';
import { Shield, UserX, UserCheck, Save, Search, CheckSquare, Square, UserPlus, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdministracionUsuarios() {
  const { tenantId } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [matriz, setMatriz] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({ nombres: '', apellidos: '', username: '', email: '', rol: 'Operario', password: '' });

  useEffect(() => {
    loadUsuarios();
  }, [tenantId]);

  const loadUsuarios = async () => {
    try {
      const data = await fetchApi(`/usuarios-permisos?tenantId=${tenantId}`);
      setUsuarios(data);
    } catch (err) {
      console.error(err);
      alert('Error cargando usuarios');
    }
  };

  const selectUser = async (user) => {
    setSelectedUser(user);
    setLoading(true);
    try {
      const data = await fetchApi(`/usuarios-permisos/${user.id_usuario}/matriz`);
      setMatriz(data);
    } catch (err) {
      console.error(err);
      alert('Error cargando la matriz de permisos');
    }
    setLoading(false);
  };

  const handleToggleEstado = async (user) => {
    const confirmMsg = user.activo ? '¿Desea inactivar a este usuario?' : '¿Desea reactivar a este usuario?';
    if (!window.confirm(confirmMsg)) return;

    try {
      await fetchApi(`/usuarios-permisos/${user.id_usuario}/estado`, {
        method: 'PUT',
        body: JSON.stringify({ activo: !user.activo })
      });
      loadUsuarios();
      if (selectedUser?.id_usuario === user.id_usuario) {
        setSelectedUser(null);
      }
    } catch (err) {
      console.error(err);
      alert('Error cambiando estado');
    }
  };

  const handlePermisoChange = (id_modulo, id_formulario, permisoKey, value) => {
    setMatriz(prev => prev.map(mod => {
      if (mod.id_modulo !== id_modulo) return mod;
      return {
        ...mod,
        formularios: mod.formularios.map(form => {
          if (form.id_formulario !== id_formulario) return form;
          
          const nuevosPermisos = { ...form.permisos, [permisoKey]: value };
          if (permisoKey === 'acceder' && !value) {
            Object.keys(nuevosPermisos).forEach(k => nuevosPermisos[k] = false);
          }
          if (permisoKey !== 'acceder' && value) {
            nuevosPermisos.acceder = true;
          }

          return { ...form, permisos: nuevosPermisos };
        })
      };
    }));
  };

  const handleSeleccionarTodos = () => {
    setMatriz(prev => prev.map(mod => ({
      ...mod,
      formularios: mod.formularios.map(form => ({
        ...form,
        permisos: {
          acceder: true, consultar: true, nuevo: true, editar: true, eliminar: true, imprimir: true, excel: true, pdf: true, whatsapp: true
        }
      }))
    })));
  };

  const handleDesmarcarTodos = () => {
    setMatriz(prev => prev.map(mod => ({
      ...mod,
      formularios: mod.formularios.map(form => ({
        ...form,
        permisos: {
          acceder: false, consultar: false, nuevo: false, editar: false, eliminar: false, imprimir: false, excel: false, pdf: false, whatsapp: false
        }
      }))
    })));
  };

  const savePermisos = async () => {
    if (!selectedUser) return;
    try {
      setLoading(true);
      const payload = matriz.flatMap(m => m.formularios).map(f => ({
        id_formulario: f.id_formulario,
        permisos: f.permisos
      }));

      await fetchApi(`/usuarios-permisos/${selectedUser.id_usuario}/matriz`, {
        method: 'POST',
        body: JSON.stringify({ formularios: payload })
      });
      alert('Permisos guardados exitosamente. Se aplicarán en el próximo inicio de sesión del usuario.');
    } catch (err) {
      console.error(err);
      alert('Error guardando permisos');
    }
    setLoading(false);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetchApi(`/usuarios-permisos/nuevo`, {
        method: 'POST',
        body: JSON.stringify(newUser)
      });
      if (res.success) {
        alert('Usuario creado exitosamente');
        setShowModal(false);
        setNewUser({ nombres: '', apellidos: '', username: '', email: '', rol: 'Operario', password: '' });
        loadUsuarios();
      }
    } catch (err) {
      alert(err.message || 'Error creando usuario');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = usuarios.filter(u => 
    u.nombres?.toLowerCase().includes(search.toLowerCase()) || 
    u.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={24} color="var(--primary)" />
            Administración y Permisos Granulares
          </h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>Controla exactamente qué puede ver y hacer cada usuario.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserPlus size={18} /> Nuevo Usuario
        </button>
      </div>

      <div style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden' }}>
        {/* Panel Izquierdo: Usuarios */}
        <div className="card" style={{ width: '35%', display: 'flex', flexDirection: 'column', margin: 0, overflow: 'hidden' }}>
          <div className="card-header" style={{ padding: '15px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                placeholder="Buscar usuario..." 
                className="form-control"
                style={{ paddingLeft: '35px' }}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
            {filteredUsers.map(u => (
              <div 
                key={u.id_usuario} 
                onClick={() => selectUser(u)}
                style={{
                  padding: '12px',
                  marginBottom: '8px',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: selectedUser?.id_usuario === u.id_usuario ? 'var(--primary-light)' : 'transparent',
                  border: selectedUser?.id_usuario === u.id_usuario ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                  transition: 'all 0.2s'
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '14px' }}>{u.nombres} {u.apellidos}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Usuario: {u.username} | Rol: {u.rol}</div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleToggleEstado(u); }}
                  title={u.activo ? 'Inactivar usuario' : 'Activar usuario'}
                  style={{
                    background: u.activo ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: u.activo ? '#16a34a' : '#dc2626',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  {u.activo ? <UserCheck size={16} /> : <UserX size={16} />}
                </button>
              </div>
            ))}
            {filteredUsers.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>No se encontraron usuarios</div>}
          </div>
        </div>

        {/* Panel Derecho: Matriz */}
        <div className="card" style={{ width: '65%', display: 'flex', flexDirection: 'column', margin: 0, overflow: 'hidden' }}>
          {!selectedUser ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              <Shield size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
              <p>Selecciona un usuario a la izquierda para configurar sus permisos</p>
            </div>
          ) : (
            <>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>Permisos: {selectedUser.nombres} {selectedUser.apellidos}</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>Configura a qué pantallas entra y qué acciones puede realizar.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {selectedUser.rol !== 'Super_Admin' && (
                    <>
                      <button className="btn btn-secondary" onClick={handleSeleccionarTodos} disabled={loading} style={{ fontSize: '12px' }}>
                        Seleccionar Todos
                      </button>
                      <button className="btn btn-secondary" onClick={handleDesmarcarTodos} disabled={loading} style={{ fontSize: '12px' }}>
                        Desmarcar Todos
                      </button>
                    </>
                  )}
                  <button className="btn btn-primary" onClick={savePermisos} disabled={loading || selectedUser.rol === 'Super_Admin'} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Save size={16} /> {loading ? 'Guardando...' : 'Guardar Permisos'}
                  </button>
                </div>
              </div>

              {selectedUser.rol === 'Super_Admin' && (
                <div style={{ padding: '10px 20px', background: 'rgba(255,166,0,0.1)', color: '#ffa600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)' }}>
                  <Shield size={16} />
                  <strong>Administrador del Sistema:</strong> Este rol tiene acceso total por defecto y no puede ser restringido.
                </div>
              )}

              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: 'var(--bg-main)' }}>
                {matriz.map(modulo => (
                  <div key={modulo.id_modulo} className="card" style={{ marginBottom: '20px' }}>
                    <div className="card-header" style={{ background: 'var(--bg-card)', padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                      <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)' }}>{modulo.nombre}</h4>
                    </div>
                    <div style={{ padding: 0 }}>
                      {Object.entries(modulo.formularios.reduce((acc, form) => {
                        const g = form.grupo || 'Opciones Generales';
                        if (!acc[g]) acc[g] = [];
                        acc[g].push(form);
                        return acc;
                      }, {})).map(([grupo, forms]) => (
                        <div key={grupo}>
                          {grupo !== 'Opciones Generales' && (
                            <div style={{ padding: '8px 20px', background: 'rgba(255,255,255,0.02)', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              {grupo}
                            </div>
                          )}
                          {forms.map(form => (
                            <div key={form.id_formulario} style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '35%' }}>
                                <button 
                                  onClick={() => handlePermisoChange(modulo.id_modulo, form.id_formulario, 'acceder', !form.permisos.acceder)}
                                  disabled={selectedUser.rol === 'Super_Admin'}
                                  style={{ background: 'none', border: 'none', cursor: selectedUser.rol === 'Super_Admin' ? 'not-allowed' : 'pointer', color: form.permisos.acceder ? 'var(--primary)' : 'var(--text-secondary)', padding: 0, display: 'flex', opacity: selectedUser.rol === 'Super_Admin' ? 0.6 : 1 }}
                                >
                                  {form.permisos.acceder ? <CheckSquare size={20} /> : <Square size={20} />}
                                </button>
                                <span style={{ fontWeight: '500', color: form.permisos.acceder ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                  {form.nombre}
                                </span>
                              </div>
                              
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', width: '65%', opacity: form.permisos.acceder ? 1 : 0.4, pointerEvents: (form.permisos.acceder && selectedUser.rol !== 'Super_Admin') ? 'auto' : 'none' }}>
                                {['consultar', 'nuevo', 'editar', 'eliminar', 'imprimir', 'excel', 'pdf', 'whatsapp'].map(accion => (
                                  <label key={accion} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: selectedUser.rol === 'Super_Admin' ? 'not-allowed' : 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={form.permisos[accion]}
                                      disabled={selectedUser.rol === 'Super_Admin'}
                                      onChange={(e) => handlePermisoChange(modulo.id_modulo, form.id_formulario, accion, e.target.checked)}
                                      style={{ cursor: selectedUser.rol === 'Super_Admin' ? 'not-allowed' : 'pointer' }}
                                    />
                                    <span style={{ textTransform: 'capitalize' }}>{accion}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                      {modulo.formularios.length === 0 && (
                        <div style={{ padding: '15px 20px', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '13px' }}>No hay pantallas en este módulo aún.</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '500px', margin: 0, animation: 'fadeIn 0.2s ease-in' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px' }}>
              <h3 style={{ margin: 0 }}>Crear Nuevo Usuario</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateUser} style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div className="form-group">
                  <label>Nombres</label>
                  <input type="text" className="form-control" required value={newUser.nombres} onChange={e => setNewUser({...newUser, nombres: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Apellidos</label>
                  <input type="text" className="form-control" required value={newUser.apellidos} onChange={e => setNewUser({...newUser, apellidos: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div className="form-group">
                  <label>Username</label>
                  <input type="text" className="form-control" required value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" className="form-control" required value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label>Contraseña</label>
                  <input type="password" className="form-control" required value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Rol Base</label>
                  <select className="form-control" value={newUser.rol} onChange={e => setNewUser({...newUser, rol: e.target.value})}>
                    <option value="Operario">Operario</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Cajero">Cajero</option>
                    <option value="Almacenista">Almacenista</option>
                    <option value="Administrador">Administrador</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
