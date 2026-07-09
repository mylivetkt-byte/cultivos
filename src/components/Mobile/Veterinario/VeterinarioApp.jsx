import React, { useState } from 'react';
import { Camera, Search, HeartPulse, Dna, FileWarning, ShieldAlert, Pill, Syringe, Activity, Baby, ArrowLeft } from 'lucide-react';
import VetDiagnosticoIA from './VetDiagnosticoIA';
import VetConsulta from './VetConsulta';
import VetFarmacia from './VetFarmacia';
import VetReproduccion from './VetReproduccion';
import VetToros from './VetToros';
import VetDescartes from './VetDescartes';

const VeterinarioApp = ({ tenantId, fincaId }) => {
  const [activeView, setActiveView] = useState('home');

  const menuItems = [
    { id: 'diagnostico', title: 'Cámara IA', icon: <Camera size={32} color="#ec4899" />, desc: 'Diagnóstico por Foto' },
    { id: 'recetas', title: 'Farmacia', icon: <Pill size={32} color="#3b82f6" />, desc: 'Recetar y Pedidos' },
    { id: 'consulta', title: 'Consulta Rápida', icon: <Search size={32} color="#10b981" />, desc: 'Filtros y Búsqueda' },
    { id: 'prenez', title: 'Reproducción', icon: <Baby size={32} color="#8b5cf6" />, desc: 'Preñadas y Candidatas' },
    { id: 'toros', title: 'Sementales', icon: <Dna size={32} color="#f59e0b" />, desc: 'Control de Montas' },
    { id: 'descarte', title: 'Descartes', icon: <FileWarning size={32} color="#ef4444" />, desc: 'Bajas Clínicas' }
  ];

  if (activeView === 'diagnostico') {
    return (
      <div className="vet-mobile-container">
         <div className="vet-header">
           <button onClick={() => setActiveView('home')} className="vet-back-btn"><ArrowLeft size={24} /></button>
           <h2>Diagnóstico IA</h2>
         </div>
         <VetDiagnosticoIA onBack={() => setActiveView('home')} />
      </div>
    );
  }

  if (activeView === 'consulta') {
    return (
      <div className="vet-mobile-container">
         <div className="vet-header">
           <button onClick={() => setActiveView('home')} className="vet-back-btn"><ArrowLeft size={24} /></button>
           <h2>Consulta de Ganado</h2>
         </div>
         <VetConsulta onBack={() => setActiveView('home')} />
      </div>
    );
  }

  if (activeView === 'recetas') {
    return (
      <div className="vet-mobile-container">
         <div className="vet-header">
           <button onClick={() => setActiveView('home')} className="vet-back-btn"><ArrowLeft size={24} /></button>
           <h2>Farmacia Veterinaria</h2>
         </div>
         <VetFarmacia onBack={() => setActiveView('home')} />
      </div>
    );
  }

  if (activeView === 'prenez') {
    return (
      <div className="vet-mobile-container">
         <div className="vet-header">
           <button onClick={() => setActiveView('home')} className="vet-back-btn"><ArrowLeft size={24} /></button>
           <h2>Preñez y Reproducción</h2>
         </div>
         <VetReproduccion onBack={() => setActiveView('home')} />
      </div>
    );
  }

  if (activeView === 'toros') {
    return (
      <div className="vet-mobile-container">
         <div className="vet-header">
           <button onClick={() => setActiveView('home')} className="vet-back-btn"><ArrowLeft size={24} /></button>
           <h2>Sementales</h2>
         </div>
         <VetToros onBack={() => setActiveView('home')} />
      </div>
    );
  }

  if (activeView === 'descarte') {
    return (
      <div className="vet-mobile-container">
         <div className="vet-header">
           <button onClick={() => setActiveView('home')} className="vet-back-btn"><ArrowLeft size={24} /></button>
           <h2>Descartes</h2>
         </div>
         <VetDescartes onBack={() => setActiveView('home')} />
      </div>
    );
  }

  return (
    <div className="vet-mobile-container">
      <style>{`
        .vet-mobile-container {
          max-width: 480px;
          margin: 0 auto;
          background: #f8fafc;
          min-height: calc(100vh - 100px);
          border-radius: 20px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          overflow: hidden;
          font-family: 'Inter', sans-serif;
          display: flex;
          flex-direction: column;
        }
        .vet-header {
          background: #1e293b;
          color: white;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .vet-header h2 {
          margin: 0;
          font-size: 1.2rem;
          font-weight: 600;
        }
        .vet-back-btn {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
        }
        .vet-profile {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .vet-avatar {
          width: 50px;
          height: 50px;
          border-radius: 25px;
          background: #3b82f6;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 1.2rem;
        }
        .vet-welcome h3 { margin: 0; font-size: 1.1rem; }
        .vet-welcome p { margin: 0; font-size: 0.85rem; color: #94a3b8; }
        
        .vet-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          padding: 20px;
        }
        .vet-card {
          background: white;
          border-radius: 16px;
          padding: 20px 15px;
          text-align: center;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          border: 1px solid #e2e8f0;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .vet-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
        }
        .vet-icon-wrapper {
          background: #f1f5f9;
          width: 60px;
          height: 60px;
          border-radius: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 10px;
        }
        .vet-card h4 {
          margin: 0 0 5px 0;
          color: #1e293b;
          font-size: 0.95rem;
        }
        .vet-card p {
          margin: 0;
          color: #64748b;
          font-size: 0.75rem;
        }
        .vet-stats {
          margin: 0 20px 20px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          border-radius: 16px;
          padding: 20px;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .vet-stat-box { text-align: center; }
        .vet-stat-val { font-size: 1.5rem; font-weight: bold; margin-bottom: 4px; }
        .vet-stat-lbl { font-size: 0.75rem; opacity: 0.9; }
      `}</style>

      <div className="vet-header">
        <div className="vet-profile">
          <div className="vet-avatar">Z</div>
          <div className="vet-welcome">
            <h3>Centro Clínico Zootecnista</h3>
            <p>Conectado a Base de Datos Central</p>
          </div>
        </div>
      </div>

      <div className="vet-stats">
        <div className="vet-stat-box">
          <div className="vet-stat-val">245</div>
          <div className="vet-stat-lbl">Preñadas</div>
        </div>
        <div className="vet-stat-box">
          <div className="vet-stat-val">12</div>
          <div className="vet-stat-lbl">Para Parto</div>
        </div>
        <div className="vet-stat-box">
          <div className="vet-stat-val">8</div>
          <div className="vet-stat-lbl">Atenciones Hoy</div>
        </div>
      </div>

      <div className="vet-grid">
        {menuItems.map(item => (
          <div key={item.id} className="vet-card" onClick={() => setActiveView(item.id)}>
            <div className="vet-icon-wrapper">{item.icon}</div>
            <h4>{item.title}</h4>
            <p>{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VeterinarioApp;
