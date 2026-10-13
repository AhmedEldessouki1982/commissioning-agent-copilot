import type { PulseInput } from '@/lib/pulse-bus'

export interface SimulatorConfig {
  managerId: string
  agentIds: readonly string[]
  /** The only coupling: a function that publishes a pulse. */
  emit: (input: PulseInput) => void
  /** Bounds for the heartbeat jitter, ms. */
  minHeartbeatMs?: number
  maxHeartbeatMs?: number
  /** Bounds for how long a dispatched task stays "in flight", ms. */
  minDwellMs?: number
  maxDwellMs?: number
}

export interface Simulator {
  start: () => void
  stop: () => void
  isRunning: () => boolean
}

const randInt = (min: number, max: number): number =>
  Math.floor(min + Math.random() * (max - min + 1))

/**
 * Phase-1 stand-in for the real dispatch engine.
 *
 * It only ever calls `emit({ from, to, type })`, exactly like the Phase-2
 * backend (WebSocket/SSE) will. Rendering and status logic never reference the
 * simulator directly.
 */
export function createSimulator(config: SimulatorConfig): Simulator {
  const {
    managerId,
    agentIds,
    emit,
    minHeartbeatMs = 900,
    maxHeartbeatMs = 1900,
    minDwellMs = 1800,
    maxDwellMs = 3800,
  } = config

  let running = false
  let taskSeq = 0
  const timers = new Set<ReturnType<typeof setTimeout>>()
  const inFlight = new Map<string, number>() // agentId -> taskId

  const later = (fn: () => void, ms: number): void => {
    const id = setTimeout(() => {
      timers.delete(id)
      if (running) fn()
    }, ms)
    timers.add(id)
  }

  const freeAgents = (): string[] => agentIds.filter((id) => !inFlight.has(id))

  const heartbeat = (): void => {
    const target = agentIds[randInt(0, agentIds.length - 1)]
    if (target !== undefined) emit({ from: managerId, to: target, type: 'idle' })
  }

  const dispatch = (): void => {
    const free = freeAgents()
    if (free.length === 0) return
    const target = free[randInt(0, free.length - 1)]
    if (target === undefined) return
    taskSeq += 1
    const taskId = taskSeq
    inFlight.set(target, taskId)
    emit({ from: managerId, to: target, type: 'dispatch', taskId })

    later(
      () => {
        inFlight.delete(target)
        emit({ from: target, to: managerId, type: 'result', taskId })
        // chain a fresh dispatch so the dashboard keeps breathing
        later(dispatch, randInt(minHeartbeatMs, maxHeartbeatMs))
      },
      randInt(minDwellMs, maxDwellMs),
    )
  }

  const tick = (): void => {
    const roll = Math.random()
    if (roll < 0.4) {
      heartbeat()
    } else if (roll < 0.75) {
      dispatch()
    } else if (inFlight.size === 0) {
      heartbeat()
    }
    later(tick, randInt(minHeartbeatMs, maxHeartbeatMs))
  }

  return {
    start(): void {
      if (running) return
      running = true
      // kick off a couple of cycles immediately so it looks alive
      dispatch()
      later(dispatch, randInt(400, 900))
      later(tick, randInt(minHeartbeatMs, maxHeartbeatMs))
    },
    stop(): void {
      running = false
      for (const id of timers) clearTimeout(id)
      timers.clear()
      inFlight.clear()
    },
    isRunning(): boolean {
      return running
    },
  }
}
