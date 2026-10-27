/**
 * SMOKE TEST de performance
 *
 * Objetivo: verificar que el sistema responde correctamente
 * con un solo usuario. Si este test falla, no tiene sentido
 * correr los tests de carga.
 *
 * 1 VU — 1 iteración — sin carga
 */
import http from 'k6/http'
import { check, group } from 'k6'
import { Trend, Rate } from 'k6/metrics'
import { BASE_URL, HEADERS, login, ensureTestUser } from '../lib/helpers.js'

// Métricas custom
const productListDuration = new Trend('product_list_duration', true)
const loginDuration        = new Trend('login_duration', true)
const errorRate            = new Rate('error_rate')

export const options = {
  vus: 1,
  iterations: 1,

  thresholds: {
    // Ningún endpoint debe superar 1 segundo en smoke
    http_req_duration: ['p(95)<1000'],
    error_rate:        ['rate<0.01'],
  },
}

export function setup() {
  ensureTestUser()
}

export default function () {
  group('Productos públicos', () => {
    const res = http.get(`${BASE_URL}/api/products`, { headers: HEADERS })
    productListDuration.add(res.timings.duration)

    const ok = check(res, {
      'GET /products: status 200':           (r) => r.status === 200,
      'GET /products: tiene campo data':     (r) => r.json('data') !== undefined,
      'GET /products: data es array':        (r) => Array.isArray(r.json('data')),
      'GET /products: al menos 1 producto':  (r) => r.json('data').length > 0,
      'GET /products: tiempo < 1000ms':      (r) => r.timings.duration < 1000,
    })
    errorRate.add(!ok)
  })

  group('Autenticación', () => {
    const start = Date.now()
    const token = login()
    loginDuration.add(Date.now() - start)

    check(token, {
      'POST /login: devuelve token': (t) => t !== null,
    })
    errorRate.add(token === null)

    if (token) {
      group('Endpoint protegido /me', () => {
        const res = http.get(`${BASE_URL}/api/auth/me`, {
          headers: { ...HEADERS, Authorization: `Bearer ${token}` },
        })
        const ok = check(res, {
          'GET /me: status 200':           (r) => r.status === 200,
          'GET /me: tiene email':          (r) => r.json('email') !== undefined,
          'GET /me: no expone password':   (r) => r.json('password') === undefined,
        })
        errorRate.add(!ok)
      })

      group('Órdenes del usuario', () => {
        const res = http.get(`${BASE_URL}/api/orders/me`, {
          headers: { ...HEADERS, Authorization: `Bearer ${token}` },
        })
        const ok = check(res, {
          'GET /orders/me: status 200':    (r) => r.status === 200,
          'GET /orders/me: es array':      (r) => Array.isArray(r.json()),
        })
        errorRate.add(!ok)
      })
    }
  })

  group('Producto individual', () => {
    // Primero obtenemos un id real
    const listRes = http.get(`${BASE_URL}/api/products?pageSize=1`, { headers: HEADERS })
    const data = listRes.json('data')
    if (data && data.length > 0) {
      const id = data[0].id
      const res = http.get(`${BASE_URL}/api/products/${id}`, { headers: HEADERS })
      const ok = check(res, {
        'GET /products/:id: status 200':   (r) => r.status === 200,
        'GET /products/:id: tiene nombre': (r) => r.json('data.name') !== undefined || r.json('name') !== undefined,
      })
      errorRate.add(!ok)
    }
  })
}
