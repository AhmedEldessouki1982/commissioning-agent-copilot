/**
 * Shared domain contract for Agent Orchestra.
 *
 * These are deliberately framework-agnostic (plain interfaces, no enums) so the
 * NestJS backend can import this exact contract over WebSocket/SSE without
 * translation. Types only — nothing here may emit runtime code.
 */

export type AgentStatus = 'online' | 'busy' | 'idle' | 'error'

/** Which "tier" an agent sits in the orchestration tree. */
export type AgentKind = 'manager' | 'engineer'

/** A capability an agent can execute during a commissioning scope. */
export interface Skill {
  id: string
  name: string
  /** Optional proficiency 0..1, used for weighting in later phases. */
  level?: number
}

/** The agent's job description / engagement terms. */
export interface Contract {
  id: string
  title: string
  role: string
  /** Markdown body rendered in the side drawer. */
  markdown: string
}

export interface Agent {
  /** Stable id used as PulseEvent.from / PulseEvent.to. */
  id: string
  /** Uppercase display name, e.g. "MECH ENGINEER". */
  name: string
  /** Compact label for the activity log, e.g. "MECH". */
  shortName: string
  kind: AgentKind
  /** One-line role description shown under the name. */
  role: string
  status: AgentStatus
  skills: Skill[]
  contract: Contract
  /** Parent agent id ("manager" delegates down); null for the manager. */
  parentId: string | null
}

/** The three pulse semantics travelling across the graph. */
export type PulseType = 'idle' | 'dispatch' | 'result'

/** A single message/energy event on the bus. */
export interface PulseEvent {
  id: string
  /** Agent emitting the pulse. */
  from: string
  /** Agent receiving the pulse. */
  to: string
  type: PulseType
  /** Monotonic task number assigned by the dispatcher. */
  taskId?: number
  /** Optional free-text label (procedure, work order, ...). */
  label?: string
  /** Epoch ms the pulse was emitted. */
  at: number
}

/** One line in the terminal-style activity log. */
export interface ActivityLogEntry {
  id: string
  at: number
  /** Pre-rendered terminal line, e.g. "[09:42:11] MANAGER → I&C: dispatch #12". */
  text: string
  type: PulseType
}
