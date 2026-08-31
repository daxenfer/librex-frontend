#!/usr/bin/env node
// Driver de Librex: maneja la app corriendo a través de su API real (HTTP + JWT).
// No es la suite de tests — habla con los dos servidores levantados, igual que el navegador.
//
//   node .claude/skills/run-librex/driver.mjs health
//   node .claude/skills/run-librex/driver.mjs smoke
//   node .claude/skills/run-librex/driver.mjs seed
//   node .claude/skills/run-librex/driver.mjs clean
//   node .claude/skills/run-librex/driver.mjs api GET /api/reports/unlinked-returns
//
// Todo lo que crea lleva el prefijo [E2E] en el nombre, para que `clean` lo encuentre.

const API = process.env.LIBREX_API ?? 'http://localhost:5176'
const WEB = process.env.LIBREX_WEB ?? 'http://localhost:5173'
const USER = process.env.LIBREX_USER ?? 'admin'
const PASS = process.env.LIBREX_PASS ?? 'Admin1234'
const TAG = '[E2E]'

let token = ''
let pass = 0, fail = 0

const ok = (cond, label, extra = '') => {
  console.log(`${cond ? '  PASS ' : '  FALLO'}  ${label}${extra ? ' — ' + extra : ''}`)
  cond ? pass++ : fail++
  return cond
}
const money = n => `$${Number(n).toFixed(2)}`
const iso = ms => new Date(ms).toISOString()
const day = n => iso(Date.now() + n * 86400000)

async function api(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  return { status: res.status, data }
}

async function must(method, path, body, what) {
  const r = await api(method, path, body)
  if (r.status >= 300) {
    console.error(`\nNo se pudo ${what}: HTTP ${r.status}\n${JSON.stringify(r.data).slice(0, 400)}`)
    process.exit(1)
  }
  return r.data
}

async function login() {
  const r = await api('POST', '/api/auth/login', { username: USER, password: PASS })
  if (r.status !== 200) {
    console.error(`Login falló (${r.status}). ¿Está el backend en ${API} y sembrado el usuario?`)
    process.exit(1)
  }
  token = r.data.token ?? r.data.Token
}

/* ── health ─────────────────────────────────────────────────────────── */

async function health() {
  // connection: close evita que undici deje el pool abierto; con keep-alive, salir aquí
  // dispara una aserción de libuv en Windows (UV_HANDLE_CLOSING).
  const ping = url => fetch(url, { headers: { connection: 'close' } })
    .then(r => r.status).catch(() => 0)
  const b = await ping(`${API}/api/health`)
  ok(b === 200, `backend ${API}`, b ? `HTTP ${b}` : 'sin respuesta')
  const f = await ping(WEB)
  ok(f === 200, `frontend ${WEB}`, f ? `HTTP ${f}` : 'sin respuesta')
}

/* ── siembra ────────────────────────────────────────────────────────── */

// Dos clientes con remisión propia: hace falta un "otro cliente" para probar
// las guardas de consistencia.
async function seedFixture() {
  const supplier = await must('POST', '/api/suppliers',
    { name: `${TAG} Proveedor`, contact: 'Contacto', phone: '8110000000', email: 'e2e@proveedor.test' },
    'crear proveedor')
  const product = await must('POST', '/api/products',
    { name: `${TAG} Libro`, isbn: '978E2E', unitType: 'Unidad', supplierId: supplier.id },
    'crear producto')
  const mkCustomer = name => must('POST', '/api/customers',
    { name, contact: 'Director', address: 'Calle 1', postalCode: '64000', phone: '8112345678', city: 'Monterrey' },
    'crear cliente')
  const customerA = await mkCustomer(`${TAG} Escuela A`)
  const customerB = await mkCustomer(`${TAG} Escuela B`)

  const mkRemission = customerId => must('POST', '/api/remissions', {
    customerId, deliveryDate: day(0), paymentDueDate: day(30), returnDueDate: day(60),
    returnPercentage: 0, discountAmount: 0,
    details: [{ productId: product.id, quantity: 10, unitPrice: 100 }],
  }, 'crear remisión')

  return {
    supplier, product, customerA, customerB,
    remissionA: await mkRemission(customerA.id),
    remissionB: await mkRemission(customerB.id),
  }
}

// El borrado es lógico y en cascada: tumbar al cliente arrastra sus documentos.
async function clean(quiet = false) {
  const byTag = list => list.filter(x => x.name?.startsWith(TAG))
  const groups = [
    ['customers', byTag((await api('GET', '/api/customers')).data ?? [])],
    ['products', byTag((await api('GET', '/api/products')).data ?? [])],
    ['suppliers', byTag((await api('GET', '/api/suppliers')).data ?? [])],
  ]
  let n = 0
  for (const [resource, items] of groups) {
    for (const item of items) {
      const r = await api('DELETE', `/api/${resource}/${item.id}`)
      if (r.status === 204) n++
      else console.warn(`  aviso: DELETE /api/${resource}/${item.id} -> ${r.status}`)
    }
  }
  if (!quiet) console.log(`Limpieza: ${n} registros ${TAG} eliminados (borrado lógico).`)
  return n
}

