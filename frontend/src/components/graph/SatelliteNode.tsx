import type { ReactNode } from 'react'
import { FileText, Wrench } from 'lucide-react'
import { HudFrame } from '@/components/hud/HudFrame'
import type { Agent } from '@/types/agents'
import type { PanelKey, SatelliteLayout } from './layout'

export interface SatelliteNodeProps {
  agent: Agent
  layout: SatelliteLayout
  onOpen: (agentId: string, panel: PanelKey) => void
}

const META: Record<PanelKey, { label: string; Icon: typeof Wrench }> = {
  skills: { label: 'Skills', Icon: Wrench },
  contract: { label: 'Contract', Icon: FileText },
}

/** Small attached node (Skills / Contract) that opens the side drawer. */
export function SatelliteNode({ agent, layout, onOpen }: SatelliteNodeProps): ReactNode {
  const { label, Icon } = META[layout.panel]
  const meta = layout.panel === 'skills' ? `${agent.skills.length}` : 'JD'

  return (
    <button
      type="button"
      className="absolute -translate-x-1/2 -translate-y-1/2 text-left"
      style={{ left: layout.x, top: layout.y, width: layout.width }}
      onClick={() => onOpen(agent.id, layout.panel)}
      aria-label={`Open ${label} for ${agent.name}`}
    >
      <HudFrame interactive scanlines={false} className="flex items-center gap-2 px-2 py-1.5">
        <Icon className="size-3.5 text-accent" />
        <span className="text-[0.6rem] tracking-wider text-foreground/90 uppercase">{label}</span>
        <span className="ml-auto text-[0.55rem] tracking-wider text-muted-foreground">{meta}</span>
      </HudFrame>
    </button>
  )
}
