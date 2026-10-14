import type { ReactNode } from 'react'
import { useFitScale } from '@/hooks/useFitScale'
import type { Agent, AgentStatus } from '@orchestra/contract'
import { AgentNode } from './AgentNode'
import { GraphEdges } from './GraphEdges'
import { PulseLayer } from './PulseLayer'
import { SatelliteNode } from './SatelliteNode'
import { AGENT_NODES, CANVAS, SATELLITES, type PanelKey } from './layout'

export interface ArchitectureGraphProps {
  agents: readonly Agent[]
  statuses: Record<string, AgentStatus>
  flashing: ReadonlySet<string>
  onOpenPanel: (agentId: string, panel: PanelKey) => void
}

/**
 * The hero view. A fixed logical canvas (SVG edges + HTML/Motion nodes) is
 * scaled to fit the viewport, so every layer stays in perfect registration.
 */
export function ArchitectureGraph({
  agents,
  statuses,
  flashing,
  onOpenPanel,
}: ArchitectureGraphProps): ReactNode {
  const [ref, scale] = useFitScale(CANVAS.width, CANVAS.height)
  const byId: Record<string, Agent> = Object.fromEntries(agents.map((a) => [a.id, a]))

  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden">
      <div
        className="absolute top-1/2 left-1/2"
        style={{
          width: CANVAS.width,
          height: CANVAS.height,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        <svg
          width={CANVAS.width}
          height={CANVAS.height}
          viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
          className="absolute inset-0"
        >
          <GraphEdges />
          <PulseLayer />
        </svg>

        {AGENT_NODES.map((node) => {
          const agent = byId[node.id]
          if (!agent) return null
          return (
            <AgentNode
              key={node.id}
              agent={agent}
              layout={node}
              status={statuses[node.id] ?? agent.status}
              flashing={flashing.has(node.id)}
            />
          )
        })}

        {SATELLITES.map((satellite) => {
          const agent = byId[satellite.agentId]
          if (!agent) return null
          return (
            <SatelliteNode
              key={satellite.id}
              agent={agent}
              layout={satellite}
              onOpen={onOpenPanel}
            />
          )
        })}
      </div>
    </div>
  )
}
