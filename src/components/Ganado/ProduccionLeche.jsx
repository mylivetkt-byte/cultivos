import React, { useState } from 'react';

function ProduccionLeche({ fincaId }) {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [litros, setLitros] = useState('');
  const [cliente, setCliente] = useState('');
  const [tipoPago, setTipoPago] = useState('Contado');
  const [valorTotal, setValorTotal] = useState('');

  const handleGuardar = async () => {
    try {
      const res = await fetch('/api/ganado_avanzado/leche', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ fecha, litros, cliente, tipo_pago: tipoPago, valor_total: valorTotal })
      });
      if(res.ok) {
        alert('Producción y Venta de Leche registrada con éxito.');
        setLitros(''); setCliente(''); setValorTotal('');
      } else {
        alert('Error al registrar venta de leche.');
      }
    } catch(e) {
      alert('Error de red al registrar.');
    }
  };

  return (
    <div className="p-4 dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ color: 'var(--primary)', margin: 0 }}>🥛 Producción y Venta de Leche</h2>
          <p style={{ margin: '5px 0 0 0', color: 'var(--text-muted)' }}>Registro Diario de Ordeño y Facturación a Clientes</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px' }}>📗 Exportar Diario Excel</button>
          <button style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px' }}>📕 Reporte DIAN PDF</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: '1', minWidth: '300px', padding: '20px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <h3 style={{ marginTop: 0, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>Formulario de Ordeño y Venta</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div><label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Fecha de Ordeño</label><br/><input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}/></div>
            <div><label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Litros Extraídos (Total)</label><br/><input type="number" value={litros} onChange={e => setLitros(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}/></div>
            
            <div><label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cliente / Industria Láctea</label><br/><input type="text" value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Ej: Lácteos La Sabana" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}/></div>
            
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tipo de Pago</label><br/>
              <select value={tipoPago} onChange={e => setTipoPago(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                <option value="Contado">Pago de Contado</option>
                <option value="Crédito">A Crédito (Cartera)</option>
              </select>
            </div>

            <div><label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Valor Total Venta ($)</label><br/><input type="number" value={valorTotal} onChange={e => setValorTotal(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}/></div>
            
            <button onClick={handleGuardar} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}>Registrar Venta de Leche</button>
          </div>
        </div>

        <div className="card" style={{ flex: '1', minWidth: '300px', padding: '20px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <h3 style={{ marginTop: 0, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>Resumen del Mes</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginTop: '20px' }}>
            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
              <h4 style={{ margin: '0 0 5px 0', fontSize: '13px', color: 'var(--text-muted)' }}>Litros Producidos Este Mes</h4>
              <h2 style={{ margin: 0, color: '#3b82f6' }}>4,250 L</h2>
            </div>

            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
              <h4 style={{ margin: '0 0 5px 0', fontSize: '13px', color: 'var(--text-muted)' }}>Ingresos por Leche (Contado)</h4>
              <h2 style={{ margin: 0, color: '#10b981' }}>$ 8,500,000</h2>
            </div>

            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
              <h4 style={{ margin: '0 0 5px 0', fontSize: '13px', color: 'var(--text-muted)' }}>Cartera por Cobrar (Crédito)</h4>
              <h2 style={{ margin: 0, color: '#f59e0b' }}>$ 1,200,000</h2>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProduccionLeche;
