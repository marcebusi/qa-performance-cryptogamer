/**
 * SPIKE TEST — pico repentino de tráfico
 *
 * Simula un evento inesperado: una campaña viral, un
 * lanzamiento de producto o un ataque de tráfico.
 * El sistema pasa de 0 a 100 usuarios en segundos.
 *
 * Preguntas que responde:
 * - ¿El sistema se rompe bajo un pico repentino?
 * - ¿Se recupera cuando el pico termina?
 * - ¿Cuánto tarda en volver a responder normalmente?
 */
import http from 'k6/http'
import { check, group, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'
import { BASE_URL, HEADERS, ensureTestUser } from '../lib/helpers.js'

const errorRate      = new Rate('error_rate')
const spikeResponse  = new Trend('spike_response_time', true)

export const options = {
  stages: [
    { duration: '10s', target: 1   },  // línea base — 1 usuario
    { duration: '10s', target: 1   },  // steady
    { duration: '5s',  target: 100 },  // PICO — 100 usuarios en 5 segundos
    { duration: '30s', target: 100 },  // sostener el pico
    { duration: '10s', target: 1   },  // caída repentina
    { duration: '30s', target: 1   },  // recuperación
  ],

  thresholds: {
    // Durante el pico aceptamos degradación, pero no caída total
    http_req_failed: ['rate<0.20'],    // hasta 20% de errores durante el pico
    error_rate:      ['rate<0.20'],
  },
}

export function setup() {
  ensureTestUser()
}

export default function () {
  group('Pico en endpoint público', () => {
    const res = http.get(`${BASE_URL}/api/products`, { headers: HEADERS })
    spikeResponse.add(res.timings.duration)

    const ok = check(res, {
      'no es error 5xx':       (r) => r.status < 500,
      'responde algo':         (r) => r.status > 0,
    })
    errorRate.add(!ok)

    // Log del tiempo durante el pico para análisis posterior
    if (res.timings.duration > 2000) {
      console.log(`⚠️  Respuesta lenta: ${res.timings.duration}ms (VU: ${__VU}, iter: ${__ITER})`)
    }
  })

  sleep(0.3)
}
