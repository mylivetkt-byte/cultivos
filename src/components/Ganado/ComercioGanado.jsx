import React, { useState, useEffect } from 'react';
import { fetchTableData } from '../../utils/api';

function ComercioGanado({ fincaId }) {
  const [tab, setTab] = useState('entradas');
  
  // Dictionaries
  const [hatos, setHatos] = useState([]);
  const [especies, setEspecies] = useState([]);
  const [razas, setRazas] = useState([]);
  const [potreros, setPotreros] = useState([]);
  
  // Entradas States
  const [tipoEntrada, setTipoEntrada] = useState('Compra'); // 'Compra', 'Obsequio'
  const [tipoCompra, setTipoCompra] = useState('individual'); // 'individual', 'lote'
  const [idHato, setIdHato] = useState('');
  const [idEspecie, setIdEspecie] = useState('');
  const [idRaza, setIdRaza] = useState('');
  const [idPotrero, setIdPotrero] = useState('');
  
  const [fechaEntrada, setFechaEntrada] = useState(new Date().toISOString().split('T')[0]);
  const [arete, setArete] = useState('');
  const [nombre, setNombre] = useState('');
  const [sexo, setSexo] = useState('Macho');
  const [cantidadAnimales, setCantidadAnimales] = useState(1);
  const [procedencia, setProcedencia] = useState('');
  const [vendedor, setVendedor] = useState('');
  const [valorCompra, setValorCompra] = useState('');

  // Salidas States
  const [tipoSalida, setTipoSalida] = useState('Venta'); // 'Venta', 'Obsequio', 'Muerte'
  const [tipoVenta, setTipoVenta] = useState('individual'); // 'individual', 'lote'
  const [fechaSalida, setFechaSalida] = useState(new Date().toISOString().split('T')[0]);
  const [idAnimalSalida, setIdAnimalSalida] = useState('');
  const [animalesSeleccionados, setAnimalesSeleccionados] = useState([]);
  const [comprador, setComprador] = useState('');
  const [valorVenta, setValorVenta] = useState('');
  const [pesoVenta, setPesoVenta] = useState('');
  // Muerte states
  const [causaPresunta, setCausaPresunta] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [impactoEconomico, setImpactoEconomico] = useState('');
  
  const [animalesDisponibles, setAnimalesDisponibles] = useState([]);

  useEffect(() => {
    // Load catalogs
    Promise.all([
      fetchTableData('ganado_hatos', { pageSize: 100 }),
      fetchTableData('ganado_especies', { pageSize: 100 }),
      fetchTableData('ganado_razas', { pageSize: 100 }),
      fetchTableData('ganado_potreros', { pageSize: 100 })
    ]).then(([resHatos, resEspecies, resRazas, resPotreros]) => {
      setHatos(resHatos.data || []);
      setEspecies(resEspecies.data || []);
      setRazas(resRazas.data || []);
      setPotreros(resPotreros.data || []);
      if(resEspecies.data?.length) setIdEspecie(resEspecies.data[0].id_especie);
      if(resRazas.data?.length) setIdRaza(resRazas.data[0].id_raza);
    }).catch(console.error);
  }, []);

  // Reset hato selection when global finca filter changes
  useEffect(() => {
    const filtered = fincaId ? hatos.filter(h => String(h.id_finca) === String(fincaId)) : hatos;
    if (filtered.length > 0) {
      setIdHato(filtered[0].id_hato);
    } else {
      setIdHato('');
    }
    setIdPotrero('');
  }, [fincaId, hatos]);

  useEffect(() => {
    if (tab === 'salidas') {
      fetchTableData('ganado_animales', { pageSize: 1000, filters: { estado: 'Activo' } })
        .then(res => setAnimalesDisponibles(res.data || []))
        .catch(console.error);
    }
  }, [tab]);

  const handleEntrada = async () => {
    try {
      const res = await fetch('/api/ganado_avanzado/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          tipo_entrada: tipoEntrada,
          id_hato: idHato,
          id_raza: idRaza,
          id_potrero: idPotrero,
          es_lote: tipoCompra === 'lote',
          cantidad_animales: cantidadAnimales,
          fecha: fechaEntrada,
          arete_crotal: arete,
          nombre,
          sexo,
          fecha_nacimiento: new Date().toISOString().split('T')[0],
          procedencia,
          vendedor,
          valor: tipoEntrada === 'Obsequio' ? 0 : valorCompra
        })
      });
      if(res.ok) {
        alert('Entrada registrada exitosamente.');
        setArete(''); setNombre(''); setProcedencia(''); setVendedor(''); setValorCompra(''); setCantidadAnimales(1);
      } else if (res.status === 409) {
        const err = await res.json();
        alert(`❌ Conflicto: ${err.error || 'El arete ya existe.'}`);
      } else {
        alert('Error al registrar entrada');
      }
    } catch(e) {
      alert('Error de red al registrar');
    }
  };

  const handleSalida = async () => {
    try {
      const payload = {
        tipo_salida: tipoSalida,
        es_lote: tipoVenta === 'lote',
        fecha: fechaSalida,
        comprador,
        valor: tipoSalida === 'Venta' ? valorVenta : 0,
        peso_venta_kg: pesoVenta,
        causa_presunta: causaPresunta,
        diagnostico_veterinario: diagnostico,
        impacto_economico: impactoEconomico
      };

      if (tipoVenta === 'lote') {
        payload.animales = animalesSeleccionados;
      } else {
        payload.id_animal = idAnimalSalida;
      }

      const res = await fetch('/api/ganado_avanzado/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(payload)
      });
      if(res.ok) {
        alert('Salida registrada exitosamente.');
        setIdAnimalSalida(''); setComprador(''); setValorVenta(''); setPesoVenta(''); setAnimalesSeleccionados([]);
        setCausaPresunta(''); setDiagnostico(''); setImpactoEconomico('');
        fetchTableData('ganado_animales', { pageSize: 1000, filters: { estado: 'Activo' } })
          .then(r => setAnimalesDisponibles(r.data || []));
      } else {
        alert('Error al registrar salida');
      }
    } catch(e) {
      alert('Error de red al registrar');
    }
  };

  const handleSelectMultiple = (e) => {
    const values = Array.from(e.target.selectedOptions, option => option.value);
    setAnimalesSeleccionados(values);
  };
  
  const hatosOrdenados = [...(fincaId ? hatos.filter(h => String(h.id_finca) === String(fincaId)) : hatos)].sort((a, b) => a.nombre.localeCompare(b.nombre));
  const selectedHato = hatosOrdenados.find(h => String(h.id_hato) === String(idHato));
  
  let potrerosOrdenados = [...potreros];
  if (selectedHato) {
    potrerosOrdenados = potrerosOrdenados.filter(p => String(p.id_finca) === String(selectedHato.id_finca));
  } else if (fincaId) {
    potrerosOrdenados = potrerosOrdenados.filter(p => String(p.id_finca) === String(fincaId));
  }
  potrerosOrdenados.sort((a, b) => a.nombre.localeCompare(b.nombre));

  const razasFiltradas = [...razas]
    .filter(r => String(r.id_especie) === String(idEspecie))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <div className="p-4 dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ color: 'var(--primary)', margin: 0 }}>🚜 Control de Inventario Animal</h2>
          <p style={{ margin: '5px 0 0 0', color: 'var(--text-muted)' }}>Gestión Multi-Especie de Entradas, Salidas y Mortalidad</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px' }}>📗 Exportar a Excel</button>
          <button style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px' }}>📕 Exportar a PDF</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <button 
          onClick={() => setTab('entradas')}
          style={{ padding: '10px 20px', background: tab === 'entradas' ? 'var(--primary)' : 'var(--card-bg)', color: tab === 'entradas' ? 'white' : 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          📥 Entradas (Compras / Obsequios)
        </button>
        <button 
          onClick={() => setTab('salidas')}
          style={{ padding: '10px 20px', background: tab === 'salidas' ? 'var(--primary)' : 'var(--card-bg)', color: tab === 'salidas' ? 'white' : 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          📤 Salidas (Ventas / Obsequios / Muerte)
        </button>
      </div>

      {tab === 'entradas' && (
        <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: 'var(--text)' }}>Registrar Nueva Entrada</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select value={tipoEntrada} onChange={e => setTipoEntrada(e.target.value)} style={{ padding: '5px', borderRadius: '4px', border: '1px solid var(--border)', background: '#f8fafc' }}>
                <option value="Compra">Entrada por Compra</option>
                <option value="Obsequio">Entrada por Obsequio (Regalo)</option>
              </select>
              <select value={tipoCompra} onChange={e => setTipoCompra(e.target.value)} style={{ padding: '5px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                <option value="individual">Individual (1 animal)</option>
                <option value="lote">Por Lote (Varios animales)</option>
              </select>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
            {/* Ubicación y Clasificación */}
            <div><label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Hato / Finca de Destino</label><br/>
              <select value={idHato} onChange={e => {
                  setIdHato(e.target.value);
                  setIdPotrero('');
                }} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                <option value="">-- Seleccione un Hato/Finca --</option>
                {hatosOrdenados.map(h => <option key={h.id_hato} value={h.id_hato}>{h.nombre} ({h.codigo})</option>)}
              </select>
            </div>
            <div><label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Especie</label><br/>
              <select value={idEspecie} onChange={e => {
                setIdEspecie(e.target.value);
                const rm = razas.filter(r => String(r.id_especie) === String(e.target.value));
                if (rm.length > 0) setIdRaza(rm[0].id_raza);
              }} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                {especies.map(e => <option key={e.id_especie} value={e.id_especie}>{e.nombre}</option>)}
              </select>
            </div>
            <div><label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Raza</label><br/>
              <select value={idRaza} onChange={e => setIdRaza(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                {razasFiltradas.map(r => <option key={r.id_raza} value={r.id_raza}>{r.nombre}</option>)}
              </select>
            </div>
            <div><label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Potrero (Opcional)</label><br/>
              <select value={idPotrero} onChange={e => setIdPotrero(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                <option value="">-- Sin asignar --</option>
                {potrerosOrdenados.map(p => <option key={p.id_potrero} value={p.id_potrero}>{p.nombre}</option>)}
              </select>
            </div>
            <div><label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sexo</label><br/>
              <select value={sexo} onChange={e => setSexo(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                <option value="Macho">Macho</option>
                <option value="Hembra">Hembra</option>
              </select>
            </div>
            <div><label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Fecha de Entrada</label><br/>
              <input type="date" value={fechaEntrada} onChange={e => setFechaEntrada(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}/>
            </div>

            <div style={{ gridColumn: 'span 3', borderTop: '1px dashed var(--border)', margin: '10px 0' }}></div>

            {/* Datos específicos */}
            {tipoCompra === 'individual' ? (
              <>
                <div><label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Arete / Crotal</label><br/><input type="text" value={arete} onChange={e => setArete(e.target.value)} placeholder="Ej: 9982..." style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}/></div>
                <div><label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Nombre (Opcional)</label><br/><input type="text" value={nombre} onChange={e => setNombre(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}/></div>
              </>
            ) : (
              <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cantidad de Animales en Lote</label><br/><input type="number" min="2" value={cantidadAnimales} onChange={e => setCantidadAnimales(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}/></div>
            )}
            
            {tipoEntrada === 'Compra' && (
              <div><label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Valor {tipoCompra === 'lote' ? 'Total del Lote' : 'Compra'} ($)</label><br/><input type="number" value={valorCompra} onChange={e => setValorCompra(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}/></div>
            )}
            
            <div><label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Procedencia (Finca Origen)</label><br/><input type="text" value={procedencia} onChange={e => setProcedencia(e.target.value)} placeholder="Ej: Hacienda El Sol" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}/></div>
            <div><label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tipoEntrada === 'Compra' ? 'Vendedor' : 'Donante'}</label><br/><input type="text" value={vendedor} onChange={e => setVendedor(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}/></div>
            
            <div style={{ gridColumn: 'span 3', textAlign: 'right', marginTop: '10px' }}>
              <button onClick={handleEntrada} style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Guardar Entrada</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'salidas' && (
        <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: 'var(--text)' }}>Registrar Salida / Muerte</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select value={tipoSalida} onChange={e => setTipoSalida(e.target.value)} style={{ padding: '5px', borderRadius: '4px', border: '1px solid var(--border)', background: tipoSalida === 'Muerte' ? '#fef2f2' : '#f8fafc' }}>
                <option value="Venta">Salida por Venta</option>
                <option value="Obsequio">Salida por Obsequio</option>
                <option value="Muerte">Baja por Muerte</option>
              </select>
              <select value={tipoVenta} onChange={e => setTipoVenta(e.target.value)} style={{ padding: '5px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                <option value="individual">Individual (1 animal)</option>
                <option value="lote">Por Lote (Varios animales)</option>
              </select>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div><label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Fecha de Salida/Muerte</label><br/><input type="date" value={fechaSalida} onChange={e => setFechaSalida(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}/></div>
            
            {tipoSalida !== 'Muerte' && (
              <div><label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tipoSalida === 'Venta' ? 'Comprador' : 'Beneficiario'}</label><br/><input type="text" value={comprador} onChange={e => setComprador(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}/></div>
            )}
            
            {tipoVenta === 'individual' ? (
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Seleccionar Animal</label><br/>
                <select value={idAnimalSalida} onChange={e => setIdAnimalSalida(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  <option value="">-- Seleccione un animal --</option>
                  {animalesDisponibles.map(a => (
                    <option key={a.id_animal} value={a.id_animal}>{a.arete_crotal} - {a.nombre || 'Sin nombre'}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Seleccionar Animales (Lote)</label><br/>
                <select multiple value={animalesSeleccionados} onChange={handleSelectMultiple} style={{ width: '100%', height: '120px', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  {animalesDisponibles.map(a => (
                    <option key={a.id_animal} value={a.id_animal}>{a.arete_crotal} - {a.nombre || 'Sin nombre'}</option>
                  ))}
                </select>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '5px 0 0 0' }}>Manten presionada la tecla Ctrl (o Cmd) para seleccionar múltiples.</p>
              </div>
            )}
            
            {tipoSalida === 'Venta' && (
              <>
                <div><label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Peso Total Venta (Kg)</label><br/><input type="number" value={pesoVenta} onChange={e => setPesoVenta(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}/></div>
                <div><label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Valor Total Venta ($)</label><br/><input type="number" value={valorVenta} onChange={e => setValorVenta(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}/></div>
              </>
            )}

            {tipoSalida === 'Muerte' && (
              <>
                <div><label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Causa Presunta</label><br/><input type="text" value={causaPresunta} onChange={e => setCausaPresunta(e.target.value)} placeholder="Ej: Mordedura de serpiente" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}/></div>
                <div><label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Impacto Económico Estimado ($)</label><br/><input type="number" value={impactoEconomico} onChange={e => setImpactoEconomico(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}/></div>
                <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Diagnóstico Veterinario (Opcional)</label><br/><textarea value={diagnostico} onChange={e => setDiagnostico(e.target.value)} rows="3" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}/></div>
              </>
            )}
            
            <div style={{ gridColumn: 'span 2', textAlign: 'right', marginTop: '10px' }}>
              <button onClick={handleSalida} style={{ background: tipoSalida === 'Muerte' ? '#ef4444' : '#3b82f6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                {tipoSalida === 'Muerte' ? 'Registrar Baja por Muerte' : 'Registrar Salida'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ComercioGanado;
