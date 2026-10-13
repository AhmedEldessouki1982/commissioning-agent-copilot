import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ActivityLog } from '@/components/dashboard/ActivityLog'
import { StatCards } from '@/components/dashboard/StatCards'
import { TopBar } from '@/components/dashboard/TopBar'
import { ArchitectureGraph } from '@/components/graph/ArchitectureGraph'
import { SideDrawer, type DrawerTarget } from '@/components/graph/SideDrawer'
import { Background } from '@/components/hud/Background'
import { useActivityFeed } from '@/hooks/useActivityFeed'
import { useAgentRuntime } from '@/hooks/useAgentRuntime'
import { useEmitPulse } from '@/hooks/usePulseBus'
import { pulseBus } from '@/lib/pulse-bus'
import { AGENTS_BY_ID, ENGINEER_IDS, MANAGER_ID, agents } from '@/mock/architecture'
import { createSimulator, type Simulator } from '@/mock/simulator'

const PROJECT_NAME = 'COMMISSIONING ORCHESTRA'

export default function App(): ReactNode {
  const [simulatorOn, setSimulatorOn] = useState(true)
  const [target, setTarget] = useState<DrawerTarget | null>(null)

  const emit = useEmitPulse()
  const reset = useCallback(() => pulseBus.reset(), [])
  const { statuses, flashing } = useAgentRuntime(agents)
  const labelFor = useCallback((id: string) => AGENTS_BY_ID[id]?.shortName ?? id, [])
  const { entries, dispatched, completed } = useActivityFeed(labelFor)

  const simulatorRef = useRef<Simulator | null>(null)

  useEffect(() => {
    const simulator = createSimulator({ managerId: MANAGER_ID, agentIds: ENGINEER_IDS, emit, onReset: reset })
    simulatorRef.current = simulator
    return () => {
      simulator.stop()
      simulatorRef.current = null
    }
  }, [emit, reset])

  useEffect(() => {
    const simulator = simulatorRef.current
    if (!simulator) return
    if (simulatorOn) simulator.start()
    else simulator.stop()
  }, [simulatorOn])

  const handleManualDispatch = useCallback(() => {
    simulatorRef.current?.dispatchTo()
  }, [])

  const activeAgents = useMemo(
    () => Object.values(statuses).filter((status) => status === 'busy').length,
    [statuses],
  )

  const openAgent = target ? AGENTS_BY_ID[target.agentId] : undefined
  const drawerStatus = target
    ? (statuses[target.agentId] ?? openAgent?.status ?? 'idle')
    : 'idle'

  return (
    <div className="relative min-h-screen xl:h-screen xl:overflow-hidden">
      <Background />

      <div className="relative z-10 mx-auto flex min-h-screen flex-col gap-3 p-3 sm:p-4 xl:h-screen xl:min-h-0">
        <TopBar
          projectName={PROJECT_NAME}
          simulatorOn={simulatorOn}
          connectionLabel={simulatorOn ? 'simulated feed' : 'feed paused'}
          onToggleSimulator={() => setSimulatorOn((value) => !value)}
          onManualDispatch={handleManualDispatch}
        />

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="relative h-[58vh] min-h-[380px] overflow-hidden xl:h-auto xl:min-h-0">
            <ArchitectureGraph
              agents={agents}
              statuses={statuses}
              flashing={flashing}
              onOpenPanel={(agentId, panel) => setTarget({ agentId, panel })}
            />
          </section>

          <aside className="flex min-h-0 flex-col gap-3">
            <StatCards
              activeAgents={activeAgents}
              totalAgents={agents.length}
              dispatched={dispatched}
              completed={completed}
            />
            <ActivityLog entries={entries} className="h-[38vh] xl:h-auto xl:flex-1" />
          </aside>
        </div>
      </div>

      <SideDrawer
        target={target}
        agent={openAgent}
        status={drawerStatus}
        onClose={() => setTarget(null)}
      />
    </div>
  )
}
