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

// Fondo animado tipo aurora (shader WebGL con Three.js).
// En móvil / reduce-motion / save-data NO se monta: queda el degradado CSS de la página.
// three.js se carga dinámicamente, así el móvil ni siquiera descarga la librería.
export function AnimatedShaderBackground() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    if (prefersStaticBackground()) return // fallback: degradado CSS de la página

    let cancelled = false
    let cleanup = () => {}

    import('three')
      .then((THREE) => {
        if (cancelled || !container) return

        let renderer: import('three').WebGLRenderer
        try {
          renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' })
        } catch {
          return // WebGL no disponible → queda el degradado CSS
        }

        const scene = new THREE.Scene()
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

        const width = () => container.clientWidth || window.innerWidth
        const height = () => container.clientHeight || window.innerHeight

        // El shader es fragment-bound: el costo escala con la cantidad de píxeles.
        // Renderizamos a 0.4x (≈6x menos píxeles) y dejamos que CSS lo escale.
        const RENDER_SCALE = 0.4
        const bufW = () => Math.max(1, Math.round(width() * RENDER_SCALE))
        const bufH = () => Math.max(1, Math.round(height() * RENDER_SCALE))

        renderer.setPixelRatio(1)
        renderer.setSize(bufW(), bufH(), false)
        const canvas = renderer.domElement
        canvas.style.display = 'block'
        canvas.style.width = '100%'
        canvas.style.height = '100%'
        container.appendChild(canvas)

        const material = new THREE.ShaderMaterial({
          uniforms: {
            iTime: { value: 0 },
            iResolution: { value: new THREE.Vector2(bufW(), bufH()) },
          },
          vertexShader: `
            void main() {
              gl_Position = vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform float iTime;
            uniform vec2 iResolution;

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
              gl_FragColor = o * 1.5;
            }
          `,
        })

        const geometry = new THREE.PlaneGeometry(2, 2)
        const mesh = new THREE.Mesh(geometry, material)
        scene.add(mesh)

        let frameId = 0
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
            material.uniforms.iTime.value += acc // avanza por tiempo real → misma velocidad
            renderer.render(scene, camera)
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

        const handleResize = () => {
          renderer.setSize(bufW(), bufH(), false)
          material.uniforms.iResolution.value.set(bufW(), bufH())
        }
        window.addEventListener('resize', handleResize)

        // Pérdida de contexto WebGL (frecuente en móvil/cambio de GPU): ocultar canvas → degradado CSS
        const handleContextLost = (e: Event) => {
          e.preventDefault()
          stop()
          canvas.style.display = 'none'
        }
        canvas.addEventListener('webglcontextlost', handleContextLost)

        cleanup = () => {
          stop()
          document.removeEventListener('visibilitychange', handleVisibility)
          window.removeEventListener('resize', handleResize)
          canvas.removeEventListener('webglcontextlost', handleContextLost)
          if (canvas.parentNode === container) container.removeChild(canvas)
          geometry.dispose()
          material.dispose()
          renderer.dispose()
        }
      })
      .catch(() => {}) // si falla la carga de three, queda el degradado CSS

    return () => {
      cancelled = true
      cleanup()
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
