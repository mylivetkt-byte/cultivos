import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import { authFetch } from '../../utils/api';

export default function GeneradorNominaDian({ tenantId, onCancel, onSuccess }) {
  const [planillas, setPlanillas] = useState([]);
  const [selectedPlanilla, setSelectedPlanilla] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPlanillasCerradas();
  }, [tenantId]);

  const fetchPlanillasCerradas = async () => {
    try {
      const tid = tenantId || 1;
      // Fetch planillas que esten Cerradas y no hayan sido emitidas a la DIAN aun
      const res = await authFetch(`/api/rrhh/planillas-manuales?tenantId=${tid}`);
      const data = await res.json();
      if(Array.isArray(data)) {
        // En un caso real filtrariamos las que ya esten en dian_nominas_cabecera
        setPlanillas(data.filter(p => p.estado === 'Cerrada')); 
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEmitir = async () => {
    if (!selectedPlanilla) return message.error('Seleccione una planilla operativa base');
    setLoading(true);
    
    try {
      // 1. Obtener detalles de la planilla operativa seleccionada para mapearlos a DIAN
      const resDetalles = await authFetch(`/api/rrhh/planillas-manuales/${selectedPlanilla}/detalles`);
      const detalles = await resDetalles.json();

      if (!detalles || detalles.length === 0) {
        throw new Error('La planilla seleccionada no tiene labores registradas.');
      }

      // Agrupar por empleado
      const empleadosMap = {};
      detalles.forEach(d => {
        if (!empleadosMap[d.id_empleado]) {
          empleadosMap[d.id_empleado] = {
            id_empleado: d.id_empleado,
            tipo_trabajador: 1, // 1 = Dependiente
            subtipo_trabajador: 0,
            tipo_contrato: 1, // Fijo
            sueldo: Number(d.salario_base || d.total || 0),
            municipio: 1,
            codigo_trabajador: 'EMP-'+d.id_empleado,
            devengos: [],
            deducciones: [
              { concepto: 'Salud', valor: Math.round(Number(d.salario_base || d.total || 0) * 0.04) },
              { concepto: 'Pension', valor: Math.round(Number(d.salario_base || d.total || 0) * 0.04) }
            ],
            total_devengos: 0
          };
        }
        
        const valorTotal = Number(d.total);
        empleadosMap[d.id_empleado].devengos.push({
          concepto: 'Basico', // Mapeamos las labores agricolas como basico o bonificacion
          valor: valorTotal
        });
        empleadosMap[d.id_empleado].total_devengos += valorTotal;
      });

      const trabajadoresPayload = Object.values(empleadosMap);

      // 2. Enviar a la API de DIAN para emitir
      const resEmitir = await authFetch('/api/dian/emitir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenantId || 1,
          id_planilla_manual: selectedPlanilla,
          trabajadores: trabajadoresPayload
        })
      });

      const result = await resEmitir.json();
      if (!resEmitir.ok) throw new Error(result.error || 'Error emitiendo nómina');

      message.success(`Nómina emitida exitosamente. CUNE: ${result.cune}`);
      if(onSuccess) onSuccess();
      
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>Emitir Nómina a la DIAN</h2>
      <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '24px' }}>
        Seleccione una Planilla Manual (operativa) que ya esté Cerrada. El sistema consolidará las labores por trabajador, calculará devengos y deducciones, y generará el XML requerido por la DIAN.
      </p>

      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#334155' }}>
          Planilla Operativa Base
        </label>
        <select 
          value={selectedPlanilla} 
          onChange={e => setSelectedPlanilla(e.target.value)}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
        >
          <option value="">-- Seleccione una planilla --</option>
          {planillas.map(p => (
            <option key={p.id_planilla} value={p.id_planilla}>
              Planilla {p.tipo_planilla} #{p.id_planilla} (Total: ${Number(p.total_planilla).toLocaleString()}) - {p.fecha_inicio.substring(0,10)}
            </option>
          ))}
        </select>
        {planillas.length === 0 && (
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#ef4444' }}>
            No hay planillas en estado "Cerrada" disponibles para emitir.
          </div>
        )}
      </div>

      <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '24px', borderLeft: '4px solid #3b82f6' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>Resumen de Validación</h4>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#475569', fontSize: '13px' }}>
          <li>Se consolidarán los jornales y labores por trabajador.</li>
          <li>Se aplicarán las deducciones estándar (Salud 4%, Pensión 4%).</li>
          <li>El comprobante será firmado digitalmente con el Token DIAN.</li>
        </ul>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button onClick={onCancel} className="btn btn-outline" disabled={loading}>
          Cancelar
        </button>
        <button onClick={handleEmitir} className="btn btn-primary" disabled={loading || !selectedPlanilla}>
          {loading ? 'Transmitiendo a DIAN...' : 'Firmar y Emitir DIAN'}
        </button>
      </div>
    </div>
  );
}
