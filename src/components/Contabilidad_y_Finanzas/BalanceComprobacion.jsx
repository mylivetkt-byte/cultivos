import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/api';

const BalanceComprobacion = ({ tenantId }) => {
  const [data, setData] = useState([]);
  const [catalogoCuentas, setCatalogoCuentas] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [modoTiempo, setModoTiempo] = useState('lapsos');
  const [fechaInicio, setFechaInicio] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]);
  
  const [idFinca, setIdFinca] = useState('');
  const [idLapsoInicio, setIdLapsoInicio] = useState('');
  const [idLapsoFin, setIdLapsoFin] = useState('');
  const [conTerceros, setConTerceros] = useState(false);

  const [fincas, setFincas] = useState([]);
  const [lapsos, setLapsos] = useState([]);

  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const resFincas = await authFetch(`/api/contabilidad/subempresas?tenantId=${tenantId || 1}`);
        const resLapsos = await authFetch(`/api/contabilidad/periodos?tenantId=${tenantId || 1}`);
        const resCuentas = await authFetch(`/api/contabilidad/catalogos?tableName=plan_contable&tenantId=${tenantId || 1}`);
        
        if (resFincas.ok) setFincas(await resFincas.json());
        if (resLapsos.ok) setLapsos(await resLapsos.json());
        if (resCuentas.ok) {
          const cat = await resCuentas.json();
          const map = {};
          if (cat.cuentas) {
            cat.cuentas.forEach(c => map[c.codigo] = c);
          }
          setCatalogoCuentas(map);
        }
      } catch (err) {
        console.error("Error cargando catálogos:", err);
      }
    };
    fetchCatalogs();
  }, [tenantId]);

  const fetchReporte = async () => {
    setLoading(true);
    setError(null);
    try {
      let queryParams = `tenantId=${tenantId || 1}`;
      if (idFinca) queryParams += `&id_finca=${idFinca}`;
      
      if (modoTiempo === 'fechas') {
        queryParams += `&fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
      } else {
        if (!idLapsoInicio || !idLapsoFin) throw new Error("Debes seleccionar un lapso inicial y final");
        queryParams += `&id_periodo_inicio=${idLapsoInicio}&id_periodo_fin=${idLapsoFin}`;
      }

      const response = await authFetch(`/api/contabilidad/reportes/balance-comprobacion?${queryParams}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Error al cargar el reporte');
      setData(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // FUNCION PARA AGRUPAR JERARQUICAMENTE
  const buildHierarchicalData = () => {
    if (data.length === 0) return [];
    
    const treeMap = {};

    // 1. Registrar movimientos detallados (Nivel 5) y sumarizar hacia padres
    data.forEach(row => {
      // Calcular saldos correctos para este registro según su naturaleza
      const saldoAnteriorBruto = parseFloat(row.saldo_anterior_bruto || 0);
      const saldoAnterior = row.naturaleza === 'Credito' ? -saldoAnteriorBruto : saldoAnteriorBruto;
      const debito = parseFloat(row.debitos_periodo || 0);
      const credito = parseFloat(row.creditos_periodo || 0);
      
      let saldoNuevo = 0;
      if (row.naturaleza === 'Credito') {
        saldoNuevo = saldoAnterior - debito + credito;
      } else {
        saldoNuevo = saldoAnterior + debito - credito;
      }

      // Evitar procesar saldos absolutamente en 0 si no hay movimientos (opcional, pero útil)
      if (Math.abs(saldoAnterior) < 0.01 && Math.abs(debito) < 0.01 && Math.abs(credito) < 0.01 && Math.abs(saldoNuevo) < 0.01) return;

      const codigoFull = row.codigo;
      
      // Función para acumular en el árbol
      const addToTree = (cod, esTercero = false, terceroObj = null) => {
        if (!treeMap[cod]) {
          treeMap[cod] = {
            codigo: cod,
            nombre: catalogoCuentas[cod] ? catalogoCuentas[cod].nombre : (esTercero ? terceroObj.razon_social : 'SIN NOMBRE'),
            nivel: catalogoCuentas[cod] ? catalogoCuentas[cod].nivel : (esTercero ? 6 : codigoFull.length),
            isTercero: esTercero,
            terceroInfo: terceroObj,
            saldoAnterior: 0,
            debito: 0,
            credito: 0,
            saldoNuevo: 0,
            hijos: new Set()
          };
        }
        treeMap[cod].saldoAnterior += saldoAnterior;
        treeMap[cod].debito += debito;
        treeMap[cod].credito += credito;
        treeMap[cod].saldoNuevo += saldoNuevo;
      };

      // Descomponer código en sus niveles
      // Ej: 36050501 -> N1: 3, N2: 36, N3: 3605, N4: 360505, N5: 36050501
      const prefixes = [];
      if (codigoFull.length >= 1) prefixes.push(codigoFull.substring(0, 1));
      if (codigoFull.length >= 2) prefixes.push(codigoFull.substring(0, 2));
      if (codigoFull.length >= 4) prefixes.push(codigoFull.substring(0, 4));
      if (codigoFull.length >= 6) prefixes.push(codigoFull.substring(0, 6));
      if (codigoFull.length >= 8) prefixes.push(codigoFull.substring(0, 8)); // Y así sucesivamente...

      prefixes.forEach(prefix => addToTree(prefix));

      // Construir relaciones de parentesco
      for (let i = 1; i < prefixes.length; i++) {
        const parent = prefixes[i-1];
        const child = prefixes[i];
        treeMap[parent].hijos.add(child);
      }

      // Si es con terceros, agregarlo como hijo del último nivel
      if (conTerceros && row.id_tercero) {
        const terceroCode = `${codigoFull}_T_${row.numero_identificacion}`;
        addToTree(terceroCode, true, { nit: row.numero_identificacion, razon_social: row.razon_social });
        treeMap[codigoFull].hijos.add(terceroCode);
      }
    });

    // 2. Aplanar el árbol para renderizado (recorrido en pre-orden)
    const renderList = [];
    
    // Obtener los raíces (Nivel 1)
    const roots = Object.keys(treeMap).filter(k => k.length === 1).sort();

    const traverse = (cod) => {
      renderList.push(treeMap[cod]);
      const sortedHijos = Array.from(treeMap[cod].hijos).sort();
      sortedHijos.forEach(hijo => traverse(hijo));
    };

    roots.forEach(root => traverse(root));

    return renderList;
  };

  const hierarchicalList = buildHierarchicalData();

  const handlePrint = () => {
    const printContent = document.querySelector('.printable-report');
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Balance de Prueba</title>
          <style>
            @media print {
              @page { margin: 15mm; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: system-ui, -apple-system, sans-serif; }
            }
          </style>
        </head>
        <body style="background: white; margin: 0;">
          ${printContent.innerHTML}
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const exportToCSV = () => {
    let csv = 'Cuenta / NIT,Nombre / Razón Social,Nivel,SALDO ANTERIOR,DÉBITOS,CRÉDITOS,NUEVO SALDO\n';
    hierarchicalList.forEach(r => {
      const code = r.isTercero ? r.terceroInfo.nit : r.codigo;
      csv += `"${code}","${r.nombre}",${r.nivel},${r.saldoAnterior},${r.debito},${r.credito},${r.saldoNuevo}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Balance_Jerarquico.csv`;
    a.click();
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 }).format(amount);

  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
  const inputStyle = { padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'white', width: '100%' };

  // Totales (Sumando solo el Nivel 1)
  const roots = hierarchicalList.filter(r => r.codigo.length === 1);
  const totalDebitos = roots.reduce((sum, r) => sum + r.debito, 0);
  const totalCreditos = roots.reduce((sum, r) => sum + r.credito, 0);
  const diferencia = Math.abs(totalDebitos - totalCreditos);

  const lapsoInicioObj = lapsos.find(l => l.id_periodo.toString() === idLapsoInicio);
  const lapsoFinObj = lapsos.find(l => l.id_periodo.toString() === idLapsoFin);
  const lapsoInicioName = lapsoInicioObj ? `${lapsoInicioObj.ano}-${String(lapsoInicioObj.mes).padStart(2,'0')}` : idLapsoInicio;
  const lapsoFinName = lapsoFinObj ? `${lapsoFinObj.ano}-${String(lapsoFinObj.mes).padStart(2,'0')}` : idLapsoFin;

  return (
    <div style={{ margin: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
      {/* HEADER NO IMPRIMIBLE */}
      <div className="no-print">
        <div style={{ background: 'linear-gradient(90deg, #1e293b 0%, #334155 100%)', padding: '24px', color: 'white' }}>
          <h2 style={{ margin: '0 0 8px 0' }}>⚖️ Balance de Prueba (Jerárquico)</h2>
          <p style={{ margin: 0, color: '#cbd5e1' }}>Vista multinivel con opción de apertura de terceros.</p>
        </div>
        <div style={{ padding: '24px' }}>
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={labelStyle}>Finca (Subempresa)</label>
                <select value={idFinca} onChange={(e) => setIdFinca(e.target.value)} style={inputStyle}>
                  <option value="">-- Toda la Empresa --</option>
                  {fincas.map(f => (
                    <option key={f.id_finca} value={f.id_finca}>{f.codigo} - {f.nombre}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                  <input type="checkbox" checked={conTerceros} onChange={(e) => setConTerceros(e.target.checked)} style={{ transform: 'scale(1.2)' }} />
                  Detallar por Terceros
                </label>
                <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                  <button onClick={() => setModoTiempo('fechas')} style={{ padding: '8px 16px', border: 'none', background: modoTiempo === 'fechas' ? '#2563eb' : 'transparent', color: modoTiempo === 'fechas' ? 'white' : '#475569', fontWeight: 'bold', cursor: 'pointer' }}>📅 Fechas</button>
                  <button onClick={() => setModoTiempo('lapsos')} style={{ padding: '8px 16px', border: 'none', background: modoTiempo === 'lapsos' ? '#2563eb' : 'transparent', color: modoTiempo === 'lapsos' ? 'white' : '#475569', fontWeight: 'bold', cursor: 'pointer' }}>⏱️ Lapsos</button>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              {modoTiempo === 'fechas' ? (
                <>
                  <div><label style={labelStyle}>Desde</label><input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Hasta</label><input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} style={inputStyle} /></div>
                </>
              ) : (
                <>
                  <div>
                    <label style={labelStyle}>Lapso Inicial</label>
                    <select value={idLapsoInicio} onChange={(e) => setIdLapsoInicio(e.target.value)} style={inputStyle}>
                      <option value="">-- Seleccionar --</option>
                      {lapsos.map(L => <option key={L.id_periodo} value={L.id_periodo}>{L.ano}-{String(L.mes).padStart(2,'0')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Lapso Final</label>
                    <select value={idLapsoFin} onChange={(e) => setIdLapsoFin(e.target.value)} style={inputStyle}>
                      <option value="">-- Seleccionar --</option>
                      {lapsos.map(L => <option key={L.id_periodo} value={L.id_periodo}>{L.ano}-{String(L.mes).padStart(2,'0')}</option>)}
                    </select>
                  </div>
                </>
              )}
              <button onClick={fetchReporte} style={{ background: '#22c55e', color: 'white', padding: '9px 24px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginLeft: 'auto' }}>
                {loading ? 'Consultando...' : '▶ Generar Balance'}
              </button>
              
              {hierarchicalList.length > 0 && (
                <>
                  <button onClick={handlePrint} style={{ background: '#3b82f6', color: 'white', padding: '9px 24px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                    🖨️ Imprimir
                  </button>
                  <button onClick={exportToCSV} style={{ background: '#f59e0b', color: 'white', padding: '9px 24px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                    📊 Exportar CSV
                  </button>
                </>
              )}
            </div>
          </div>
          {error && <div style={{ background: '#fef2f2', color: '#991b1b', padding: '12px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #fca5a5' }}>{error}</div>}
        </div>
      </div>

      {/* REPORTE IMPRIMIBLE */}
      {hierarchicalList.length > 0 && (
        <div className="printable-report" style={{ padding: '40px', background: 'white' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>BALANCE DE PRUEBA {conTerceros ? 'CON TERCEROS' : 'CONSOLIDADO'}</h1>
            <h3 style={{ margin: 0, fontWeight: 'normal', color: '#475569' }}>
              {idFinca ? `Finca/Subempresa: ${fincas.find(f => f.id_finca.toString() === idFinca)?.nombre}` : 'Empresa Consolidada'}
            </h3>
            <p style={{ margin: '8px 0 0 0', color: '#64748b' }}>
              {modoTiempo === 'fechas' ? `Desde ${fechaInicio} hasta ${fechaFin}` : `Lapso ${lapsoInicioName} a ${lapsoFinName}`}
            </p>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'monospace' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>CÓDIGO</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>NOMBRE DE LA CUENTA / TERCERO</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>SALDO ANTERIOR</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>DÉBITOS MES</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>CRÉDITOS MES</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>NUEVO SALDO</th>
              </tr>
            </thead>
            <tbody>
              {hierarchicalList.map((item, idx) => {
                // Estilo condicional según el nivel
                let fontWeight = 'normal';
                let color = 'inherit';
                let paddingLeft = '8px';
                
                if (item.nivel === 1) { fontWeight = 'bold'; color = '#0f172a'; }
                else if (item.nivel === 2) { fontWeight = 'bold'; color = '#1e293b'; paddingLeft = '16px'; }
                else if (item.nivel === 3) { paddingLeft = '24px'; fontWeight = '500'; }
                else if (item.nivel === 4) { paddingLeft = '32px'; }
                else if (item.nivel === 5) { paddingLeft = '40px'; }

                if (item.isTercero) {
                  paddingLeft = '50px';
                  color = '#475569';
                }

                return (
                  <tr key={idx} style={{ borderBottom: item.isTercero ? 'none' : '1px solid #f1f5f9', fontWeight, color }}>
                    <td style={{ padding: '6px 8px', paddingLeft: item.isTercero ? paddingLeft : '8px' }}>
                      {item.isTercero ? item.terceroInfo.nit : item.codigo}
                    </td>
                    <td style={{ padding: '6px 8px', paddingLeft }}>
                      {item.nombre}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{formatCurrency(item.saldoAnterior)}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{item.debito > 0 ? formatCurrency(item.debito) : ''}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{item.credito > 0 ? formatCurrency(item.credito) : ''}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{formatCurrency(item.saldoNuevo)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #334155', borderBottom: '2px double #334155', fontWeight: 'bold' }}>
                <td colSpan="3" style={{ padding: '12px 8px', textAlign: 'right' }}>TOTAL SUMAS IGUALES MOVIMIENTO:</td>
                <td style={{ padding: '12px 8px', textAlign: 'right' }}>{formatCurrency(totalDebitos)}</td>
                <td style={{ padding: '12px 8px', textAlign: 'right' }}>{formatCurrency(totalCreditos)}</td>
                <td style={{ padding: '12px 8px', textAlign: 'right', color: diferencia > 0.01 ? '#dc2626' : '#16a34a' }}>
                  {diferencia > 0.01 ? `Descuadre: ${formatCurrency(diferencia)}` : 'OK'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default BalanceComprobacion;
