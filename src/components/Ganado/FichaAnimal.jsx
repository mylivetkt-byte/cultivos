import React, { useState } from 'react';
import AsyncSelect from 'react-select/async';
import HistoriaClinicaModal from './HistoriaClinicaModal';

function FichaAnimal({ fincaId }) {
  const [showHistory, setShowHistory] = useState(false);
  const [animal, setAnimal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fotoIndex, setFotoIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);

  const fetchOptions = async (inputValue) => {
    try {
      const q = inputValue || '';
      const res = await fetch(`/api/ganado_avanzado/search?q=${q}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        return data.map(a => ({
          value: a.arete_crotal,
          label: `${a.arete_crotal} - ${a.nombre || 'Sin nombre'} ${a.collar_gps_id ? `(GPS: ${a.collar_gps_id})` : ''}`
        }));
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  };

  const loadOptions = (inputValue) => {
    return fetchOptions(inputValue);
  };



  const fetchAnimal = async (codigo) => {
    if (!codigo) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/ganado_avanzado/ficha/${codigo}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnimal({
          ...data.animal,
          eventos: data.historial || []
        });
      } else {
        alert('Animal no encontrado en la base de datos.');
        setAnimal(null);
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (selected) => {
    setSelectedOption(selected);
    if (selected) {
      fetchAnimal(selected.value);
    } else {
      setAnimal(null);
    }
  };

  // Helper to render a node in the pedigree tree
  const PedigreeNode = ({ ani, role }) => {
    if (!ani) return <div style={{ border: '1px dashed var(--border)', padding: '10px', borderRadius: '4px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>Desconocido</div>;
    return (
      <div style={{ border: '1px solid var(--border)', padding: '10px', borderRadius: '4px', background: 'var(--card-bg)', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>{role}</div>
        <strong style={{ fontSize: '14px', color: 'var(--primary)' }}>{ani.nombre || ani.arete_crotal}</strong>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {ani.arete_crotal}</div>
        {ani.pedigri?.numero_registro && <div style={{ fontSize: '11px', color: '#10b981' }}>Reg: {ani.pedigri.numero_registro}</div>}
      </div>
    );
  };

  return (
    <div className="p-4 dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ color: 'var(--primary)', margin: 0 }}>🐄 Ficha Técnica y Pedigrí Élite</h2>
          <p style={{ margin: '5px 0 0 0', color: 'var(--text-muted)' }}>Consulta el árbol genealógico, mérito genético y hoja de vida completa del animal.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '15px', padding: '20px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border)', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, maxWidth: '500px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
            🔍 Buscador Inteligente (Arete, Nombre o Localizador GPS)
          </label>
          <AsyncSelect
            cacheOptions
            defaultOptions
            loadOptions={loadOptions}
            onChange={handleChange}
            value={selectedOption}
            placeholder="Buscar o seleccionar..."
            noOptionsMessage={() => "No se encontraron animales"}
            isClearable
          />
        </div>
        <div>
          {animal && (
            <button onClick={() => setShowHistory(true)} style={{ background: '#10b981', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              📋 Registrar Nuevo Evento Clínico
            </button>
          )}
        </div>
      </div>

      {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Cargando datos del animal...</div>}

      {animal && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* HEADER VIP (FOTO + DATOS BASICOS + PEDIGRI INFO) */}
          <div className="card" style={{ display: 'flex', gap: '20px', padding: '20px', background: animal.pedigri ? 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' : 'var(--card-bg)', borderRadius: '8px', border: animal.pedigri ? '2px solid #fbbf24' : '1px solid var(--border)' }}>
            <div style={{ width: '200px', height: '200px', borderRadius: '8px', background: '#e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: '60px', overflow: 'hidden', border: '2px solid white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', position: 'relative' }}>
              {animal.fotos && animal.fotos.length > 0 ? (
                <>
                  <img src={animal.fotos[fotoIndex].url_foto} alt={animal.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {animal.fotos.length > 1 && (
                    <div style={{ position: 'absolute', bottom: '10px', display: 'flex', gap: '5px', background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '12px' }}>
                      <button onClick={() => setFotoIndex(prev => prev > 0 ? prev - 1 : animal.fotos.length - 1)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '14px' }}>◄</button>
                      <span style={{ color: 'white', fontSize: '12px' }}>{fotoIndex + 1}/{animal.fotos.length}</span>
                      <button onClick={() => setFotoIndex(prev => prev < animal.fotos.length - 1 ? prev + 1 : 0)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '14px' }}>►</button>
                    </div>
                  )}
                </>
              ) : animal.pedigri?.foto_url ? (
                <img src={animal.pedigri.foto_url} alt="Animal" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : '🐂'}
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ margin: 0, color: 'var(--text)', fontSize: '28px' }}>{animal.nombre}</h2>
                {animal.pedigri && <span title="Animal con Pedigrí de Alto Valor" style={{ fontSize: '24px' }}>🏆</span>}
                <button onClick={() => window.location.hash = '#/dashboard/ganado/estudio-fotografico'} style={{ marginLeft: 'auto', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  📸 Ver Estudio
                </button>
              </div>
              <div style={{ marginTop: '5px', display: 'flex', gap: '10px' }}>
                <span style={{ background: '#3b82f6', color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>ID: {animal.arete_crotal}</span>
                {animal.collar_gps_id && <span style={{ background: '#8b5cf6', color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '14px' }}>📍 GPS: {animal.collar_gps_id}</span>}
                <span style={{ background: animal.estado === 'Activo' ? '#10b981' : '#ef4444', color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '14px' }}>{animal.estado}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginTop: '20px' }}>
                <div><strong style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Raza</strong><br/><span style={{ fontSize: '15px' }}>{animal.raza || { 1: 'Brahman Rojo', 2: 'Gyr Lechero', 3: 'Angus Negro', 4: 'Brahman Blanco', 13: 'Brahman', 14: 'Angus', 15: 'Gyr', 16: 'Holstein', 17: 'Simmental' }[animal.id_raza] || 'No Especificada'}</span></div>
                <div><strong style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Sexo</strong><br/><span style={{ fontSize: '15px' }}>{animal.sexo}</span></div>
                <div><strong style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Edad</strong><br/><span style={{ fontSize: '15px' }}>{animal.edad_meses} meses</span></div>
                <div><strong style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Peso Actual</strong><br/><span style={{ fontSize: '15px', color: '#10b981', fontWeight: 'bold' }}>{animal.peso_actual_kg} kg</span></div>
              </div>
            </div>

            {/* PANEL PREMIUM DERECHO */}
            {animal.pedigri && (
              <div style={{ width: '300px', background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '5px' }}>⭐ Datos de Registro</h4>
                <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                  <strong>Reg:</strong> {animal.pedigri.numero_registro}<br/>
                  <strong>Asoc:</strong> {animal.pedigri.asociacion}<br/>
                  <strong>Criador:</strong> {animal.pedigri.criador}<br/>
                  <div style={{ marginTop: '10px', padding: '10px', background: '#fef3c7', borderRadius: '4px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#b45309', textTransform: 'uppercase', fontWeight: 'bold' }}>Mérito Genético (DEP)</div>
                    <div style={{ fontSize: '20px', color: '#d97706', fontWeight: 'bold' }}>${parseFloat(animal.pedigri.merito_genetico_usd).toLocaleString()} USD</div>
                  </div>
                  {animal.pedigri.premios && (
                    <div style={{ marginTop: '10px', fontSize: '12px', color: '#475569' }}>
                      <strong>🏆 Premios Destacados:</strong><br/>
                      {animal.pedigri.premios.split('\\n').map((p, i) => <div key={i}>• {p}</div>)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RENTABILIDAD Y FINANZAS */}
          {animal.finanzas && (
            <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, color: 'var(--text)' }}>💰 Análisis de Rentabilidad y Mercado</h3>
                <span style={{ 
                  background: animal.finanzas.listo_para_venta ? '#10b981' : '#f59e0b', 
                  color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' 
                }}>
                  {animal.finanzas.listo_para_venta ? '✅ Listo para Venta' : '⏳ En Etapa Productiva'}
                </span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Costo Base / Compra</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text)' }}>${animal.finanzas.costo_adquisicion.toLocaleString()}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mantenimiento Acumulado</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text)' }}>${animal.finanzas.costo_mantenimiento.toLocaleString()}</div>
                </div>
                <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '12px', color: '#166534' }}>Valor Venta Mercado</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#15803d' }}>${animal.finanzas.valor_mercado.toLocaleString()}</div>
                </div>
                <div style={{ background: animal.finanzas.rentabilidad_usd > 0 ? '#eff6ff' : '#fef2f2', padding: '15px', borderRadius: '8px', border: animal.finanzas.rentabilidad_usd > 0 ? '1px solid #bfdbfe' : '1px solid #fecaca' }}>
                  <div style={{ fontSize: '12px', color: animal.finanzas.rentabilidad_usd > 0 ? '#1e40af' : '#b91c1c' }}>ROI (Retorno Proyectado)</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: animal.finanzas.rentabilidad_usd > 0 ? '#1d4ed8' : '#b91c1c' }}>
                    {animal.finanzas.rentabilidad_usd > 0 ? '+' : ''}${animal.finanzas.rentabilidad_usd.toLocaleString()} ({animal.finanzas.rentabilidad_porcentaje.toFixed(1)}%)
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {/* ARBOL GENEALOGICO */}
            <div className="card" style={{ flex: '1', minWidth: '400px', padding: '20px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <h3 style={{ marginTop: 0, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>🌳 Árbol Genealógico</h3>
              
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                <PedigreeNode ani={animal} role="El Ejemplar" />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-around', position: 'relative', marginTop: '30px' }}>
                {/* Connecting lines for parents */}
                <div style={{ position: 'absolute', top: '-15px', left: '25%', right: '25%', height: '15px', borderTop: '2px solid #cbd5e1', borderLeft: '2px solid #cbd5e1', borderRight: '2px solid #cbd5e1' }}></div>
                <div style={{ position: 'absolute', top: '-30px', left: '50%', height: '15px', borderLeft: '2px solid #cbd5e1' }}></div>
                
                <div style={{ flex: 1, padding: '0 10px' }}>
                  <PedigreeNode ani={animal.padre} role="Padre" />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginTop: '30px' }}>
                    <div style={{ position: 'absolute', top: '-15px', left: '25%', right: '25%', height: '15px', borderTop: '2px solid #cbd5e1', borderLeft: '2px solid #cbd5e1', borderRight: '2px solid #cbd5e1' }}></div>
                    <div style={{ position: 'absolute', top: '-30px', left: '50%', height: '15px', borderLeft: '2px solid #cbd5e1' }}></div>
                    <div style={{ flex: 1, paddingRight: '5px' }}><PedigreeNode ani={animal.padre?.padre} role="Abuelo Paterno" /></div>
                    <div style={{ flex: 1, paddingLeft: '5px' }}><PedigreeNode ani={animal.padre?.madre} role="Abuela Paterna" /></div>
                  </div>
                </div>

                <div style={{ flex: 1, padding: '0 10px' }}>
                  <PedigreeNode ani={animal.madre} role="Madre" />

                  <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginTop: '30px' }}>
                    <div style={{ position: 'absolute', top: '-15px', left: '25%', right: '25%', height: '15px', borderTop: '2px solid #cbd5e1', borderLeft: '2px solid #cbd5e1', borderRight: '2px solid #cbd5e1' }}></div>
                    <div style={{ position: 'absolute', top: '-30px', left: '50%', height: '15px', borderLeft: '2px solid #cbd5e1' }}></div>
                    <div style={{ flex: 1, paddingRight: '5px' }}><PedigreeNode ani={animal.madre?.padre} role="Abuelo Materno" /></div>
                    <div style={{ flex: 1, paddingLeft: '5px' }}><PedigreeNode ani={animal.madre?.madre} role="Abuela Materna" /></div>
                  </div>
                </div>
              </div>
            </div>

            {/* LINEA DE TIEMPO CLINICA */}
            <div className="card" style={{ flex: '1', minWidth: '400px', padding: '20px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <h3 style={{ marginTop: 0, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>⏳ Historial (Sanidad y Vacunas)</h3>
              <div style={{ height: '400px', overflowY: 'auto', paddingRight: '10px' }}>
                <div style={{ position: 'relative', borderLeft: '2px solid #e2e8f0', marginLeft: '10px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {animal.eventos.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)' }}>No hay eventos registrados.</div>
                  ) : animal.eventos.map((ev, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '-27px', top: '2px', width: '12px', height: '12px', borderRadius: '50%', background: ev.tipo === 'Nacimiento' ? '#10b981' : ev.tipo === 'Vacunación' ? '#3b82f6' : ev.tipo === 'Sanidad' ? '#ef4444' : '#f59e0b', border: '2px solid white' }}></div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                        {new Date(ev.fecha).toLocaleDateString()} 
                        <span style={{ color: ev.tipo === 'Sanidad' ? '#ef4444' : 'var(--primary)', marginLeft: '10px', padding: '2px 6px', background: '#f1f5f9', borderRadius: '4px' }}>
                          {ev.tipo}
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--text)', marginTop: '6px', lineHeight: '1.4' }}>
                        {ev.desc_hist}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHistory && animal && (
        <HistoriaClinicaModal animalId={animal.id_animal} onClose={() => { setShowHistory(false); fetchAnimal(animal.arete_crotal); }} />
      )}
    </div>
  );
}

export default FichaAnimal;
