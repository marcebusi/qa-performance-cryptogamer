import http from 'k6/http'
import { check } from 'k6'

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001'

export const HEADERS = {
  'Content-Type': 'application/json',
}

export const TEST_USER = {
  email: __ENV.TEST_USER_EMAIL || 'testuser@cryptogamer.test',
  password: __ENV.TEST_USER_PASSWORD || 'TestPass123!',
}

/**
 * Obtiene un token JWT haciendo login.
 * Retorna el token o null si falla.
 */
export function login() {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify(TEST_USER),
    { headers: HEADERS }
  )

  const ok = check(res, {
    'login: status 200': (r) => r.status === 200,
    'login: tiene token': (r) => r.json('token') !== undefined,
  })

  if (!ok) return null
  return res.json('token')
}

/**
 * Headers con autorización para endpoints protegidos.
 */
export function authHeaders(token) {
  return {
    ...HEADERS,
    Authorization: `Bearer ${token}`,
  }
}

/**
 * Registra el usuario de prueba si no existe.
 * Llamar una vez en setup().
 */
export function ensureTestUser() {
  const res = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify({ name: 'Performance Test User', ...TEST_USER }),
    { headers: HEADERS }
  )
  // 201 = creado, 409 = ya existe — ambos son OK
  return res.status === 201 || res.status === 409
}
