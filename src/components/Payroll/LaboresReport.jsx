import React, { useState, useEffect } from 'react';
import axios from 'axios';
export default function LaboresReport({ tenantId }) {
  const [labores, setLabores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLabores = async () => {
      try {
        const res = await axios.get(`/api/rrhh/labores-historial?tenantId=${tenantId || 1}`);
        setLabores(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLabores();
  }, [tenantId]);

  if (loading) return <div className="p-6 text-center">Cargando reporte de labores...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <span className="text-green-600 text-3xl">🚜</span>
          Reporte de Labores y Jornales
        </h1>
        <div className="flex gap-2">
          <button className="btn btn-outline border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors">
            <span>⚙️</span>
            Filtros
          </button>
          <button className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
            <span>⬇️</span>
            Exportar Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-indigo-50 p-4 rounded-full text-indigo-600 text-2xl">
            📅
          </div>
          <div>
            <p className="text-gray-500 text-sm font-medium">Labores Registradas</p>
            <h3 className="text-2xl font-bold text-gray-800">{labores.length}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-green-50 p-4 rounded-full text-green-600 text-2xl">
            🚜
          </div>
          <div>
            <p className="text-gray-500 text-sm font-medium">Horas Máquina/Hombre</p>
            <h3 className="text-2xl font-bold text-gray-800">
              {labores.reduce((acc, l) => acc + (l.horas || 0), 0)} hrs
            </h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-blue-50 p-4 rounded-full text-blue-600 text-2xl">
            👥
          </div>
          <div>
            <p className="text-gray-500 text-sm font-medium">Costo Estimado</p>
            <h3 className="text-2xl font-bold text-gray-800">
              ${labores.reduce((acc, l) => acc + (l.costo_estimado || 0), 0).toLocaleString()}
            </h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                <th className="p-4 border-b font-semibold">Fecha</th>
                <th className="p-4 border-b font-semibold">Responsable</th>
                <th className="p-4 border-b font-semibold">Cargo</th>
                <th className="p-4 border-b font-semibold">Actividad</th>
                <th className="p-4 border-b font-semibold">Lote/Área</th>
                <th className="p-4 border-b font-semibold text-right">Duración</th>
                <th className="p-4 border-b font-semibold text-right">Costo (COP)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {labores.map((l, i) => (
                <tr key={i} className="hover:bg-green-50/50 transition-colors">
                  <td className="p-4 text-gray-600 font-medium">{l.fecha}</td>
                  <td className="p-4 font-bold text-gray-800">{l.empleado}</td>
                  <td className="p-4 text-gray-500">{l.cargo}</td>
                  <td className="p-4">
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">
                      {l.labor}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600">{l.lote}</td>
                  <td className="p-4 text-right font-medium text-gray-700">{l.horas} hrs</td>
                  <td className="p-4 text-right font-bold text-gray-800">${l.costo_estimado.toLocaleString()}</td>
                </tr>
              ))}
              {labores.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-500">
                    No se encontraron labores registradas para el periodo seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
