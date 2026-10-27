/**
 * STRESS TEST — encontrar el límite del sistema
 *
 * Sube la carga progresivamente hasta que el sistema
 * empieza a fallar o degradarse. Permite identificar
 * el punto de quiebre y cómo se recupera.
 *
 * Escenario:
 *   Sube de 0 a 50 VUs en escalones de 10,
 *   luego baja para verificar recuperación.
 */
import http from 'k6/http'
import { check, group, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'
import { BASE_URL, HEADERS, login, ensureTestUser } from '../lib/helpers.js'

const errorRate    = new Rate('error_rate')
const responseTime = new Trend('response_time', true)

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // nivel 1
    { duration: '30s', target: 10 },   // mantener
    { duration: '30s', target: 20 },   // nivel 2
    { duration: '30s', target: 20 },   // mantener
    { duration: '30s', target: 30 },   // nivel 3
    { duration: '30s', target: 30 },   // mantener
    { duration: '30s', target: 40 },   // nivel 4
    { duration: '30s', target: 40 },   // mantener
    { duration: '30s', target: 50 },   // nivel 5 — punto de estrés
    { duration: '1m',  target: 50 },   // sostener el estrés
    { duration: '30s', target: 0  },   // recuperación
  ],

  thresholds: {
    // En stress permitimos umbrales más altos que en load
    http_req_duration: ['p(95)<2000'],
    error_rate:        ['rate<0.10'],  // hasta 10% de errores es aceptable bajo estrés
    http_req_failed:   ['rate<0.10'],
  },
}

export function setup() {
  ensureTestUser()
}

export default function () {
  group('Endpoint más cargado: listado de productos', () => {
    const res = http.get(`${BASE_URL}/api/products`, { headers: HEADERS })
    responseTime.add(res.timings.duration)

    const ok = check(res, {
      'status 200 o 429':    (r) => r.status === 200 || r.status === 429,
      'no es error 5xx':     (r) => r.status < 500,
    })
    errorRate.add(!ok)
  })

  sleep(0.5)

  group('Login bajo carga', () => {
    const token = login()
    errorRate.add(token === null)
  })

  sleep(1)
}
