import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { authFetch } from '../../utils/api';
import { customStyles } from '../PremiumSelect';

function PrestamoCapturer({ tenantId, fincaId }) {
  const [terceros, setTerceros] = useState([]);
  const [selectedTercero, setSelectedTercero] = useState(null);
  const [formData, setFormData] = useState({
    monto: '',
    cuotas: 1,
    concepto: 'Préstamo/Adelanto',
    fecha: new Date().toISOString().slice(0, 10)
  });
  const [loading, setLoading] = useState(false);
  const [prestamoRegistrado, setPrestamoRegistrado] = useState(null); // Will hold the printable voucher data

  useEffect(() => {
    if (tenantId) {
      // Fetch employees/contractors (for now all terceros, can be filtered by type)
      authFetch(`/api/terceros?id_tenant=${tenantId}`)
        .then(res => res.json())
        .then(data => {
          const options = data.map(t => ({
            value: t.id_tercero,
            label: `${t.documento} - ${t.nombre_completo}`,
            data: t
          }));
          setTerceros(options);
        })
        .catch(err => console.error(err));
    }
  }, [tenantId]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTercero) return alert('Seleccione un empleado o contratista.');
    if (!formData.monto || formData.monto <= 0) return alert('Ingrese un monto válido.');

    setLoading(true);
    try {
      const res = await authFetch('/api/cartera/prestamo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_tenant: tenantId,
          id_finca: fincaId,
          id_tercero: selectedTercero.value,
          monto: formData.monto,
          cuotas: formData.cuotas,
          concepto: formData.concepto,
          fecha: formData.fecha
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Show Voucher
      setPrestamoRegistrado({
        ...data.prestamo,
        tercero: selectedTercero.data
      });
      alert('Préstamo registrado exitosamente en Cuentas por Cobrar.');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPrestamoRegistrado(null);
    setSelectedTercero(null);
    setFormData({ monto: '', cuotas: 1, concepto: 'Préstamo/Adelanto', fecha: new Date().toISOString().slice(0, 10) });
  };

  const handlePrint = () => {
    const printContent = document.getElementById('printable-voucher');
    const windowPrint = window.open('', '', 'width=800,height=600');
    windowPrint.document.write(`
      <html>
        <head>
          <title>Comprobante de Préstamo</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; }
            .content { margin-bottom: 40px; line-height: 1.8; }
            .row { display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px dashed #ccc; }
            .label { font-weight: bold; }
            .signatures { margin-top: 80px; display: flex; justify-content: space-between; }
            .sig-box { width: 45%; text-align: center; border-top: 1px solid #333; padding-top: 10px; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    windowPrint.document.close();
    windowPrint.focus();
    setTimeout(() => {
      windowPrint.print();
      windowPrint.close();
    }, 250);
  };

  if (prestamoRegistrado) {
    const { tercero, numero_documento, monto, cuotas, concepto, fecha } = prestamoRegistrado;
    return (
      <div className="module-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2>✅ Desembolso Exitoso</h2>
          <div>
            <button className="btn" onClick={resetForm} style={{ marginRight: '10px' }}>Volver</button>
            <button className="btn btn-primary" onClick={handlePrint}>🖨️ Imprimir Pagaré / Comprobante</button>
          </div>
        </div>

        <div className="card" style={{ padding: '40px', background: 'white', color: 'black', maxWidth: '800px', margin: '0 auto' }}>
          <div id="printable-voucher">
            <div className="header" style={{ textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: '20px', marginBottom: '30px' }}>
              <h1 style={{ margin: 0, fontSize: '24px', textTransform: 'uppercase' }}>COMPROBANTE DE DESEMBOLSO / PAGARÉ</h1>
              <p style={{ margin: '5px 0 0 0' }}>Documento N°: <strong>{numero_documento}</strong></p>
            </div>
            
            <div className="content" style={{ marginBottom: '40px', lineHeight: '1.8' }}>
              <p>Por medio del presente documento, declaro haber recibido de la empresa la suma de dinero detallada a continuación, en calidad de <strong>{concepto}</strong>.</p>
              
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px dashed #ccc' }}>
                <span className="label" style={{ fontWeight: 'bold' }}>Beneficiario (Deudor):</span>
                <span>{tercero.nombre_completo}</span>
              </div>
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px dashed #ccc' }}>
                <span className="label" style={{ fontWeight: 'bold' }}>Documento de Identidad:</span>
                <span>{tercero.documento}</span>
              </div>
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px dashed #ccc' }}>
                <span className="label" style={{ fontWeight: 'bold' }}>Fecha de Desembolso:</span>
                <span>{fecha}</span>
              </div>
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px dashed #ccc' }}>
                <span className="label" style={{ fontWeight: 'bold' }}>Monto Aprobado:</span>
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>${Number(monto).toLocaleString('es-CO')}</span>
              </div>
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px dashed #ccc' }}>
                <span className="label" style={{ fontWeight: 'bold' }}>Condiciones de Pago:</span>
                <span>Descuento en {cuotas} cuota(s)</span>
              </div>
              
              <p style={{ marginTop: '20px', fontSize: '12px', textAlign: 'justify' }}>
                Autorizo expresamente a la empresa a deducir y descontar de mis salarios, liquidación de prestaciones sociales, vacaciones, indemnizaciones o cualquier otra suma que se me adeude, el valor total o los saldos pendientes de este préstamo. Este documento presta mérito ejecutivo.
              </p>
            </div>

            <div className="signatures" style={{ marginTop: '80px', display: 'flex', justifyContent: 'space-between' }}>
              <div className="sig-box" style={{ width: '45%', textAlign: 'center', borderTop: '1px solid #333', paddingTop: '10px' }}>
                <strong>FIRMA DEL EMPLEADO/CONTRATISTA</strong><br />
                C.C. {tercero.documento}
              </div>
              <div className="sig-box" style={{ width: '45%', textAlign: 'center', borderTop: '1px solid #333', paddingTop: '10px' }}>
                <strong>FIRMA AUTORIZADA EMPRESA</strong><br />
                Aprobado por
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="module-container">
      <div className="module-header">
        <h1>💸 Préstamos y Adelantos</h1>
        <p>Registra desembolsos a empleados o contratistas, genera comprobantes y contabiliza automáticamente.</p>
      </div>

      <div className="card" style={{ maxWidth: '600px' }}>
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Buscar Empleado / Contratista</label>
            <Select 
              options={terceros}
              value={selectedTercero}
              onChange={setSelectedTercero}
              placeholder="Buscar por cédula o nombre..."
              styles={{
                control: (base) => ({ ...base, background: 'var(--bg-color)', borderColor: 'var(--border)', color: 'var(--text)' }),
                singleValue: (base) => ({ ...base, color: 'var(--text)' }),
                input: (base) => ({ ...base, color: 'var(--text)' }),
                menu: (base) => ({ ...base, background: 'var(--bg-card)' }),
                option: (base, state) => ({ ...base, background: state.isFocused ? 'var(--primary)' : 'transparent', color: state.isFocused ? 'white' : 'var(--text)' })
              }}
            />
          </div>

          <div className="form-group">
            <label>Monto a Desembolsar ($)</label>
            <input 
              type="number" 
              name="monto" 
              value={formData.monto} 
              onChange={handleChange} 
              className="form-control" 
              required 
              min="1"
            />
          </div>

          <div className="form-group">
            <label>Fecha del Desembolso</label>
            <input 
              type="date" 
              name="fecha" 
              value={formData.fecha} 
              onChange={handleChange} 
              className="form-control" 
              required 
            />
          </div>

          <div className="form-group">
            <label>Número de Cuotas (Descuentos)</label>
            <input 
              type="number" 
              name="cuotas" 
              value={formData.cuotas} 
              onChange={handleChange} 
              className="form-control" 
              required 
              min="1"
            />
          </div>

          <div className="form-group">
            <label>Concepto</label>
            <input 
              type="text" 
              name="concepto" 
              value={formData.concepto} 
              onChange={handleChange} 
              className="form-control" 
              required 
            />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1', marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '16px', padding: '12px' }} disabled={loading}>
              {loading ? 'Procesando...' : '💰 Registrar Préstamo y Generar Comprobante'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PrestamoCapturer;
