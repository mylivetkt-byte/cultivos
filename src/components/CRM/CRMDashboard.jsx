import React, { useState } from 'react';
import TercerosDashboard from './TercerosDashboard';
import TerceroProfile from './TerceroProfile';

function CRMDashboard({ tenantId }) {
  const [selectedTerceroId, setSelectedTerceroId] = useState(null);

  if (selectedTerceroId) {
    return (
      <TerceroProfile 
        tenantId={tenantId} 
        terceroId={selectedTerceroId} 
        onBack={() => setSelectedTerceroId(null)} 
      />
    );
  }

  return (
    <TercerosDashboard 
      tenantId={tenantId} 
      onSelectTercero={setSelectedTerceroId} 
    />
  );
}

export default CRMDashboard;
