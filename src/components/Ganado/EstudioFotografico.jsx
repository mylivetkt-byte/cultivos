import React, { useState, useEffect } from 'react';
import { Camera, Search, Filter, Plus, X, Trash2 } from 'lucide-react';
import AsyncSelect from 'react-select/async';

const EstudioFotografico = () => {
  const [fotos, setFotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [fileToUpload, setFileToUpload] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [descripcion, setDescripcion] = useState('');
  const [esPrincipal, setEsPrincipal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchFotos = async () => {
    try {
      const res = await fetch('/api/ganado_avanzado/estudio', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFotos(data);
      }
    } catch (err) {
      console.error("Error fetching fotos:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async (inputValue) => {
    try {
      const res = await fetch(`/api/ganado_avanzado/search?q=${inputValue || ''}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        return data.map(a => ({
          value: a.id_animal,
          label: `${a.arete_crotal} - ${a.nombre || 'Sin nombre'}`
        }));
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedAnimal || !fileToUpload) {
      alert("Debes seleccionar un animal y una fotografía.");
      return;
    }
    
    setUploading(true);
    const formData = new FormData();
    formData.append('id_animal', selectedAnimal.value);
    formData.append('foto', fileToUpload);
    formData.append('descripcion', descripcion);
    formData.append('es_principal', esPrincipal);

    try {
      const res = await fetch('/api/ganado_avanzado/estudio', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      
      if (res.ok) {
        alert("¡Fotografía subida con éxito!");
        setShowModal(false);
        setFileToUpload(null);
        setImagePreview(null);
        setDescripcion('');
        setEsPrincipal(false);
        setSelectedAnimal(null);
        fetchFotos(); // Recargar galería
      } else {
        const err = await res.json();
        alert("Error al subir la foto: " + (err.error || "Desconocido"));
      }
    } catch (error) {
      console.error(error);
      alert("Error de conexión al subir.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileToUpload(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleDelete = async (id_foto) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar esta fotografía permanentemente?")) return;
    
    try {
      const res = await fetch(`/api/ganado_avanzado/estudio/${id_foto}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        fetchFotos();
      } else {
        alert("Error al eliminar la fotografía");
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión al eliminar");
    }
  };

  const filteredFotos = fotos.filter(f => {
    const q = searchTerm.toLowerCase();
    return (
      (f.nombre && f.nombre.toLowerCase().includes(q)) ||
      (f.arete_crotal && f.arete_crotal.toLowerCase().includes(q)) ||
      (f.raza && f.raza.toLowerCase().includes(q))
    );
  });
  useEffect(() => {
    fetchFotos();
  }, []);

  if (loading) return <div style={{ padding: '20px' }}>Cargando estudio fotográfico...</div>;
  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1e293b' }}>
          <Camera size={28} color="#8b5cf6" />
          Estudio Fotográfico Élite
        </h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Buscar (arete, nombre, raza)..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '8px 10px 8px 30px', border: '1px solid #cbd5e1', borderRadius: '6px', width: '250px' }}
            />
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#8b5cf6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>
            <Plus size={16} /> Subir Foto
          </button>
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
        gap: '20px' 
      }}>
        {filteredFotos.map((f, i) => (
          <div key={i} style={{ 
            background: 'white', 
            borderRadius: '12px', 
            overflow: 'hidden', 
            position: 'relative',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: f.es_principal ? '2px solid #8b5cf6' : '1px solid #e2e8f0'
          }}>
            <button 
              onClick={() => handleDelete(f.id_foto)}
              style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, opacity: 0.8, transition: 'opacity 0.2s' }}
              title="Eliminar Foto"
              onMouseOver={e => e.currentTarget.style.opacity = 1}
              onMouseOut={e => e.currentTarget.style.opacity = 0.8}
            >
              <Trash2 size={16} />
            </button>
            <div style={{ height: '250px', width: '100%', overflow: 'hidden' }}>
              <img 
                src={f.url_foto} 
                alt={f.descripcion} 
                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
              />
            </div>
            <div style={{ padding: '15px' }}>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', display: 'flex', justifyContent: 'space-between' }}>
                {f.nombre}
                <span style={{ fontSize: '12px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px', color: '#64748b' }}>
                  {f.arete_crotal}
                </span>
              </h3>
              <p style={{ margin: '0 0 10px 0', color: '#64748b', fontSize: '14px' }}>{f.raza}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#94a3b8' }}>
                <span>{new Date(f.fecha_toma).toLocaleDateString()}</span>
                <span>{f.descripcion}</span>
              </div>
            </div>
          </div>
        ))}
        {filteredFotos.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            {searchTerm ? 'No se encontraron fotos que coincidan con la búsqueda.' : 'No hay fotografías registradas aún.'}
          </div>
        )}
      </div>

      {/* Modal Subir Foto */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '400px', maxWidth: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Subir Nueva Fotografía</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleUpload}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px' }}>Seleccionar Animal *</label>
                <AsyncSelect
                  cacheOptions
                  defaultOptions
                  loadOptions={fetchOptions}
                  value={selectedAnimal}
                  onChange={(option) => {
                    setSelectedAnimal(option);
                  }}
                  placeholder="Buscar por arete o nombre..."
                  noOptionsMessage={() => 'No se encontraron animales'}
                  styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                  menuPortalTarget={document.body}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px' }}>Seleccionar Archivo (Imagen) *</label>
                {!imagePreview ? (
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileChange} 
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc' }} 
                    required 
                  />
                ) : (
                  <div style={{ position: 'relative', width: '100%', height: '200px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button 
                      type="button"
                      onClick={() => { setFileToUpload(null); setImagePreview(null); }}
                      style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px' }}>Descripción</label>
                <input type="text" value={descripcion} onChange={e => setDescripcion(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} placeholder="Ej: Vista de perfil derecho" />
              </div>
              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="checkbox" id="es_principal" checked={esPrincipal} onChange={e => setEsPrincipal(e.target.checked)} />
                <label htmlFor="es_principal" style={{ fontSize: '14px' }}>Marcar como foto principal</label>
              </div>
              <button type="submit" disabled={uploading} style={{ width: '100%', background: uploading ? '#94a3b8' : '#8b5cf6', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                {uploading ? 'Subiendo archivo...' : 'Guardar Fotografía'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EstudioFotografico;
