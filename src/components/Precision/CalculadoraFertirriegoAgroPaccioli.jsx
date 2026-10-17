import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, Sparkles, CheckCircle2, AlertTriangle, Send, 
  MessageCircle, Save, Sliders, Droplets, ArrowRight, ShieldCheck, 
  ChevronDown, BookOpen, Layers, Check, RefreshCw
} from 'lucide-react';
import { authFetch } from '../../utils/api';
import ManualitoCampesinoModal from '../Common/ManualitoCampesinoModal';
import { hablarEnVozCampesina, pararVozCampesina } from '../../utils/glosarioCampesino';

// Presets agronómicos estándar internacionales (FAO / AgroPaccioli)
const PRESETS_CULTIVOS = {
  'Tomate (Fructificación)': {
    cultivo: 'Tomate',
    fase: 'Fructificación / Cosecha',
    meq: { no3: '14.0', nh4: '0.8', h2po4: '1.5', k: '9.0', ca: '5.5', mg: '2.5', so4: '3.0' }
  },
  'Pimiento / Morrón (Llenado)': {
    cultivo: 'Pimiento',
    fase: 'Llenado de fruto',
    meq: { no3: '13.0', nh4: '0.6', h2po4: '1.4', k: '8.0', ca: '5.0', mg: '2.2', so4: '2.8' }
  },
  'Fresa (Producción continua)': {
    cultivo: 'Fresa',
    fase: 'Producción continua',
    meq: { no3: '10.5', nh4: '0.5', h2po4: '1.8', k: '6.5', ca: '4.5', mg: '2.0', so4: '2.5' }
  },
  'Aguacate Hass (Floración & Cuajado)': {
    cultivo: 'Aguacate Hass',
    fase: 'Floración y cuajado',
    meq: { no3: '11.0', nh4: '0.5', h2po4: '1.5', k: '7.5', ca: '4.5', mg: '2.0', so4: '2.2' }
  },
  'Café Tecnificado (Llenado de grano)': {
    cultivo: 'Café Tecnificado',
    fase: 'Llenado de grano',
    meq: { no3: '13.5', nh4: '0.8', h2po4: '1.6', k: '8.5', ca: '4.0', mg: '2.0', so4: '2.0' }
  },
  'Cítricos / Limón Tahití (Desarrollo)': {
    cultivo: 'Cítricos',
    fase: 'Desarrollo de fruta',
    meq: { no3: '12.0', nh4: '0.6', h2po4: '1.3', k: '7.0', ca: '5.0', mg: '2.2', so4: '2.8' }
  }
};

