import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import schema from './schema';
import Finca from './models/Finca';
import VisitaTecnica from './models/VisitaTecnica';
import VisitaTecnicaDetalle from './models/VisitaTecnicaDetalle';
// Import other models (Potrero, Estanque, etc.) when created

const adapter = new SQLiteAdapter({
  schema,
  // (optional) dbName: 'sas_agricolas_db',
  // (optional) jsi: true, /* Enable JSI for faster performance on modern React Native */
  onSetUpError: error => {
    console.error("Error setting up WatermelonDB:", error);
  }
});

export const database = new Database({
  adapter,
  modelClasses: [
    Finca,
    VisitaTecnica,
    VisitaTecnicaDetalle,
    // Potrero,
    // Estanque
  ],
});
