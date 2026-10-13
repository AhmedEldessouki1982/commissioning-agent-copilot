import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { AgentStatus } from '@/types/agents'

const STATUS_META: Record<AgentStatus, { label: string; color: string }> = {
  online: { label: 'ONLINE', color: 'var(--status-online)' },
  busy: { label: 'BUSY', color: 'var(--status-busy)' },
  idle: { label: 'IDLE', color: 'var(--status-idle)' },
  error: { label: 'ERROR', color: 'var(--status-error)' },
}

export interface StatusChipProps {
  status: AgentStatus
  label?: string
  /** Disable the pulsing ring (used in dense/dense contexts). */
  static?: boolean
  className?: string
}

/** Compact status pill with a color-coded, pulsing dot. */
export function StatusChip({
  status,
  label,
  static: isStatic = false,
  className,
}: StatusChipProps): ReactNode {
  const meta = STATUS_META[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-[0.62rem] font-medium tracking-wider uppercase',
        className,
      )}
      style={{
        color: meta.color,
        borderColor: `color-mix(in oklab, ${meta.color} 45%, transparent)`,
        background: `color-mix(in oklab, ${meta.color} 12%, transparent)`,
      }}
    >
      <span
        className={cn('hud-dot', isStatic && 'hud-dot--static')}
        style={{ ['--dot-color' as string]: meta.color }}
        aria-hidden
      />
      {label ?? meta.label}
    </span>
  )
}
