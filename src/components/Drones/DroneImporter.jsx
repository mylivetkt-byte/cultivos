import React, { useState } from 'react';
import { Upload, CheckCircle, AlertTriangle } from 'lucide-react';
import { authFetch } from '../../utils/api';

export default function DroneImporter() {
  const [file, setFile] = useState(null);
  const [tipoImportacion, setTipoImportacion] = useState('misiones');
  const [previewData, setPreviewData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) processFile(droppedFile);
  };

  const processFile = (file) => {
    setFile(file);
    // Simulación rápida de parseo de CSV o GeoJSON para la UI
    setLoading(true);
    setTimeout(() => {
      if (tipoImportacion === 'misiones') {
        setPreviewData([
          { fecha: '2026-08-28', duracion: 45, area: 12.5, equipo_dron_id: 1, piloto_id: 2 },
          { fecha: '2026-08-28', duracion: 30, area: 8.0, equipo_dron_id: 1, piloto_id: 2 }
        ]);
      } else {
        setPreviewData([
          { fecha: '2026-08-28', indice: 0.82, lote_id: 1, zona: 'Norte' },
          { fecha: '2026-08-28', indice: 0.75, lote_id: 1, zona: 'Sur' }
        ]);
      }
      setLoading(false);
    }, 1000);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/drones/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: tipoImportacion, registros: previewData })
      });
      if (res.ok) {
        setSuccess(true);
        setPreviewData([]);
        setFile(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>Importador de Datos de Drones (Pix4D / DJI)</h3>
      
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#475569' }}>
          Tipo de Importación
        </label>
        <select 
          value={tipoImportacion} 
          onChange={(e) => setTipoImportacion(e.target.value)}
          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
        >
          <option value="misiones">Vuelos/Misiones (CSV)</option>
          <option value="analisis">Índices Multiespectrales (GeoJSON/CSV)</option>
        </select>
      </div>

      <div 
        onDragOver={(e) => e.preventDefault()} 
        onDrop={handleDrop}
        style={{
          border: '2px dashed #cbd5e1',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          background: '#f8fafc',
          cursor: 'pointer',
          marginBottom: '24px'
        }}
      >
        <Upload size={32} color="#94a3b8" style={{ marginBottom: '8px' }} />
        <p style={{ margin: 0, color: '#64748b' }}>Arrastra un archivo aquí o haz clic para subir</p>
        <input 
          type="file" 
          accept=".csv,.geojson,.json"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files[0] && processFile(e.target.files[0])}
        />
      </div>

      {loading && <p>Procesando archivo...</p>}

      {success && (
        <div style={{ padding: '16px', background: '#dcfce7', color: '#166534', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={20} />
          Datos importados exitosamente.
        </div>
      )}

      {previewData.length > 0 && !loading && (
        <div>
          <h4 style={{ color: '#334155', marginBottom: '8px' }}>Previsualización de Datos ({previewData.length} registros)</h4>
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ background: '#f1f5f9' }}>
                <tr>
                  {Object.keys(previewData[0]).map(k => (
                    <th key={k} style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val, j) => (
                      <td key={j} style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button 
            className="btn btn-primary" 
            style={{ marginTop: '16px', width: '100%' }}
            onClick={handleConfirm}
          >
            Confirmar Importación
          </button>
        </div>
      )}
    </div>
  );
}
