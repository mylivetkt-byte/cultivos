import React, { useState } from 'react';
import { Settings, User, Truck, Wrench } from 'lucide-react';
import JefeTallerDashboard from './JefeTallerDashboard';
import MecanicoDashboard from './MecanicoDashboard';
import ConductorDashboard from './ConductorDashboard';
import './TallerApp.css'; // We'll extract styles here

const TallerApp = ({ tenantId }) => {
  const [activeRole, setActiveRole] = useState('jefe'); // jefe, mecanico, conductor
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="vet-mobile-container">
      {/* DEVELOPMENT ROLE SELECTOR */}
      <div className="role-selector">
        <span className="role-lbl">Simular Rol:</span>
        <button className={`role-btn ${activeRole === 'jefe' ? 'active' : ''}`} onClick={() => { setActiveRole('jefe'); setActiveTab('home'); }}>Jefe</button>
        <button className={`role-btn ${activeRole === 'mecanico' ? 'active' : ''}`} onClick={() => { setActiveRole('mecanico'); setActiveTab('home'); }}>Mecánico</button>
        <button className={`role-btn ${activeRole === 'conductor' ? 'active' : ''}`} onClick={() => { setActiveRole('conductor'); setActiveTab('home'); }}>Conductor</button>
      </div>

      <div className="app-content-area">
        {activeRole === 'jefe' && <JefeTallerDashboard tenantId={tenantId} activeTab={activeTab} setActiveTab={setActiveTab} />}
        {activeRole === 'mecanico' && <MecanicoDashboard tenantId={tenantId} activeTab={activeTab} setActiveTab={setActiveTab} />}
        {activeRole === 'conductor' && <ConductorDashboard tenantId={tenantId} activeTab={activeTab} setActiveTab={setActiveTab} />}
      </div>
    </div>
  );
};

export default TallerApp;
