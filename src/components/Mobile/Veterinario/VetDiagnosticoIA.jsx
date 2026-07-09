import React, { useState } from 'react';
import { Camera, Upload, AlertCircle } from 'lucide-react';

const VetDiagnosticoIA = ({ onBack }) => {
  const [photo, setPhoto] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  const handleCapture = () => {
    // Simulando captura de foto
    setPhoto('captured');
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setResult({
        diagnosis: 'Posible Dermatofitosis (Tiña) o Lesión Cutánea Menor',
        confidence: '85%',
        recommendation: 'Aplicar fungicida tópico (ej. Tintura de Yodo) y aislar si las lesiones se expanden.',
        medicine: 'Yodo al 10%'
      });
    }, 2000);
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '15px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left', color: '#991b1b' }}>
        <AlertCircle size={24} />
        <span style={{ fontSize: '12px' }}>Tome una foto clara de la lesión, ojo, o pezuña del animal para obtener un diagnóstico asistido por IA.</span>
      </div>

      {!photo ? (
        <div 
          onClick={handleCapture}
          style={{ 
            height: '250px', 
            background: '#e2e8f0', 
            borderRadius: '16px', 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center',
            cursor: 'pointer',
            border: '2px dashed #cbd5e1'
          }}
        >
          <Camera size={48} color="#64748b" style={{ marginBottom: '10px' }} />
          <strong style={{ color: '#475569' }}>Tocar para Capturar Foto</strong>
        </div>
      ) : analyzing ? (
        <div style={{ height: '250px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ marginTop: '15px', color: '#64748b', fontWeight: 'bold' }}>La IA está analizando la imagen...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      ) : result ? (
        <div style={{ textAlign: 'left' }}>
          <div style={{ height: '200px', background: '#cbd5e1', borderRadius: '12px', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             [Foto Capturada de la Piel]
          </div>
          <div style={{ background: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 10px', color: '#1e293b', fontSize: '16px' }}>Resultados IA (Confianza: {result.confidence})</h3>
            <div style={{ marginBottom: '10px' }}>
              <strong style={{ fontSize: '12px', color: '#64748b' }}>Posible Diagnóstico:</strong>
              <div style={{ color: '#b91c1c', fontWeight: 'bold' }}>{result.diagnosis}</div>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <strong style={{ fontSize: '12px', color: '#64748b' }}>Recomendación Clínica:</strong>
              <div style={{ fontSize: '14px', color: '#1e293b' }}>{result.recommendation}</div>
            </div>
            <button style={{ width: '100%', padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Upload size={18} />
              Guardar en Historia Clínica y Recetar {result.medicine}
            </button>
            <button onClick={() => setPhoto(null)} style={{ width: '100%', padding: '12px', background: 'transparent', color: '#64748b', border: 'none', borderRadius: '8px', fontWeight: 'bold', marginTop: '5px' }}>
              Tomar otra foto
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default VetDiagnosticoIA;
