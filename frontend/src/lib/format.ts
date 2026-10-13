/** Format an epoch (ms) or Date as a 24h wall clock `HH:MM:SS`. */
export function formatClock(input: number | Date): string {
  const d = input instanceof Date ? input : new Date(input)
  return d.toLocaleTimeString('en-GB', { hour12: false })
}

/** Format a task number as `#12`. */
export function formatTask(taskId?: number): string {
  return taskId === undefined ? '' : `#${taskId}`
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
