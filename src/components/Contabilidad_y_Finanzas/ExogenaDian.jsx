import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/api';
import Pagination from '../Pagination';

const ExogenaDian = ({ tenantId }) => {
  const [formatos] = useState([
    { id: '1001', nombre: 'Pagos o Abonos en Cuenta y Retenciones' },
    { id: '1003', nombre: 'Retenciones en la fuente que le practicaron' },
    { id: '1005', nombre: 'Impuesto a las Ventas por Pagar (Descontable)' },
    { id: '1007', nombre: 'Ingresos Recibidos en el Año' },
    { id: '1008', nombre: 'Saldos de Cuentas por Cobrar' },
    { id: '1009', nombre: 'Saldos de Cuentas por Pagar' }
  ]);
  
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [selectedFormato, setSelectedFormato] = useState('1001');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchExogena = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/dian/generar-exogena?tenantId=${tenantId || 1}&anio=${anio}&formato=${selectedFormato}`);
      if (!res.ok) throw new Error("Error generando formato DIAN");
      const result = await res.json();
      setData(result);
      setCurrentPage(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (data.length === 0) return;
    
    const headers = ["Concepto", "Tipo_Doc", "NIT", "Razon_Social", "Direccion", "Cod_Depto", "Cod_Mun", "Valor"];
    const csvContent = [
      headers.join(";"),
      ...data.map(r => [
        r.concepto,
        r.tipo_doc,
        r.nit,
        `"${r.razon_social}"`,
        `"${r.direccion || ''}"`,
        r.cod_depto,
        r.cod_municipio,
        r.valor
      ].join(";"))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `DIAN_${selectedFormato}_${anio}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  return (
    <div style={{ margin: '20px', background: 'var(--card-bg)', color: 'var(--text)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
      <div style={{ background: 'linear-gradient(90deg, #1e3a8a 0%, #1e40af 100%)', padding: '24px', color: 'white', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
        <h2 style={{ margin: '0 0 8px 0' }}>📄 Generador de Información Exógena (DIAN)</h2>
        <p style={{ margin: 0, color: '#bfdbfe' }}>Generación automática de formatos XML para el pre-validador DIAN, consolidando terceros según mapeo contable.</p>
      </div>

      <div style={{ padding: '24px' }}>
        <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '24px', display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '4px' }}>Año Gravable</label>
            <input type="number" value={anio} onChange={e => setAnio(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', width: '100px' }} />
          </div>
          
          <div style={{ flex: 1, minWidth: '300px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '4px' }}>Formato DIAN a Generar</label>
            <select value={selectedFormato} onChange={e => setSelectedFormato(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', width: '100%' }}>
              {formatos.map(f => (
                <option key={f.id} value={f.id}>Formato {f.id} - {f.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <button onClick={fetchExogena} style={{ background: '#3b82f6', color: 'white', padding: '9px 24px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginRight: '10px' }}>
              {loading ? 'Calculando...' : '⚙️ Auditar y Extraer'}
            </button>
            <button onClick={handleExportCSV} disabled={data.length === 0} style={{ background: data.length > 0 ? '#10b981' : '#9ca3af', color: 'white', padding: '9px 24px', border: 'none', borderRadius: '4px', cursor: data.length > 0 ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}>
              📥 Descargar CSV (Pre-validador)
            </button>
          </div>
        </div>

        {error && <div style={{ background: '#fef2f2', color: '#991b1b', padding: '12px', borderRadius: '6px', marginBottom: '20px' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: 'var(--text)' }}>Vista Previa - Formato {selectedFormato}</h3>
          <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
            Total Registros: {data.length}
          </span>
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '12px', textAlign: 'center' }}>Concepto</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>TD</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>NIT / Cédula</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Razón Social / Nombre</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Dpto</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Mun</th>
                <th style={{ padding: '12px', textAlign: 'right', background: '#e0e7ff', color: '#3730a3' }}>Valor a Reportar</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No hay movimientos para este formato en el año {anio}.
                  </td>
                </tr>
              )}
              {data.slice((currentPage - 1) * 20, currentPage * 20).map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#0369a1' }}>{item.concepto}</td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>{item.tipo_doc}</td>
                  <td style={{ padding: '10px', fontFamily: 'monospace' }}>{item.nit}</td>
                  <td style={{ padding: '10px', fontWeight: '500' }}>{item.razon_social}</td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>{item.cod_depto}</td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>{item.cod_municipio}</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#3730a3' }}>
                    {formatCurrency(item.valor)}
                  </td>
                </tr>
              ))}
            </tbody>
            {data.length > 0 && (
              <tfoot>
                <tr style={{ background: 'var(--bg-main)', borderTop: '2px solid #cbd5e1' }}>
                  <td colSpan="6" style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>TOTAL A REPORTAR:</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#1e3a8a', fontSize: '14px' }}>
                    {formatCurrency(data.reduce((acc, i) => acc + i.valor, 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
          {data.length > 0 && (
            <div style={{ marginTop: '15px' }}>
              <Pagination 
                currentPage={currentPage}
                totalItems={data.length}
                pageSize={20}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default ExogenaDian;
