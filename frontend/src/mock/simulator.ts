import type { PulseInput } from '@/lib/pulse-bus'

export interface SimulatorConfig {
  managerId: string
  agentIds: readonly string[]
  /** The only coupling: functions injected by the caller. */
  emit: (input: PulseInput) => void
  /** Called on stop() so derived state (bus subscribers) settles to idle. */
  onReset: () => void
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
  /**
   * Assigns a task to `agentId`, or to any free agent when none is given.
   * Every dispatch immediately schedules its matching result, so an agent can
   * never be left busy without a completion. Works even while paused.
   * Returns false (no-op) when the target is busy or every agent is busy.
   */
  dispatchTo: (agentId?: string) => boolean
}

const randInt = (min: number, max: number): number =>
  Math.floor(min + Math.random() * (max - min + 1))

/**
 * Phase-1 stand-in for the real dispatch engine.
 *
 * It only ever calls the injected `emit`/`onReset` functions, exactly like the
 * Phase-2 backend (WebSocket/SSE) will — same interface, different transport.
 * Rendering and status logic never reference the simulator directly.
 */
export function createSimulator(config: SimulatorConfig): Simulator {
  const {
    managerId,
    agentIds,
    emit,
    onReset,
    minHeartbeatMs = 900,
    maxHeartbeatMs = 1900,
    minDwellMs = 1800,
    maxDwellMs = 3800,
  } = config

  let running = false
  let taskSeq = 0

  // Auto-loop timers only fire while `running`; task-lifecycle timers always
  // fire (a manual dispatch completes even when the auto loop is paused).
  const autoTimers = new Set<ReturnType<typeof setTimeout>>()
  const taskTimers = new Set<ReturnType<typeof setTimeout>>()
  const inFlight = new Map<string, number>() // agentId -> taskId

  const laterAuto = (fn: () => void, ms: number): void => {
    const id = setTimeout(() => {
      autoTimers.delete(id)
      if (running) fn()
    }, ms)
    autoTimers.add(id)
  }

  const laterTask = (fn: () => void, ms: number): void => {
    const id = setTimeout(() => {
      taskTimers.delete(id)
      fn()
    }, ms)
    taskTimers.add(id)
  }

  const freeAgents = (): string[] => agentIds.filter((id) => !inFlight.has(id))

  const heartbeat = (): void => {
    const target = agentIds[randInt(0, agentIds.length - 1)]
    if (target !== undefined) emit({ from: managerId, to: target, type: 'idle' })
  }

  /** Core factory: taskId first, then dispatch + its matching result. */
  const assignTask = (agentId: string): boolean => {
    if (inFlight.has(agentId)) return false
    taskSeq += 1
    const taskId = taskSeq
    inFlight.set(agentId, taskId)
    emit({ from: managerId, to: agentId, type: 'dispatch', taskId })

    laterTask(() => {
      inFlight.delete(agentId)
      emit({ from: agentId, to: managerId, type: 'result', taskId })
    }, randInt(minDwellMs, maxDwellMs))
    return true
  }

  const dispatch = (): void => {
    const free = freeAgents()
    const target = free[randInt(0, free.length - 1)]
    if (target !== undefined) assignTask(target)
  }

  const tick = (): void => {
    const roll = Math.random()
    if (roll < 0.4) heartbeat()
    else dispatch() // dispatch no-ops while every agent is busy
    laterAuto(tick, randInt(minHeartbeatMs, maxHeartbeatMs))
  }

  return {
    start(): void {
      if (running) return
      running = true
      // kick off a couple of cycles immediately so it looks alive
      dispatch()
      laterAuto(dispatch, randInt(400, 900))
      laterAuto(tick, randInt(minHeartbeatMs, maxHeartbeatMs))
    },
    stop(): void {
      running = false
      for (const id of autoTimers) clearTimeout(id)
      for (const id of taskTimers) clearTimeout(id)
      autoTimers.clear()
      taskTimers.clear()
      inFlight.clear()
      onReset() // settle every derived subscriber (bus → reducer → status chips)
    },
    isRunning(): boolean {
      return running
    },
    dispatchTo(agentId?: string): boolean {
      if (agentId === undefined) {
        const free = freeAgents()
        const target = free[randInt(0, free.length - 1)]
        return target !== undefined && assignTask(target)
      }
      return assignTask(agentId)
    },
  }
}