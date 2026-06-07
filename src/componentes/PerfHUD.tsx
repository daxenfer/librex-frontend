import { useEffect, useRef, useState } from 'react'

// HUD de rendimiento (solo desarrollo). Muestra FPS, frame-time y memoria JS.
// Se activa con ?perf en la URL, o siempre en modo dev si forceShow.
// Útil para comparar el costo de distintos diseños (p. ej. fondos animados).
export function PerfHUD({ forceShow = false }: { forceShow?: boolean }) {
  const [stats, setStats] = useState({ fps: 0, ms: 0, mem: 0, min: 999, max: 0 })
  const frames = useRef(0)
  const lastTime = useRef(performance.now())
  const lastFrame = useRef(performance.now())
  const minFps = useRef(999)
  const maxFps = useRef(0)

  const enabled =
    forceShow ||
    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('perf'))

  useEffect(() => {
    if (!enabled) return
    let raf = 0
    const loop = () => {
      const now = performance.now()
      frames.current++
      const frameMs = now - lastFrame.current
      lastFrame.current = now

      if (now - lastTime.current >= 500) {
        const fps = Math.round((frames.current * 1000) / (now - lastTime.current))
        minFps.current = Math.min(minFps.current, fps)
        maxFps.current = Math.max(maxFps.current, fps)
        // performance.memory solo existe en Chromium
        const perfMem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
        const mem = perfMem ? Math.round(perfMem.usedJSHeapSize / 1048576) : 0
        setStats({ fps, ms: Math.round(frameMs * 10) / 10, mem, min: minFps.current, max: maxFps.current })
        frames.current = 0
        lastTime.current = now
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [enabled])

  if (!enabled) return null

  const color = stats.fps >= 55 ? '#34d399' : stats.fps >= 30 ? '#fbbf24' : '#f87171'

  return (
    <div style={box}>
      <div style={{ ...row, color, fontWeight: 700 }}>
        <span>FPS</span><span>{stats.fps}</span>
      </div>
      <div style={row}><span>min/max</span><span>{stats.min === 999 ? '-' : stats.min}/{stats.max}</span></div>
      <div style={row}><span>frame</span><span>{stats.ms} ms</span></div>
      {stats.mem > 0 && <div style={row}><span>JS heap</span><span>{stats.mem} MB</span></div>}
    </div>
  )
}

const box: React.CSSProperties = {
  position: 'fixed', top: 8, right: 8, zIndex: 99999,
  background: 'rgba(0,0,0,0.78)', color: '#e5e7eb',
  fontFamily: 'monospace', fontSize: 12, lineHeight: 1.5,
  padding: '8px 10px', borderRadius: 8, minWidth: 130,
  border: '1px solid rgba(255,255,255,0.15)', pointerEvents: 'none',
}
const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 12 }
