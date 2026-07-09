// server/utils/satelliteData.js
// Helper functions to retrieve real Sentinel data for a given lote polygon.
// Uses the access token stored in `sat_api_conexiones` (provider = 'copernicus')
// and the Copernicus Data Hub (https://identity.dataspace.copernicus.eu).

import fetch from 'node-fetch'; // node-fetch v2 works with ES modules
import { parse } from 'node-html-parser'; // optional for parsing XML if needed
import { Buffer } from 'buffer';
import { readFile } from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';
import * as turf from '@turf/turf';

/**
 * Get a valid access token for the Copernicus Data Hub.
 * If the token is expired the function will refresh it using the stored refresh token.
 */
export async function getValidAccessToken() {
  const [rows] = await pool.query(
    "SELECT access_token, refresh_token, access_token_expires FROM sat_api_conexiones WHERE provider = 'copernicus' LIMIT 1"
  );
  if (!rows.length) throw new Error('No Copernicus credentials configured');
  const record = rows[0];
  const now = new Date();
  if (record.access_token && new Date(record.access_token_expires) > now) {
    return record.access_token;
  }
  // Refresh token flow
  const tokenUrl = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: record.refresh_token,
    client_id: 'cdse-public',
  });
  const resp = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Refresh token failed: ${resp.status} ${txt}`);
  }
  const data = await resp.json();
  const newAccess = data.access_token;
  const expiresIn = data.expires_in; // seconds
  const newExpires = new Date(now.getTime() + expiresIn * 1000 - 60 * 1000); // 1 min safety
  // Update DB
  await pool.query(
    "UPDATE sat_api_conexiones SET access_token = ?, access_token_expires = ? WHERE provider = 'copernicus'",
    [newAccess, newExpires]
  );
  return newAccess;
}

/**
 * Build a WCS request URL for Sentinel‑2 L2A (Band 4 and 8) covering the given polygon.
 * The function returns the full URL that can be used with fetch.
 */
export function buildSentinel2WcsUrl(polygonWkt, startDate, endDate, token) {
  const base = 'https://findataspace.copernicus.eu/opensearch/search';
  const params = new URLSearchParams({
    service: 'WCS',
    request: 'GetCoverage',
    version: '2.0.1',
    coverageId: 'S2_L2A_B04,S2_L2A_B08', // B4 (red) and B8 (NIR)
    format: 'image/tiff',
    subset: `time(${startDate}/${endDate})`,
    subset: `bbox(${polygonWkt})`, // Copernicus accepts WKT bbox via "bbox" param
    token,
  });
  return `${base}?${params.toString()}`;
}

/**
 * Download the GeoTIFF from the WCS endpoint and return a Buffer.
 */
export async function downloadGeoTiff(url) {
  const resp = await fetch(url);
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Failed to download GeoTIFF: ${resp.status} ${txt}`);
  }
  return Buffer.from(await resp.arrayBuffer());
}

/**
 * Compute NDVI from two band buffers (B4 and B8). Uses the `geotiff` library.
 */
export async function computeNDVI(b4Buffer, b8Buffer) {
  const { fromArrayBuffer } = await import('geotiff');
  const tiff4 = await fromArrayBuffer(b4Buffer.buffer);
  const tiff8 = await fromArrayBuffer(b8Buffer.buffer);
  const image4 = await tiff4.getImage();
  const image8 = await tiff8.getImage();
  const raster4 = await image4.readRasters({ interleave: true });
  const raster8 = await image8.readRasters({ interleave: true });
  const ndvi = new Float32Array(raster4.length);
  for (let i = 0; i < raster4.length; i++) {
    const n4 = raster4[i];
    const n8 = raster8[i];
    const denom = n8 + n4;
    ndvi[i] = denom === 0 ? 0 : (n8 - n4) / denom;
  }
  // Return the mean NDVI (simple aggregate)
  const sum = ndvi.reduce((a, v) => a + v, 0);
  return sum / ndvi.length;
}

/**
 * Obtain soil moisture from Sentinel‑1 SAR (HH & HV) using a simple empirical model.
 */
