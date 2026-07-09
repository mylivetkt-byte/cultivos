// load-test/k6-test.js
// K6 load test for creating purchase orders.
// Simulates 50 virtual users for 30 seconds.

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3002';
const createOrderTrend = new Trend('create_order_duration');

export const options = {
  stages: [{ duration: '30s', target: 50 }], // 50 VUs for 30s
  thresholds: {
    'create_order_duration': ['p(90)<200'], // 90th percentile < 200ms
    'http_req_failed': ['rate<0.01'], // < 1% failed requests
  },
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function () {
  // Minimal payload to create an order (adjust fields as needed)
  const payload = JSON.stringify({
    id_tenant: 1,
    id_proveedor: 1,
    fecha_entrega_esperada: new Date().toISOString().slice(0, 10),
    detalles: [
      {
        id_insumo: 1,
        nombre: 'Insumo Test',
        cantidad: randomInt(1, 10),
        precio: randomInt(5, 20),
        subtotal: 0,
      },
    ],
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const res = http.post(`${BASE_URL}/api/compras/orden`, payload, params);
  createOrderTrend.add(res.timings.duration);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response has success': (r) => {
      try {
        const json = r.json();
        return json && json.success;
      } catch (e) {
        return false;
      }
    },
  });
  sleep(1);
}
