/**
 * @jest-environment node
 */
import request from 'supertest';
import app from '../../server/index.js'; // El export default que agregamos
import pool from '../../server/db.js';

describe('API de Facturación POS', () => {
  // Limpiamos o mockeamos antes de las pruebas si es necesario.
  // Por seguridad, este test probará el endpoint general y simulará fallos (timeouts)
  // para no ensuciar la BD, o validará reglas puras.

  it('Debe rechazar una emisión DIAN sin credenciales válidas (Prueba de Seguridad)', async () => {
    const payloadVenta = {
      total: 1000,
      cliente: 'Consumidor Final',
      items: [{ id: 1, nombre: 'Abono', qty: 1, price: 1000 }]
    };

    // Probamos el endpoint de la DIAN protegido. Esperamos un 401 si no hay token.
    const res = await request(app)
      .post('/api/dian/emitir')
      .send(payloadVenta)
      .set('Accept', 'application/json');

    expect(res.status).toBe(401); 
    expect(res.body.error).toMatch(/Acceso denegado/i);
  });

  // Idealmente, se testean los flujos con tokens mockeados, pero
  // aseguramos que Supertest + Express levante bien.
  it('El Healthcheck del servidor debe retornar 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  afterAll(async () => {
    // Cerramos el pool de DB para que Jest pueda salir limpiamente
    await pool.end();
  });
});
