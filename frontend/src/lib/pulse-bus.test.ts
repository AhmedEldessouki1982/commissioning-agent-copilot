import { describe, expect, it, vi } from 'vitest'
import type { PulseEvent } from '@orchestra/contract'
import type { AgentSeed, RuntimeState } from '@/lib/runtime-reducer'
import { createRuntimeState, reduce } from '@/lib/runtime-reducer'
import { PulseBus, type PulseInput } from '@/lib/pulse-bus'

const input = (over: Partial<PulseInput> = {}): PulseInput => ({
  from: 'manager',
  to: 'eng-1',
  type: 'dispatch',
  taskId: 1,
  ...over,
})

const wireEvent = (id: string, over: Partial<PulseEvent> = {}): PulseEvent => ({
  id,
  from: 'manager',
  to: 'eng-1',
  type: 'dispatch',
  taskId: 1,
  at: Date.now(),
  ...over,
})

const seed: AgentSeed[] = [
  { id: 'manager', status: 'online' },
  { id: 'eng-1', status: 'idle' },
]

/** Mirrors how useAgentRuntime maps departures onto the pure reducer. */
function applyEvent(state: RuntimeState, event: PulseEvent): RuntimeState {
  if (event.taskId === undefined) return state
  const taskId = String(event.taskId)
  if (event.type === 'dispatch') {
    return reduce(state, { type: 'dispatch', agentId: event.to, taskId })
  }
  if (event.type === 'result') {
    return reduce(state, { type: 'result', agentId: event.from, taskId })
  }
  return state
}

describe('pulse bus', () => {
  it('emit builds a fresh id and timestamp and copies the input', () => {
    const bus = new PulseBus()

    const event = bus.emit(input())

    expect(event.id).toBeTypeOf('string')
    expect(event.id).not.toBe('')
    expect(event.at).toBeTypeOf('number')
    expect(Number.isFinite(event.at)).toBe(true)
    expect(event.from).toBe('manager')
    expect(event.to).toBe('eng-1')
    expect(event.type).toBe('dispatch')
    expect(event.taskId).toBe(1)
  })

  it('emit generates a distinct id per call', () => {
    const bus = new PulseBus()
    expect(bus.emit(input()).id).not.toBe(bus.emit(input()).id)
  })

  it('delivers departures to subscribers and stops after unsubscribe', () => {
    const bus = new PulseBus()
    const listener = vi.fn()

    const off = bus.on(listener)
    bus.emit(input())
    expect(listener).toHaveBeenCalledTimes(1)

    off()
    bus.emit(input())
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('reset notifies listeners until they unsubscribe', () => {
    const bus = new PulseBus()
    const listener = vi.fn()

    const off = bus.onReset(listener)
    bus.reset()
    expect(listener).toHaveBeenCalledTimes(1)

    off()
    bus.reset()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('routes arrivals separately from departures', () => {
    const bus = new PulseBus()
    const departure = vi.fn()
    const arrival = vi.fn()

    bus.on(departure)
    bus.onArrival(arrival)

    const event = bus.emit(input())
    bus.emitArrival(event)

    expect(departure).toHaveBeenCalledTimes(1)
    expect(arrival).toHaveBeenCalledTimes(1)
    expect(arrival).toHaveBeenCalledWith(event)
  })
})

describe('pulse bus ingest', () => {
  it('delivers the event unchanged, preserving id and at exactly', () => {
    const bus = new PulseBus()
    const received: PulseEvent[] = []
    bus.on((event) => {
      received.push(event)
    })

    const event = wireEvent('backend-42', { taskId: 5, at: 1_234_567_890 })
    const before = { ...event }

    bus.ingest(event)

    expect(received).toHaveLength(1)
    // Same object, verbatim — no new id, no copy, no mutation.
    expect(received[0]).toBe(event)
    expect(received[0]?.id).toBe('backend-42')
    expect(received[0]?.at).toBe(1_234_567_890)
    expect(event).toEqual(before)
  })

  it('drives agent runtime state exactly like an emitted event', () => {
    const emittedBus = new PulseBus()
    let emittedState = createRuntimeState(seed)
    emittedBus.on((event) => {
      emittedState = applyEvent(emittedState, event)
    })
    const emitted = emittedBus.emit(input({ taskId: 3 }))

    const ingestedBus = new PulseBus()
    let ingestedState = createRuntimeState(seed)
    ingestedBus.on((event) => {
      ingestedState = applyEvent(ingestedState, event)
    })
    ingestedBus.ingest(emitted)

    expect(ingestedState).toEqual(emittedState)
    expect(ingestedState.statuses['eng-1']).toBe('busy')
    expect(ingestedState.inFlight['eng-1']).toEqual(['3'])
  })

  it('ignores a repeated id so an event is never counted twice', () => {
    const bus = new PulseBus()
    const listener = vi.fn()
    bus.on(listener)

    const event = wireEvent('dup-1')
    bus.ingest(event)
    bus.ingest({ ...event }) // same id, different object

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('remembers only the most recent ids for dedupe', () => {
    const bus = new PulseBus()
    const listener = vi.fn()
    bus.on(listener)

    for (let i = 0; i <= 200; i++) bus.ingest(wireEvent(`e${i}`))
    expect(listener).toHaveBeenCalledTimes(201)

    bus.ingest(wireEvent('e0')) // evicted from the 200-id window → delivered
    expect(listener).toHaveBeenCalledTimes(202)

    bus.ingest(wireEvent('e200')) // still remembered → ignored
    expect(listener).toHaveBeenCalledTimes(202)
  })

  it('leaves emit counting normally after an ingest', () => {
    const bus = new PulseBus()
    const listener = vi.fn()
    bus.on(listener)

    bus.ingest(wireEvent('b-1'))
    bus.emit(input())
    bus.emit(input())

    expect(listener).toHaveBeenCalledTimes(3)
  })
})
