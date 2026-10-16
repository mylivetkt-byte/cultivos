import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import { authFetch } from '../../utils/api';
import DynamicCatalog from '../DynamicCatalog';

export default function DroneDetailsModal({ drone, onClose }) {
  const [activeTab, setActiveTab] = useState('misiones');
  const [equipoDron, setEquipoDron] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEquipo = async () => {
      try {
        const res = await authFetch(`/api/table/equipos_dron/data?search=${drone.id_maquinaria}`);
        const data = await res.json();
        // Buscar el exacto
        const match = data.data.find(d => Number(d.equipo_id) === Number(drone.id_maquinaria));
        if (match) {
          setEquipoDron(match);
        }
      } catch (err) {
        console.error('Error fetching equipo dron:', err);
      } finally {
        setLoading(false);
      }
    };
    if (drone) {
      fetchEquipo();
    }
  }, [drone]);

  const tabs = [
    { id: 'misiones', label: 'Misiones' },
    { id: 'analisis', label: 'Análisis (Índices)' },
    { id: 'baterias', label: 'Baterías' },
    { id: 'mantenimientos', label: 'Mantenimientos' },
    { id: 'documentos', label: 'Documentos' },
    { id: 'alquiler', label: 'Alquiler' },
    { id: 'licencias', label: 'Licencias Pilotos' }
  ];

  return (
    <Modal
      isOpen={!!drone}
      onClose={onClose}
      title={`🚁 Ficha del Dron - ${drone.codigo} (${drone.nombre})`}
      footer={
        <button className="btn btn-outline" onClick={onClose}>Cerrar</button>
      }
    >
      <div style={{ padding: '16px 0', borderBottom: '1px solid var(--border)', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px',
                background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                color: activeTab === tab.id ? 'white' : 'var(--text)',
                border: '1px solid',
                borderColor: activeTab === tab.id ? 'var(--primary)' : 'var(--border)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: activeTab === tab.id ? '600' : '400',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ minHeight: '400px' }}>
        {loading ? (
          <p>Cargando información del dron...</p>
        ) : !equipoDron && activeTab !== 'misiones' ? (
          <p style={{ color: 'var(--warning)' }}>⚠️ Este equipo no tiene registro complementario en equipos_dron.</p>
        ) : (
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
            {activeTab === 'misiones' && (
              <div>
                <h3 style={{ marginTop: 0 }}>Historial de Misiones</h3>
                <p style={{ color: 'var(--text-muted)' }}>Misiones asociadas a este dron (usar programador para nuevas).</p>
                <div style={{ overflowX: 'auto' }}>
                  {/* Aquí idealmente un sub-grid de dron_misiones */}
                  <DynamicCatalog tableName="dron_misiones" />
                </div>
              </div>
            )}
            
            {activeTab === 'analisis' && (
              <div>
                <h3 style={{ marginTop: 0 }}>Análisis Multiespectral (NDVI)</h3>
                <DynamicCatalog tableName="dron_analisis" />
              </div>
            )}

            {activeTab === 'baterias' && (
              <div>
                <h3 style={{ marginTop: 0 }}>Gestión de Baterías</h3>
                <DynamicCatalog tableName="dron_baterias" />
              </div>
            )}

            {activeTab === 'mantenimientos' && (
              <div>
                <h3 style={{ marginTop: 0 }}>Mantenimientos Específicos</h3>
                <DynamicCatalog tableName="dron_mantenimientos" />
              </div>
            )}

            {activeTab === 'documentos' && (
              <div>
                <h3 style={{ marginTop: 0 }}>Documentos (Pólizas / Manuales)</h3>
                <DynamicCatalog tableName="dron_documentos" />
              </div>
            )}

            {activeTab === 'alquiler' && (
              <div>
                <h3 style={{ marginTop: 0 }}>Historial de Alquiler</h3>
                <DynamicCatalog tableName="dron_alquileres" />
              </div>
            )}

            {activeTab === 'licencias' && (
              <div>
                <h3 style={{ marginTop: 0 }}>Licencias de Pilotos Habilitados</h3>
                <DynamicCatalog tableName="dron_licencias_pilotos" />
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
