import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { 
  ShieldCheck, AlertTriangle, CheckCircle, TrendingUp, DollarSign, 
  Users, Map, Calendar, Download, RefreshCw, FileText
} from 'lucide-react';

export default function AuditoriaCostosDashboard({ tenantId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    periodoAnio: new Date().getFullYear(),
    periodoMes: new Date().getMonth() + 1,
    quincena: 'Primera'
  });
  const [contabilizando, setContabilizando] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/rrhh/auditoria-costos', {
        params: {
          tenantId: tenantId || 1,
          ...filters
        }
      });
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tenantId, filters.periodoAnio, filters.periodoMes, filters.quincena]);

  const handleContabilizar = async () => {
    if (!data) return;
    setContabilizando(true);
    setSuccessMsg(null);
    try {
      const res = await axios.post('/api/rrhh/contabilizar-nomina', {
        tenantId: tenantId || 1,
        pAnio: filters.periodoAnio,
        pMes: filters.periodoMes,
        pQuin: filters.quincena,
        totalNomina: data.kpis.totalNomina,
        totalLabores: data.kpis.totalLabores,
        variacion: data.kpis.variacion
      });
      if (res.data.success) {
        setSuccessMsg(`Comprobante ${res.data.documento} generado con éxito.`);
      }
    } catch (err) {
      console.error(err);
      alert('Error al contabilizar: ' + (err.response?.data?.error || err.message));
    } finally {
      setContabilizando(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[600px] w-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Cruzando bases de datos de auditoría...</p>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || { totalNomina: 0, totalLabores: 0, variacion: 0 };
  const trazabilidad = data?.trazabilidad || [];
  const lotes = data?.lotes || [];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
  };

  const variacionPercentage = kpis.totalNomina > 0 
    ? ((kpis.variacion / kpis.totalNomina) * 100).toFixed(1) 
    : 0;

  const isAuditClean = Math.abs(kpis.variacion) < 1000; // Tolerance threshold
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in font-sans">
      
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-gradient-to-r from-gray-900 to-slate-800 p-8 rounded-2xl shadow-xl text-white">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-10 h-10 text-emerald-400" />
            <h1 className="text-4xl font-bold tracking-tight">Auditoría de Costos</h1>
          </div>
          <p className="text-gray-400 text-lg max-w-2xl">
            Cruce transaccional entre Nómina Pagada y Costos de Producción en Lotes.
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20">
          <select 
            value={filters.periodoMes}
            onChange={(e) => setFilters({...filters, periodoMes: e.target.value})}
            className="bg-transparent text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded-lg px-2 py-1 appearance-none cursor-pointer"
          >
            {Array.from({length: 12}, (_, i) => (
              <option key={i+1} value={i+1} className="text-gray-900">
                {new Date(2000, i, 1).toLocaleString('es', { month: 'long' }).toUpperCase()}
              </option>
            ))}
          </select>
          <div className="w-px h-6 bg-white/20"></div>
          <select 
            value={filters.quincena}
            onChange={(e) => setFilters({...filters, quincena: e.target.value})}
            className="bg-transparent text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded-lg px-2 py-1 appearance-none cursor-pointer"
          >
            <option value="Primera" className="text-gray-900">1ra Quincena</option>
            <option value="Segunda" className="text-gray-900">2da Quincena</option>
            <option value="Mensual" className="text-gray-900">Mensual</option>
          </select>
          <button 
            onClick={fetchData}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="Actualizar Datos"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alerta de Auditoría */}
      <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 shadow-sm transition-all ${
        isAuditClean 
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
          : 'bg-amber-50 border-amber-200 text-amber-800'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-full ${isAuditClean ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            {isAuditClean ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="font-bold text-lg">
              {isAuditClean ? 'Cruce Operativo Exitoso' : 'Descuadre Detectado en el Cruce'}
            </h3>
            <p className="text-sm opacity-90">
              {isAuditClean 
                ? 'El 100% de la nómina operativa ha sido costeada y reportada en las labores de los lotes.' 
                : `Existe una diferencia de ${formatCurrency(kpis.variacion)} entre la nómina pagada y el valor costeado en campo.`}
            </p>
          </div>
        </div>
        {!isAuditClean && (
          <button className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm">
            Ver Detalle de Fugas
          </button>
        )}
      </div>

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute -right-6 -top-6 bg-red-50 w-24 h-24 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-lg text-red-600"><DollarSign className="w-5 h-5" /></div>
              <p className="text-gray-500 font-medium text-sm uppercase tracking-wider">Total Nómina Pagada</p>
            </div>
            <h3 className="text-3xl font-bold text-gray-900">{formatCurrency(kpis.totalNomina)}</h3>
            <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
              Extractado de `rrhh_nomina_detalle`
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute -right-6 -top-6 bg-emerald-50 w-24 h-24 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><Map className="w-5 h-5" /></div>
              <p className="text-gray-500 font-medium text-sm uppercase tracking-wider">Costeado a Lotes</p>
            </div>
            <h3 className="text-3xl font-bold text-gray-900">{formatCurrency(kpis.totalLabores)}</h3>
            <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
              Extractado de `labores_diarias`
            </p>
          </div>
        </div>

        <div className={`p-6 rounded-2xl shadow-sm border relative overflow-hidden group hover:shadow-md transition-shadow ${
          isAuditClean ? 'bg-white border-gray-100' : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg ${isAuditClean ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-200 text-amber-800'}`}>
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className={`font-medium text-sm uppercase tracking-wider ${isAuditClean ? 'text-gray-500' : 'text-amber-800'}`}>
                Variación (Tiempo Ocioso / Subsidios)
              </p>
            </div>
            <h3 className={`text-3xl font-bold ${isAuditClean ? 'text-gray-900' : 'text-amber-900'}`}>
              {formatCurrency(kpis.variacion)}
            </h3>
            <p className={`text-sm mt-2 font-medium ${isAuditClean ? 'text-emerald-600' : 'text-amber-700'}`}>
              {variacionPercentage}% respecto a la nómina
            </p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Costos por Lote Bar Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Map className="w-5 h-5 text-indigo-500" />
            Distribución del Costo Operativo por Lote
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lotes} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="lote" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                <YAxis 
                  axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}}
                  tickFormatter={(val) => `$${val / 1000}k`}
                />
                <RechartsTooltip 
                  cursor={{fill: '#f3f4f6'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  formatter={(val) => [formatCurrency(val), 'Costo']}
                />
                <Bar dataKey="costo_total" radius={[6, 6, 0, 0]}>
                  {lotes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Action / Contabilizar Card */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-8 rounded-2xl border border-indigo-100 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="relative z-10 max-w-md">
            <div className="bg-indigo-100 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
              <FileText className="w-7 h-7 text-indigo-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Integración Contable</h3>
            <p className="text-gray-600 mb-8 leading-relaxed">
              La nómina de este periodo está lista para ser transferida a la contabilidad. Se generará un comprobante diario afectando automáticamente las cuentas de Costos de Producción (7105), Gastos y Pasivos.
            </p>
            {successMsg && (
              <div className="mb-4 p-3 bg-emerald-100 text-emerald-800 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">{successMsg}</span>
              </div>
            )}
            <div className="flex gap-4">
              <button 
                onClick={handleContabilizar}
                disabled={contabilizando || successMsg}
                className={`flex-1 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                  successMsg ? 'bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-indigo-200'
                }`}
              >
                {contabilizando ? (
                  <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Procesando...</>
                ) : successMsg ? (
                  <><CheckCircle className="w-5 h-5" /> Contabilizado</>
                ) : (
                  <>Generar Comprobante Contable</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Trazabilidad Detallada */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-500" />
            Trazabilidad Detallada por Empleado
          </h3>
          <button className="text-gray-500 hover:text-indigo-600 transition-colors flex items-center gap-2 text-sm font-medium">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white text-gray-500 text-xs uppercase tracking-wider">
                <th className="p-4 border-b font-semibold">ID / Empleado</th>
                <th className="p-4 border-b font-semibold text-right">Nómina Liquidada</th>
                <th className="p-4 border-b font-semibold text-center">Labores Creadas</th>
                <th className="p-4 border-b font-semibold text-right">Costo a Lotes</th>
                <th className="p-4 border-b font-semibold text-right">Variación / Ocio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {trazabilidad.map((emp, i) => {
                const diff = (emp.nomina_devengada || 0) - (emp.costo_reportado_labores || 0);
                const isDiff = Math.abs(diff) > 1000;
                return (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs">
                          {emp.nombres?.charAt(0) || 'E'}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{emp.nombres} {emp.apellidos}</p>
                          <p className="text-gray-400 text-xs">ID: {emp.id_empleado}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right font-medium text-gray-900">
                      {formatCurrency(emp.nomina_devengada)}
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {emp.cantidad_labores}
                      </span>
                    </td>
                    <td className="p-4 text-right font-medium text-emerald-600">
                      {formatCurrency(emp.costo_reportado_labores)}
                    </td>
                    <td className="p-4 text-right">
                      <span className={`inline-flex items-center gap-1 font-bold text-sm ${isDiff ? 'text-amber-600' : 'text-gray-400'}`}>
                        {isDiff && <AlertTriangle className="w-3 h-3" />}
                        {formatCurrency(diff)}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {trazabilidad.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-gray-500">
                    No se encontraron registros cruzados para este periodo.
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
