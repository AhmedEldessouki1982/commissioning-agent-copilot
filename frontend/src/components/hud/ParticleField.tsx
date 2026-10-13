import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

/** A drifting constellation of particles, tinted from the live terminal accent. */
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  tone: 'accent' | 'result'
}

type Rgb = [number, number, number]

const LINK_DISTANCE = 160
const MAX_PARTICLES = 240
const MIN_PARTICLES = 60
const AREA_PER_PARTICLE = 8500
const DRIFT = 0.32

/** Accepts either an "r g b" triple or a #rrggbb string. */
function parseColor(value: string, fallback: Rgb): Rgb {
  const raw = value.trim()
  const triple = raw.split(/[\s,]+/).map(Number)
  if (triple.length === 3) {
    const [r, g, b] = triple
    if (r !== undefined && g !== undefined && b !== undefined && [r, g, b].every(Number.isFinite)) {
      return [r, g, b]
    }
  }
  const hex = raw.replace('#', '')
  if (hex.length === 6) {
    const n = Number.parseInt(hex, 16)
    if (!Number.isNaN(n)) return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  return fallback
}

export function ParticleField(): ReactNode {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const styles = getComputedStyle(document.documentElement)
    const accent = parseColor(styles.getPropertyValue('--accent-rgb'), [172, 115, 99])
    const result = parseColor(styles.getPropertyValue('--pulse-result'), [133, 224, 206])

    const toneOf = (tone: Particle['tone']): Rgb => (tone === 'accent' ? accent : result)
    const rgba = ([r, g, b]: Rgb, a: number): string => `rgba(${r}, ${g}, ${b}, ${a})`

    let width = 0
    let height = 0
    let particles: Particle[] = []
    let raf = 0

    const seed = (): void => {
      const count = Math.min(
        MAX_PARTICLES,
        Math.max(MIN_PARTICLES, Math.round((width * height) / AREA_PER_PARTICLE)),
      )
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * DRIFT,
        vy: (Math.random() - 0.5) * DRIFT,
        r: 0.6 + Math.random() * 1.1,
        tone: Math.random() < 0.28 ? 'result' : 'accent',
      }))
    }

    const render = (advance: boolean): void => {
      ctx.clearRect(0, 0, width, height)

      for (const p of particles) {
        ctx.beginPath()
        ctx.fillStyle = rgba(toneOf(p.tone), 0.1)
        ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2)
        ctx.fill()

        ctx.beginPath()
        ctx.fillStyle = rgba(toneOf(p.tone), 0.9)
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }

      const limit = LINK_DISTANCE * LINK_DISTANCE
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i]
        if (!a) continue
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j]
          if (!b) continue
          const dx = a.x - b.x
          const dy = a.y - b.y
          const d2 = dx * dx + dy * dy
          if (d2 > limit) continue
          const alpha = (1 - Math.sqrt(d2) / LINK_DISTANCE) * 0.34
          ctx.beginPath()
          ctx.strokeStyle = rgba(accent, alpha)
          ctx.lineWidth = 0.9
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }

      if (!advance) return
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < -20) p.x = width + 20
        else if (p.x > width + 20) p.x = -20
        if (p.y < -20) p.y = height + 20
        else if (p.y > height + 20) p.y = -20
      }
    }

    const resize = (): void => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
      render(!reduced)
    }

    const loop = (): void => {
      render(true)
      raf = requestAnimationFrame(loop)
    }

    const start = (): void => {
      cancelAnimationFrame(raf)
      if (reduced) {
        render(false)
        return
      }
      raf = requestAnimationFrame(loop)
    }

    const stop = (): void => cancelAnimationFrame(raf)

    const onVisibility = (): void => {
      if (document.hidden) stop()
      else start()
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)
    resize()
    start()

    return () => {
      stop()
      observer.disconnect()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [reduced])

  return <canvas ref={canvasRef} className="hud-bg__particles" aria-hidden />
}