export default function CalculadoraFertirriegoAgroPaccioli({ fincas = [], sectores = [], selectedFincaId = '' }) {
  const [selectedFinca, setSelectedFinca] = useState(selectedFincaId || '');
  const [selectedSector, setSelectedSector] = useState('');
  const [nombrePrograma, setNombrePrograma] = useState('');
  const [cultivoNombre, setCultivoNombre] = useState('Tomate');
  const [faseFenologica, setFaseFenologica] = useState('Fructificación / Cosecha');

  // Análisis de Agua de la Finca (meq/L)
  const [aguaMeq, setAguaMeq] = useState({
    ca: '1.5',
    mg: '0.8',
    k: '0.2',
    no3: '0.1',
    so4: '0.5',
    hco3: '2.2',
    ce: '0.45'
  });

  // Requerimientos Objetivo del Cultivo (meq/L)
  const [objetivoMeq, setObjetivoMeq] = useState(PRESETS_CULTIVOS['Tomate (Fructificación)'].meq);

  // Parámetros de Tanques y Equipos de Riego
  const [tanqueConfig, setTanqueConfig] = useState({
    volumen_tanque_a_l: '1000',
    volumen_tanque_b_l: '1000',
    tasa_inyeccion_l_m3: '10',
    volumen_riego_m3: '120',
    acido_tipo: 'Acido_Fosforico_85'
  });

  // Estados de cálculo y guardado
  const [calculando, setCalculando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [hablandoInstrucciones, setHablandoInstrucciones] = useState(false);

  const handleEscucharInstrucciones = () => {
    if (!resultado) return;
    if (hablandoInstrucciones) {
      pararVozCampesina();
      setHablandoInstrucciones(false);
    } else {
      setHablandoInstrucciones(true);
      const texto = `Atención operario. Instrucciones para preparar el fertilizante. ` +
        `Para el Tanque A: ${resultado.instrucciones_campesino.tanque_a}. ` +
        `Para el Tanque B: ${resultado.instrucciones_campesino.tanque_b}. ` +
        `Y de Ácido: ${resultado.instrucciones_campesino.acido}. ` +
        `Recuerde nunca revolver el Tanque A con el Tanque B en el mismo balde.`;

      hablarEnVozCampesina(texto);

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const check = setInterval(() => {
          if (!window.speechSynthesis.speaking) {
            setHablandoInstrucciones(false);
            clearInterval(check);
          }
        }, 500);
      } else {
        setTimeout(() => setHablandoInstrucciones(false), 8000);
      }
    }
  };

  // Historial de soluciones guardadas
  const [historialSoluciones, setHistorialSoluciones] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  useEffect(() => {
    if (selectedFincaId) setSelectedFinca(selectedFincaId);
  }, [selectedFincaId]);

  useEffect(() => {
    fetchHistorial();
  }, [selectedFinca]);

  const showToast = (type, text) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchHistorial = async () => {
    setLoadingHistorial(true);
    try {
      let url = '/api/riego-precision/soluciones-nutritivas';
      if (selectedFinca) url += `?fincaId=${selectedFinca}`;
      const res = await authFetch(url);
      const data = await res.json();
      if (Array.isArray(data)) setHistorialSoluciones(data);
    } catch (err) {
      console.error('Error cargando historial de fertirriego:', err);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const handleSelectPreset = (e) => {
    const key = e.target.value;
    if (PRESETS_CULTIVOS[key]) {
      const p = PRESETS_CULTIVOS[key];
      setCultivoNombre(p.cultivo);
      setFaseFenologica(p.fase);
      setObjetivoMeq({ ...p.meq });
      if (!nombrePrograma) {
        setNombrePrograma(`Plan Nutricional ${p.cultivo} - ${p.fase}`);
      }
    }
  };

  const handleCalcularSolucion = async () => {
    setCalculando(true);
    try {
      const res = await authFetch('/api/riego-precision/calcular-solucion-nutritiva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objetivo_meq: objetivoMeq,
          agua_meq: aguaMeq,
          acido_tipo: tanqueConfig.acido_tipo,
          volumen_tanque_a_l: parseFloat(tanqueConfig.volumen_tanque_a_l) || 1000,
          volumen_tanque_b_l: parseFloat(tanqueConfig.volumen_tanque_b_l) || 1000,
          tasa_inyeccion_l_m3: parseFloat(tanqueConfig.tasa_inyeccion_l_m3) || 10,
          volumen_riego_m3: parseFloat(tanqueConfig.volumen_riego_m3) || 100
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al calcular');

      setResultado(data);
      showToast('success', `Balance iónico calculado con éxito: CE teórica = ${data.ce_estimada_ms_cm} mS/cm`);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setCalculando(false);
    }
  };

  const handleGuardarEnBD = async () => {
    if (!resultado) return;
    if (!selectedFinca || !selectedSector || !nombrePrograma) {
      showToast('error', 'Seleccione Finca, Sector y asigne un Nombre al programa.');
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        id_finca: selectedFinca,
        id_sector: selectedSector,
        nombre_programa: nombrePrograma,
        cultivo_nombre: cultivoNombre,
        fase_fenologica: faseFenologica,
        volumen_riego_m3: tanqueConfig.volumen_riego_m3,
        volumen_tanque_a_l: tanqueConfig.volumen_tanque_a_l,
        volumen_tanque_b_l: tanqueConfig.volumen_tanque_b_l,
        tasa_inyeccion_l_m3: tanqueConfig.tasa_inyeccion_l_m3,
        ce_estimada_ms_cm: resultado.ce_estimada_ms_cm,
        ph_estimado: resultado.ph_estimado,
        requerimientos_meq: objetivoMeq,
        agua_aporte_meq: aguaMeq,
        fertilizantes_calculados: resultado.tanque_a_1000L,
        tanque_a_instrucciones: resultado.instrucciones_campesino.tanque_a,
        tanque_b_instrucciones: resultado.instrucciones_campesino.tanque_b,
        acido_instrucciones: resultado.instrucciones_campesino.acido
      };

      const res = await authFetch('/api/riego-precision/guardar-solucion-nutritiva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');

      showToast('success', 'Formulación estequiométrica registrada exitosamente en Base de Datos.');
      fetchHistorial();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleEnviarWhatsAppBodega = () => {
    if (!resultado) return;
    const secObj = sectores.find(s => s.id_sector === parseInt(selectedSector));
    const secNombre = secObj ? secObj.nombre : 'Sector Destino';

    const texto = `🧪 *ORDEN DE PREPARACIÓN DE FERTIRRIEGO (BODEGA)*\n` +
      `🌱 *Cultivo:* ${cultivoNombre} (${faseFenologica})\n` +
      `📍 *Destino:* ${secNombre}\n` +
      `⚡ *CE Esperada:* ${resultado.ce_estimada_ms_cm} mS/cm | *pH:* ${resultado.ph_estimado}\n\n` +
      `------------------------------------\n` +
      `${resultado.instrucciones_campesino.tanque_a}\n\n` +
      `------------------------------------\n` +
      `${resultado.instrucciones_campesino.tanque_b}\n\n` +
      `------------------------------------\n` +
      `${resultado.instrucciones_campesino.acido}\n\n` +
      `_Favor confirmar cuando los tanques estén listos y homogeneizados._`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* TOAST NOTIFICACIÓN */}
      {toastMsg && (
        <div className={`feedback-banner ${toastMsg.type}`}>
          {toastMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* HEADER DE LA CALCULADORA */}
      <div style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fef3c7', color: '#b45309', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', marginBottom: '6px' }}>
              <Sparkles size={14} />
              CIENCIA NUTRICIONAL & ESTEQUIOMETRÍA AVANZADA
            </div>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
              Formulador de Soluciones Nutritivas & Tanques A / B
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              Balance iónico en meq/L, neutralización estequiométrica de bicarbonatos con ácidos y repartición sin precipitación química.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <ManualitoCampesinoModal 
              modulo="Preparación de Fertirriego en Tanques A y B"
              tituloBoton="🌾 Guía de Tanques A / B (3 Pasos)"
              pasos={[
                {
                  titulo: "Paso 1: Escoger el cultivo y cargar la receta",
                  detalle: "Seleccione arriba el cultivo (Tomate, Café, Aguacate, etc.). La calculadora le dirá exactamente cuántos kilos de abono necesita.",
                  audio: "Paso uno. Seleccione arriba el cultivo. La calculadora le dirá exactamente cuántos kilos de abono necesita para ese lote."
                },
                {
                  titulo: "Paso 2: Disolver por separado en Tanque A y Tanque B",
                  detalle: "En el Tanque A disuelva el Calcio y los Nitratos. En el Tanque B disuelva los Sulfatos y Fosfatos. ¡Nunca los revuelva en el mismo balde porque se corta el abono!",
                  audio: "Paso dos. En el Tanque A disuelva el Calcio. En el Tanque B disuelva los Sulfatos y Fosfatos. Nunca los revuelva en el mismo balde porque se corta el fertilizante."
                },
                {
                  titulo: "Paso 3: Prender la inyección hacia el cultivo",
                  detalle: "Verifique que el agua esté corriendo en las cintas de goteo y abra las válvulas de inyección para que el abono llegue parejo a la raíz.",
                  audio: "Paso tres. Verifique que el agua esté corriendo en las mangueras de goteo y abra la inyección para alimentar el cultivo."
                }
              ]}
            />
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>Cargar Preset:</span>
            <select 
              onChange={handleSelectPreset}
              style={{ minHeight: '40px', padding: '6px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600' }}
            >
              <option value="">Seleccione cultivo objetivo...</option>
              {Object.keys(PRESETS_CULTIVOS).map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
        </div>

        {/* METADATOS DEL PLAN */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
          <div className="form-group">
            <label>Finca Destino *</label>
            <select 
              value={selectedFinca} 
              onChange={(e) => setSelectedFinca(e.target.value)}
            >
              <option value="">Seleccione Finca</option>
              {fincas.map(f => (
                <option key={f.id_finca} value={f.id_finca}>{f.nombre}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Sector Hídrico *</label>
            <select 
              value={selectedSector} 
              onChange={(e) => setSelectedSector(e.target.value)}
            >
              <option value="">Seleccione Sector</option>
              {sectores.map(s => (
                <option key={s.id_sector} value={s.id_sector}>{s.codigo_sector} - {s.nombre}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Nombre del Programa Nutricional *</label>
            <input 
              type="text" 
              placeholder="Ej. Plan Tomate Fructificación A-B"
              value={nombrePrograma}
              onChange={(e) => setNombrePrograma(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Cultivo & Variedad</label>
            <input 
              type="text" 
              placeholder="Ej. Tomate Chonto"
              value={cultivoNombre}
              onChange={(e) => setCultivoNombre(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* GRILLA DE PARÁMETROS: ANÁLISIS DE AGUA VS REQUERIMIENTOS IÓNICOS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* COLUMNA 1: APORTE DEL AGUA */}
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
            <Droplets size={18} color="#0284c7" />
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800' }}>1. Análisis Fisicoquímico del Agua de Riego</h4>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label>Bicarbonatos (HCO₃⁻ meq/L) *</label>
              <input 
                type="number" 
                step="0.1" 
                value={aguaMeq.hco3}
                onChange={(e) => setAguaMeq({ ...aguaMeq, hco3: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>CE Agua (mS/cm)</label>
              <input 
                type="number" 
                step="0.05" 
                value={aguaMeq.ce}
                onChange={(e) => setAguaMeq({ ...aguaMeq, ce: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Calcio Agua (Ca²⁺ meq/L)</label>
              <input 
                type="number" 
                step="0.1" 
                value={aguaMeq.ca}
                onChange={(e) => setAguaMeq({ ...aguaMeq, ca: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Magnesio Agua (Mg²⁺ meq/L)</label>
              <input 
                type="number" 
                step="0.1" 
                value={aguaMeq.mg}
                onChange={(e) => setAguaMeq({ ...aguaMeq, mg: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Potasio Agua (K⁺ meq/L)</label>
              <input 
                type="number" 
                step="0.1" 
                value={aguaMeq.k}
                onChange={(e) => setAguaMeq({ ...aguaMeq, k: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Sulfatos Agua (SO₄²⁻ meq/L)</label>
              <input 
                type="number" 
                step="0.1" 
                value={aguaMeq.so4}
                onChange={(e) => setAguaMeq({ ...aguaMeq, so4: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* COLUMNA 2: OBJETIVO NUTRICIONAL DEL CULTIVO */}
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
            <FlaskConical size={18} color="#16a34a" />
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800' }}>2. Solución Nutritiva Objetivo (meq/L)</h4>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label>Nitrógeno Nítrico (NO₃⁻) *</label>
              <input 
                type="number" 
                step="0.5" 
                value={objetivoMeq.no3}
                onChange={(e) => setObjetivoMeq({ ...objetivoMeq, no3: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Fósforo (H₂PO₄⁻) *</label>
              <input 
                type="number" 
                step="0.1" 
                value={objetivoMeq.h2po4}
                onChange={(e) => setObjetivoMeq({ ...objetivoMeq, h2po4: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Potasio (K⁺) *</label>
              <input 
                type="number" 
                step="0.5" 
                value={objetivoMeq.k}
                onChange={(e) => setObjetivoMeq({ ...objetivoMeq, k: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Calcio (Ca²⁺) *</label>
              <input 
                type="number" 
                step="0.5" 
                value={objetivoMeq.ca}
                onChange={(e) => setObjetivoMeq({ ...objetivoMeq, ca: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Magnesio (Mg²⁺) *</label>
              <input 
                type="number" 
                step="0.1" 
                value={objetivoMeq.mg}
                onChange={(e) => setObjetivoMeq({ ...objetivoMeq, mg: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Sulfato (SO₄²⁻) *</label>
              <input 
                type="number" 
                step="0.1" 
                value={objetivoMeq.so4}
                onChange={(e) => setObjetivoMeq({ ...objetivoMeq, so4: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* COLUMNA 3: TANQUES & DOSIFICACIÓN */}
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
            <Layers size={18} color="#eab308" />
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800' }}>3. Parámetros de Inyección & Tanques</h4>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="form-group">
              <label>Ácido Corrector de pH *</label>
              <select 
                value={tanqueConfig.acido_tipo}
                onChange={(e) => setTanqueConfig({ ...tanqueConfig, acido_tipo: e.target.value })}
              >
                <option value="Acido_Fosforico_85">Ácido Fosfórico 85% (Aporta P)</option>
                <option value="Acido_Nitrico_60">Ácido Nítrico 60% (Aporta N)</option>
                <option value="Acido_Sulfurico_98">Ácido Sulfúrico 98% (Aporta S)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label>Volumen Tanque A (L)</label>
                <input 
                  type="number" 
                  value={tanqueConfig.volumen_tanque_a_l}
                  onChange={(e) => setTanqueConfig({ ...tanqueConfig, volumen_tanque_a_l: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Volumen Tanque B (L)</label>
                <input 
                  type="number" 
                  value={tanqueConfig.volumen_tanque_b_l}
                  onChange={(e) => setTanqueConfig({ ...tanqueConfig, volumen_tanque_b_l: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label>Tasa Inyección (L/m³)</label>
                <input 
                  type="number" 
                  value={tanqueConfig.tasa_inyeccion_l_m3}
                  onChange={(e) => setTanqueConfig({ ...tanqueConfig, tasa_inyeccion_l_m3: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Volumen Riego Total (m³)</label>
                <input 
                  type="number" 
                  value={tanqueConfig.volumen_riego_m3}
                  onChange={(e) => setTanqueConfig({ ...tanqueConfig, volumen_riego_m3: e.target.value })}
                />
              </div>
            </div>

            <button 
              type="button"
              className="btn-primary-riego"
              style={{ minHeight: '48px', marginTop: '6px' }}
              onClick={handleCalcularSolucion}
              disabled={calculando}
            >
              <Sparkles size={18} />
              <span>{calculando ? 'Calculando Balance...' : 'CALCULAR BALANCE ESTEQUIOMÉTRICO'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* RESULTADOS DE ALTA INGENIERÍA & FICHA DE CAMPO                        */}
      {/* ===================================================================== */}
      {resultado && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* RESUMEN DE CE Y PH */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div style={{ background: '#0284c7', color: '#ffffff', padding: '18px 22px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', opacity: 0.9 }}>Conductividad Eléctrica Estimada</div>
                <div style={{ fontSize: '32px', fontWeight: '900', lineHeight: 1.1 }}>{resultado.ce_estimada_ms_cm} mS/cm</div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>Rango óptimo agronómico</div>
              </div>
              <Sparkles size={36} style={{ opacity: 0.8 }} />
            </div>

            <div style={{ background: '#16a34a', color: '#ffffff', padding: '18px 22px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', opacity: 0.9 }}>pH Solución Amortiguada</div>
                <div style={{ fontSize: '32px', fontWeight: '900', lineHeight: 1.1 }}>{resultado.ph_estimado}</div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>Máxima absorción de microelementos</div>
              </div>
              <ShieldCheck size={36} style={{ opacity: 0.8 }} />
            </div>
          </div>

          {/* TABLA DE SALES COMERCIALES (INGENIERO) */}
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                ⚖️ Dosificación de Fertilizantes Comerciales Solubles
              </h4>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>
                Concentración: 10 L/m³ (Factor x100)
              </span>
            </div>

            <div className="table-responsive-container">
              <table className="custom-riego-table">
                <thead>
                  <tr>
                    <th>Fertilizante Comercial</th>
                    <th>Tanque Asignado</th>
                    <th>Fórmula Soluble</th>
                    <th>Concentración (g/m³)</th>
                    <th>Kg para Tanque 1.000 L</th>
                    <th>Kg para este Riego ({tanqueConfig.volumen_riego_m3} m³)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Nitrato de Calcio</strong></td>
                    <td><span className="badge-estado En_Riego">Tanque A</span></td>
                    <td>15.5-0-0 + 19% Ca</td>
                    <td>{resultado.sales_g_m3.nitrato_calcio} g/m³</td>
                    <td><strong style={{ color: '#0284c7', fontSize: '15px' }}>{resultado.tanque_a_1000L.nitrato_calcio_kg} kg</strong></td>
                    <td><strong>{resultado.totales_riego_actual.nitrato_calcio} kg</strong></td>
                  </tr>
                  <tr>
                    <td><strong>Nitrato de Potasio</strong></td>
                    <td><span className="badge-estado En_Riego">Tanque A</span></td>
                    <td>13-0-46</td>
                    <td>{resultado.sales_g_m3.nitrato_potasio} g/m³</td>
                    <td><strong style={{ color: '#0284c7', fontSize: '15px' }}>{resultado.tanque_a_1000L.nitrato_potasio_kg} kg</strong></td>
                    <td><strong>{resultado.totales_riego_actual.nitrato_potasio} kg</strong></td>
                  </tr>
                  <tr>
                    <td><strong>Quelato de Hierro (EDDHA 6%)</strong></td>
                    <td><span className="badge-estado En_Riego">Tanque A</span></td>
                    <td>Fe Quelatado</td>
                    <td>{resultado.sales_g_m3.quelato_hierro} g/m³</td>
                    <td><strong style={{ color: '#0284c7', fontSize: '15px' }}>{resultado.tanque_a_1000L.quelato_hierro_kg} kg</strong></td>
                    <td><strong>{resultado.totales_riego_actual.quelato_hierro} kg</strong></td>
                  </tr>
                  <tr>
                    <td><strong>Fosfato Monopotásico (MKP)</strong></td>
                    <td><span className="badge-estado Completado">Tanque B</span></td>
                    <td>0-52-34</td>
                    <td>{resultado.sales_g_m3.mkp} g/m³</td>
                    <td><strong style={{ color: '#16a34a', fontSize: '15px' }}>{resultado.tanque_b_1000L.mkp_kg} kg</strong></td>
                    <td><strong>{resultado.totales_riego_actual.mkp} kg</strong></td>
                  </tr>
                  <tr>
                    <td><strong>Sulfato de Magnesio</strong></td>
                    <td><span className="badge-estado Completado">Tanque B</span></td>
                    <td>16% MgO + 13% S</td>
                    <td>{resultado.sales_g_m3.sulfato_magnesio} g/m³</td>
                    <td><strong style={{ color: '#16a34a', fontSize: '15px' }}>{resultado.tanque_b_1000L.sulfato_magnesio_kg} kg</strong></td>
                    <td><strong>{resultado.totales_riego_actual.sulfato_magnesio} kg</strong></td>
                  </tr>
                  <tr>
                    <td><strong>Sulfato de Potasio Soluble</strong></td>
                    <td><span className="badge-estado Completado">Tanque B</span></td>
                    <td>0-0-50 + 18% S</td>
                    <td>{resultado.sales_g_m3.sulfato_potasio} g/m³</td>
                    <td><strong style={{ color: '#16a34a', fontSize: '15px' }}>{resultado.tanque_b_1000L.sulfato_potasio_kg} kg</strong></td>
                    <td><strong>{resultado.totales_riego_actual.sulfato_potasio} kg</strong></td>
                  </tr>
                  <tr>
                    <td><strong>Micronutrientes Mix</strong></td>
                    <td><span className="badge-estado Completado">Tanque B</span></td>
                    <td>B, Zn, Mn, Cu, Mo</td>
                    <td>{resultado.sales_g_m3.micronutrientes} g/m³</td>
                    <td><strong style={{ color: '#16a34a', fontSize: '15px' }}>{resultado.tanque_b_1000L.micronutrientes_kg} kg</strong></td>
                    <td><strong>{resultado.totales_riego_actual.micronutrientes} kg</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* FICHA VISUAL PARA EL CAMPESINO / BODEGUERO */}
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '2px solid #16a34a', padding: '24px', boxShadow: '0 4px 14px rgba(22, 163, 74, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
              <div>
                <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '800' }}>
                  👨‍🌾 FICHA DE MEZCLA PARA BODEGA Y CAMPO
                </span>
                <h4 style={{ margin: '8px 0 0 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                  Instrucciones de Pesaje y Dilución Simplificadas
                </h4>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button 
                  type="button"
                  style={{ 
                    minHeight: '44px', 
                    padding: '8px 16px', 
                    background: hablandoInstrucciones ? '#dc2626' : '#059669', 
                    color: '#ffffff', 
                    border: '1px solid #10b981', 
                    borderRadius: '10px', 
                    fontWeight: '700', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                  }}
                  onClick={handleEscucharInstrucciones}
                  title="El teléfono le lee en voz alta qué abonos echar en cada tanque"
                >
                  <span>{hablandoInstrucciones ? '⏹️ Detener Voz' : '🔊 Escuchar Instrucciones de Mezcla'}</span>
                </button>

                <button 
                  className="btn-whatsapp-orden"
                  style={{ minHeight: '44px', padding: '8px 16px' }}
                  onClick={handleEnviarWhatsAppBodega}
                >
                  <MessageCircle size={18} />
                  <span>Enviar por WhatsApp a Bodeguero</span>
                </button>

                <button 
                  className="btn-primary-riego"
                  style={{ minHeight: '44px' }}
                  onClick={handleGuardarEnBD}
                  disabled={guardando}
                >
                  <Save size={18} />
                  <span>{guardando ? 'Guardando en BD...' : 'Guardar Formulación en BD'}</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '16px', whiteSpace: 'pre-line', fontSize: '13px', lineHeight: 1.6, color: '#0369a1' }}>
                <strong>{resultado.instrucciones_campesino.tanque_a}</strong>
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px', whiteSpace: 'pre-line', fontSize: '13px', lineHeight: 1.6, color: '#15803d' }}>
                <strong>{resultado.instrucciones_campesino.tanque_b}</strong>
              </div>

              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '16px', whiteSpace: 'pre-line', fontSize: '13px', lineHeight: 1.6, color: '#b91c1c' }}>
                <strong>{resultado.instrucciones_campesino.acido}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* HISTORIAL DE FORMULACIONES GUARDADAS EN BASE DE DATOS                  */}
      {/* ===================================================================== */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px' }}>
        <h4 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
          📑 Historial de Soluciones Nutritivas Registradas en la Finca
        </h4>

        {historialSoluciones.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            No hay formulaciones guardadas en la base de datos aún. Realice un cálculo y presione "Guardar Formulación en BD".
          </p>
        ) : (
          <div className="table-responsive-container">
            <table className="custom-riego-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Programa</th>
                  <th>Cultivo / Fase</th>
                  <th>Sector / Finca</th>
                  <th>CE Estimada</th>
                  <th>Volumen Riego</th>
                  <th>Creado Por</th>
                </tr>
              </thead>
              <tbody>
                {historialSoluciones.map(s => (
                  <tr key={s.id_solucion}>
                    <td>{new Date(s.creado_el).toLocaleDateString()}</td>
                    <td><strong>{s.nombre_programa}</strong></td>
                    <td>{s.cultivo_nombre} ({s.fase_fenologica || 'General'})</td>
                    <td>{s.sector_nombre} ({s.finca_nombre})</td>
                    <td><strong>{s.ce_estimada_ms_cm} mS/cm</strong></td>
                    <td>{s.volumen_riego_m3} m³</td>
                    <td>{s.creado_por}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