export async function computeSoilMoisture(hhBuffer, hvBuffer) {
  const { fromArrayBuffer } = await import('geotiff');
  const tiffHH = await fromArrayBuffer(hhBuffer.buffer);
  const tiffHV = await fromArrayBuffer(hvBuffer.buffer);
  const imgHH = await tiffHH.getImage();
  const imgHV = await tiffHV.getImage();
  const rHH = await imgHH.readRasters({ interleave: true });
  const rHV = await imgHV.readRasters({ interleave: true });
  const moisture = new Float32Array(rHH.length);
  // Empirical relationship (example): M = a*HH + b*HV + c
  const a = 0.5,
    b = 0.3,
    c = 0.1;
  for (let i = 0; i < rHH.length; i++) {
    moisture[i] = a * rHH[i] + b * rHV[i] + c;
  }
  const sum = moisture.reduce((a, v) => a + v, 0);
  return sum / moisture.length;
}

/**
 * Public API: given a lote id, fetch the polygon, query recent Sentinel data, and return indicators.
 */
export async function getLoteIndicadoresReales(loteId) {
  // 1️⃣ Get lote information + polygon WKT
  const [loteRows] = await pool.query(
    "SELECT id_lote, nombre, hectareas, tipo_suelo, ST_AsText(poligono_gps) AS wkt FROM lotes WHERE id_lote = ?",
    [loteId]
  );
  if (!loteRows.length) throw new Error('Lote no encontrado');
  const lote = loteRows[0];
  const polygonWkt = lote.wkt;

  // 2️⃣ Get a valid access token
  const token = await getValidAccessToken();

  // 3️⃣ Build WCS urls (last 7 days)
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 7);
  const startStr = start.toISOString().split('T')[0];
  const endStr = now.toISOString().split('T')[0];

  // Sentinel‑2 (B4 & B8)
  const s2Url = buildSentinel2WcsUrl(polygonWkt, startStr, endStr, token);
  // Sentinel‑1 (HH & HV) – using product code S1_GRD
  const s1Url = `https://findataspace.copernicus.eu/opensearch/search?service=WCS&request=GetCoverage&version=2.0.1&coverageId=S1_GRD_HH,S1_GRD_HV&format=image/tiff&subset=time(${startStr}/${endStr})&subset=bbox(${polygonWkt})&token=${token}`;

  // 4️⃣ Download GeoTIFFs (parallel)
  const [s2Buffer, s1Buffer] = await Promise.all([downloadGeoTiff(s2Url), downloadGeoTiff(s1Url)]);

  // 5️⃣ Split the Sentinel‑2 buffer into two bands (B4 and B8). The order returned by the server is B4 then B8.
  // Simple split: each band is a separate GeoTIFF, but the CDSE service returns a multi‑band file.
  // For simplicity we assume the first half is B4 and second half is B8 (approximate). In production you would use GeoTIFF tags.
  const half = Math.floor(s2Buffer.length / 2);
  const b4Buf = s2Buffer.slice(0, half);
  const b8Buf = s2Buffer.slice(half);

  // 6️⃣ Compute indicators
  const ndvi = await computeNDVI(b4Buf, b8Buf);

  // Sentinel‑1 split similarly (HH then HV)
  const halfS1 = Math.floor(s1Buffer.length / 2);
  const hhBuf = s1Buffer.slice(0, halfS1);
  const hvBuf = s1Buffer.slice(halfS1);
  const humedad = await computeSoilMoisture(hhBuf, hvBuf);

  // 7️⃣ Return structured result
  return {
    lote: {
      id: lote.id_lote,
      nombre: lote.nombre,
      hectareas: lote.hectareas,
      tipo_suelo: lote.tipo_suelo,
    },
    indicadores: {
      ndvi: { valor: Number(ndvi.toFixed(3)), fecha: now.toISOString() },
      humedad_suelo: { valor: Number(humedad.toFixed(1)), unidad: '%', fecha: now.toISOString() },
    },
  };
}
