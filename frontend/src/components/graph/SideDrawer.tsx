import type { ReactNode } from 'react'
import { StatusChip } from '@/components/hud/StatusChip'
import { MarkdownLite } from '@/components/ui/markdown-lite'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { Agent, AgentStatus } from '@/types/agents'
import type { PanelKey } from './layout'

export interface DrawerTarget {
  agentId: string
  panel: PanelKey
}

export interface SideDrawerProps {
  target: DrawerTarget | null
  agent: Agent | undefined
  status: AgentStatus
  onClose: () => void
}

function SkillsList({ agent }: { agent: Agent }): ReactNode {
  return (
    <ul className="mt-1 space-y-2.5">
      {agent.skills.map((skill) => (
        <li key={skill.id} className="space-y-1">
          <div className="flex items-center justify-between gap-3 text-xs text-foreground/90">
            <span>{skill.name}</span>
            {skill.level !== undefined ? (
              <span className="text-[0.6rem] text-muted-foreground">
                {Math.round(skill.level * 100)}%
              </span>
            ) : null}
          </div>
          {skill.level !== undefined ? (
            <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-accent"
                style={{
                  width: `${Math.round(skill.level * 100)}%`,
                  boxShadow: '0 0 8px var(--accent-glow)',
                }}
              />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

/** Side drawer (shadcn Sheet) showing an agent's Skills or Contract. */
export function SideDrawer({ target, agent, status, onClose }: SideDrawerProps): ReactNode {
  const open = target !== null && agent !== undefined
  const panel: PanelKey = target?.panel ?? 'skills'

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <SheetContent
        side="right"
        className="border-l-[color-mix(in_oklab,var(--accent)_30%,var(--border))]"
      >
        {agent ? (
          <>
            <SheetHeader>
              <span className="text-[0.55rem] tracking-[0.3em] text-muted-foreground uppercase">
                {panel === 'skills' ? 'Capabilities' : 'Job description'}
              </span>
              <SheetTitle className="flex items-center gap-2">
                {agent.name}
                <StatusChip status={status} static />
              </SheetTitle>
              <SheetDescription>{agent.role}</SheetDescription>
            </SheetHeader>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {panel === 'skills' ? (
                <SkillsList agent={agent} />
              ) : (
                <MarkdownLite source={agent.contract.markdown} />
              )}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
