import type { Agent, Contract, Skill } from '@/types/agents'

/**
 * Static architecture definition for Phase 1.
 *
 * In Phase 2 the NestJS backend will serve this (and live statuses) — the shape
 * is intentionally identical to `src/types/agents.ts` on the backend side.
 *
 * The wording is real commissioning scope, not filler.
 */

const skill = (id: string, name: string, level?: number): Skill =>
  level === undefined ? { id, name } : { id, name, level }

const contract = (agent: string, title: string, role: string, body: string): Contract => ({
  id: `contract-${agent}`,
  title,
  role,
  markdown: body,
})

export const MANAGER_ID = 'manager'

export const agents: Agent[] = [
  {
    id: MANAGER_ID,
    name: 'MANAGER',
    shortName: 'MANAGER',
    kind: 'manager',
    role: 'Commissioning Manager · orchestration',
    status: 'online',
    parentId: null,
    skills: [
      skill('m-scope', 'Scope & sequence control (L3 → L4)', 1),
      skill('m-dispatch', 'Work-package dispatch & resource levelling', 0.95),
      skill('m-punch', 'Punch-list governance & turnover approval', 0.9),
      skill('m-risk', 'Commissioning risk register ownership', 0.85),
      skill('m-sched', 'P6 schedule integration & look-ahead', 0.9),
    ],
    contract: contract(
      MANAGER_ID,
      'Commissioning Manager — Engagement',
      'Orchestrates all discipline sub-agents',
      [
        '# Commissioning Manager',
        '',
        '**Reports to:** Project Manager (EPC).',
        '',
        '## Mandate',
        'Own the commissioning execution plan from mechanical completion through',
        'reliability run. Dispatch work packages to discipline sub-agents, arbitrate',
        'interfaces, and hold the acceptance gate for every system turnover.',
        '',
        '## Responsibilities',
        '- Maintain the L3/L4 commissioning schedule and weekly look-ahead.',
        '- Dispatch scoped tasks per discipline and verify returned evidence.',
        '- Chair daily commissioning coordination and interface meetings.',
        '- Approve subsystem turnover dossiers before client walk-down.',
        '- Escalate HSE and schedule risks with mitigation options.',
      ].join('\n'),
    ),
  },
  {
    id: 'mech',
    name: 'MECH ENGINEER',
    shortName: 'MECH',
    kind: 'engineer',
    role: 'Mechanical Commissioning Engineer · employee-1',
    status: 'idle',
    parentId: MANAGER_ID,
    skills: [
      skill('mech-align', 'Pump & fan shaft alignment / vibration', 1),
      skill('mech-blow', 'Steam blow & air blow of piping systems', 0.95),
      skill('mech-hydro', 'HRSG & BOP hydrostatic testing', 0.9),
      skill('mech-hanger', 'Pipe stress & spring-hanger verification', 0.85),
      skill('mech-valve', 'Valve stroke, packing & relief testing', 0.9),
    ],
    contract: contract(
      'mech',
      'Mechanical Commissioning Engineer — Engagement',
      'Static & rotating mechanical systems',
      [
        '# Mechanical Commissioning Engineer',
        '',
        '**Discipline:** Mechanical (static, rotating, piping).',
        '',
        '## Scope of work',
        '- Pre-commissioning of pumps, fans, compressors and their auxiliaries.',
        '- Flushing, steam blow and air blow of process and utility systems.',
        '- Hydrostatic / pneumatic pressure testing and leak checks.',
        '- Verification of pipe alignment, supports and spring hangers.',
        '- Produce as-built test records feeding the turnover dossier.',
        '',
        '## Acceptance criteria',
        'All mechanical datasheets met, vibration within ISO 10816 limits, no leaks',
        'at hold points, and signed discipline check sheets returned to the Manager.',
      ].join('\n'),
    ),
  },
  {
    id: 'ic',
    name: 'I&C ENGINEER',
    shortName: 'I&C',
    kind: 'engineer',
    role: 'Instrumentation & Control Engineer · employee-2',
    status: 'idle',
    parentId: MANAGER_ID,
    skills: [
      skill('ic-loop', 'Loop checks (4-20 mA / HART)', 1),
      skill('ic-logic', 'Logic & interlock function tests', 0.95),
      skill('ic-sis', 'SIS & burner management (BMS) proving', 0.9),
      skill('ic-dcs', 'DCS I/O, graphics & alarm verification', 0.9),
      skill('ic-cal', 'Calibration of TT / PT / FT / LT', 0.95),
    ],
    contract: contract(
      'ic',
      'I&C Commissioning Engineer — Engagement',
      'Instruments, DCS and safety systems',
      [
        '# Instrumentation & Control Commissioning Engineer',
        '',
        '**Discipline:** Instruments, control, safety instrumented systems.',
        '',
        '## Scope of work',
        '- Loop checking from field device to DCS/HMI, including documentation.',
        '- Function testing of logic, interlocks and permissives.',
        '- Proof testing of SIS, burner management and ESD systems.',
        '- Verification of alarm, trend and faceplate graphics.',
        '- Calibration records for all transmitters and switches.',
        '',
        '## Acceptance criteria',
        'Every loop passes an end-to-end check with signed loop folder; cause &',
        'effect matrix demonstrated for all safety functions.',
      ].join('\n'),
    ),
  },
  {
    id: 'elec',
    name: 'ELEC ENGINEER',
    shortName: 'ELEC',
    kind: 'engineer',
    role: 'Electrical Commissioning Engineer · employee-3',
    status: 'idle',
    parentId: MANAGER_ID,
    skills: [
      skill('elec-relay', 'Protection relay testing (IEEE C37 / IEC 60255)', 1),
      skill('elec-hipot', 'Hi-pot & insulation resistance testing', 0.9),
      skill('elec-swgr', 'MV / LV switchgear commissioning', 0.95),
      skill('elec-gen', 'Generator protection, AVR & synchronization', 0.9),
      skill('elec-earth', 'Earthing, bonding & lightning protection', 0.85),
    ],
    contract: contract(
      'elec',
      'Electrical Commissioning Engineer — Engagement',
      'Power distribution, protection and generators',
      [
        '# Electrical Commissioning Engineer',
        '',
        '**Discipline:** HV/MV/LV power, protection, generation.',
        '',
        '## Scope of work',
        '- Secondary injection testing of protection relays and schemes.',
        '- Insulation resistance and Hi-pot testing of cables and busbars.',
        '- Energization and functional checkout of MV/LV switchgear.',
        '- Generator protection, AVR and synchronization checks.',
        '- Earthing, bonding and LPS continuity verification.',
        '',
        '## Acceptance criteria',
        'Protection settings verified against the coordination study, all test',
        'certificates issued, and safe energization witnessed and signed off.',
      ].join('\n'),
    ),
  },
]

export const AGENTS_BY_ID: Readonly<Record<string, Agent>> = Object.fromEntries(
  agents.map((a) => [a.id, a]),
)

export const ENGINEER_IDS: readonly string[] = agents
  .filter((a) => a.kind === 'engineer')
  .map((a) => a.id)
