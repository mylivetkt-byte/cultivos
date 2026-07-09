import React, { useState, useEffect } from 'react';
import axios from 'axios';
export default function RRHHDashboard({ tenantId }) {
  const [kpis, setKpis] = useState(null);
  const [labores, setLabores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [kpiRes, labRes] = await Promise.all([
          axios.get(`/api/rrhh/kpis?tenantId=${tenantId || 1}`),
          axios.get(`/api/rrhh/labores-historial?tenantId=${tenantId || 1}`)
        ]);
        setKpis(kpiRes.data);
        setLabores(labRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tenantId]);

  if (loading) return <div className="p-6 text-center">Cargando Dashboard RRHH...</div>;

  const totalCostoOperativo = kpis?.costos?.reduce((sum, c) => sum + Number(c.costo || 0), 0) || 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
        <span className="text-blue-600 text-3xl">👥</span>
        Dashboard RRHH y Maquinaria
      </h1>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="bg-blue-50 p-4 rounded-full text-blue-600 text-2xl">
            👥
          </div>
          <div>
            <p className="text-gray-500 text-sm font-medium">Headcount Activo</p>
            <h3 className="text-3xl font-bold text-gray-800">{kpis?.headcount || 0}</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="bg-green-50 p-4 rounded-full text-green-600 text-2xl">
            🔧
          </div>
          <div>
            <p className="text-gray-500 text-sm font-medium">Equipos / Plantas</p>
            <h3 className="text-3xl font-bold text-gray-800">{kpis?.maquinas || 0}</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="bg-amber-50 p-4 rounded-full text-amber-600 text-2xl">
            🚜
          </div>
          <div>
            <p className="text-gray-500 text-sm font-medium">Vehículos Operativos</p>
            <h3 className="text-3xl font-bold text-gray-800">{kpis?.vehiculos || 0}</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="bg-red-50 p-4 rounded-full text-red-600 text-2xl">
            💰
          </div>
          <div>
            <p className="text-gray-500 text-sm font-medium">Costo Mensual Est.</p>
            <h3 className="text-xl font-bold text-gray-800">
              ${totalCostoOperativo.toLocaleString()}
            </h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribución de Cargos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-1">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
            <span className="text-blue-600 text-xl">💼</span>
            Distribución por Cargos
          </h2>
          <div className="space-y-4">
            {kpis?.cargos?.map((c, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">{c.cargo}</span>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
                  {c.cantidad}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Costos Nómina vs Contratistas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
            <span className="text-green-600 text-xl">📈</span>
            Costos Operativos Acumulados
          </h2>
          <div className="space-y-4">
            {kpis?.costos?.map((c, i) => (
              <div key={i} className="flex items-center justify-between border-b pb-2">
                <span className="text-gray-600 font-medium">{c.tipo}</span>
                <span className="text-gray-800 font-bold">${Number(c.costo).toLocaleString()}</span>
              </div>
            ))}
            {(!kpis?.costos || kpis.costos.length === 0) && (
              <div className="text-center text-gray-500 py-4">No hay costos contables registrados en el periodo actual.</div>
            )}
          </div>
        </div>
      </div>

      {/* Historial de Labores */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-lg font-bold text-gray-800">Últimas Labores de Campo (Mano de Obra y Maquinaria)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                <th className="p-4 border-b">Fecha</th>
                <th className="p-4 border-b">Empleado/Contratista</th>
                <th className="p-4 border-b">Cargo</th>
                <th className="p-4 border-b">Labor Realizada</th>
                <th className="p-4 border-b">Lote/Centro Costo</th>
                <th className="p-4 border-b text-right">Horas</th>
                <th className="p-4 border-b text-right">Costo Est.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {labores.map((l, i) => (
                <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                  <td className="p-4 text-gray-600">{l.fecha}</td>
                  <td className="p-4 font-medium text-gray-800">{l.empleado}</td>
                  <td className="p-4 text-gray-500">{l.cargo}</td>
                  <td className="p-4">
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md text-xs font-semibold">
                      {l.labor}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600">{l.lote}</td>
                  <td className="p-4 text-right font-medium text-gray-700">{l.horas}h</td>
                  <td className="p-4 text-right font-bold text-green-700">${l.costo_estimado.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
