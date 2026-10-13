import type { ReactNode } from 'react'
import { Activity, Pause, Play, Radio, Satellite } from 'lucide-react'
import { GlitchText } from '@/components/hud/GlitchText'
import { HudFrame } from '@/components/hud/HudFrame'
import { StatusChip } from '@/components/hud/StatusChip'
import { Button } from '@/components/ui/button'
import { useClock } from '@/hooks/useClock'
import { formatClock } from '@/lib/format'

export interface TopBarProps {
  projectName: string
  simulatorOn: boolean
  connectionLabel: string
  onToggleSimulator: () => void
  onManualDispatch: () => void
}

export function TopBar({
  projectName,
  simulatorOn,
  connectionLabel,
  onToggleSimulator,
  onManualDispatch,
}: TopBarProps): ReactNode {
  const now = useClock()

  return (
    <HudFrame
      scanlines={false}
      className="px-3 py-2"
      contentClassName="flex flex-wrap items-center gap-3"
    >
      <div className="flex items-center gap-2">
        <Satellite className="size-4 text-accent" />
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-wider">
            <GlitchText text={projectName} />
          </div>
          <div className="text-[0.55rem] tracking-[0.28em] text-muted-foreground uppercase">
            agent orchestra · phase 1
          </div>
        </div>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <StatusChip status={simulatorOn ? 'online' : 'idle'} label={connectionLabel} />
        <span className="hidden items-center gap-1.5 text-xs tracking-widest text-muted-foreground sm:inline-flex">
          <Activity className="size-3.5" />
          {formatClock(now)}
        </span>
        <Button variant="outline" size="sm" onClick={onManualDispatch} title="Emit a manual dispatch">
          <Radio />
          Ping
        </Button>
        <Button
          variant={simulatorOn ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleSimulator}
        >
          {simulatorOn ? <Pause /> : <Play />}
          {simulatorOn ? 'Sim on' : 'Sim off'}
        </Button>
      </div>
    </HudFrame>
  )
}