/* ── smoke ──────────────────────────────────────────────────────────── */

async function smoke() {
  await clean(true) // por si una corrida anterior murió a medias
  const f = await seedFixture()
  console.log(`Siembra lista: remisión A N° ${f.remissionA.folioFormatted}, B N° ${f.remissionB.folioFormatted}\n`)

  console.log('[1] getById resuelve los renglones; la lista NO')
  const full = (await api('GET', `/api/remissions/${f.remissionA.id}`)).data
  ok(full.details?.length === 1, 'getById trae los renglones')
  ok(!!full.details[0].productName, 'trae productName', full.details[0].productName)
  ok(!!full.details[0].supplierName, 'trae supplierName', full.details[0].supplierName)
  const fromList = (await api('GET', '/api/remissions')).data.find(r => r.id === f.remissionA.id)
  ok(!fromList.details?.[0]?.productName,
    'el endpoint de LISTA no puebla productName (por eso los formularios usan getById)')

  console.log('\n[2] Devolución ligada: insumos del tope de cantidad')
  await must('POST', '/api/returns', {
    customerId: f.customerA.id, remissionId: f.remissionA.id, date: iso(Date.now()), discount: 0,
    details: [{ productId: f.product.id, quantity: 3, unitPrice: 100 }],
  }, 'crear devolución ligada')
  const already = ((await api('GET', '/api/returns')).data ?? [])
    .filter(n => n.remissionId === f.remissionA.id)
    .flatMap(n => n.details).filter(d => d.productId === f.product.id)
    .reduce((s, d) => s + d.quantity, 0)
  ok(already === 3, `"ya devueltas" calculable desde /api/returns: ${already} de 10`)

  const supBefore = (await api('GET', `/api/reports/by-supplier?supplierId=${f.supplier.id}`)).data
  const prodBefore = (await api('GET', `/api/reports/sales-by-product?supplierId=${f.supplier.id}`)).data

  console.log('\n[3] Sin remisión hace falta motivo')
  const noReason = await api('POST', '/api/returns', {
    customerId: f.customerA.id, date: iso(Date.now()), discount: 0,
    details: [{ productId: f.product.id, quantity: 1, unitPrice: 100 }],
  })
  ok(noReason.status === 400, `sin motivo -> ${noReason.status}`)
  ok(/motivo/i.test(JSON.stringify(noReason.data)), 'el mensaje pide el motivo')

  const withReason = await api('POST', '/api/returns', {
    customerId: f.customerA.id, date: iso(Date.now()),
    unlinkedReason: 'Material de muestra que nunca se facturó', discount: 0,
    details: [{ productId: f.product.id, quantity: 2, unitPrice: 100 }],
  })
  ok(withReason.status === 201, `con motivo -> ${withReason.status}`)
  ok(withReason.data?.unlinkedReason?.includes('muestra'), 'guardó el motivo')

  console.log('\n[4] Guardas: nada se liga a la remisión de otro cliente')
  const crossedReturn = await api('POST', '/api/returns', {
    customerId: f.customerB.id, remissionId: f.remissionA.id, date: iso(Date.now()), discount: 0,
    details: [{ productId: f.product.id, quantity: 1, unitPrice: 100 }],
  })
  ok(crossedReturn.status === 400 && typeof crossedReturn.data?.error === 'string',
    'devolución cruzada -> 400 { error }', crossedReturn.data?.error ?? '')
  const crossedPayment = await api('POST', '/api/payments', {
    customerId: f.customerB.id, date: iso(Date.now()), amount: 100, paymentMethod: 'Efectivo',
    allocations: [{ remissionId: f.remissionA.id, amount: 100 }],
  })
  ok(crossedPayment.status === 400 && typeof crossedPayment.data?.error === 'string',
    'pago cruzado -> 400 { error }', crossedPayment.data?.error ?? '')

  console.log('\n[5] Reportes: lo suelto se separa de lo ligado')
  const unlinked = (await api('GET', '/api/reports/unlinked-returns')).data
  const row = unlinked.rows.find(r => r.customerId === f.customerA.id)
  ok(!!row && row.noteCount === 1, 'la nota suelta aparece; la ligada no')
  ok(row?.unlinkedAmount === 200, `importe ${money(row?.unlinkedAmount ?? 0)}`)
  const supAfter = (await api('GET', `/api/reports/by-supplier?supplierId=${f.supplier.id}`)).data
  ok(supAfter.totals.totalReturns === supBefore.totals.totalReturns,
    `saldo por proveedor NO la incluye (${money(supAfter.totals.totalReturns)})`)
  const prodAfter = (await api('GET', `/api/reports/sales-by-product?supplierId=${f.supplier.id}`)).data
  ok(prodAfter.grandTotalReturned === prodBefore.grandTotalReturned + 2,
    `cantidades SÍ la cuenta (${prodBefore.grandTotalReturned} -> ${prodAfter.grandTotalReturned})`)

  console.log('\n[6] Pago: aplicado vs anticipo')
  const payment = await must('POST', '/api/payments', {
    customerId: f.customerA.id, date: iso(Date.now()), amount: 500, paymentMethod: 'Efectivo',
    allocations: [{ remissionId: f.remissionA.id, amount: 200 }],
  }, 'crear pago')
  ok(payment.appliedAmount === 200 && payment.unappliedAmount === 300,
    `aplicado ${money(payment.appliedAmount)}, anticipo ${money(payment.unappliedAmount)}`)

  console.log('\n[7] Borrado lógico: eliminar un producto NO mutila la remisión')
  const totalBefore = (await api('GET', `/api/remissions/${f.remissionA.id}`)).data.total
  ok((await api('DELETE', `/api/products/${f.product.id}`)).status === 204, 'producto eliminado')
  const afterDelete = (await api('GET', `/api/remissions/${f.remissionA.id}`)).data
  ok(afterDelete.total === totalBefore, `total intacto (${money(totalBefore)})`)
  ok(afterDelete.details.every(d => d.productName), 'los renglones conservan el nombre del producto')
  ok((await api('GET', '/api/products')).data.every(p => p.id !== f.product.id),
    'el producto ya no aparece en el catálogo')

  console.log('\n[8] Los folios eliminados quedan quemados')
  const nextBefore = (await api('GET', '/api/remissions')).data
    .reduce((m, r) => Math.max(m, r.folioNumber), 0)
  await api('DELETE', `/api/customers/${f.customerB.id}`)
  const probe = await must('POST', '/api/remissions', {
    customerId: f.customerA.id, deliveryDate: day(0), paymentDueDate: day(30), returnDueDate: day(60),
    returnPercentage: 0, discountAmount: 0,
    details: [{ productId: (await api('GET', '/api/products')).data[0]?.id ?? 1, quantity: 1, unitPrice: 1 }],
  }, 'crear remisión de sondeo').catch(() => null)
  if (probe) ok(probe.folioNumber > nextBefore, `folio ${probe.folioNumber} > ${nextBefore} (no se reutiliza)`)

  console.log('\n[limpieza]')
  await clean()
  const left = (await api('GET', '/api/customers')).data.filter(c => c.name.startsWith(TAG))
  ok(left.length === 0, 'no quedaron registros [E2E] activos')

  console.log(`\n══ ${pass} correctas, ${fail} fallidas ══`)
  return fail === 0
}

