import { useEffect, useReducer, useState } from 'react'
import { pulseBus } from '@/lib/pulse-bus'
import { createRuntimeState, reduce } from '@/lib/runtime-reducer'
import type { Agent, AgentStatus } from '@orchestra/contract'

export interface AgentRuntime {
  /** Live status per agent id (overrides the static seed). */
  statuses: Record<string, AgentStatus>
  /** Ids currently showing an arrival ripple (purely visual). */
  flashing: ReadonlySet<string>
}

const RIPPLE_MS = 720

/**
 * Derives live agent status from the pure runtime reducer, fed *only* by pulse
 * departures. Arrivals drive the ripple flash, which is cosmetic — losing an
 * arrival (hidden tab, missing route, reduced motion) can never drift status.
 */
export function useAgentRuntime(agents: readonly Agent[]): AgentRuntime {
  const [state, dispatch] = useReducer(reduce, agents, createRuntimeState)
  const [flashing, setFlashing] = useState<ReadonlySet<string>>(() => new Set<string>())

  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>()

    const offDeparture = pulseBus.on((event) => {
      if (event.taskId === undefined) return
      const taskId = String(event.taskId)
      if (event.type === 'dispatch') {
        dispatch({ type: 'dispatch', agentId: event.to, taskId })
      } else if (event.type === 'result') {
        dispatch({ type: 'result', agentId: event.from, taskId })
      }
    })

    const offArrival = pulseBus.onArrival((event) => {
      setFlashing((prev) => new Set(prev).add(event.to))
      const timer = setTimeout(() => {
        timers.delete(timer)
        setFlashing((prev) => {
          const next = new Set(prev)
          next.delete(event.to)
          return next
        })
      }, RIPPLE_MS)
      timers.add(timer)
    })

    const offReset = pulseBus.onReset(() => dispatch({ type: 'reset' }))

    return () => {
      offDeparture()
      offArrival()
      offReset()
      for (const timer of timers) clearTimeout(timer)
    }
  }, [])

  return { statuses: state.statuses, flashing }
}
