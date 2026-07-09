import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'fincas',
      columns: [
        { name: 'nombre', type: 'string' },
        { name: 'id_tenant', type: 'number', isOptional: true },
        { name: 'updated_at', type: 'number' } // We store Unix timestamp of last update
      ]
    }),
    tableSchema({
      name: 'ganado_potreros',
      columns: [
        { name: 'codigo', type: 'string' },
        { name: 'nombre', type: 'string' },
        { name: 'id_finca', type: 'number' },
        { name: 'updated_at', type: 'number' }
      ]
    }),
    tableSchema({
      name: 'acuicola_estanques',
      columns: [
        { name: 'codigo', type: 'string' },
        { name: 'id_finca', type: 'number' },
        { name: 'area_m2', type: 'number', isOptional: true },
        { name: 'updated_at', type: 'number' }
      ]
    }),
    tableSchema({
      name: 'visitas_tecnicas',
      columns: [
        { name: 'id_finca', type: 'number' },
        { name: 'modulo', type: 'string' },
        { name: 'fecha_visita', type: 'number' },
        { name: 'latitud', type: 'number', isOptional: true },
        { name: 'longitud', type: 'number', isOptional: true },
        { name: 'firma_digital', type: 'string', isOptional: true },
        { name: 'hash_auditoria', type: 'string', isOptional: true },
        { name: 'observaciones_generales', type: 'string', isOptional: true },
        { name: 'updated_at', type: 'number' },
        // WatermelonDB uses 'id' automatically, but here we flag if it needs sync
        { name: '_status', type: 'string', isOptional: true }
      ]
    }),
    tableSchema({
      name: 'visitas_tecnicas_detalles',
      columns: [
        { name: 'id_visita_uuid', type: 'string' }, // We use UUID to link offline
        { name: 'id_origen', type: 'number' },
        { name: 'tabla_origen', type: 'string' },
        { name: 'diagnostico', type: 'string', isOptional: true },
        { name: 'tratamiento', type: 'string', isOptional: true },
        { name: 'recomendaciones', type: 'string', isOptional: true },
        { name: 'updated_at', type: 'number' }
      ]
    })
  ]
});
