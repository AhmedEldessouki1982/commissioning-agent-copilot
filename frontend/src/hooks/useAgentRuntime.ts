import { useEffect, useState } from 'react'
import { pulseBus } from '@/lib/pulse-bus'
import type { Agent, AgentStatus } from '@/types/agents'

export interface AgentRuntime {
  /** Live status per agent id (overrides the static seed). */
  statuses: Record<string, AgentStatus>
  /** Ids currently showing an arrival ripple. */
  flashing: ReadonlySet<string>
}

const RIPPLE_MS = 720

/**
 * Derives live agent status + arrival flashes purely from bus events.
 * Nothing here talks to the visuals directly — it only listens.
 */
export function useAgentRuntime(agents: readonly Agent[]): AgentRuntime {
  const [statuses, setStatuses] = useState<Record<string, AgentStatus>>(() =>
    Object.fromEntries(agents.map((a) => [a.id, a.status])),
  )
  const [flashing, setFlashing] = useState<ReadonlySet<string>>(() => new Set<string>())

  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>()

    const offDeparture = pulseBus.on((event) => {
      if (event.type === 'dispatch') {
        setStatuses((prev) => ({ ...prev, [event.from]: 'busy' }))
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

      if (event.type === 'dispatch') {
        setStatuses((prev) => ({ ...prev, [event.to]: 'busy' }))
      }
      if (event.type === 'result') {
        setStatuses((prev) => ({ ...prev, [event.to]: 'idle', [event.from]: 'idle' }))
      }
    })

    return () => {
      offDeparture()
      offArrival()
      for (const timer of timers) clearTimeout(timer)
    }
  }, [])

  return { statuses, flashing }
}
