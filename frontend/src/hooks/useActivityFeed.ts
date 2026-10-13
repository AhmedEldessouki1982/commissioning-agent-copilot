import { useEffect, useRef, useState } from 'react'
import { formatClock } from '@/lib/format'
import { pulseBus } from '@/lib/pulse-bus'
import type { ActivityLogEntry, PulseEvent } from '@/types/agents'

export interface ActivityFeed {
  entries: ActivityLogEntry[]
  dispatched: number
  completed: number
}

const MAX_ENTRIES = 200

/**
 * Turns pulse traffic into a terminal activity log + running counters.
 * `labelFor` maps an agent id to its compact log label.
 */
export function useActivityFeed(labelFor: (id: string) => string): ActivityFeed {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([])
  const [dispatched, setDispatched] = useState(0)
  const [completed, setCompleted] = useState(0)

  const labelRef = useRef(labelFor)
  useEffect(() => {
    labelRef.current = labelFor
  })

  useEffect(() => {
    const render = (event: PulseEvent): string => {
      const from = labelRef.current(event.from)
      const to = labelRef.current(event.to)
      const task = event.taskId === undefined ? '' : ` task #${event.taskId}`
      return `[${formatClock(event.at)}] ${from} → ${to}: ${event.type}${task}`
    }

    const offDeparture = pulseBus.on((event) => {
      if (event.type === 'idle') return // heartbeats stay out of the log
      if (event.type === 'dispatch') setDispatched((n) => n + 1)
      setEntries((prev) =>
        [{ id: event.id, at: event.at, text: render(event), type: event.type }, ...prev].slice(
          0,
          MAX_ENTRIES,
        ),
      )
    })

    const offArrival = pulseBus.onArrival((event) => {
      if (event.type === 'result') setCompleted((n) => n + 1)
    })

    return () => {
      offDeparture()
      offArrival()
    }
  }, [])

  return { entries, dispatched, completed }
}
