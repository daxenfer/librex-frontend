import { useEffect, useRef } from 'react'

// Decide si conviene mostrar un fondo estático en vez del shader animado.
// Móvil, "ahorro de datos" o "reducir movimiento" → estático (cero costo de GPU).
function prefersStaticBackground(): boolean {
  if (typeof window === 'undefined') return true
  const mm = window.matchMedia
  const reduceMotion = mm('(prefers-reduced-motion: reduce)').matches
  const isMobile = mm('(pointer: coarse)').matches && mm('(max-width: 768px)').matches
  const conn = (navigator as { connection?: { saveData?: boolean } }).connection
  const saveData = conn?.saveData === true
  return reduceMotion || isMobile || saveData
}

// Triángulo a pantalla completa generado desde gl_VertexID — no requiere buffers
// de atributos. Cubre el viewport con un solo triángulo (más barato que un quad).
const VERTEX_SHADER = `#version 300 es
void main() {
  vec2 verts[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
  gl_Position = vec4(verts[gl_VertexID], 0.0, 1.0);
}
`

// Fragment shader del aurora — idéntico al original (mismas octavas, mismo loop).
// GLSL ES 3.00: `tanh` es nativo y la salida va a un `out` en vez de gl_FragColor.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform float iTime;
uniform vec2 iResolution;
out vec4 fragColor;

#define NUM_OCTAVES 3

float rand(vec2 n) {
  return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 ip = floor(p);
  vec2 u = fract(p);
  u = u*u*(3.0-2.0*u);

  float res = mix(
    mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x),
    mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x), u.y);
  return res * res;
}

float fbm(vec2 x) {
  float v = 0.0;
  float a = 0.3;
  vec2 shift = vec2(100);
  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
  for (int i = 0; i < NUM_OCTAVES; ++i) {
    v += a * noise(x);
    x = rot * x * 2.0 + shift;
    a *= 0.4;
  }
  return v;
}

void main() {
  vec2 shake = vec2(sin(iTime * 1.2) * 0.005, cos(iTime * 2.1) * 0.005);
  vec2 p = ((gl_FragCoord.xy + shake * iResolution.xy) - iResolution.xy * 0.5) / iResolution.y * mat2(6.0, -4.0, 4.0, 6.0);
  vec2 v;
  vec4 o = vec4(0.0);

  float f = 2.0 + fbm(p + vec2(iTime * 5.0, 0.0)) * 0.5;

  for (float i = 0.0; i < 12.0; i++) {
    v = p + cos(i * i + (iTime + p.x * 0.08) * 0.025 + i * vec2(13.0, 11.0)) * 3.5 + vec2(sin(iTime * 3.0 + i) * 0.003, cos(iTime * 3.5 - i) * 0.003);
    float tailNoise = fbm(v + vec2(iTime * 0.5, i)) * 0.3 * (1.0 - (i / 12.0));
    vec4 auroraColors = vec4(
      0.1 + 0.3 * sin(i * 0.2 + iTime * 0.4),
      0.3 + 0.5 * cos(i * 0.3 + iTime * 0.5),
      0.7 + 0.3 * sin(i * 0.4 + iTime * 0.3),
      1.0
    );
    vec4 currentContribution = auroraColors * exp(sin(i * i + iTime * 0.8)) / length(max(v, vec2(v.x * f * 0.015, v.y * 1.5)));
    float thinnessFactor = smoothstep(0.0, 1.0, i / 12.0) * 0.6;
    o += currentContribution * (1.0 + tailNoise * 0.8) * thinnessFactor;
  }

  o = tanh(pow(o / 100.0, vec4(1.6)));
  fragColor = o * 1.5;
}
`

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type)
  if (!sh) return null
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh)
    return null
  }
  return sh
}

// Fondo animado tipo aurora (shader WebGL2 crudo, sin three.js).
// En móvil / reduce-motion / save-data NO se monta: queda el degradado CSS de la página.
export function AnimatedShaderBackground() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    if (prefersStaticBackground()) return // fallback: degradado CSS de la página

    const canvas = document.createElement('canvas')
    // antialias: false → el shader cubre toda la pantalla, MSAA no aporta nada
    // visible pero sí reserva buffers de GPU. low-power evita la GPU dedicada.
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      powerPreference: 'low-power',
      depth: false,
      stencil: false,
    })
    if (!gl) return // WebGL2 no disponible → queda el degradado CSS

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
    if (!vs || !fs) return
    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return
    gl.useProgram(program)
    // Los shaders ya están enlazados al programa; podemos liberarlos.
    gl.deleteShader(vs)
    gl.deleteShader(fs)

    const uTime = gl.getUniformLocation(program, 'iTime')
    const uRes = gl.getUniformLocation(program, 'iResolution')

    // VAO vacío: el triángulo se genera desde gl_VertexID, sin buffers.
    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)

    const width = () => container.clientWidth || window.innerWidth
    const height = () => container.clientHeight || window.innerHeight

    // El shader es fragment-bound: el costo escala con la cantidad de píxeles.
    // Renderizamos a escala reducida y dejamos que CSS lo escale a pantalla completa.
    // 0.5x da bordes más nítidos que 0.4x; MAX_DIM acota el lado más largo del
    // buffer para que en monitores 2K/4K no crezca sin control.
    const RENDER_SCALE = 0.5
    const MAX_DIM = 1280 // px, lado más largo del buffer de render
    const bufDims = (): [number, number] => {
      let w = width() * RENDER_SCALE
      let h = height() * RENDER_SCALE
      const longest = Math.max(w, h)
      if (longest > MAX_DIM) {
        const k = MAX_DIM / longest
        w *= k
        h *= k
      }
      return [Math.max(1, Math.round(w)), Math.max(1, Math.round(h))]
    }

    const applySize = () => {
      const [w, h] = bufDims()
      canvas.width = w
      canvas.height = h
      gl.viewport(0, 0, w, h)
      gl.uniform2f(uRes, w, h)
    }

    canvas.style.display = 'block'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    applySize()
    container.appendChild(canvas)

    let frameId = 0
    let iTime = 0
    const targetFps = 24
    const minDelta = 1 / targetFps
    let last = performance.now()
    let acc = 0

    const animate = () => {
      const now = performance.now()
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      acc += dt
      if (acc >= minDelta) {
        iTime += acc // avanza por tiempo real → misma velocidad
        gl.uniform1f(uTime, iTime)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
        acc = 0
      }
      frameId = requestAnimationFrame(animate)
    }

    const start = () => {
      if (!frameId && !document.hidden) {
        last = performance.now()
        frameId = requestAnimationFrame(animate)
      }
    }
    const stop = () => {
      cancelAnimationFrame(frameId)
      frameId = 0
    }

    start()

    const handleVisibility = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', handleVisibility)

    const handleResize = () => applySize()
    window.addEventListener('resize', handleResize)

    // Pérdida de contexto WebGL (frecuente en móvil/cambio de GPU): ocultar canvas → degradado CSS
    const handleContextLost = (e: Event) => {
      e.preventDefault()
      stop()
      canvas.style.display = 'none'
    }
    canvas.addEventListener('webglcontextlost', handleContextLost)

    return () => {
      stop()
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('resize', handleResize)
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      if (canvas.parentNode === container) container.removeChild(canvas)
      gl.deleteProgram(program)
      gl.deleteVertexArray(vao)
      // Libera el contexto GPU de inmediato en vez de esperar al GC.
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
    />
  )
}
