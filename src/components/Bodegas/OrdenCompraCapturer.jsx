import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { authFetch } from '../../utils/api';

function OrdenCompraCapturer({ tenantId }) {
  const [proveedores, setProveedores] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [fechaEntrega, setFechaEntrega] = useState(new Date().toISOString().slice(0, 10));
  const [detalles, setDetalles] = useState([]);
  
  const [currentInsumo, setCurrentInsumo] = useState(null);
  const [cantidad, setCantidad] = useState('');
  const [precio, setPrecio] = useState('');

  useEffect(() => {
    // Cargar proveedores
    authFetch(`/api/terceros?id_tenant=${tenantId}`)
      .then(res => res.json())
      .then(data => {
        const provs = data.filter(t => t.es_proveedor === 1 || t.tipo_tercero === 'Proveedor').map(t => ({
          value: t.id_tercero,
          label: `${t.documento} - ${t.nombre_completo}`,
          telefono: t.telefono,
          nombre_completo: t.nombre_completo
        }));
        setProveedores(provs);
      })
      .catch(err => console.error(err));

    // Cargar insumos
    authFetch(`/api/table/insumos/data?tenantId=${tenantId}&pageSize=100`)
      .then(res => res.json())
      .then(data => {
        if (data && data.data) {
          setInsumos(data.data.map(i => ({
            value: i.id_insumo,
            label: `${i.codigo} - ${i.nombre} (${i.unidad_medida})`
          })));
        }
      })
      .catch(err => console.error(err));
  }, [tenantId]);

  const handleAddDetalle = () => {
    if (!currentInsumo || !cantidad || !precio) return alert("Complete los datos del insumo.");
    setDetalles([...detalles, {
      id_insumo: currentInsumo.value,
      nombre: currentInsumo.label,
      cantidad: Number(cantidad),
      precio: Number(precio),
      subtotal: Number(cantidad) * Number(precio)
    }]);
    setCurrentInsumo(null);
    setCantidad('');
    setPrecio('');
  };

  const removeDetalle = (index) => {
    setDetalles(detalles.filter((_, i) => i !== index));
  };

  const totalOrden = detalles.reduce((acc, d) => acc + d.subtotal, 0);

  const handleSubmit = async () => {
    if (!selectedProveedor || detalles.length === 0) return alert("Falta proveedor o insumos.");
    
    try {
      const res = await authFetch('/api/compras/orden', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_tenant: tenantId,
          id_proveedor: selectedProveedor.value,
          fecha_entrega_esperada: fechaEntrega,
          detalles: detalles
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Orden de Compra Creada: ' + data.numero_orden);
        
        // WhatsApp integration
        if (selectedProveedor.telefono && confirm(`¿Desea enviar la orden por WhatsApp al proveedor al número ${selectedProveedor.telefono}?`)) {
          const texto_orden = `Hola ${selectedProveedor.nombre_completo},\nAdjunto los detalles de nuestro pedido:\n\n` + 
            detalles.map(d => `- ${d.cantidad}x ${d.nombre} a $${d.precio.toLocaleString('es-CO')}`).join('\n') +
            `\n\nTotal estimado: $${totalOrden.toLocaleString('es-CO')}\nPor favor confirmar recepción.`;
            
          await authFetch('/api/whatsapp/send-oc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telefono: selectedProveedor.telefono,
              numero_orden: data.numero_orden,
              texto_orden: texto_orden
            })
          });
          alert('¡Mensaje de WhatsApp enviado!');
        }

        setDetalles([]);
        setSelectedProveedor(null);
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    }
  };

  const selectStyles = {
    control: (base) => ({ ...base, background: 'var(--bg-color)', borderColor: 'var(--border)', color: 'var(--text)' }),
    singleValue: (base) => ({ ...base, color: 'var(--text)' }),
    input: (base) => ({ ...base, color: 'var(--text)' }),
    menu: (base) => ({ ...base, background: 'var(--bg-card)' }),
    option: (base, state) => ({ ...base, background: state.isFocused ? 'var(--primary)' : 'transparent', color: state.isFocused ? 'white' : 'var(--text)' })
  };

  return (
    <div className="module-container">
      <div className="module-header">
        <h1>🛒 Generar Orden de Compra</h1>
        <p>Crea pedidos oficiales a proveedores para abastecer el almacén.</p>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="form-grid">
          <div className="form-group" style={{ gridColumn: '1 / span 2' }}>
            <label>Proveedor</label>
            <Select 
              options={proveedores} 
              value={selectedProveedor} 
              onChange={setSelectedProveedor} 
              placeholder="Buscar proveedor..."
              styles={selectStyles}
            />
          </div>
          <div className="form-group">
            <label>Fecha Esperada de Entrega</label>
            <input 
              type="date" 
              className="form-control" 
              value={fechaEntrega} 
              onChange={e => setFechaEntrega(e.target.value)} 
            />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h3>Agregar Insumos</h3>
        <div className="form-grid" style={{ alignItems: 'end' }}>
          <div className="form-group" style={{ gridColumn: '1 / span 2' }}>
            <label>Insumo</label>
            <Select 
              options={insumos} 
              value={currentInsumo} 
              onChange={setCurrentInsumo} 
              placeholder="Buscar insumo..."
              styles={selectStyles}
            />
          </div>
          <div className="form-group">
            <label>Cantidad Pedida</label>
            <input 
              type="number" 
              className="form-control" 
              aria-label="Cantidad Pedida"
              value={cantidad} 
              onChange={e => setCantidad(e.target.value)} 
            />
          </div>
          <div className="form-group">
            <label>Precio Unitario Negociado ($)</label>
            <input 
              type="number" 
              className="form-control" 
              aria-label="Precio Unitario Negociado ($)"
              value={precio} 
              onChange={e => setPrecio(e.target.value)} 
            />
          </div>
          <div className="form-group">
            <button className="btn btn-secondary hover-effect" onClick={handleAddDetalle} style={{ width: '100%' }}>➕ Agregar</button>
          </div>
        </div>
      </div>

      {detalles.length > 0 && (
        <div className="card">
          <h3>Detalles de la Orden</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Cantidad</th>
                <th>Vlr Unitario</th>
                <th>Subtotal</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {detalles.map((d, idx) => (
                <tr key={idx}>
                  <td>{d.nombre}</td>
                  <td>{d.cantidad}</td>
                  <td>${d.precio.toLocaleString('es-CO')}</td>
                  <td>${d.subtotal.toLocaleString('es-CO')}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => removeDetalle(idx)}>Quitar</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="3" style={{ textAlign: 'right', fontWeight: 'bold' }}>Total Orden:</td>
                <td colSpan="2" style={{ fontWeight: 'bold', fontSize: '1.2em' }}>${totalOrden.toLocaleString('es-CO')}</td>
              </tr>
            </tfoot>
          </table>

          <div style={{ marginTop: '20px', textAlign: 'right' }}>
            <button className="btn btn-primary hover-effect" onClick={handleSubmit} style={{ fontSize: '16px', padding: '10px 20px' }}>
              ✉️ Emitir Orden de Compra y Enviar por WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrdenCompraCapturer;
