import React, { useState, useEffect, useRef } from 'react';
import { message, Select } from 'antd';
import SignatureCanvas from 'react-signature-canvas';
import { authFetch } from '../../utils/api';

export default function SalidasMercancia({ tenantId, fincaId }) {
  const [bodegas, setBodegas] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [tiposDoc, setTiposDoc] = useState([]);
  
  const [selectedBodega, setSelectedBodega] = useState('');
  const [selectedEmpleado, setSelectedEmpleado] = useState('');
  const [selectedTipoDoc, setSelectedTipoDoc] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const [existencias, setExistencias] = useState([]);
  const [detalles, setDetalles] = useState([]);
  const [selectedItem, setSelectedItem] = useState('');
  const [cantidadToAdd, setCantidadToAdd] = useState('');

  const [loading, setLoading] = useState(false);
  const sigCanvas = useRef({});

  useEffect(() => {
    fetchCatalogs();
  }, [tenantId]);

  useEffect(() => {
    if (selectedBodega) fetchExistencias(selectedBodega);
  }, [selectedBodega]);

  const fetchCatalogs = async () => {
    try {
      const tid = tenantId || 1;
      const [resB, resE, resT] = await Promise.all([
        authFetch(`/api/table/bod_bodegas/data?tenantId=${tid}&pageSize=500`),
        authFetch(`/api/table/rrhh_empleados/data?tenantId=${tid}&pageSize=500`),
        authFetch(`/api/inventario/tipos_documento?tenantId=${tid}`)
      ]);
      const dataB = await resB.json();
      const dataE = await resE.json();
      const dataT = await resT.json();
      
      setBodegas(dataB.data || []);
      setEmpleados(dataE.data || []);
      
      // Filtrar solo tipos de documento de Salida
      if(Array.isArray(dataT)) {
        setTiposDoc(dataT.filter(t => t.naturaleza === 'Salida'));
      }
    } catch (e) {
      console.error(e);
      message.error('Error cargando catálogos');
    }
  };

  const fetchExistencias = async (bodegaId) => {
    try {
      const tid = tenantId || 1;
      const res = await authFetch(`/api/inventario/existencias?tenantId=${tid}&bodegaId=${bodegaId}`);
      const data = await res.json();
      setExistencias(Array.isArray(data) ? data : []);
      setDetalles([]); // Resetear detalles si cambian de bodega
      setSelectedItem('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddItem = () => {
    const qtyParsed = parseFloat(cantidadToAdd.toString().replace(',', '.'));
    
    if (!selectedItem || isNaN(qtyParsed) || qtyParsed <= 0) {
      return message.warning('Seleccione un artículo válido y una cantidad mayor a 0');
    }

    const exis = existencias.find(e => e.id_insumo.toString() === selectedItem);
    if (!exis) return message.error('Artículo no encontrado en existencias');

    if (qtyParsed > Number(exis.cantidad)) {
      return message.error(`Saldo insuficiente. Solo hay ${exis.cantidad} disponibles.`);
    }

    const existsInCart = detalles.find(d => d.id_insumo === exis.id_insumo);
    if (existsInCart) {
      const newQty = Number(existsInCart.cantidad) + qtyParsed;
      if (newQty > Number(exis.cantidad)) {
        return message.error('La suma excede el saldo disponible en bodega');
      }
      setDetalles(detalles.map(d => d.id_insumo === exis.id_insumo ? { ...d, cantidad: newQty } : d));
    } else {
      setDetalles([...detalles, {
        id_insumo: exis.id_insumo,
        nombre: exis.insumo_nombre,
        codigo: exis.codigo,
        unidad: exis.unidad_medida,
        cantidad: qtyParsed,
        costo_unitario: Number(exis.costo_promedio || 0)
      }]);
    }

    setSelectedItem('');
    setCantidadToAdd('');
  };

  const handleRemoveItem = (id_insumo) => {
    setDetalles(detalles.filter(d => d.id_insumo !== id_insumo));
  };

  const clearSignature = () => {
    sigCanvas.current.clear();
  };

  const handleSave = async () => {
    if (!selectedBodega) return message.error('Seleccione Bodega Origen');
    if (!selectedTipoDoc) return message.error('Seleccione Tipo de Documento');
    if (!selectedEmpleado) return message.error('Seleccione la Persona que Reclama');
    if (detalles.length === 0) return message.error('Agregue al menos un artículo a entregar');
    if (sigCanvas.current.isEmpty()) return message.error('La firma digital del receptor es obligatoria para la salida.');

    const firmaBase64 = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');

    setLoading(true);
    try {
      const payload = {
        id_tenant: tenantId || 1,
        id_tipo: selectedTipoDoc,
        id_bodega_origen: selectedBodega,
        id_empleado_recibe: selectedEmpleado,
        observaciones: observaciones,
        firma_recibe: firmaBase64,
        detalles: detalles
      };

      const res = await authFetch('/api/inventario/documentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error procesando salida');

      message.success(`Salida registrada exitosamente. Comprobante: ${result.consecutivo}`);
      
      // Reset form
      setSelectedBodega('');
      setSelectedEmpleado('');
      setSelectedTipoDoc('');
      setObservaciones('');
      setDetalles([]);
      sigCanvas.current.clear();
      setExistencias([]);
      
    } catch (e) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: '#ef4444', color: 'white', padding: '12px', borderRadius: '8px', fontSize: '24px' }}>
          📤
        </div>
        <div>
          <h2 style={{ margin: 0, color: '#1e293b' }}>Salidas y Consumos</h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>Control estricto de entrega de materiales con firma digital obligatoria</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* PANEL IZQUIERDO: CABECERA */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>1. Datos de Entrega</h3>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#475569' }}>Tipo de Documento *</label>
            <select className="form-control" value={selectedTipoDoc} onChange={e => setSelectedTipoDoc(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <option value="">-- Seleccione --</option>
              {tiposDoc.map(t => <option key={t.id_tipo} value={t.id_tipo}>{t.nombre}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#475569' }}>Bodega Origen (Despacha) *</label>
            <select className="form-control" value={selectedBodega} onChange={e => setSelectedBodega(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <option value="">-- Seleccione Bodega --</option>
              {bodegas.map(b => <option key={b.id_bodega} value={b.id_bodega}>{b.nombre}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#475569' }}>Persona que Reclama (Firma) *</label>
            <select className="form-control" value={selectedEmpleado} onChange={e => setSelectedEmpleado(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <option value="">-- Seleccione Empleado --</option>
              {empleados.map(e => <option key={e.id_empleado} value={e.id_empleado}>{e.nombres} {e.apellidos} - {e.numero_documento}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#475569' }}>Observaciones (Motivo / Cuadrilla)</label>
            <textarea className="form-control" value={observaciones} onChange={e => setObservaciones(e.target.value)} rows="2" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          </div>
        </div>

        {/* PANEL DERECHO: ITEMS */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>2. Artículos a Entregar</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 300px' }}>
                <Select
                  showSearch
                  placeholder="-- Buscar código, barra o nombre --"
                  value={selectedItem || undefined}
                  onChange={val => setSelectedItem(val)}
                  disabled={!selectedBodega}
                  style={{ width: '100%', height: '40px' }}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={existencias.filter(e => Number(e.cantidad) > 0).map(e => ({
                    value: e.id_insumo.toString(),
                    label: `${e.codigo} - ${e.insumo_nombre} (Disp: ${e.cantidad})`
                  }))}
                />
                {selectedItem && (() => {
                  const ex = existencias.find(e => e.id_insumo.toString() === selectedItem);
                  return ex ? (
                    <div style={{ fontSize: '13px', color: '#059669', marginTop: '6px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📦</span> Existencia Actual: {ex.cantidad} {ex.unidad_medida} en bodega
                    </div>
                  ) : null;
                })()}
              </div>
              <div style={{ flex: '0 0 160px' }}>
                <input 
                  type="number" 
                  step="any"
                  min="0.01"
                  placeholder="Cantidad a sacar" 
                  value={cantidadToAdd} 
                  onChange={e => setCantidadToAdd(e.target.value)} 
                  style={{ width: '100%', padding: '0 12px', borderRadius: '6px', border: '1px solid #cbd5e1', height: '40px', fontSize: '15px', fontWeight: 'bold', textAlign: 'center' }} 
                />
              </div>
              <div style={{ flex: '0 0 auto' }}>
                <button onClick={handleAddItem} disabled={!selectedBodega} style={{ height: '40px', padding: '0 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                  + Añadir
                </button>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc' }}>
            {detalles.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                No hay artículos agregados.<br/>Seleccione un ítem con saldo disponible.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#475569' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Código</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Descripción</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Cant</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>X</th>
                  </tr>
                </thead>
                <tbody>
                  {detalles.map(d => (
                    <tr key={d.id_insumo} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px' }}>{d.codigo}</td>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>{d.nombre}</td>
                      <td style={{ padding: '8px', textAlign: 'center', color: '#ef4444', fontWeight: 'bold' }}>- {d.cantidad} {d.unidad}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <button onClick={() => handleRemoveItem(d.id_insumo)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}>✖</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* PANEL INFERIOR: FIRMA */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#334155' }}>3. Firma de Recibido</h3>
          <button onClick={clearSignature} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
            Limpiar Firma
          </button>
        </div>
        
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
          El empleado debe firmar en el recuadro inferior para conformar la entrega física de los artículos.
        </p>

        <div style={{ border: '2px dashed #cbd5e1', borderRadius: '8px', background: '#f8fafc', height: '200px', cursor: 'crosshair', position: 'relative' }}>
          <SignatureCanvas 
            ref={sigCanvas}
            penColor="black"
            canvasProps={{ width: '900', height: '200', className: 'sigCanvas', style: { width: '100%', height: '100%' } }} 
          />
          <div style={{ position: 'absolute', bottom: '10px', left: '0', right: '0', textAlign: 'center', pointerEvents: 'none', color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>
            Firme Aquí
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          onClick={handleSave} 
          disabled={loading}
          style={{ background: '#10b981', color: 'white', border: 'none', padding: '16px 32px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.3)' }}
        >
          {loading ? 'Procesando Salida...' : '✔️ Aplicar Salida y Descontar Kárdex'}
        </button>
      </div>

    </div>
  );
}
