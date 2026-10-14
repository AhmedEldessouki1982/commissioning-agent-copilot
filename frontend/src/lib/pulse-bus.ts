import type { PulseEvent, PulseType } from '@orchestra/contract'

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

/** How many recently delivered ids the bus remembers, to dedupe `ingest`. */
const RECENT_ID_LIMIT = 200

/**
 * Tiny synchronous event emitter for pulse traffic.
 *
 * Producers call `emit({ from, to, type })`; the Phase-2 backend instead calls
 * `ingest(event)` with a fully-formed event from the wire. Both funnel through
 * one delivery path, so visuals only subscribe to `on` (departure) and
 * `onArrival` (when a rendered pulse reaches its target) and never care which
 * side produced the event.
 */
export class PulseBus {
  private departureListeners = new Set<PulseListener>()
  private arrivalListeners = new Set<PulseListener>()
  private resetListeners = new Set<ResetListener>()

  /** Instance-scoped id counter, so two buses can't collide. */
  private sequence = 0

  /** Bounded FIFO of recently delivered ids (dedupe window for `ingest`). */
  private recentIds: string[] = []
  private recentIdSet = new Set<string>()

  /**
   * Producer helper: stamps a fresh `id`/`at` onto `input`, then delivers it.
   * Always yields a new event, so it never dedupes.
   */
  emit(input: PulseInput): PulseEvent {
    this.sequence += 1
    const event: PulseEvent = {
      id: `pulse-${this.sequence}-${Date.now().toString(36)}`,
      at: Date.now(),
      ...input,
    }
    this.deliver(event)
    return event
  }

  /**
   * Consumer path (Phase 2: the backend over WebSocket/SSE). Delivers a
   * pre-formed event verbatim — `id` and `at` are preserved and the object is
   * never mutated. An id already delivered inside the recent window is ignored
   * so an event redelivered by the transport can't be counted twice.
   */
  ingest(event: PulseEvent): void {
    if (this.recentIdSet.has(event.id)) return
    this.deliver(event)
  }

  /** The one delivery path shared by `emit` and `ingest`. */
  private deliver(event: PulseEvent): void {
    this.remember(event.id)
    for (const listener of this.departureListeners) listener(event)
  }

  /** Records a delivered id, evicting the oldest once the window is full. */
  private remember(id: string): void {
    if (this.recentIdSet.has(id)) return
    this.recentIdSet.add(id)
    this.recentIds.push(id)
    if (this.recentIds.length > RECENT_ID_LIMIT) {
      const evicted = this.recentIds.shift()
      if (evicted !== undefined) this.recentIdSet.delete(evicted)
    }
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
