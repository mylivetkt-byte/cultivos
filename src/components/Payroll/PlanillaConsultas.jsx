import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function PlanillaConsultas({ tenantId, fincaId }) {
  const [planillas, setPlanillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroCiclo, setFiltroCiclo] = useState('');

  useEffect(() => {
    fetchPlanillas();
  }, [tenantId, fincaId, filtroCiclo]);

  const fetchPlanillas = async () => {
    try {
      setLoading(true);
      const url = `/api/rrhh/planillas?tenantId=${tenantId || 1}${fincaId ? '&fincaId='+fincaId : ''}${filtroCiclo ? '&ciclo='+filtroCiclo : ''}`;
      const res = await axios.get(url);
      setPlanillas(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleContabilizar = async (id) => {
    if (!window.confirm(`¿Seguro que deseas cerrar y contabilizar la planilla #${id}? Esta acción es irreversible.`)) return;
    try {
      await axios.post(`/api/rrhh/planillas/${id}/contabilizar`);
      alert('Planilla Contabilizada Exitosamente. Se ha generado el asiento contable.');
      fetchPlanillas();
    } catch (err) {
      console.error(err);
      alert('Error al contabilizar la planilla: ' + (err.response?.data?.error || err.message));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <span>📄</span>
          Consulta de Planillas de Nómina
        </h1>
        <div className="flex gap-2">
          <select 
            className="border-gray-300 rounded-lg p-2 bg-white shadow-sm"
            value={filtroCiclo}
            onChange={(e) => setFiltroCiclo(e.target.value)}
          >
            <option value="">-- Todos los Ciclos --</option>
            <option value="Semanal">Semanal</option>
            <option value="Quincenal">Quincenal</option>
            <option value="Mensual">Mensual</option>
            <option value="Vacaciones">Vacaciones</option>
            <option value="Liquidacion">Liquidaciones</option>
          </select>
          <button 
            onClick={handlePrint}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg shadow hover:bg-gray-900 transition flex items-center gap-2"
          >
            <span>🖨️</span> Imprimir
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-8">Cargando planillas...</div>
      ) : (
        <div className="space-y-8">
          {planillas.length === 0 ? (
            <div className="bg-white p-8 text-center text-gray-500 rounded-xl shadow-sm border border-gray-100">
              No se encontraron planillas para los filtros seleccionados.
            </div>
          ) : planillas.map(p => (
            <div key={p.id_planilla} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-none print:mb-8">
              <div className="bg-gray-800 text-white p-4 flex justify-between items-center print:bg-transparent print:text-black print:border-b-2 print:border-black">
                <div>
                  <h2 className="text-xl font-bold">Planilla #{p.id_planilla} - {p.ciclo}</h2>
                  <p className="text-sm opacity-80 print:opacity-100">{p.fecha_inicio.substring(0,10)} al {p.fecha_fin.substring(0,10)}</p>
                </div>
                <div className="text-right flex items-center gap-2">
                  {p.estado !== 'Contabilizada' && (
                    <button 
                      onClick={() => handleContabilizar(p.id_planilla)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm font-bold transition print:hidden shadow-sm"
                    >
                      ✓ Cerrar y Contabilizar
                    </button>
                  )}
                  <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-bold print:border print:border-black print:text-black">
                    {p.estado}
                  </span>
                </div>
              </div>
              
              <div className="p-4 overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 uppercase tracking-wider print:bg-transparent print:border-b">
                      <th className="p-3 border-b">Documento</th>
                      <th className="p-3 border-b">Empleado</th>
                      <th className="p-3 border-b text-center">Días</th>
                      <th className="p-3 border-b text-right">Básico</th>
                      <th className="p-3 border-b text-right">Devengado</th>
                      <th className="p-3 border-b text-right">Deducido</th>
                      <th className="p-3 border-b text-right">Neto Pagado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {p.detalles?.map(d => (
                      <tr key={d.id_detalle} className="hover:bg-gray-50">
                        <td className="p-3 font-mono text-gray-500">{d.documento}</td>
                        <td className="p-3 font-bold text-gray-800">{d.nombre_completo}</td>
                        <td className="p-3 text-center">{d.dias_trabajados}</td>
                        <td className="p-3 text-right">${Number(d.salario_base).toLocaleString()}</td>
                        <td className="p-3 text-right text-green-700">${Number(d.total_devengos).toLocaleString()}</td>
                        <td className="p-3 text-right text-red-700">${Number(d.total_deducciones).toLocaleString()}</td>
                        <td className="p-3 text-right font-bold text-gray-900">${Number(d.neto_pagar).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-bold print:bg-transparent">
                    <tr>
                      <td colSpan="4" className="p-3 text-right">TOTALES:</td>
                      <td className="p-3 text-right text-green-700">${Number(p.total_devengado).toLocaleString()}</td>
                      <td className="p-3 text-right text-red-700">${Number(p.total_deducido).toLocaleString()}</td>
                      <td className="p-3 text-right text-gray-900">${Number(p.total_neto).toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
