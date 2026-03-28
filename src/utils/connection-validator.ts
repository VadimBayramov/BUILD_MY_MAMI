import type { Connection, Screen } from '@typedefs/funnel';

// ── Types ─────────────────────────────────────────────────────────────────

export type ConnectionStatus =
  | 'default-path'   // isDefault=true, condition=null, no cycle → main path
  | 'conditional'    // condition !== null
  | 'plain'          // isDefault=false, condition=null
  | 'self-loop'      // source === target
  | 'in-cycle'       // part of a cycle on the default path
  | 'error';         // duplicate isDefault from same source

export type ScreenStatus =
  | 'ok'
  | 'start'
  | 'dead-end'           // no outgoing, not a terminal type
  | 'unreachable'        // no path from startScreen reaches this screen
  | 'in-cycle'           // lies on a circular default path
  | 'duplicate-default'; // two+ (isDefault=true, condition=null) outgoing

export interface ConnectionDiagnostic {
  status: ConnectionStatus;
  errorReason?: string;
}

export interface ScreenDiagnostic {
  statuses: Set<ScreenStatus>;
  outgoingCount: number;
  incomingCount: number;
  defaultCount: number;
}

export interface ConnectionDiagnostics {
  connections: Record<string, ConnectionDiagnostic>;
  screens: Record<string, ScreenDiagnostic>;
}

const TERMINAL_TYPES = new Set(['result', 'paywall']);

// ── Cycle detection on default path ──────────────────────────────────────

function detectDefaultPathCycles(connections: Connection[]): {
  cycleScreenIds: Set<string>;
  cycleConnIds: Set<string>;
} {
  // Build map: screenId → default outgoing connection
  const defaultNext = new Map<string, Connection>();
  for (const c of connections) {
    if (c.isDefault && c.condition === null && c.from !== c.to) {
      // first default wins (duplicates handled separately)
      if (!defaultNext.has(c.from)) defaultNext.set(c.from, c);
    }
  }

  const cycleScreenIds = new Set<string>();
  const cycleConnIds = new Set<string>();
  const globalVisited = new Set<string>();

  for (const startId of defaultNext.keys()) {
    if (globalVisited.has(startId)) continue;

    const pathOrder: string[] = [];
    const pathSet = new Set<string>();
    let current: string | undefined = startId;

    while (current && defaultNext.has(current)) {
      if (pathSet.has(current)) {
        // Found a cycle — mark every screen from `current` to end of path
        let inCycle = false;
        for (const s of pathOrder) {
          if (s === current) inCycle = true;
          if (inCycle) {
            cycleScreenIds.add(s);
            const conn = defaultNext.get(s);
            if (conn) cycleConnIds.add(conn.id);
          }
        }
        cycleScreenIds.add(current);
        break;
      }
      if (globalVisited.has(current)) break;

      pathSet.add(current);
      pathOrder.push(current);
      current = defaultNext.get(current)?.to;
    }

    for (const s of pathOrder) globalVisited.add(s);
  }

  return { cycleScreenIds, cycleConnIds };
}

// ── Reachability BFS from start ───────────────────────────────────────────

function findReachableScreens(
  screenIds: string[],
  connections: Connection[],
  startScreenId: string,
): Set<string> {
  const adj = new Map<string, string[]>();
  for (const id of screenIds) adj.set(id, []);
  for (const c of connections) {
    if (c.from !== c.to) {
      adj.get(c.from)?.push(c.to);
    }
  }

  const reachable = new Set<string>();
  const queue = [startScreenId];
  reachable.add(startScreenId);

  while (queue.length > 0) {
    const node = queue.shift()!;
    for (const neighbor of adj.get(node) ?? []) {
      if (!reachable.has(neighbor)) {
        reachable.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return reachable;
}

// ── Main validator ────────────────────────────────────────────────────────

export function validateConnections(
  screens: Record<string, Screen>,
  connections: Connection[],
  startScreenId: string,
): ConnectionDiagnostics {
  const screenIds = Object.keys(screens);

  // ── Pre-pass: cycles + reachability ─────────────────────────────────────
  const { cycleScreenIds, cycleConnIds } = detectDefaultPathCycles(connections);
  const reachable = findReachableScreens(screenIds, connections, startScreenId);

  // ── Pass 1: per-screen counters ─────────────────────────────────────────
  const outgoing: Record<string, Connection[]> = {};
  const incoming: Record<string, number> = {};
  for (const id of screenIds) { outgoing[id] = []; incoming[id] = 0; }

  for (const conn of connections) {
    outgoing[conn.from]?.push(conn);
    if (conn.from !== conn.to && incoming[conn.to] !== undefined) incoming[conn.to]!++;
  }

  // ── Pass 2: per-connection status ────────────────────────────────────────
  const connResult: Record<string, ConnectionDiagnostic> = {};
  const defaultSeen = new Set<string>();

  for (const conn of connections) {
    // Self-loop
    if (conn.from === conn.to) {
      connResult[conn.id] = { status: 'self-loop', errorReason: 'Self-loop: screen connects to itself' };
      continue;
    }
    // In a default-path cycle
    if (cycleConnIds.has(conn.id)) {
      connResult[conn.id] = { status: 'in-cycle', errorReason: 'Circular path: users will loop forever' };
      continue;
    }
    // Conditional branch
    if (conn.condition !== null) {
      connResult[conn.id] = { status: 'conditional' };
      continue;
    }
    // Default path — only first per source is valid
    if (conn.isDefault) {
      if (defaultSeen.has(conn.from)) {
        connResult[conn.id] = { status: 'error', errorReason: 'Duplicate default: only one default path allowed per screen' };
      } else {
        defaultSeen.add(conn.from);
        connResult[conn.id] = { status: 'default-path' };
      }
      continue;
    }
    connResult[conn.id] = { status: 'plain' };
  }

  // ── Pass 3: per-screen diagnostics ──────────────────────────────────────
  const screenResult: Record<string, ScreenDiagnostic> = {};

  for (const id of screenIds) {
    const screen = screens[id]!;
    const out = outgoing[id] ?? [];
    const defaultCount = out.filter((c) => c.isDefault && c.condition === null).length;
    const statuses = new Set<ScreenStatus>();

    if (id === startScreenId) statuses.add('start');
    if (cycleScreenIds.has(id)) statuses.add('in-cycle');
    if (!reachable.has(id) && id !== startScreenId) statuses.add('unreachable');
    if (defaultCount > 1) {
      statuses.add('duplicate-default');
    } else if (out.filter((c) => c.from !== c.to).length === 0 && !TERMINAL_TYPES.has(screen.type)) {
      statuses.add('dead-end');
    }

    if (statuses.size === 0 || (statuses.size === 1 && statuses.has('start'))) {
      statuses.add('ok');
    }

    screenResult[id] = {
      statuses,
      outgoingCount: out.length,
      incomingCount: incoming[id] ?? 0,
      defaultCount,
    };
  }

  return { connections: connResult, screens: screenResult };
}

// ── Connect-time guards ───────────────────────────────────────────────────

export function shouldBeDefault(fromId: string, connections: Connection[]): boolean {
  return !connections.some((c) => c.from === fromId && c.from !== c.to);
}

export function isDuplicateConnection(from: string, to: string, connections: Connection[]): boolean {
  return connections.some((c) => c.from === from && c.to === to);
}
