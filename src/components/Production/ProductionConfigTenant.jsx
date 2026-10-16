import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Save, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';

const ProductionConfigTenant = () => {
  const id_tenant = localStorage.getItem('tenant_id') || 1;
  const [margen, setMargen] = useState(20);
  const [habilitarIntel, setHabilitarIntel] = useState(true);
  const [diasVigencia, setDiasVigencia] = useState(30);
  const [telefonoAlertas, setTelefonoAlertas] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/produccion/config-tenant/${id_tenant}`);
        if (res.data) {
          setMargen(res.data.margen_minimo_rentable || 20);
          setHabilitarIntel(res.data.habilitar_inteligencia_mercado === 1 || res.data.habilitar_inteligencia_mercado === true);
          setDiasVigencia(res.data.dias_validez_precio_mercado || 30);
          setTelefonoAlertas(res.data.whatsapp_alertas_telefono || '');
        }
      } catch (err) {
        console.log('Sin configuración previa, usando valores por defecto.');
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [id_tenant]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    try {
      const res = await axios.post('/api/produccion/config-tenant', {
        id_tenant,
        margen_minimo_rentable: parseFloat(margen),
        habilitar_inteligencia_mercado: habilitarIntel ? 1 : 0,
        dias_validez_precio_mercado: parseInt(diasVigencia),
        whatsapp_alertas_telefono: telefonoAlertas
      });
      if (res.data?.success !== false) {
        setSuccess('¡Configuración actualizada correctamente!');
        setTimeout(() => setSuccess(''), 4000);
      }
    } catch (err) {
      setSuccess(err.response?.data?.error || 'Error al guardar la configuración');
      setTimeout(() => setSuccess(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse bg-[#131b2e] border border-slate-800 rounded-2xl p-8 shadow-xl">
            <div className="h-6 w-48 bg-slate-700 rounded mb-6"></div>
            <div className="h-10 bg-slate-700 rounded-lg mb-4"></div>
            <div className="h-10 bg-slate-700 rounded-lg mb-6"></div>
            <div className="h-12 bg-slate-700 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-teal-400 bg-clip-text text-transparent">
            Configuración de Producción
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Parametros de rentabilidad, inteligencia de mercado y vigencia de precios
          </p>
        </div>

        {/* Success/Error message */}
        {success && (
          <div className={`border rounded-lg p-4 text-sm ${
            success.includes('Error') || success.includes('error')
              ? 'bg-red-950/40 border-red-500/20 text-red-300'
              : 'bg-emerald-950/40 border-emerald-500/20 text-emerald-300'
          }`}>
            {success}
          </div>
        )}

        {/* Config Card */}
        <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-8 shadow-xl">
          <div className="flex items-center mb-6 pb-4 border-b border-slate-800">
            <Settings className="w-6 h-6 text-teal-400 mr-3" />
            <h2 className="text-xl font-bold text-white">Parametros de Producción</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Margen Minimo Rentable */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase">
                Margen Mínimo Rentable (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={margen}
                  onChange={e => setMargen(e.target.value)}
                  min="0"
                  max="100"
                  required
                  className="w-full bg-[#1b253b] border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">%</span>
              </div>
              <p className="text-xs text-slate-500">
                Margen requerido para considerar una orden como "Rentable" en los simuladores.
              </p>
            </div>

            {/* Inteligencia de Mercado Toggle */}
            <div className="flex justify-between items-center py-4 px-4 bg-[#1b253b] rounded-xl border border-slate-800">
              <div>
                <label className="block text-sm font-semibold text-slate-300">
                  Inteligencia de Mercado
                </label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Habilitar consulta de precios promedio históricos en simulaciones.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHabilitarIntel(!habilitarIntel)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  habilitarIntel ? 'bg-teal-500' : 'bg-slate-600'
                }`}
              >
                <span className="sr-only">Toggle inteligencia de mercado</span>
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  habilitarIntel ? 'translate-x-5' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Vigencia de Precios */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase">
                Vigencia de Precios Referenciales (Días)
              </label>
              <input
                type="number"
                value={diasVigencia}
                onChange={e => setDiasVigencia(e.target.value)}
                min="1"
                required
                className="w-full bg-[#1b253b] border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20"
              />
              <p className="text-xs text-slate-500">
                Tiempo de validez para estimar precios de mercado.
              </p>
            </div>

            {/* Telefono de Alertas WhatsApp */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase">
                Teléfono de Alertas WhatsApp (Jefe de Bodega / Compras)
              </label>
              <input
                type="text"
                value={telefonoAlertas}
                onChange={e => setTelefonoAlertas(e.target.value)}
                placeholder="Ej. 573001234567"
                className="w-full bg-[#1b253b] border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20"
              />
              <p className="text-xs text-slate-500">
                Número celular con código de país para enviar los PDFs de desabastecimiento (ej. 57 para Colombia).
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-800">
              <button
                type="submit"
                disabled={saving}
                className="w-full inline-flex items-center justify-center py-2.5 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Configuración
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProductionConfigTenant;