// src/server/utils/geo.js
// Convierte un objeto GeoJSON (Polygon o MultiPolygon) a WKT compatible con MySQL GEOMETRY
// Utiliza la librería 'wellknown' que ya está en el proyecto (se agregó en etapas previas).
import wellknown from 'wellknown';

/**
 * Convierte geometría GeoJSON a texto WKT.
 * @param {object} geojson - Objeto GeoJSON válido (Polygon, MultiPolygon, Point, etc.)
 * @returns {string} WKT string
 */
export function geometryFromGeoJSON(geojson) {
  try {
    const wkt = wellknown.stringify(geojson);
    if (!wkt) throw new Error('Conversión a WKT falló');
    return wkt;
  } catch (err) {
    console.error('Error converting GeoJSON to WKT:', err);
    throw err;
  }
}
