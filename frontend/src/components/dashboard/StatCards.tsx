import type { ReactNode } from 'react'
import { Bot, CircleCheckBig, Send } from 'lucide-react'
import { HudFrame } from '@/components/hud/HudFrame'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: number
  hint: string
  Icon: typeof Bot
  accent?: boolean
}

function StatCard({ label, value, hint, Icon, accent = false }: StatCardProps): ReactNode {
  return (
    <HudFrame className="flex-1 px-3 py-2" glow={accent}>
      <div className="flex items-center justify-between">
        <span className="text-[0.55rem] tracking-[0.24em] text-muted-foreground uppercase">
          {label}
        </span>
        <Icon className={cn('size-3.5', accent ? 'text-accent' : 'text-muted-foreground')} />
      </div>
      <div className="mt-1 text-2xl leading-none font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-[0.58rem] tracking-wider text-muted-foreground uppercase">
        {hint}
      </div>
    </HudFrame>
  )
}

export interface StatCardsProps {
  activeAgents: number
  totalAgents: number
  dispatched: number
  completed: number
}

export function StatCards({
  activeAgents,
  totalAgents,
  dispatched,
  completed,
}: StatCardsProps): ReactNode {
  return (
    <div className="flex gap-3">
      <StatCard
        label="Active agents"
        value={activeAgents}
        hint={`of ${totalAgents} online`}
        Icon={Bot}
        accent={activeAgents > 0}
      />
      <StatCard label="Dispatched" value={dispatched} hint="tasks assigned" Icon={Send} />
      <StatCard label="Completed" value={completed} hint="results returned" Icon={CircleCheckBig} />
    </div>
  )
}
