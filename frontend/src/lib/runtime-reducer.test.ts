import { describe, expect, it } from 'vitest'
import type { AgentStatus } from '@/types/agents'
import {
  createRuntimeState,
  reduce,
  type AgentSeed,
  type RuntimeState,
} from '@/lib/runtime-reducer'

const MANAGER = 'manager'
const ENGINEER = 'eng-1'
const OTHER = 'eng-2'

const seed: AgentSeed[] = [
  { id: MANAGER, status: 'online' },
  { id: ENGINEER, status: 'idle' },
  { id: OTHER, status: 'idle' },
]

const statusOf = (state: RuntimeState, id: string): AgentStatus | undefined => state.statuses[id]

describe('runtime reducer', () => {
  it('keeps an agent busy until the last concurrent task returns', () => {
    let state = createRuntimeState(seed)
    state = reduce(state, { type: 'dispatch', agentId: ENGINEER, taskId: '1' })
    state = reduce(state, { type: 'dispatch', agentId: ENGINEER, taskId: '2' })

    expect(statusOf(state, ENGINEER)).toBe('busy')
    expect(state.inFlight[ENGINEER]).toEqual(['1', '2'])

    // First result is not the last one — the agent must stay busy.
    state = reduce(state, { type: 'result', agentId: ENGINEER, taskId: '1' })
    expect(statusOf(state, ENGINEER)).toBe('busy')
    expect(state.inFlight[ENGINEER]).toEqual(['2'])

    // Last result frees the agent and clears its in-flight bucket.
    state = reduce(state, { type: 'result', agentId: ENGINEER, taskId: '2' })
    expect(statusOf(state, ENGINEER)).toBe('idle')
    expect(state.inFlight[ENGINEER]).toBeUndefined()
  })

  it('never changes the manager status across a full task lifecycle', () => {
    let state = createRuntimeState(seed)
    state = reduce(state, { type: 'dispatch', agentId: ENGINEER, taskId: '7' })
    state = reduce(state, { type: 'idle' })
    state = reduce(state, { type: 'result', agentId: ENGINEER, taskId: '7' })

    expect(statusOf(state, MANAGER)).toBe('online')
  })

  it('treats the idle heartbeat as a no-op', () => {
    const state = createRuntimeState(seed)
    expect(reduce(state, { type: 'idle' })).toBe(state)
  })

  it('reset clears in-flight work and settles everyone but the manager to idle', () => {
    let state = createRuntimeState(seed)
    state = reduce(state, { type: 'dispatch', agentId: ENGINEER, taskId: '1' })
    state = reduce(state, { type: 'dispatch', agentId: OTHER, taskId: '2' })

    state = reduce(state, { type: 'reset' })

    expect(state.inFlight).toEqual({})
    expect(statusOf(state, MANAGER)).toBe('online')
    expect(statusOf(state, ENGINEER)).toBe('idle')
    expect(statusOf(state, OTHER)).toBe('idle')
  })
})
