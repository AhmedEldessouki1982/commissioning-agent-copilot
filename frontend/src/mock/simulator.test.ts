import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PulseInput } from '@/lib/pulse-bus'
import { createSimulator, type SimulatorConfig } from '@/mock/simulator'

const DWELL = 500

function makeSim(over: Partial<SimulatorConfig> = {}) {
  const events: PulseInput[] = []
  const onReset = vi.fn()
  const sim = createSimulator({
    managerId: 'manager',
    agentIds: ['eng-1', 'eng-2'],
    emit: (input) => {
      events.push(input)
    },
    onReset,
    minHeartbeatMs: 1000,
    maxHeartbeatMs: 1000,
    minDwellMs: DWELL,
    maxDwellMs: DWELL,
    ...over,
  })
  return { events, onReset, sim }
}

const dispatches = (events: PulseInput[]) => events.filter((e) => e.type === 'dispatch')
const results = (events: PulseInput[]) => events.filter((e) => e.type === 'result')

describe('simulator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('emits exactly one matching result for every dispatch', () => {
    const { events, sim } = makeSim()

    expect(sim.dispatchTo('eng-1')).toBe(true)
    vi.advanceTimersByTime(DWELL + 1)

    expect(dispatches(events)).toHaveLength(1)
    expect(results(events)).toHaveLength(1)
    expect(results(events)[0]?.taskId).toBe(dispatches(events)[0]?.taskId)
  })

  it('stop() settles in-flight tasks, clears timers and calls onReset', () => {
    const { events, onReset, sim } = makeSim()

    sim.start()
    expect(sim.isRunning()).toBe(true)
    expect(dispatches(events).length).toBeGreaterThan(0)

    sim.stop()
    expect(sim.isRunning()).toBe(false)
    expect(onReset).toHaveBeenCalledTimes(1)

    // Any in-flight result and the auto loop must be cancelled at stop.
    const frozen = events.length
    vi.advanceTimersByTime(60_000)
    expect(events.length).toBe(frozen)
    expect(results(events)).toHaveLength(0)
  })

  it('lets a manual dispatch run while the auto loop is paused', () => {
    const { events, sim } = makeSim()
    expect(sim.isRunning()).toBe(false)

    expect(sim.dispatchTo('eng-1')).toBe(true)
    expect(dispatches(events)).toHaveLength(1)

    vi.advanceTimersByTime(DWELL + 1)
    expect(results(events)).toHaveLength(1)
  })

  it('is a no-op when every agent is busy', () => {
    const { events, sim } = makeSim()

    expect(sim.dispatchTo('eng-1')).toBe(true)
    expect(sim.dispatchTo('eng-2')).toBe(true)

    const before = events.length
    expect(sim.dispatchTo()).toBe(false) // no free target
    expect(sim.dispatchTo('eng-1')).toBe(false) // explicit busy target
    expect(events.length).toBe(before)
  })

  it('assigns an arbitrary free agent when no target is given', () => {
    const { events, sim } = makeSim()

    expect(sim.dispatchTo('eng-1')).toBe(true)
    expect(sim.dispatchTo()).toBe(true) // only eng-2 is free

    const targets = dispatches(events).map((e) => e.to)
    expect(targets).toEqual(['eng-1', 'eng-2'])
  })
})