/* ── main ───────────────────────────────────────────────────────────── */

const [cmd, ...rest] = process.argv.slice(2)

switch (cmd) {
  // process.exitCode en vez de process.exit(): salir de golpe con sockets vivos revienta
  // libuv en Windows. Node cierra solo cuando el pool se drena.
  case 'health':
    await health()
    process.exitCode = fail ? 1 : 0
    break

  case 'smoke':
    await login()
    process.exitCode = (await smoke()) ? 0 : 1
    break

  case 'seed': {
    await login()
    const f = await seedFixture()
    console.log(`Datos ${TAG} listos para navegar la UI en ${WEB}:`)
    console.log(`  clientes: ${f.customerA.name} (id ${f.customerA.id}), ${f.customerB.name}`)
    console.log(`  remisiones: N° ${f.remissionA.folioFormatted}, N° ${f.remissionB.folioFormatted} (10 pzas · $100 c/u)`)
    console.log(`  producto: ${f.product.name} · proveedor: ${f.supplier.name}`)
    console.log(`\nAl terminar: node .claude/skills/run-librex/driver.mjs clean`)
    break
  }

  case 'clean':
    await login()
    await clean()
    break

  case 'api': {
    const [method, path, ...body] = rest
    if (!method || !path) { console.error('uso: api <METHOD> <path> [json]'); process.exit(1) }
    await login()
    const r = await api(method.toUpperCase(), path, body.length ? JSON.parse(body.join(' ')) : undefined)
    console.log(`HTTP ${r.status}`)
    console.log(JSON.stringify(r.data, null, 2))
    process.exitCode = r.status >= 400 ? 1 : 0
    break
  }

  default:
    console.log(`Driver de Librex — maneja la app corriendo vía su API.

  health                 ¿responden backend (${API}) y frontend (${WEB})?
  smoke                  flujo completo con aserciones; siembra y limpia solo
  seed                   deja datos ${TAG} para navegar la UI a mano
  clean                  borra todo lo marcado ${TAG}
  api <M> <path> [json]  petición autenticada ad hoc

Variables: LIBREX_API, LIBREX_WEB, LIBREX_USER, LIBREX_PASS`)
}
