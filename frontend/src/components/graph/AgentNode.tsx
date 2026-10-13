import type { ReactNode } from 'react'
import { Cpu, Server } from 'lucide-react'
import { GlitchText } from '@/components/hud/GlitchText'
import { HudFrame } from '@/components/hud/HudFrame'
import { StatusChip } from '@/components/hud/StatusChip'
import { cn } from '@/lib/utils'
import type { Agent, AgentStatus } from '@/types/agents'
import type { GraphNodeLayout } from './layout'

export interface AgentNodeProps {
  agent: Agent
  layout: GraphNodeLayout
  status: AgentStatus
  flashing: boolean
}

/** An agent card: name, role, status chip + arrival ripple. */
export function AgentNode({ agent, layout, status, flashing }: AgentNodeProps): ReactNode {
  const isManager = agent.kind === 'manager'
  const busy = status === 'busy'

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: layout.x, top: layout.y, width: layout.width }}
    >
      <HudFrame glow={busy || flashing} className={cn('px-3 py-2.5', isManager && 'px-4 py-3')}>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[0.55rem] tracking-[0.28em] text-muted-foreground uppercase">
            {isManager ? (
              <Server className="size-3.5 text-accent" />
            ) : (
              <Cpu className="size-3.5 text-muted-foreground" />
            )}
            {isManager ? 'orchestrator' : 'sub-agent'}
          </span>
          <StatusChip status={status} static={status === 'idle' || status === 'error'} />
        </div>

        <div className={cn('mt-1.5 font-semibold tracking-wide', isManager ? 'text-base' : 'text-sm')}>
          {isManager ? <GlitchText text={agent.name} /> : agent.name}
        </div>
        <div className="mt-0.5 text-[0.62rem] leading-tight text-muted-foreground">{agent.role}</div>

        <div className="mt-2 flex items-center gap-3 text-[0.55rem] tracking-wider text-muted-foreground uppercase">
          <span>{agent.skills.length} skills</span>
          <span className="text-border">|</span>
          <span>contract</span>
        </div>
      </HudFrame>

      {flashing ? <span className="node-ripple" aria-hidden /> : null}
    </div>
  )
}
