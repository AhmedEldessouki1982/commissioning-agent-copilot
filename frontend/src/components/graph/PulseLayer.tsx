import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { usePulseEvents } from '@/hooks/usePulseBus'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { pulseBus } from '@/lib/pulse-bus'
import { pulseRoute } from './layout'
import type { PulseEvent, PulseType } from '@/types/agents'

interface PulseStyle {
  color: string
  /** Seconds for the head to traverse the edge. */
  duration: number
  /** Stroke/dot radius. */
  width: number
  /** Number of trailing dots (comet). */
  dots: number
  /** Relative velocity spread of the trailing dots. */
  spread: number
}

const STYLE: Record<PulseType, PulseStyle> = {
  // slow, faint heartbeat
  idle: { color: 'var(--pulse-idle)', duration: 2.9, width: 2, dots: 3, spread: 0.14 },
  // bright, fast task assignment
  dispatch: { color: 'var(--pulse-dispatch)', duration: 1.1, width: 3.2, dots: 5, spread: 0.11 },
  // return trip when the task completes
  result: { color: 'var(--pulse-result)', duration: 1.35, width: 3, dots: 5, spread: 0.11 },
}

interface ActivePulse {
  event: PulseEvent
  path: string
  reverse: boolean
  style: PulseStyle
}

/**
 * Renders travelling pulses as glowing dots with a fading comet trail, using
 * native SVG `animateMotion` (precise direction control + no per-frame JS).
 * Purely a consumer of the pulse bus.
 */
export function PulseLayer(): ReactNode {
  const [active, setActive] = useState<ActivePulse[]>([])
  const reduced = usePrefersReducedMotion()
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>())

  const settle = useCallback((event: PulseEvent, delayMs: number): void => {
    const timer = setTimeout(() => {
      timers.current.delete(timer)
      setActive((prev) => prev.filter((p) => p.event.id !== event.id))
      pulseBus.emitArrival(event)
    }, delayMs)
    timers.current.add(timer)
  }, [])

  usePulseEvents((event) => {
    const route = pulseRoute(event.from, event.to)
    if (!route) return
    const style = STYLE[event.type]

    if (reduced) {
      // No travel under reduced motion — resolve with a short beat so status
      // chips still animate meaningfully.
      settle(event, 180)
      return
    }

    setActive((prev) => [...prev.slice(-24), { event, path: route.path, reverse: route.reverse, style }])
    const trailing = (style.dots - 1) * style.duration * style.spread
    settle(event, style.duration * 1000 + trailing * 1000 + 120)
  })

  useEffect(() => {
    const pending = timers.current
    return () => {
      for (const timer of pending) clearTimeout(timer)
      pending.clear()
    }
  }, [])

  return (
    <g className="pulse-layer">
      {active.map(({ event, path, reverse, style }) => {
        const keyPoints = reverse ? '1;0' : '0;1'
        return (
          <g
            key={event.id}
            style={{ filter: `drop-shadow(0 0 ${style.width + 3}px ${style.color})` }}
          >
            {Array.from({ length: style.dots }, (_, index) => {
              const isHead = index === 0
              const radius = isHead ? style.width * 1.15 : style.width * Math.max(0.4, 0.7 - index * 0.08)
              const opacity = isHead ? 1 : Math.max(0.1, 0.55 - index * 0.12)
              const duration = style.duration + index * style.duration * style.spread
              return (
                <circle key={index} r={radius} fill={style.color} opacity={opacity}>
                  <animateMotion
                    dur={`${duration}s`}
                    repeatCount="1"
                    fill="freeze"
                    calcMode="linear"
                    keyPoints={keyPoints}
                    keyTimes="0;1"
                    path={path}
                  />
                </circle>
              )
            })}
          </g>
        )
      })}
    </g>
  )
}
