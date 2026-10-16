import React, { useState } from 'react';
import TenantForm from './TenantForm';
import FincasTab from './FincasTab';
import BodegasTab from './BodegasTab';
import ResolucionesDIANTab from './ResolucionesDIANTab';

export default function EmpresaManager({ onBack, onSaved, editTenant = null }) {
  const [activeTab, setActiveTab] = useState('basicos');
  // editTenant could be updated if we save it, but usually onSaved is triggered.
  // We need to know if we are creating a new company, because if it's new, we shouldn't show Fincas until it's created.
  
  const isNew = !editTenant;

  const tabStyle = (isActive) => ({
    padding: '12px 24px',
    cursor: isNew && !isActive ? 'not-allowed' : 'pointer',
    background: isActive ? 'var(--bg-card)' : 'var(--bg-main)',
    borderBottom: isActive ? '3px solid #1976d2' : '3px solid transparent',
    color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
    fontWeight: isActive ? '600' : '400',
    transition: 'all 0.3s ease',
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: 'none',
    outline: 'none',
    fontSize: '15px'
  });

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', background: 'var(--bg-card)', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', maxHeight: '90vh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        {onBack && (
          <button onClick={onBack} style={{ border: 'none', background: 'var(--bg-main)', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#e0e0e0'} onMouseLeave={(e) => e.currentTarget.style.background = '#f5f5f5'}>
            ←
          </button>
        )}
        <div>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '24px' }}>{editTenant ? `Administrar Empresa: ${editTenant.razon_social}` : 'Registrar Nueva Empresa'}</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>Configura los datos principales y las fincas asociadas.</p>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
        <button style={tabStyle(activeTab === 'basicos')} onClick={() => setActiveTab('basicos')}>
          Datos Básicos
        </button>
        <button 
          style={tabStyle(activeTab === 'fincas')} 
          onClick={() => {
            if (!isNew) setActiveTab('fincas');
          }}
          disabled={isNew}
          title={isNew ? 'Debes guardar la empresa primero' : ''}
        >
          Fincas
        </button>
        <button 
          style={tabStyle(activeTab === 'bodegas')} 
          onClick={() => {
            if (!isNew) setActiveTab('bodegas');
          }}
          disabled={isNew}
          title={isNew ? 'Debes guardar la empresa primero' : ''}
        >
          Bodegas
        </button>
        <button 
          style={tabStyle(activeTab === 'resoluciones')} 
          onClick={() => {
            if (!isNew) setActiveTab('resoluciones');
          }}
          disabled={isNew}
          title={isNew ? 'Debes guardar la empresa primero' : ''}
        >
          Resoluciones DIAN
        </button>
      </div>

      <div style={{ minHeight: '400px', animation: 'fadeIn 0.5s ease-in-out' }}>
        {activeTab === 'basicos' && (
          <TenantForm onBack={onBack} onSaved={onSaved} editTenant={editTenant} isEmbedded={true} />
        )}
        {activeTab === 'fincas' && !isNew && (
          <FincasTab tenantId={editTenant.id_tenant} />
        )}
        {activeTab === 'bodegas' && !isNew && (
          <BodegasTab tenantId={editTenant.id_tenant} />
        )}
        {activeTab === 'resoluciones' && !isNew && (
          <ResolucionesDIANTab tenantId={editTenant.id_tenant} />
        )}
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
