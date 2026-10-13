import { useCallback, useEffect, useRef } from 'react'
import { pulseBus, type PulseInput } from '@/lib/pulse-bus'
import type { PulseEvent } from '@/types/agents'

/** Emit a pulse onto the shared bus (used by the simulator and UI controls). */
export function useEmitPulse(): (input: PulseInput) => PulseEvent {
  return useCallback((input: PulseInput) => pulseBus.emit(input), [])
}

/** Subscribe to pulse departures. Handler is kept current without re-subscribing. */
export function usePulseEvents(handler: (event: PulseEvent) => void): void {
  const ref = useRef(handler)
  useEffect(() => {
    ref.current = handler
  })
  useEffect(() => pulseBus.on((event) => ref.current(event)), [])
}

/** Subscribe to pulse arrivals (when the travelling dot reaches its target). */
export function usePulseArrivals(handler: (event: PulseEvent) => void): void {
  const ref = useRef(handler)
  useEffect(() => {
    ref.current = handler
  })
  useEffect(() => pulseBus.onArrival((event) => ref.current(event)), [])
}
