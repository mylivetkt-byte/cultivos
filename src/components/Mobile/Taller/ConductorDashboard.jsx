import React from 'react';
import { Home, Truck, AlertTriangle, FileCheck, Tractor } from 'lucide-react';
import TallerNuevaOT from './TallerNuevaOT';

export default function ConductorDashboard({ tenantId, activeTab, setActiveTab }) {

  if (activeTab === 'emergencia') {
    return (
      <div style={{height: '100%', overflow: 'auto', background: '#fff'}}>
        {/* We reuse NuevaOT but pre-filled or simplified if needed */}
        <TallerNuevaOT onBack={() => setActiveTab('home')} tenantId={tenantId} />
      </div>
    );
  }

  return (
    <>
      <div className="app-header" style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Hola, Conductor</h2>
            <p>Máquina: [JJD-001] John Deere</p>
          </div>
          <Tractor size={36} color="rgba(255,255,255,0.8)" />
        </div>
        
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.15)', padding: 15, borderRadius: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 'bold' }}>✓ Checklist</div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>Al día</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.15)', padding: 15, borderRadius: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 'bold' }}>2 Labores</div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>Programadas hoy</div>
          </div>
        </div>
      </div>

      <h3 style={{ margin: '10px 20px', fontSize: '1.1rem', color: '#1e293b' }}>Labores de Campo</h3>
      
      <div className="task-list">
        <div className="task-card">
          <div className="task-title">Preparación Lote 4B</div>
          <div className="task-desc">Pase de rastra pesada. Profundidad 30cm.</div>
          <div className="task-meta">
            <span className="task-badge progress">En Ejecución</span>
            <span>07:00 AM - 12:00 PM</span>
          </div>
          <button className="btn-primary-mobile">Finalizar Labor</button>
        </div>

        <div className="task-card" style={{ borderLeftColor: '#cbd5e1' }}>
          <div className="task-title">Aplicación Fertilizante Lote 2</div>
          <div className="task-desc">Abonadora acoplada. Urea 50kg/ha.</div>
          <div className="task-meta">
            <span className="task-badge">Pendiente</span>
            <span>13:00 PM - 16:00 PM</span>
          </div>
          <button className="btn-primary-mobile" style={{ background: '#3b82f6' }}>Iniciar Labor</button>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        <button 
          className="btn-primary-mobile" 
          style={{ background: '#ef4444', padding: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
          onClick={() => setActiveTab('emergencia')}
        >
          <AlertTriangle size={20} /> Reportar Daño / Varada
        </button>
      </div>

      <div className="bottom-nav">
        <div className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
          <Home size={22} />
          <span>Inicio</span>
        </div>
        <div className={`nav-item`} onClick={() => {}}>
          <FileCheck size={22} />
          <span>Checklist</span>
        </div>
        <div className={`nav-item`} onClick={() => {}}>
          <Truck size={22} />
          <span>Viajes</span>
        </div>
      </div>
    </>
  );
}
