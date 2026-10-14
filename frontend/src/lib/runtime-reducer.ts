import type { AgentStatus } from '@orchestra/contract'

/**
 * Live agent state, derived *only* from pulse departures — never from
 * animation timing or arrivals. This keeps status correct when a route is
 * missing, the tab is throttled/hidden, or reduced motion is enabled, and it
 * handles concurrent tasks to one agent (an agent is only idle once its
 * in-flight set empties).
 */
export interface RuntimeState {
  /** agentId → taskIds currently assigned to that agent (string form). */
  inFlight: Record<string, string[]>
  /** agentId → current status. */
  statuses: Record<string, AgentStatus>
}

export type RuntimeAction =
  /** A task left the manager for `agentId`. */
  | { type: 'dispatch'; agentId: string; taskId: string }
  /** A task left `agentId` back to the manager. */
  | { type: 'result'; agentId: string; taskId: string }
  /** Idle heartbeat — deliberately a no-op for state. */
  | { type: 'idle' }
  /** Pause/teardown — clear everything and settle to idle. */
  | { type: 'reset' }

export interface AgentSeed {
  id: string
  status: AgentStatus
}

/** Initial runtime state from the static architecture seed. */
export function createRuntimeState(agents: readonly AgentSeed[]): RuntimeState {
  const statuses: Record<string, AgentStatus> = {}
  for (const agent of agents) statuses[agent.id] = agent.status
  return { inFlight: {}, statuses }
}

/**
 * Pure reducer. `dispatch` acts on DEPARTURE (target becomes busy), `result`
 * acts on DEPARTURE (sender frees itself only once its last task returns).
 * The manager is never a subject of either action, so it stays `online`.
 */
export function reduce(state: RuntimeState, action: RuntimeAction): RuntimeState {
  switch (action.type) {
    case 'dispatch': {
      const current = state.inFlight[action.agentId] ?? []
      return {
        inFlight: { ...state.inFlight, [action.agentId]: [...current, action.taskId] },
        statuses: { ...state.statuses, [action.agentId]: 'busy' },
      }
    }

    case 'result': {
      const current = state.inFlight[action.agentId] ?? []
      const remaining = current.filter((taskId) => taskId !== action.taskId)

      const inFlight = { ...state.inFlight }
      if (remaining.length === 0) {
        delete inFlight[action.agentId]
      } else {
        inFlight[action.agentId] = remaining
      }

      const statuses = { ...state.statuses }
      // Free the agent only when no task remains in flight.
      if (remaining.length === 0) statuses[action.agentId] = 'idle'

      return { inFlight, statuses }
    }

    case 'idle':
      return state

    case 'reset': {
      const statuses: Record<string, AgentStatus> = {}
      for (const [id, status] of Object.entries(state.statuses)) {
        // The manager (seeded `online`) stays online; everyone else settles to idle.
        statuses[id] = status === 'online' ? 'online' : 'idle'
      }
      return { inFlight: {}, statuses }
    }

    default:
      return state
  }
}
