import React, { useState, useEffect, useRef } from 'react';
import { authFetch, fetchApi } from '../../utils/api';
import PremiumSelect from '../PremiumSelect';
import { FaCamera, FaUpload, FaSpinner, FaWhatsapp, FaExclamationTriangle, FaLeaf, FaBoxOpen, FaCheckCircle, FaExclamationCircle, FaMapMarkerAlt } from 'react-icons/fa';

const SmartPrescriptionApp = () => {
  const [lotes, setLotes] = useState([]);
  const [insumos, setInsumos] = useState([]);
  
  const [selectedLote, setSelectedLote] = useState(null);
  
  // AI State
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);
  const fileInputRef = useRef(null);

  // Prescription State
  const [selectedInsumo, setSelectedInsumo] = useState(null);
  const [dosis, setDosis] = useState('');
  const [recipeItems, setRecipeItems] = useState([]);
  
  // WhatsApp States
  const [isAlertingGerencia, setIsAlertingGerencia] = useState(false);
  const [isAlertingCompras, setIsAlertingCompras] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchLotes();
    fetchInsumos();
  }, []);

  const fetchLotes = async () => {
    try {
      const res = await fetchApi('/table/lotes/data?pageSize=1000');
      if (res.data) {
        setLotes(res.data.map(l => ({ value: l.id_lote, label: l.nombre || `Lote ${l.id_lote}` })));
      }
    } catch (error) {
      alert('Error cargando lotes: ' + error.message);
      console.error('Error fetching lotes:', error);
    }
  };

  const fetchInsumos = async () => {
    try {
      const res = await fetchApi('/table/insumos/data?pageSize=1000');
      if (res.data) {
        // We want all items that might be prescribed (Agrochemicals, Fertilizers, Raw materials)
        const validInsumos = res.data.filter(i => i.tipo_item !== 'Servicio');
        setInsumos(validInsumos.map(i => ({
          value: i.id_insumo,
          label: `${i.codigo || ''} - ${i.nombre || 'Sin nombre'}`,
          stock: parseFloat(i.stock_actual) || 0,
          origen: i.origen,
          is_viol: i.origen === 'Biofábrica' || (i.nombre && (i.nombre.toLowerCase().includes('viol') || i.nombre.toLowerCase().includes('biol')))
        })));
      }
    } catch (error) {
      alert('Error cargando insumos: ' + error.message);
      console.error('Error fetching insumos:', error);
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert("Tu dispositivo o navegador no soporta GPS.");
      return;
    }
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const response = await authFetch('/api/gis/detect-lote', {
          method: 'POST',
          body: JSON.stringify({ lat: latitude, lng: longitude })
        });
        const res = await response.json();
        if (res && res.id_lote) {
          setSelectedLote(res.id_lote);
          alert(`Ubicación detectada exitosamente en el Lote: ${res.nombre}`);
        } else {
          alert("No se detectó ningún lote registrado cerca de tus coordenadas actuales.");
        }
      } catch (e) {
        alert("Error de conexión al detectar la ubicación.");
      } finally {
        setIsDetectingLocation(false);
      }
    }, (error) => {
      setIsDetectingLocation(false);
      alert("Por favor, permite el acceso al GPS para auto-detectar el lote.");
    }, { enableHighAccuracy: true });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(URL.createObjectURL(file));
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!imageBase64) return;
    setIsAnalyzing(true);
    setDiagnosis(null);
    try {
      const response = await authFetch('/api/ai/diagnosticar-plaga', {
        method: 'POST',
        body: JSON.stringify({ imageBase64 })
      });
      const res = await response.json();
      if (res.success) {
        setDiagnosis(res.data);
      } else {
        alert(res.error || 'Error al analizar la imagen.');
      }
    } catch (error) {
      alert('Error de conexión con IA.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const alertGerencia = async () => {
    if (!diagnosis || !selectedLote) return;
    setIsAlertingGerencia(true);
    try {
      const loteName = lotes.find(l => l.value === selectedLote)?.label || 'Desconocido';
      const response = await authFetch('/api/whatsapp/alertar-gerencia', {
        method: 'POST',
        body: JSON.stringify({
          ubicacion: `Lote: ${loteName}`,
          diagnostico: diagnosis.diagnostico,
          nivel_riesgo: diagnosis.nivel_riesgo,
          accion_recomendada: diagnosis.accion_recomendada,
          detalles: diagnosis.detalles
        })
      });
      const res = await response.json();
      if (res.data) alert('¡Alerta enviada a Gerencia exitosamente!');
      else alert(res.error);
    } catch (e) {
      alert('Error enviando WhatsApp.');
    } finally {
      setIsAlertingGerencia(false);
    }
  };

  const solicitarAbastecimiento = async () => {
    if (!selectedInsumo) return;
    setIsAlertingCompras(true);
    try {
      const insumoData = insumos.find(i => i.value === selectedInsumo);
      const isViol = insumoData.is_viol;
      const accionRequerida = isViol ? 'gestionar producción en Biofábrica urgente' : 'gestionar compra urgente a proveedores';
      const msg = `¡Alerta de Desabastecimiento!\nFinca: La Finca\nLote: ${selectedLote?.label || 'N/A'}\nInsumo requerido: ${insumoData.label}\nTipo: ${isViol ? 'Orgánico / Biofábrica' : 'Químico Comercial'}\nStock actual: 0\nPor favor, ${accionRequerida}.`;
      
      const response = await authFetch('/api/whatsapp/send', {
        method: 'POST',
        body: JSON.stringify({
          phone: '1234567890',
          message: msg
        })
      });
      const res = await response.json();
      if (res.data) {
        alert(isViol ? 'Alerta enviada al Jefe de Producción de Violes exitosamente.' : 'Alerta de abastecimiento enviada a Compras exitosamente.');
      } else {
        alert(res.error || 'Error enviando mensaje');
      }
    } catch (e) {
      alert('Error enviando WhatsApp.');
    } finally {
      setIsAlertingCompras(false);
    }
  };

  const addInsumoToRecipe = () => {
    if (!selectedInsumo || !dosis) return;
    const insumoObj = insumos.find(i => i.value === selectedInsumo);
    setRecipeItems([...recipeItems, { ...insumoObj, dosis }]);
    setSelectedInsumo(null);
    setDosis('');
  };

  const removeInsumo = (idx) => {
    setRecipeItems(recipeItems.filter((_, i) => i !== idx));
  };

  const grabarReceta = async () => {
    if (!selectedLote || recipeItems.length === 0) {
      alert("Asegúrese de haber seleccionado el Lote y añadido al menos un producto a la receta.");
      return;
    }
    
    setIsSaving(true);
    try {
      const payload = {
        tenantId: 1, // hardcoded for demo
        ubicacion: { lote: lotes.find(l => l.value === selectedLote)?.label || String(selectedLote) },
        observaciones: diagnosis ? `Diagnóstico: ${diagnosis.diagnostico}` : '',
        items: recipeItems.map(item => ({
          id_insumo: item.value,
          cantidadRequerida: parseFloat(item.dosis) || 1
        }))
      };

      const response = await authFetch('/api/recetas/ejecutar', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const res = await response.json();
      
      if (res.success) {
        alert(`¡Éxito! ${res.message}\nSalida: ${res.documentoSalida}\nEgreso Contable: ${res.comprobanteContable}`);
        setRecipeItems([]);
        setSelectedLote(null);
        setDiagnosis(null);
        setImageBase64(null);
        setImage(null);
        fetchInsumos(); // Refresh stock
      } else {
        alert(res.error || 'Error al grabar la receta.');
      }
    } catch (error) {
      alert('Error de conexión al grabar la receta.');
    } finally {
      setIsSaving(false);
    }
  };

  const getRiskColor = (risk) => {
    if(!risk) return 'text-gray-500';
    const r = risk.toLowerCase();
    if(r.includes('bajo')) return 'text-green-500';
    if(r.includes('medio')) return 'text-yellow-500';
    if(r.includes('alto')) return 'text-orange-500';
    if(r.includes('crítico') || r.includes('critico')) return 'text-red-600';
    return 'text-blue-500';
  };

  const currentInsumoObj = selectedInsumo ? insumos.find(i => i.value === selectedInsumo) : null;

  return (
    <div style={{ minHeight: '100vh', padding: '20px', background: '#0f172a', color: '#e2e8f0', paddingBottom: '60px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* HEADER TIPO APP MÓVIL */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#111827', padding: '20px', borderRadius: '10px', border: '1px solid rgba(148, 163, 184, 0.25)' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#fff' }}>
              Recetario IA (Lotes: {lotes.length}, Insumos: {insumos.length})
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>Asistente Inteligente de Campo</p>
          </div>
          <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '50%', color: '#60a5fa' }}>
            <FaLeaf size={24} />
          </div>
        </div>

        {/* 1. DIAGNÓSTICO VISUAL */}
        <div style={{ background: '#111827', border: '1px solid rgba(148, 163, 184, 0.25)', borderRadius: '10px', padding: '20px' }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
            <FaCamera color="#60a5fa" /> 1. Diagnóstico Visual
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* UBICACIÓN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8' }}>📍 Ubicación del Lote</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1, color: '#0f172a', fontWeight: 'normal' }}>
                  <PremiumSelect 
                    options={lotes} 
                    value={selectedLote} 
                    onChange={(e) => setSelectedLote(e.target.value)} 
                    placeholder="Seleccione o detecte por GPS..." 
                  />
                </div>
                <button 
                  onClick={detectLocation}
                  disabled={isDetectingLocation}
                  title="Auto-Detectar por GPS"
                  style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', padding: '0 16px', cursor: isDetectingLocation ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {isDetectingLocation ? <FaSpinner className="animate-spin" size={18} /> : <FaMapMarkerAlt size={18} />}
                </button>
              </div>
            </div>

            {/* FOTOGRAFÍA */}
            <div style={{ border: '1px solid #334155', borderRadius: '10px', padding: '12px', background: '#0f172a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Fotografía de Plaga o Enfermedad</div>
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ background: '#1e293b', color: '#fff', border: '1px solid #475569', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <FaCamera size={14} /> {image ? 'Cambiar foto' : 'Abrir cámara'}
                </button>
              </div>
              
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                style={{ display: 'none' }} 
                ref={fileInputRef}
                onChange={handleImageUpload}
              />
              
              {!image ? (
                <div style={{ color: '#94a3b8', fontSize: '12px', lineHeight: 1.5 }}>
                  Antes de recetar, abre la cámara y toma una fotografía clara de la hoja, fruto o tallo afectado.
                </div>
              ) : (
                <div style={{ marginTop: '10px' }}>
                  <img src={image} alt="Crop" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: '8px', border: '1px solid #334155' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '12px', color: '#cbd5e1' }}>
                    <span>Fotografía lista para análisis.</span>
                    <button 
                      onClick={() => { setImageBase64(''); setImage(null); }} 
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                    >
                      Limpiar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* BOTÓN ANALIZAR */}
            <button 
              onClick={analyzeImage}
              disabled={!imageBase64 || isAnalyzing}
              style={{ width: '100%', padding: '14px', background: (!imageBase64 || isAnalyzing) ? '#1e293b' : '#2563eb', color: (!imageBase64 || isAnalyzing) ? '#64748b' : '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: (!imageBase64 || isAnalyzing) ? 'not-allowed' : 'pointer' }}
            >
              {isAnalyzing ? <FaSpinner className="animate-spin" size={16} /> : <FaLeaf size={16} />}
              {isAnalyzing ? 'Procesando con IA...' : 'Analizar Enfermedad'}
            </button>

            {/* DIAGNOSIS RESULT */}
            {diagnosis && (
              <div style={{ marginTop: '4px', background: '#0f172a', border: '1px solid #334155', padding: '16px', borderRadius: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff' }}>{diagnosis.diagnostico}</h3>
                  <div style={{ marginTop: '6px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', background: '#1e293b', color: getRiskColor(diagnosis.nivel_riesgo).replace('text-', '') }}>
                      Nivel de Riesgo: {diagnosis.nivel_riesgo}
                    </span>
                  </div>
                </div>
                
                <p style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: 1.6, borderLeft: '3px solid #334155', paddingLeft: '12px', marginTop: '16px' }}>
                  {diagnosis.detalles}
                </p>
                
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '12px', borderRadius: '8px', marginTop: '16px' }}>
                  <p style={{ margin: '0 0 6px 0', color: '#60a5fa', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>Acción Sugerida</p>
                  <p style={{ margin: 0, color: '#bfdbfe', fontSize: '13px' }}>{diagnosis.accion_recomendada}</p>
                </div>

                <button 
                  onClick={alertGerencia}
                  disabled={isAlertingGerencia || !selectedLote}
                  style={{ width: '100%', padding: '12px', marginTop: '16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', fontSize: '13px', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: (isAlertingGerencia || !selectedLote) ? 'not-allowed' : 'pointer' }}
                >
                  {isAlertingGerencia ? <FaSpinner className="animate-spin" size={16} /> : <FaWhatsapp size={18} />}
                  Alertar Alta Gerencia
                </button>
                {!selectedLote && <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#f87171', textAlign: 'center' }}>Seleccione el Lote arriba para alertar.</p>}
              </div>
            )}
          </div>
        </div>

        {/* 2. RECETA E INVENTARIO */}
        <div style={{ background: '#111827', border: '1px solid rgba(148, 163, 184, 0.25)', borderRadius: '10px', padding: '20px' }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
            <FaBoxOpen color="#60a5fa" /> 2. Receta e Inventario
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#94a3b8' }}>
              💊 Insumo a Aplicar
              <div style={{ color: '#0f172a', fontWeight: 'normal' }}>
                <PremiumSelect 
                  options={insumos} 
                  value={selectedInsumo} 
                  onChange={(e) => setSelectedInsumo(e.target.value)} 
                  placeholder="Busque químico o viol..." 
                />
              </div>
            </label>

            <div style={{ background: '#0f172a', border: '1px solid #334155', padding: '16px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {currentInsumoObj && (
                <>
                  {/* TIPO DE PRODUCTO */}
                <div>
                  <span style={{ display: 'inline-block', padding: '4px 8px', background: '#1e293b', color: '#93c5fd', borderRadius: '4px', fontSize: '11px', border: '1px solid rgba(59, 130, 246, 0.3)', textTransform: 'uppercase', fontWeight: 800 }}>
                    {currentInsumoObj.is_viol ? 'Orgánico / Biofábrica' : 'Químico Comercial'}
                  </span>
                </div>

                {/* STOCK HIGHLIGHT */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
                  <span style={{ color: '#cbd5e1', fontSize: '13px', fontWeight: 800 }}>Stock Bodega:</span>
                  <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', color: currentInsumoObj.stock > 0 ? '#4ade80' : '#ef4444' }}>
                    {currentInsumoObj.stock > 0 ? <FaCheckCircle size={14} /> : <FaExclamationCircle size={14} />}
                    {currentInsumoObj.stock}
                  </div>
                </div>

                {/* DOSIS INPUT */}
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#94a3b8' }}>
                  Dosis a Aplicar
                  <input 
                    type="text" 
                    value={dosis}
                    onChange={(e) => setDosis(e.target.value)}
                    placeholder="Ej: 5 L/Ha"
                    style={{ padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '14px', outline: 'none' }}
                  />
                </label>

                {/* ALERTA DESABASTECIMIENTO */}
                {currentInsumoObj && currentInsumoObj.stock <= 0 && (
                  <div style={{ paddingTop: '16px', borderTop: '1px solid #334155', marginTop: '8px' }}>
                    <div style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#fbbf24', padding: '12px', marginBottom: '16px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                      <strong>¡Sin Existencias!</strong> Requiere solicitud urgente.
                    </div>
                    <button 
                      onClick={solicitarAbastecimiento}
                      disabled={isAlertingCompras}
                      style={{ width: '100%', padding: '14px', background: '#25D366', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 800, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: isAlertingCompras ? 'not-allowed' : 'pointer' }}
                    >
                      {isAlertingCompras ? <FaSpinner className="animate-spin" size={18} /> : <FaWhatsapp size={20} />}
                      {currentInsumoObj.is_viol ? 'Solicitar Producción a Biofábrica' : 'Solicitar Pedido a Compras'}
                    </button>
                  </div>
                )}
                
                {/* BOTÓN CONFIRMAR RECETA */}
                <button 
                  onClick={addInsumoToRecipe}
                  disabled={!currentInsumoObj || !dosis || currentInsumoObj.stock <= 0}
                  style={{ width: '100%', marginTop: '8px', padding: '14px', background: (!currentInsumoObj || !dosis || currentInsumoObj.stock <= 0) ? '#1e293b' : '#3b82f6', color: (!currentInsumoObj || !dosis || currentInsumoObj.stock <= 0) ? '#64748b' : '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 800, cursor: (!currentInsumoObj || !dosis || currentInsumoObj.stock <= 0) ? 'not-allowed' : 'pointer' }}
                >
                  {!currentInsumoObj ? 'Seleccione un Insumo' : currentInsumoObj.stock <= 0 ? 'Sin Stock para Agregar' : 'Agregar a la Receta'}
                </button>
                </>
              )}
              </div>

            {/* GRILLA DE RECETA */}
            <div style={{ marginTop: '16px', background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '16px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 800, color: '#fff', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
                Receta Actual ({recipeItems.length} insumos añadidos)
              </h3>
              
              {recipeItems.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '20px 0', fontStyle: 'italic' }}>
                  Aún no has agregado ningún insumo a esta receta. Selecciona uno arriba y agrégalo.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {recipeItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '10px', borderRadius: '6px', border: '1px solid #475569' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0' }}>{item.label}</span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Dosis: {item.dosis}</span>
                      </div>
                      <button onClick={() => removeInsumo(idx)} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '16px', cursor: 'pointer', padding: '4px' }}>&times;</button>
                    </div>
                  ))}
                </div>
              )}
              
              <button 
                onClick={grabarReceta}
                disabled={isSaving || recipeItems.length === 0}
                style={{ width: '100%', marginTop: '16px', padding: '14px', background: (isSaving || recipeItems.length === 0) ? '#064e3b' : '#10b981', color: (isSaving || recipeItems.length === 0) ? '#34d399' : '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 800, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: (isSaving || recipeItems.length === 0) ? 'not-allowed' : 'pointer' }}
              >
                {isSaving ? <FaSpinner className="animate-spin" size={18} style={{ marginRight: '8px' }} /> : <FaCheckCircle style={{ marginRight: '8px' }} />}
                {isSaving ? 'Grabando...' : 'Grabar Receta'}
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default SmartPrescriptionApp;
