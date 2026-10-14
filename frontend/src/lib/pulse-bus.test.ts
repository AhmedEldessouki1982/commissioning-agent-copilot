import { describe, expect, it, vi } from 'vitest'
import { PulseBus, type PulseInput } from '@/lib/pulse-bus'

const input = (over: Partial<PulseInput> = {}): PulseInput => ({
  from: 'manager',
  to: 'eng-1',
  type: 'dispatch',
  taskId: 1,
  ...over,
})

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
