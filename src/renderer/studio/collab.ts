/**
 * **Real-time collaboration** — the pure conflict-resolution + presence model that
 * lets two designers edit one design at once. Edits are field-level `CollabOp`s
 * stamped with a Lamport clock + author; `mergeOps` resolves concurrent edits
 * last-writer-wins (per field), and the presence model tracks who's live. The wire
 * transport (a websocket relay) is external infra — this is the merge/presence core
 * a transport plugs into, and it's unit-tested (deterministic, no DOM).
 */

/** A single field edit: `path` is a dot-key into the doc, stamped for ordering. */
export interface CollabOp {
  path: string
  value: unknown
  /** Lamport timestamp — monotonic across the session. */
  ts: number
  author: string
}

/** Advance a local Lamport clock on receiving a remote timestamp. Pure. */
export function nextLamport(local: number, remote = 0): number {
  return Math.max(local, remote) + 1
}

/**
 * Merge concurrent op streams last-writer-wins per field: for each `path`, the op
 * with the highest `ts` wins (ties broken by author id, so all peers converge to the
 * SAME result regardless of receive order). Returns one winning op per path, ordered
 * by ts then path. Pure + deterministic.
 */
export function mergeOps(...streams: CollabOp[][]): CollabOp[] {
  const winner = new Map<string, CollabOp>()
  for (const stream of streams)
    for (const op of stream) {
      const cur = winner.get(op.path)
      if (!cur || op.ts > cur.ts || (op.ts === cur.ts && op.author > cur.author)) winner.set(op.path, op)
    }
  return [...winner.values()].sort((a, b) => a.ts - b.ts || (a.path < b.path ? -1 : 1))
}

/** Apply ops to a flat record in place (dot-paths are treated as flat keys). Pure. */
export function applyOps(state: Record<string, unknown>, ops: CollabOp[]): Record<string, unknown> {
  for (const op of ops) state[op.path] = op.value
  return state
}

export interface Presence {
  author: string
  /** A stable colour for the peer's cursor/badge. */
  color: number
  /** Last activity timestamp (ms). */
  lastSeen: number
}

/** The peers still considered live — seen within `timeoutMs` of `now`. Pure. */
export function activePeers(peers: Presence[], now: number, timeoutMs = 15000): Presence[] {
  return peers.filter((p) => now - p.lastSeen <= timeoutMs).sort((a, b) => (a.author < b.author ? -1 : 1))
}

/** A deterministic peer colour from an author id (so a name always maps to one hue). Pure. */
export function peerColor(author: string): number {
  let h = 0
  for (let i = 0; i < author.length; i++) h = (h * 31 + author.charCodeAt(i)) >>> 0
  // spread around the hue wheel, mid saturation/lightness → a readable badge colour
  const hue = h % 360
  return hslToHex(hue, 0.6, 0.55)
}

function hslToHex(h: number, s: number, l: number): number {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return (Math.round((r + m) * 255) << 16) | (Math.round((g + m) * 255) << 8) | Math.round((b + m) * 255)
}
