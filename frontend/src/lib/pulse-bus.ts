import type { PulseEvent, PulseType } from '@/types/agents'

/** What a producer (simulator now, backend in Phase 2) hands to the bus. */
export interface PulseInput {
  from: string
  to: string
  type: PulseType
  taskId?: number
  label?: string
}

export type PulseListener = (event: PulseEvent) => void
export type ResetListener = () => void

let sequence = 0

/**
 * Tiny synchronous event emitter for pulse traffic.
 *
 * Producers call `emit({ from, to, type })`. Visuals subscribe to `on` (departure)
 * and `onArrival` (when a rendered pulse reaches its target). The Phase-2 backend
 * reuses `emit` verbatim, so nothing else needs to change.
 */
export class PulseBus {
  private departureListeners = new Set<PulseListener>()
  private arrivalListeners = new Set<PulseListener>()
  private resetListeners = new Set<ResetListener>()

  emit(input: PulseInput): PulseEvent {
    sequence += 1
    const event: PulseEvent = {
      id: `pulse-${sequence}-${Date.now().toString(36)}`,
      at: Date.now(),
      ...input,
    }
    for (const listener of this.departureListeners) listener(event)
    return event
  }

  /** Fired the moment a pulse leaves its source. */
  on(listener: PulseListener): () => void {
    this.departureListeners.add(listener)
    return () => {
      this.departureListeners.delete(listener)
    }
  }

  /** Fired when a rendered pulse reaches its target (visuals decide this). */
  emitArrival(event: PulseEvent): void {
    for (const listener of this.arrivalListeners) listener(event)
  }

  onArrival(listener: PulseListener): () => void {
    this.arrivalListeners.add(listener)
    return () => {
      this.arrivalListeners.delete(listener)
    }
  }

  /**
   * Requests a clean settle (feed paused/restarted, teardown). Subscribers
   * clear all derived state so no agent is left busy after the feed stops.
   */
  reset(): void {
    for (const listener of this.resetListeners) listener()
  }

  onReset(listener: ResetListener): () => void {
    this.resetListeners.add(listener)
    return () => {
      this.resetListeners.delete(listener)
    }
  }
}

/** Shared singleton — the only channel between producers and the visuals. */
export const pulseBus = new PulseBus()
