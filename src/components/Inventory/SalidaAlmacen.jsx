import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/api';

function SalidaAlmacen({ tenantId }) {
  const [insumos, setInsumos] = useState([]);
  const [bodegas, setBodegas] = useState([]);
  const [selectedBodega, setSelectedBodega] = useState('');
  const [selectedInsumo, setSelectedInsumo] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [personaReclama, setPersonaReclama] = useState('');
  const [idMaquina, setIdMaquina] = useState('');
  const [imprimir, setImprimir] = useState(null);

  useEffect(() => {
    authFetch(`/api/crud/insumos/data?tenantId=${tenantId}`)
      .then(res => res.json())
      .then(data => { if (data.success) setInsumos(data.data); });
      
    authFetch(`/api/crud/bodegas/data?tenantId=${tenantId}`)
      .then(res => res.json())
      .then(data => { if (data.success) setBodegas(data.data); });
  }, [tenantId]);

  const handleSalida = async () => {
    if (!selectedBodega || !selectedInsumo || !cantidad || !personaReclama) {
      alert("Faltan campos obligatorios");
      return;
    }

    try {
      const resp = await authFetch('/api/kardex/salida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          bodegaId: selectedBodega,
          insumoId: selectedInsumo,
          cantidad: Number(cantidad),
          persona_reclama: personaReclama,
          id_maquina: idMaquina || null
        })
      });
      const data = await resp.json();
      if (data.success) {
        setImprimir({
          id_documento: data.id_documento,
          fecha: new Date().toLocaleString(),
          insumo: insumos.find(i => String(i.id_insumo) === String(selectedInsumo))?.nombre,
          cantidad: cantidad,
          persona: personaReclama,
          maquina: idMaquina
        });
        setSelectedInsumo('');
        setCantidad(1);
        setPersonaReclama('');
        setIdMaquina('');
      } else {
        alert("Error: " + data.error);
      }
    } catch(e) {
      alert("Error de red");
    }
  };

  if (imprimir) {
    return (
      <div className="module-container" style={{ textAlign: 'center' }}>
        <div style={{ border: '2px dashed #ccc', padding: '20px', maxWidth: '400px', margin: '0 auto', textAlign: 'left', fontFamily: 'monospace' }}>
          <h2 style={{ textAlign: 'center', margin: '0 0 10px 0' }}>VALE DE SALIDA</h2>
          <p style={{ margin: '5px 0' }}><strong>DOC #:</strong> {imprimir.id_documento}</p>
          <p style={{ margin: '5px 0' }}><strong>FECHA:</strong> {imprimir.fecha}</p>
          <hr style={{ borderTop: '1px dashed #ccc' }} />
          <p style={{ margin: '5px 0' }}><strong>RECLAMA:</strong> {imprimir.persona}</p>
          {imprimir.maquina && <p style={{ margin: '5px 0' }}><strong>VEHÍCULO/MÁQUINA:</strong> #{imprimir.maquina}</p>}
          <hr style={{ borderTop: '1px dashed #ccc' }} />
          <p style={{ margin: '5px 0' }}><strong>ITEM:</strong> {imprimir.insumo}</p>
          <p style={{ margin: '5px 0' }}><strong>CANTIDAD:</strong> {imprimir.cantidad}</p>
          <br/><br/><br/>
          <div style={{ borderTop: '1px solid #000', width: '200px', margin: '0 auto', textAlign: 'center' }}>
            Firma de quien recibe
          </div>
        </div>
        <br/>
        <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Imprimir Vale</button>
        <button className="btn btn-secondary" onClick={() => setImprimir(null)} style={{ marginLeft: '10px' }}>Nueva Salida</button>
      </div>
    );
  }

  return (
    <div className="module-container">
      <div className="module-header">
        <h1>📤 Salidas de Almacén</h1>
        <p>Registre consumos y entregas de repuestos generando el Vale de Salida para firma.</p>
      </div>
      
      <div className="form-grid">
        <div className="card">
          <div className="form-group">
            <label>Bodega Origen</label>
            <select className="form-control" value={selectedBodega} onChange={e => setSelectedBodega(e.target.value)}>
              <option value="">-- Seleccione Bodega --</option>
              {bodegas.map(b => <option key={b.id_bodega} value={b.id_bodega}>{b.nombre}</option>)}
            </select>
          </div>
          
          <div className="form-group">
            <label>Producto o Repuesto</label>
            <select className="form-control" value={selectedInsumo} onChange={e => setSelectedInsumo(e.target.value)}>
              <option value="">-- Seleccione Item --</option>
              {insumos.map(i => <option key={i.id_insumo} value={i.id_insumo}>{i.codigo} - {i.nombre}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Cantidad a Entregar</label>
            <input type="number" min="0.01" step="0.01" className="form-control" value={cantidad} onChange={e => setCantidad(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Persona que Reclama (Obligatorio)</label>
            <input type="text" className="form-control" placeholder="Nombre completo" value={personaReclama} onChange={e => setPersonaReclama(e.target.value)} />
          </div>

          <div className="form-group">
            <label>ID Vehículo / Maquinaria (Opcional - Para repuestos)</label>
            <input type="text" className="form-control" placeholder="Ej. TR-001" value={idMaquina} onChange={e => setIdMaquina(e.target.value)} />
          </div>

          <button className="btn btn-primary" onClick={handleSalida}>Registrar y Generar Vale</button>
        </div>
      </div>
    </div>
  );
}

export default SalidaAlmacen;
