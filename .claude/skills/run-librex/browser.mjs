#!/usr/bin/env node
// Maneja la UI de Librex en un Chromium headless, hablando CDP por WebSocket.
// Sin dependencias: Node 22+ trae WebSocket nativo, así que no hace falta Playwright
// como paquete — solo su binario de Chromium.
//
//   node .claude/skills/run-librex/browser.mjs shot /reports reportes.png
//   node .claude/skills/run-librex/browser.mjs text /returns/new
//
// Inyecta la sesión en localStorage antes de navegar, así que entra directo a las
// pantallas protegidas sin pasar por el formulario de login.

import { spawn, execSync } from 'node:child_process'
import { writeFileSync, mkdtempSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const API = process.env.LIBREX_API ?? 'http://localhost:5176'
const WEB = process.env.LIBREX_WEB ?? 'http://localhost:5173'
const USER = process.env.LIBREX_USER ?? 'admin'
const PASS = process.env.LIBREX_PASS ?? 'Admin1234'
const PORT = Number(process.env.CDP_PORT ?? 9333)

const CANDIDATES = [
  process.env.CHROME,
  join(process.env.LOCALAPPDATA ?? '', 'ms-playwright', 'chromium-1234', 'chrome-win64', 'chrome.exe'),
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
].filter(Boolean)

const chromePath = CANDIDATES.find(p => { try { return existsSync(p) } catch { return false } })
if (!chromePath) {
  console.error('No encontré Chromium. Instálalo con:\n  npx playwright@latest install chromium\n' +
    'o exporta CHROME=<ruta al binario>.')
  process.exit(1)
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

/* ── sesión ─────────────────────────────────────────────────────────── */

async function getSession() {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USER, password: PASS }),
  })
  if (!res.ok) { console.error(`Login falló (${res.status}). ¿Backend arriba en ${API}?`); process.exit(1) }
  return res.json()
}

/* ── CDP ────────────────────────────────────────────────────────────── */

class Cdp {
  #ws; #id = 0; #pending = new Map(); session
  constructor(ws) {
    this.#ws = ws
    ws.addEventListener('message', e => {
      const msg = JSON.parse(e.data)
      const p = this.#pending.get(msg.id)
      if (p) { this.#pending.delete(msg.id); msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result) }
    })
  }
  send(method, params = {}, sessionId = this.session) {
    const id = ++this.#id
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject })
      this.#ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
    })
  }
  async evaluate(expression) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text)
    return r.result.value
  }
  async waitFor(expression, { timeout = 15000, label = expression } = {}) {
    const until = Date.now() + timeout
    while (Date.now() < until) {
      try { if (await this.evaluate(expression)) return true } catch { /* la página aún navega */ }
      await sleep(200)
    }
    throw new Error(`Timeout esperando: ${label}`)
  }
}

async function launch() {
  const profile = mkdtempSync(join(tmpdir(), 'librex-cdp-'))
  const child = spawn(chromePath, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--no-default-browser-check', '--disable-dev-shm-usage',
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
    '--window-size=1440,1000', 'about:blank',
  ], { stdio: 'ignore', detached: false })

  let version
  for (let i = 0; i < 60; i++) {
    try { version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); break }
    catch { await sleep(250) }
  }
  if (!version) { child.kill(); console.error('Chromium no abrió el puerto CDP.'); process.exit(1) }

  const ws = new WebSocket(version.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej) })

  const cdp = new Cdp(ws)
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' }, null)
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true }, null)
  cdp.session = sessionId
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')

  const close = () => {
    try { ws.close() } catch { /* ya cerrado */ }
    // child.kill() deja el árbol de procesos vivo en Windows.
    try {
      if (process.platform === 'win32') execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' })
      else child.kill('SIGKILL')
    } catch { /* ya murió */ }
  }
  return { cdp, close }
}

// La sesión vive en localStorage, que es por origen: hay que estar en el origen
// ANTES de escribirla, de ahí la doble navegación.
async function openApp(cdp, path) {
  const session = await getSession()
  await cdp.send('Page.navigate', { url: WEB })
  await cdp.waitFor('document.readyState === "complete"', { label: 'carga inicial' })
  await cdp.evaluate(
    `localStorage.setItem('librex_token', ${JSON.stringify(session.token)});` +
    `localStorage.setItem('librex_user', ${JSON.stringify(JSON.stringify(session))}); true`)
  await cdp.send('Page.navigate', { url: WEB + path })
  await cdp.waitFor('document.readyState === "complete"', { label: 'carga de ' + path })
  // El SPA pinta después del load y las tablas llegan por fetch; se espera contenido real.
  await cdp.waitFor('document.body.innerText.trim().length > 40', { label: 'contenido renderizado de ' + path })
  await sleep(1200)
}

/* ── comandos ───────────────────────────────────────────────────────── */

const [cmd, rawRoute = '/', out = 'librex.png'] = process.argv.slice(2)

if (!['shot', 'text'].includes(cmd)) {
  console.log(`Maneja la UI de Librex en Chromium headless (CDP, sin dependencias).

  shot <ruta> <archivo.png>   captura la pantalla ya autenticada
  text <ruta>                 imprime el texto visible (para asercionar)

Ejemplos:
  node .claude/skills/run-librex/browser.mjs shot /reports reportes.png
  node .claude/skills/run-librex/browser.mjs text /returns/new

Variables: LIBREX_API, LIBREX_WEB, LIBREX_USER, LIBREX_PASS, CHROME, CDP_PORT`)
  process.exit(cmd ? 1 : 0)
}

// Git Bash (MSYS) convierte "/reports" en una ruta de Windows antes de que Node la vea.
if (/^[A-Za-z]:[\\/]/.test(rawRoute)) {
  console.error(
    `La ruta llegó convertida por MSYS: "${rawRoute}"\n` +
    'Usa la forma sin diagonal inicial (reports) o antepón MSYS_NO_PATHCONV=1.')
  process.exit(1)
}
const route = '/' + rawRoute.replace(/^\/+/, '')

const { cdp, close } = await launch()
try {
  await openApp(cdp, route)
  if (cmd === 'shot') {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
    writeFileSync(out, Buffer.from(data, 'base64'))
    console.log(`Captura guardada: ${out}`)
  } else {
    console.log(await cdp.evaluate('document.body.innerText'))
  }
} catch (e) {
  console.error('Error manejando la UI:', e.message)
  close()
  process.exit(1)
}
close()
process.exit(0)
