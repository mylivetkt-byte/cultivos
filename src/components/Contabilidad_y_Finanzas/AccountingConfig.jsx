import React, { useState, useEffect } from 'react';
import './AccountingConfig.css';
import { authFetch } from '../../utils/api';

const AccountingConfig = ({ tenantId }) => {
  const [configs, setConfigs] = useState([]);
  const [fincas, setFincas] = useState([]);
  const [tiposDoc, setTiposDoc] = useState([]);
  const [tiposComp, setTiposComp] = useState([]);
  const [cuentas, setCuentas] = useState([]);

  const [formData, setFormData] = useState({
    id_finca: '',
    modulo: 'INVENTARIO',
    id_tipo_documento: '',
    id_tipo_comp: '',
    cuenta_debito: '',
    cuenta_credito: ''
  });

  const loadData = async () => {
    try {
      const [confRes, fincasRes, docRes, compRes, cuentasRes] = await Promise.all([
        authFetch(`/api/contabilidad/distribucion/${tenantId}`).then(res => res.json()),
        authFetch(`/api/table/fincas?tenantId=${tenantId}`).then(res => res.json()),
        authFetch(`/api/inventario/tipos_documento?tenantId=${tenantId}`).then(res => res.json()),
        authFetch(`/api/table/tipos_comprobantes?tenantId=${tenantId}`).then(res => res.json()),
        authFetch(`/api/table/plan_contable?tenantId=${tenantId}`).then(res => res.json())
      ]);

      setConfigs(Array.isArray(confRes) ? confRes : []);
      setFincas(Array.isArray(fincasRes) ? fincasRes : []);
      setTiposDoc(Array.isArray(docRes) ? docRes : []);
      setTiposComp(Array.isArray(compRes) ? compRes : []);
      setCuentas(Array.isArray(cuentasRes) ? cuentasRes : []);
    } catch (error) {
      console.error('Error loading config data:', error);
    }
  };

  useEffect(() => {
    if (tenantId) loadData();
  }, [tenantId]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/contabilidad/distribucion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_tenant: tenantId,
          ...formData
        })
      });
      if (res.ok) {
        loadData();
        alert('Configuración guardada correctamente');
      } else {
        alert('Error al guardar');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar esta configuración?')) {
      try {
        await authFetch(`/api/contabilidad/distribucion/${id}`, { method: 'DELETE' });
        loadData();
      } catch (error) {
        console.error(error);
      }
    }
  };

  return (
    <div className="accounting-container">
      <div className="accounting-header">
        <h2>Distribución Contable</h2>
        <p>Configura la asignación de comprobantes y cuentas por Finca para la generación automática.</p>
      </div>

      <div className="config-panel">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Finca / Subempresa</label>
              <select name="id_finca" value={formData.id_finca} onChange={handleInputChange} required>
                <option value="">Seleccione Finca...</option>
                {fincas.map(f => (
                  <option key={f.id_finca} value={f.id_finca}>{f.nombre}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Módulo</label>
              <select name="modulo" value={formData.modulo} onChange={handleInputChange} required>
                <option value="INVENTARIO">Inventario</option>
                <option value="NOMINA">Nómina</option>
                <option value="VENTAS">Ventas</option>
              </select>
            </div>

            <div className="form-group">
              <label>Tipo de Documento</label>
              <select name="id_tipo_documento" value={formData.id_tipo_documento} onChange={handleInputChange} required>
                <option value="">Seleccione Tipo Doc...</option>
                {tiposDoc.map(t => (
                  <option key={t.id_tipo} value={t.id_tipo}>{t.nombre} ({t.naturaleza})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Tipo Comprobante (Destino)</label>
              <select name="id_tipo_comp" value={formData.id_tipo_comp} onChange={handleInputChange} required>
                <option value="">Seleccione Comprobante...</option>
                {tiposComp.map(c => (
                  <option key={c.id_tipo_comp} value={c.id_tipo_comp}>{c.nombre} ({c.codigo})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Cuenta Débito (Por Defecto)</label>
              <select name="cuenta_debito" value={formData.cuenta_debito} onChange={handleInputChange}>
                <option value="">Ninguna...</option>
                {cuentas.map(c => (
                  <option key={c.id_cuenta} value={c.id_cuenta}>{c.codigo} - {c.nombre}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Cuenta Crédito (Por Defecto)</label>
              <select name="cuenta_credito" value={formData.cuenta_credito} onChange={handleInputChange}>
                <option value="">Ninguna...</option>
                {cuentas.map(c => (
                  <option key={c.id_cuenta} value={c.id_cuenta}>{c.codigo} - {c.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className="btn-primary">Guardar Configuración</button>
        </form>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Finca</th>
              <th>Módulo</th>
              <th>Documento</th>
              <th>Comprobante</th>
              <th>Cuentas (DB / CR)</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {configs.map(c => {
              const doc = tiposDoc.find(t => t.id_tipo === c.id_tipo_documento);
              return (
                <tr key={c.id_distribucion}>
                  <td>{c.finca_nombre}</td>
                  <td>
                    <span className={`badge ${c.modulo.toLowerCase()}`}>{c.modulo}</span>
                  </td>
                  <td>{doc ? doc.nombre : `ID ${c.id_tipo_documento}`}</td>
                  <td>{c.tipo_comp_nombre}</td>
                  <td>
                    <div><strong>DB:</strong> {c.cuenta_debito_codigo || 'N/A'}</div>
                    <div><strong>CR:</strong> {c.cuenta_credito_codigo || 'N/A'}</div>
                  </td>
                  <td>
                    <button className="btn-danger" onClick={() => handleDelete(c.id_distribucion)}>Eliminar</button>
                  </td>
                </tr>
              )
            })}
            {configs.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: '#999' }}>No hay configuraciones activas.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AccountingConfig;
