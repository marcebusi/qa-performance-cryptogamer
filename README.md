# qa-performance-cryptogamer

![k6](https://img.shields.io/badge/k6-Performance%20Testing-7D64FF?logo=k6)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-F7DF1E?logo=javascript)
![CI](https://github.com/marcebusi/qa-performance-cryptogamer/actions/workflows/performance.yml/badge.svg)

Proyecto 4 del portfolio de QA — Performance Testing con **k6**.

**Aplicación bajo prueba**: [cryptogamer-ecommerce](https://github.com/marcebusi/cryptogamer-ecommerce) — e-commerce de productos gaming (Node.js + Prisma + SQLite).

---

## Tipos de tests implementados

| Test | VUs máx | Duración | Objetivo |
|---|---|---|---|
| `01_smoke.js` | 1 | ~30s | Verificar que el sistema responde antes de cargar |
| `02_load.js` | 10 | ~3min | Carga normal sostenida |
| `03_stress.js` | 50 | ~6min | Encontrar el punto de quiebre |
| `04_spike.js` | 100 | ~1.5min | Pico repentino de tráfico |

---

## Conceptos clave de k6

### Virtual Users (VUs)
Usuarios simultáneos simulados. Cada VU ejecuta el script en un loop independiente.

### Stages
Define cómo cambia la carga en el tiempo:
```js
stages: [
  { duration: '30s', target: 10 },  // sube a 10 VUs en 30 segundos
  { duration: '2m',  target: 10 },  // mantiene 10 VUs por 2 minutos
  { duration: '20s', target: 0  },  // baja a 0
]
```

### Thresholds
Define qué es "pasar" el test. Si no se cumple, el test falla con código de salida no-cero:
```js
thresholds: {
  http_req_duration: ['p(95)<500'],  // 95% de requests < 500ms
  error_rate:        ['rate<0.01'],  // menos del 1% de errores
}
```

### Checks
Assertions por request (no detienen el test, afectan métricas):
```js
check(res, {
  'status 200':       (r) => r.status === 200,
  'tiene productos':  (r) => r.json('data').length > 0,
})
```

### Métricas custom
```js
const responseTime = new Trend('product_list_time', true)
responseTime.add(res.timings.duration)
```

---

## Prerequisitos

- [k6](https://k6.io/docs/get-started/installation/) instalado
- Backend corriendo en `http://localhost:3001`

### Instalar k6 en Windows
```bash
winget install k6 --source winget
```

---

## Cómo correr los tests

### Smoke (verificación básica)
```bash
k6 run tests/01_smoke.js
```

### Load (carga normal)
```bash
k6 run tests/02_load.js
```

### Stress (buscar el límite)
```bash
k6 run tests/03_stress.js
```

### Spike (pico repentino)
```bash
k6 run tests/04_spike.js
```

### Con variables de entorno personalizadas
```bash
k6 run -e BASE_URL=http://localhost:3001 -e TEST_USER_EMAIL=mi@email.com tests/01_smoke.js
```

### Guardar resultados en JSON
```bash
k6 run --out json=results/smoke.json tests/01_smoke.js
```

---

## Cómo interpretar los resultados

```
✓ GET /products: status 200
✓ GET /products: tiempo < 1000ms

http_req_duration............: avg=45ms   min=12ms   med=38ms   max=210ms  p(90)=89ms   p(95)=120ms
http_req_failed..............: 0.00%  ✓ 0  ✗ 47
```

- **avg** — promedio (no usar para decisiones, se distorsiona con outliers)
- **p(90)** — el 90% de requests tardó menos que este valor
- **p(95)** — umbral más usado en thresholds
- **http_req_failed** — porcentaje de requests con error HTTP

---

## CI/CD

El pipeline corre automáticamente en cada push:
- **Smoke** siempre
- **Load** en push a `main`
- **Cualquier test** manualmente via `workflow_dispatch`

---

## Proyectos relacionados

| # | Proyecto | Repo |
|---|---|---|
| 1 | E2E con Playwright + TypeScript | [qa-playwright-cryptogamer](https://github.com/marcebusi/qa-playwright-cryptogamer) |
| 2 | API Testing con Playwright + Newman | [qa-api-testing-cryptogamer](https://github.com/marcebusi/qa-api-testing-cryptogamer) |
| 3 | E2E con Robot Framework | [qa-robot-framework-cryptogamer](https://github.com/marcebusi/qa-robot-framework-cryptogamer) |
| 4 | Performance Testing con k6 | ← este repo |

---

## Autor

**Marcelo Busignani** — QA Engineer  
[LinkedIn](https://www.linkedin.com/in/marcelo-busignani/) · [GitHub](https://github.com/marcebusi)
