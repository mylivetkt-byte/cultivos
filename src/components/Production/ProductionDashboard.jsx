import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LayoutDashboard, Package, DollarSign, Users, Hammer, TrendingUp, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const ProductionDashboard = () => {
  const id_tenant = localStorage.getItem('tenant_id') || 1;
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const formatCurrency = (val) => {
    if (!val || val === 0) return '$0';
    return `$${parseInt(val).toLocaleString('es-CO')}`;
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return parseFloat(num).toLocaleString('es-CO');
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/produccion/dashboard', {
        params: { id_tenant }
      });
      setStats(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError(err.response?.data?.error || 'Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [id_tenant]);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-teal-400 bg-clip-text text-transparent">
              Panel de Producción Agrícola
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Resumen en tiempo real de órdenes, costos y calidad de producción
            </p>
          </div>
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-500/20 text-red-300 rounded-lg p-4 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Stats Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-[#131b2e] p-6 rounded-2xl border border-slate-800 animate-pulse">
                <div className="h-4 w-48 bg-slate-700 rounded mb-3"></div>
                <div className="h-8 w-32 bg-slate-700 rounded"></div>
              </div>
            ))}
          </div>
        ) : stats?.stats ? (
          <div className="space-y-6">
            {/* Grid 1: Operaciones */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Órdenes */}
              <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-6 shadow-xl hover:shadow-teal-500/5 transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-slate-400 text-xs font-semibold mb-1">Órdenes Totales</p>
                    <h3 className="text-2xl font-extrabold text-teal-400">
                      {formatNumber(stats.stats.total_ordenes)}
                    </h3>
                  </div>
                  <div className="p-3 bg-teal-500/20 rounded-full">
                    <Package size={24} className="text-teal-400" />
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  {stats.stats.ordenes_finalizadas || 0} finalizadas, {stats.stats.ordenes_en_proceso || 0} proceso
                </div>
              </div>

              {/* Unidades Producidas */}
              <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-6 shadow-xl hover:shadow-emerald-500/5 transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-slate-400 text-xs font-semibold mb-1">Unidades Producidas</p>
                    <h3 className="text-2xl font-extrabold text-emerald-400">
                      {formatNumber(stats.stats.total_unidades_producidas)}
                    </h3>
                  </div>
                  <div className="p-3 bg-emerald-500/20 rounded-full">
                    <TrendingUp size={24} className="text-emerald-400" />
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  Costo promedio: {formatCurrency(stats.stats.costo_promedio)}
                </div>
              </div>

              {/* Inversión Total */}
              <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-6 shadow-xl hover:shadow-purple-500/5 transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-slate-400 text-xs font-semibold mb-1">Inversión Total</p>
                    <h3 className="text-2xl font-extrabold text-purple-400">
                      {formatCurrency(stats.stats.inversion_total)}
                    </h3>
                  </div>
                  <div className="p-3 bg-purple-500/20 rounded-full">
                    <DollarSign size={24} className="text-purple-400" />
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  Incluye MP, MOD y CIF
                </div>
              </div>

              {/* Calidad BPM */}
              <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-6 shadow-xl hover:shadow-amber-500/5 transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-slate-400 text-xs font-semibold mb-1">Calidad BPM</p>
                    <h3 className="text-2xl font-extrabold text-amber-400">
                      {formatNumber(stats.calidad?.prima_total || 0)} Primera
                    </h3>
                  </div>
                  <div className="p-3 bg-amber-500/20 rounded-full">
                    <LayoutDashboard size={24} className="text-amber-400" />
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  Merma: {formatNumber(stats.calidad?.merma_total || 0)}
                </div>
              </div>
            </div>

            {/* Grid 2: Rentabilidad Financiera */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Ingresos de Venta */}
              <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-6 shadow-xl hover:shadow-emerald-500/5 transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-slate-400 text-xs font-semibold mb-1">Ingresos de Venta Proyectados</p>
                    <h3 className="text-2xl font-extrabold text-emerald-400">
                      {formatCurrency(stats.resumen_financiero?.ingresos_totales)}
                    </h3>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  Valor estimado según precios de venta de inventario
                </div>
              </div>

              {/* Utilidad Bruta */}
              <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-6 shadow-xl hover:shadow-teal-500/5 transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-slate-400 text-xs font-semibold mb-1">Utilidad Bruta Estimada</p>
                    <h3 className="text-2xl font-extrabold text-teal-400">
                      {formatCurrency(stats.resumen_financiero?.utilidad_bruta_total)}
                    </h3>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  Ingresos estimados menos costos totales de producción
                </div>
              </div>

              {/* Margen Promedio */}
              <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-6 shadow-xl hover:shadow-indigo-500/5 transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-slate-400 text-xs font-semibold mb-1">Margen de Rentabilidad Promedio</p>
                    <h3 className="text-2xl font-extrabold text-indigo-400">
                      {parseFloat(stats.resumen_financiero?.margen_promedio || 0).toFixed(1)}%
                    </h3>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  Rentabilidad porcentual promedio de todos los lotes
                </div>
              </div>
            </div>


        {/* Gráficos Recharts */}
        {stats?.stats && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico de Barras: Rentabilidad */}
            <div className="lg:col-span-2 bg-[#131b2e] border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-teal-400 mb-6 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Costos vs Ingresos por Producto
              </h2>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.rentabilidad?.map(item => ({
                      nombre: item.nombre,
                      Costo: parseFloat(item.costo_total) || 0,
                      Ingreso: parseFloat(item.ingresos_estimados) || 0,
                    })) || []}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="nombre" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => '$' + (val / 1000000).toFixed(1) + 'M'} />
                    <Tooltip 
                      cursor={{fill: '#1e293b'}} 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                      formatter={(value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    <Bar dataKey="Costo" fill="#c084fc" radius={[4, 4, 0, 0]} name="Costo Total" />
                    <Bar dataKey="Ingreso" fill="#34d399" radius={[4, 4, 0, 0]} name="Ingreso Estimado" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico Circular: Estado de Órdenes */}
            <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-teal-400 mb-6 flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Distribución de Órdenes
              </h2>
              <div className="h-72 w-full flex justify-center items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Finalizadas', value: stats.stats.ordenes_finalizadas || 0 },
                        { name: 'En Proceso', value: stats.stats.ordenes_en_proceso || 0 },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell key="cell-0" fill="#10b981" />
                      <Cell key="cell-1" fill="#f59e0b" />
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

          </div>
        ) : (
          <div className="text-center py-20 text-slate-500 bg-[#131b2e] border border-slate-800 rounded-2xl">
            <LayoutDashboard className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold mb-2">No hay datos de producción disponibles</p>
            <p className="text-sm">Crea tu primera orden de producción</p>
          </div>
        )}

        {/* Tabla de Rentabilidad por Cultivo / Producto */}
        {stats?.rentabilidad && stats.rentabilidad.length > 0 && (
          <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-teal-400 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Rentabilidad y Márgenes por Cultivo
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-semibold">
                    <th className="py-3 px-4">Cultivo / Producto</th>
                    <th className="py-3 px-4">Unidades Producidas</th>
                    <th className="py-3 px-4">Inversión Costo</th>
                    <th className="py-3 px-4">Ingreso Estimado</th>
                    <th className="py-3 px-4">Utilidad</th>
                    <th className="py-3 px-4">Margen %</th>
                    <th className="py-3 px-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm">
                  {stats.rentabilidad.map((item) => {
                    const margen = parseFloat(item.margen_porcentaje || 0);
                    let badgeClass = "bg-emerald-950/40 border border-emerald-500/20 text-emerald-300";
                    let badgeText = "Rentable";
                    if (margen < 10) {
                      badgeClass = "bg-red-950/40 border border-red-500/20 text-red-300";
                      badgeText = "Deficitario";
                    } else if (margen < 25) {
                      badgeClass = "bg-amber-950/40 border border-amber-500/20 text-amber-300";
                      badgeText = "Marginal";
                    }
                    return (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-medium text-white">{item.nombre}</td>
                        <td className="py-3 px-4">{formatNumber(item.unidades_producidas)} {item.unidad_medida}</td>
                        <td className="py-3 px-4 text-purple-300">{formatCurrency(item.costo_total)}</td>
                        <td className="py-3 px-4 text-emerald-300">{formatCurrency(item.ingresos_estimados)}</td>
                        <td className="py-3 px-4 text-teal-300">{formatCurrency(item.utilidad_bruta)}</td>
                        <td className="py-3 px-4 font-semibold">{margen.toFixed(1)}%</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${badgeClass}`}>
                            {badgeText}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Cost Breakdown Section */}
        {stats?.costos && (stats.costos.mp_total || stats.costos.mod_total || stats.costos.cif_total) && (
          <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-teal-400 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Desglose General de Costos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#1b253b] p-4 rounded-lg border border-slate-800 text-center">
                <p className="text-slate-400 text-xs font-semibold mb-1">Materia Prima (MP)</p>
                <p className="text-lg font-bold text-teal-400">
                  {formatCurrency(stats.costos.mp_total)}
                </p>
              </div>
              <div className="bg-[#1b253b] p-4 rounded-lg border border-slate-800 text-center">
                <p className="text-slate-400 text-xs font-semibold mb-1">Mano de Obra (MOD)</p>
                <p className="text-lg font-bold text-indigo-400">
                  {formatCurrency(stats.costos.mod_total)}
                </p>
              </div>
              <div className="bg-[#1b253b] p-4 rounded-lg border border-slate-800 text-center">
                <p className="text-slate-400 text-xs font-semibold mb-1">Costos Indirectos (CIF)</p>
                <p className="text-lg font-bold text-purple-400">
                  {formatCurrency(stats.costos.cif_total)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductionDashboard;