import type { ReactNode } from 'react'
import { CONNECTORS, EDGES } from './layout'

/** SVG layer: edges, animated flow hints, edge labels and satellite connectors. */
export function GraphEdges(): ReactNode {
  return (
    <g className="graph-edges">
      {CONNECTORS.map((connector) => (
        <path key={connector.id} d={connector.path} className="graph-connector" />
      ))}

      {EDGES.map((edge) => (
        <g key={edge.id}>
          <path id={edge.id} d={edge.path} className="graph-edge" />
          <path d={edge.path} className="graph-edge-flow" />
          <text x={edge.labelX} y={edge.labelY} className="graph-edge-label" textAnchor="middle">
            {edge.label}
          </text>
        </g>
      ))}
    </g>
  )
}
