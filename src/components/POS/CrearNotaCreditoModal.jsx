import React, { useState } from 'react';
import { X, FileWarning } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authFetch } from '../../utils/api';

function CrearNotaCreditoModal({ venta, detalles, onClose, onSuccess }) {
  const { tenantId, user } = useAuth();
  const [motivo, setMotivo] = useState('Devolución parcial de los bienes');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Guardamos las cantidades a devolver. Por defecto 0, el usuario ajusta.
  const [devoluciones, setDevoluciones] = useState(
    detalles.map(d => ({ ...d, cantidad_devolver: 0 }))
  );

  const handleCantidadChange = (index, value) => {
    const val = Number(value);
    const max = devoluciones[index].cantidad;
    const newList = [...devoluciones];
    newList[index].cantidad_devolver = val > max ? max : (val < 0 ? 0 : val);
    setDevoluciones(newList);
  };

  const handleDevolucionTotal = () => {
    setDevoluciones(devoluciones.map(d => ({ ...d, cantidad_devolver: d.cantidad })));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const itemsADevolver = devoluciones
      .filter(d => d.cantidad_devolver > 0)
      .map(d => ({
        id_insumo: d.id_insumo,
        id_lote: d.id_lote,
        cantidad: d.cantidad_devolver,
        precio_unitario: d.precio_unitario,
        iva_porcentaje: d.iva_porcentaje
      }));

    if (itemsADevolver.length === 0) {
      setErrorMsg('Debe especificar al menos un ítem a devolver (cantidad mayor a 0).');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await authFetch('/api/notas-credito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_tenant: tenantId || 1,
          id_documento_referencia: venta.id_documento,
          motivo_referencia: motivo,
          items: itemsADevolver,
          usuario_creacion: user?.id_usuario || 1
        })
      });
      const data = await res.json();
      if (data.success) {
        onSuccess(data);
      } else {
        setErrorMsg(data.error || 'Error al generar la Nota de Crédito');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  const totalDevolucion = devoluciones.reduce((sum, d) => {
    const sub = d.cantidad_devolver * Number(d.precio_unitario);
    const iva = sub * (Number(d.iva_porcentaje) / 100);
    return sum + sub + iva;
  }, 0);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
    }}>
      <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', width: '600px', maxWidth: '90%', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileWarning size={20} /> Generar Nota de Crédito
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '15px' }}>
          Factura Referencia: <strong>{venta.numero_documento}</strong>
        </p>

        {errorMsg && (
          <div style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '5px' }}>Motivo (DIAN)</label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px' }}
            >
              <option value="Devolución parcial de los bienes">Devolución parcial de los bienes</option>
              <option value="Devolución total">Devolución total</option>
              <option value="Anulación de factura electrónica">Anulación de factura electrónica</option>
              <option value="Descuento comercial">Descuento comercial</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4 style={{ margin: 0, color: '#e2e8f0', fontSize: '14px' }}>Detalle de Ítems a Devolver</h4>
            <button
              type="button"
              onClick={handleDevolucionTotal}
              style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid #38bdf8', color: '#38bdf8', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
            >
              Devolución Total
            </button>
          </div>

          <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ background: 'rgba(0,0,0,0.2)' }}>
                <tr>
                  <th style={{ padding: '8px', textAlign: 'left', color: '#94a3b8' }}>Producto</th>
                  <th style={{ padding: '8px', textAlign: 'right', color: '#94a3b8' }}>Cant. Facturada</th>
                  <th style={{ padding: '8px', textAlign: 'right', color: '#94a3b8' }}>A Devolver</th>
                </tr>
              </thead>
              <tbody>
                {devoluciones.map((d, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '8px', color: '#e2e8f0' }}>{d.nombre_producto}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#94a3b8' }}>{d.cantidad}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      <input
                        type="number"
                        min="0"
                        max={d.cantidad}
                        value={d.cantidad_devolver}
                        onChange={(e) => handleCantidadChange(index, e.target.value)}
                        style={{ width: '60px', padding: '4px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '4px', textAlign: 'right' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px' }}>
            <div>
              <span style={{ color: '#94a3b8', fontSize: '13px' }}>Total Devolución: </span>
              <strong style={{ color: '#10b981', fontSize: '16px' }}>${totalDevolucion.toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{ padding: '8px 16px', background: '#ef4444', border: 'none', color: '#fff', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
              >
                {loading ? 'Generando...' : 'Confirmar NC'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CrearNotaCreditoModal;
