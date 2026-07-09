import React from 'react';
import LogoUploader from './LogoUploader';
import WaterManagement from '../pages/WaterManagement.jsx';
import DynamicCatalog from './DynamicCatalog';
// import other components as needed

export default function TableRenderer({ selectedTable, tenantId, selectedFinca, selectedNucleo }) {
  switch (selectedTable) {
    case 'config_logo':
      return <LogoUploader />;
    case 'agua':
      return <WaterManagement tenantId={tenantId} fincaId={selectedFinca} nucleoId={selectedNucleo} />;
    // Add more cases as needed, fallback to DynamicCatalog
    default:
      return (
        <DynamicCatalog
          tenantId={tenantId}
          tableName={selectedTable}
          key={selectedTable}
          fincaId={selectedFinca}
          nucleoId={selectedNucleo}
        />
      );
  }
}
