import type { ReactNode } from 'react'
import { Terminal } from 'lucide-react'
import { HudFrame } from '@/components/hud/HudFrame'
import { cn } from '@/lib/utils'
import type { ActivityLogEntry, PulseType } from '@/types/agents'

const TYPE_COLOR: Record<PulseType, string> = {
  dispatch: 'var(--pulse-dispatch)',
  result: 'var(--pulse-result)',
  idle: 'var(--pulse-idle)',
}

export interface ActivityLogProps {
  entries: ActivityLogEntry[]
  className?: string
}

/** Terminal-style live log. Newest entry on top. */
export function ActivityLog({ entries, className }: ActivityLogProps): ReactNode {
  return (
    <HudFrame
      className={cn('min-h-0', className)}
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Terminal className="size-3.5 text-accent" />
        <span className="text-[0.55rem] tracking-[0.28em] text-muted-foreground uppercase">
          activity log
        </span>
        <span className="ml-auto text-[0.55rem] tracking-wider text-muted-foreground tabular-nums">
          {entries.length}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[0.7rem] leading-relaxed">
        {entries.length === 0 ? (
          <p className="text-muted-foreground">awaiting pulse traffic…</p>
        ) : (
          <ul className="space-y-0.5">
            {entries.map((entry) => (
              <li key={entry.id} className="hud-log-line truncate" title={entry.text}>
                <span style={{ color: TYPE_COLOR[entry.type] }}>{entry.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </HudFrame>
  )
}
