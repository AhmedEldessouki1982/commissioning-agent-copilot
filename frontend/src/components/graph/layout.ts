import { ENGINEER_IDS, MANAGER_ID } from '@/mock/architecture'

/** Fixed logical canvas. Both the SVG and HTML layers live inside it. */
export const CANVAS = { width: 1200, height: 600 } as const

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface GraphNodeLayout extends Rect {
  id: string
}

export type PanelKey = 'skills' | 'contract'

export interface SatelliteLayout extends Rect {
  id: string
  agentId: string
  panel: PanelKey
}

export interface EdgeLayout {
  id: string
  from: string
  to: string
  /** Forward path, source → target. */
  path: string
  label: string
  labelX: number
  labelY: number
}

export interface ConnectorLayout {
  id: string
  path: string
}

const MANAGER_HALF_W = 120
const MANAGER_HALF_H = 52

export const MANAGER_NODE: GraphNodeLayout = {
  id: MANAGER_ID,
  x: 600,
  y: 82,
  width: MANAGER_HALF_W * 2,
  height: MANAGER_HALF_H * 2,
}

const ENGINEER_X: Record<string, number> = { mech: 212, ic: 600, elec: 988 }
const EMPLOYEE_LABEL: Record<string, string> = {
  mech: 'employee-1',
  ic: 'employee-2',
  elec: 'employee-3',
}

export const ENGINEER_NODES: GraphNodeLayout[] = ENGINEER_IDS.map((id) => ({
  id,
  x: ENGINEER_X[id] ?? 600,
  y: 322,
  width: 224,
  height: 122,
}))

export const AGENT_NODES: GraphNodeLayout[] = [MANAGER_NODE, ...ENGINEER_NODES]

const SATELLITE = { width: 138, height: 38 }
export const SATELLITES: SatelliteLayout[] = []

for (const panel of ['skills', 'contract'] as const) {
  SATELLITES.push({
    id: `${MANAGER_ID}:${panel}`,
    agentId: MANAGER_ID,
    panel,
    x: 812,
    y: panel === 'skills' ? 58 : 106,
    ...SATELLITE,
  })
}
for (const node of ENGINEER_NODES) {
  SATELLITES.push({
    id: `${node.id}:skills`,
    agentId: node.id,
    panel: 'skills',
    x: node.x - 88,
    y: 462,
    ...SATELLITE,
  })
  SATELLITES.push({
    id: `${node.id}:contract`,
    agentId: node.id,
    panel: 'contract',
    x: node.x + 88,
    y: 462,
    ...SATELLITE,
  })
}

/** Smooth vertical cubic between two anchor points. */
function linkPath(x1: number, y1: number, x2: number, y2: number, k = 0.55): string {
  const dy = y2 - y1
  return `M ${x1} ${y1} C ${x1} ${y1 + dy * k}, ${x2} ${y2 - dy * k}, ${x2} ${y2}`
}

const managerBottom = MANAGER_NODE.y + MANAGER_NODE.height / 2

export const EDGES: EdgeLayout[] = ENGINEER_NODES.map((node) => {
  const startX = MANAGER_NODE.x
  const startY = managerBottom
  const endX = node.x
  const endY = node.y - node.height / 2
  return {
    id: `${MANAGER_ID}->${node.id}`,
    from: MANAGER_ID,
    to: node.id,
    path: linkPath(startX, startY, endX, endY),
    label: `sub-agent / ${EMPLOYEE_LABEL[node.id] ?? 'employee'}`,
    labelX: (startX + endX) / 2,
    labelY: (startY + endY) / 2,
  }
})

/** Static lines from an agent card to its Skills/Contract satellites. */
export const CONNECTORS: ConnectorLayout[] = []

CONNECTORS.push({
  id: `conn-${MANAGER_ID}-skills`,
  path: `M ${MANAGER_NODE.x + MANAGER_HALF_W} ${MANAGER_NODE.y - 14} L ${812 - SATELLITE.width / 2} ${58} `,
})
CONNECTORS.push({
  id: `conn-${MANAGER_ID}-contract`,
  path: `M ${MANAGER_NODE.x + MANAGER_HALF_W} ${MANAGER_NODE.y + 14} L ${812 - SATELLITE.width / 2} ${106}`,
})
for (const node of ENGINEER_NODES) {
  const bottom = node.y + node.height / 2
  CONNECTORS.push({
    id: `conn-${node.id}-skills`,
    path: `M ${node.x} ${bottom} L ${node.x - 88} ${462 - SATELLITE.height / 2}`,
  })
  CONNECTORS.push({
    id: `conn-${node.id}-contract`,
    path: `M ${node.x} ${bottom} L ${node.x + 88} ${462 - SATELLITE.height / 2}`,
  })
}

const NODE_BY_ID: Record<string, GraphNodeLayout> = Object.fromEntries(
  AGENT_NODES.map((n) => [n.id, n]),
)

export interface PulseRoute {
  path: string
  /** true when the pulse travels against the drawn edge direction. */
  reverse: boolean
}

/**
 * Resolves the travel path for a pulse between two agents. Manager↔engineer
 * follow the drawn edges (either direction); anything else falls back to a
 * direct vertical link so the bus stays flexible.
 */
export function pulseRoute(from: string, to: string): PulseRoute | null {
  const forward = EDGES.find((e) => e.from === from && e.to === to)
  if (forward) return { path: forward.path, reverse: false }
  const reverse = EDGES.find((e) => e.from === to && e.to === from)
  if (reverse) return { path: reverse.path, reverse: true }

  const a = NODE_BY_ID[from]
  const b = NODE_BY_ID[to]
  if (!a || !b) return null
  const downward = a.y < b.y
  const startY = downward ? a.y + a.height / 2 : a.y - a.height / 2
  const endY = downward ? b.y - b.height / 2 : b.y + b.height / 2
  return { path: linkPath(a.x, startY, b.x, endY), reverse: false }
}
