/**
 * LOAD TEST — carga normal
 *
 * Simula el tráfico esperado en condiciones normales.
 * Objetivo: verificar que el sistema mantiene tiempos
 * de respuesta aceptables bajo uso cotidiano.
 *
 * Escenario:
 *   0 → 10 VUs en 30s (ramp up)
 *   10 VUs durante 2 minutos (steady state)
 *   10 → 0 VUs en 20s (ramp down)
 */
import http from 'k6/http'
import { check, group, sleep } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'
import { BASE_URL, HEADERS, login, ensureTestUser } from '../lib/helpers.js'

const errorRate         = new Rate('error_rate')
const productListTime   = new Trend('product_list_time', true)
const loginTime         = new Trend('login_time', true)
const requestsTotal     = new Counter('requests_total')

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // ramp up
    { duration: '2m',  target: 10 },   // carga sostenida
    { duration: '20s', target: 0  },   // ramp down
  ],

  thresholds: {
    // El 95% de las requests deben responder en menos de 500ms
    http_req_duration:  ['p(95)<500'],
    // El 99% en menos de 1 segundo
    'http_req_duration{group:::Productos públicos}': ['p(99)<1000'],
    // Tasa de error menor al 1%
    error_rate:         ['rate<0.01'],
    // Menos del 5% de requests fallidas (código HTTP)
    http_req_failed:    ['rate<0.05'],
  },
}

export function setup() {
  ensureTestUser()
}

export default function () {
  // Cada VU simula un usuario navegando el sitio
  group('Productos públicos', () => {
    const start = Date.now()
    const res = http.get(`${BASE_URL}/api/products`, { headers: HEADERS })
    productListTime.add(Date.now() - start)
    requestsTotal.add(1)

    const ok = check(res, {
      'status 200':          (r) => r.status === 200,
      'tiene productos':     (r) => Array.isArray(r.json('data')) && r.json('data').length > 0,
      'responde < 500ms':    (r) => r.timings.duration < 500,
    })
    errorRate.add(!ok)
  })

  sleep(1) // pausa entre acciones (simula usuario real)

  group('Búsqueda de productos', () => {
    const res = http.get(`${BASE_URL}/api/products?search=xbox&pageSize=5`, { headers: HEADERS })
    requestsTotal.add(1)

    const ok = check(res, {
      'status 200':       (r) => r.status === 200,
      'tiene paginación': (r) => r.json('total') !== undefined,
    })
    errorRate.add(!ok)
  })

  sleep(1)

  group('Login de usuario', () => {
    const start = Date.now()
    const token = login()
    loginTime.add(Date.now() - start)
    requestsTotal.add(1)
    errorRate.add(token === null)

    if (token) {
      sleep(0.5)

      group('Ver mis órdenes', () => {
        const res = http.get(`${BASE_URL}/api/orders/me`, {
          headers: { ...HEADERS, Authorization: `Bearer ${token}` },
        })
        requestsTotal.add(1)

        const ok = check(res, {
          'status 200':   (r) => r.status === 200,
          'es array':     (r) => Array.isArray(r.json()),
        })
        errorRate.add(!ok)
      })
    }
  })

  sleep(2) // pausa antes de la siguiente iteración
}
