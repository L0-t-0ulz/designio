import * as THREE from 'three'

/**
 * Weave draft designer — author a fabric's interlacement the way a weaver does,
 * with a real loom draft:
 *
 * - **threading** — which shaft (harness) each warp end is drawn through,
 * - **tie-up** — which shafts each treadle lifts,
 * - **treadling** — which treadle each weft pick presses.
 *
 * Those three pure inputs give the **drawdown** — the grid of warp-over /
 * weft-over interlacements that *is* the weave structure. The drawdown (plus
 * wrapped float lengths — a float is a thread skipping over several crossing
 * threads, what makes a satin glossy and a twill diagonal) drives a height
 * field in the same idiom as `weaveTexture`, baked into a tiling normal +
 * roughness map that replaces the fabric preset's procedural weave.
 *
 * All the math is pure so it's unit-tested in Node; only the `make*Map` bakes
 * touch the DOM.
 */

export interface WeaveDraft {
  /** Number of shafts (harnesses), 2–8. */
  shafts: number
  /** Number of treadles, 2–8. */
  treadles: number
  /** Warp end → shaft (0-based), left→right; the sequence tiles across the warp. */
  threading: number[]
  /** `tieUp[treadle][shaft]` — true = pressing that treadle lifts that shaft. */
  tieUp: boolean[][]
  /** Weft pick → treadle (0-based), bottom→top; the sequence tiles up the cloth. */
  treadling: number[]
}

export const MAX_SHAFTS = 8
export const MAX_ENDS = 32

/**
 * Validate a draft's structure. Returns a human-readable problem, or null if
 * the draft is weavable. A treadle that lifts no shaft (or every shaft) leaves
 * its pick floating unbound across the full width — real cloth would fall
 * apart there, so it's rejected (only treadles the treadling actually uses).
 */
export function validateDraft(d: WeaveDraft): string | null {
  if (!Number.isInteger(d.shafts) || d.shafts < 2 || d.shafts > MAX_SHAFTS) return `shafts must be 2–${MAX_SHAFTS}`
  if (!Number.isInteger(d.treadles) || d.treadles < 2 || d.treadles > MAX_SHAFTS) return `treadles must be 2–${MAX_SHAFTS}`
  if (d.threading.length < 1 || d.threading.length > MAX_ENDS) return `threading needs 1–${MAX_ENDS} ends`
  if (d.treadling.length < 1 || d.treadling.length > MAX_ENDS) return `treadling needs 1–${MAX_ENDS} picks`
  if (d.threading.some((s) => !Number.isInteger(s) || s < 0 || s >= d.shafts)) return 'threading references a missing shaft'
  if (d.treadling.some((t) => !Number.isInteger(t) || t < 0 || t >= d.treadles)) return 'treadling references a missing treadle'
  if (d.tieUp.length !== d.treadles || d.tieUp.some((row) => row.length !== d.shafts)) return 'tie-up must be treadles × shafts'
  for (const t of new Set(d.treadling)) {
    const lifts = d.tieUp[t].filter(Boolean).length
    if (lifts === 0) return `treadle ${t + 1} lifts no shaft (unbound pick)`
    if (lifts === d.shafts) return `treadle ${t + 1} lifts every shaft (unbound pick)`
  }
  return null
}

/** The computed interlacement grid + float lengths (both wrap, since it tiles). */
export interface Drawdown {
  ends: number
  picks: number
  /** `up[pick][end]` — true = the warp end passes over the weft pick. */
  up: boolean[][]
  /** Length of the warp float this cell belongs to (≥1; counted along picks, wrapped). */
  warpFloat: number[][]
  /** Length of the weft float this cell belongs to (≥1; counted along ends, wrapped). */
  weftFloat: number[][]
}

/** Wrapped run length of `match` cells through index `i` in a cyclic sequence. */
function wrappedRun(seq: boolean[], i: number, match: boolean): number {
  const n = seq.length
  if (seq[i] !== match) return 1
  let run = 1
  for (let k = 1; k < n && seq[(i + k) % n] === match; k++) run++
  for (let k = 1; k < n && seq[(i - k + n) % n] === match; k++) run++
  return Math.min(run, n)
}

/** Compute the drawdown for a draft: one repeat is `threading.length` ends × `treadling.length` picks. */
export function drawdown(d: WeaveDraft): Drawdown {
  const ends = d.threading.length
  const picks = d.treadling.length
  const up: boolean[][] = []
  for (let p = 0; p < picks; p++) {
    const row: boolean[] = []
    for (let e = 0; e < ends; e++) row.push(d.tieUp[d.treadling[p]][d.threading[e]])
    up.push(row)
  }
  const warpFloat: number[][] = []
  const weftFloat: number[][] = []
  for (let p = 0; p < picks; p++) {
    warpFloat.push([])
    weftFloat.push([])
    for (let e = 0; e < ends; e++) {
      const column = up.map((row) => row[e]) // the end's path up the picks
      warpFloat[p].push(up[p][e] ? wrappedRun(column, p, true) : 1)
      weftFloat[p].push(!up[p][e] ? wrappedRun(up[p], e, false) : 1)
    }
  }
  return { ends, picks, up, warpFloat, weftFloat }
}

const fract = (x: number): number => x - Math.floor(x)
/** Rounded thread bump across its width, 0 at edges → 1 at centre. */
const bump = (t: number): number => Math.sin(Math.PI * t)
const mod = (i: number, n: number): number => ((i % n) + n) % n

/**
 * Weave height at (u, v) with `threadsU × threadsV` thread cells per tile —
 * each cell maps onto the drawdown (wrapped). The thread on top ridges across
 * its width; the longer its float, the higher + flatter it sits (a 1-up plain
 * interlacement is a pure ridge, a satin's 4-float an almost-flat plateau —
 * mirroring the fixed `weaveHeight` families). Pure.
 */
export function draftHeight(dd: Drawdown, u: number, v: number, threadsU: number, threadsV: number): number {
  const uu = u * threadsU
  const vv = v * threadsV
  const e = mod(Math.floor(uu), dd.ends)
  const p = mod(Math.floor(vv), dd.picks)
  const plateau = (f: number): number => Math.min(0.85, 0.28 * (f - 1))
  if (dd.up[p][e]) {
    const base = plateau(dd.warpFloat[p][e])
    return base + (1 - base) * bump(fract(uu))
  }
  const base = plateau(dd.weftFloat[p][e])
  // the weft crimps a whisker more than the tensioned warp, so it sits a touch lower
  return 0.94 * (base + (1 - base) * bump(fract(vv)))
}

/** Yarn crowns glossier, valleys matte — same contrast convention as `weaveRoughness`. */
const ROUGH_CONTRAST = 0.22
export function draftRoughness(dd: Drawdown, u: number, v: number, threadsU: number, threadsV: number): number {
  return 1 - ROUGH_CONTRAST * draftHeight(dd, u, v, threadsU, threadsV)
}

/** Unit surface normal from the height field via central differences. Pure. */
export function draftNormal(
  dd: Drawdown,
  u: number,
  v: number,
  threadsU: number,
  threadsV: number,
  strength: number
): [number, number, number] {
  const e = 0.5 / Math.max(threadsU, threadsV)
  const hl = draftHeight(dd, u - e, v, threadsU, threadsV)
  const hr = draftHeight(dd, u + e, v, threadsU, threadsV)
  const hd = draftHeight(dd, u, v - e, threadsU, threadsV)
  const hu = draftHeight(dd, u, v + e, threadsU, threadsV)
  const nx = (hl - hr) * strength
  const ny = (hd - hu) * strength
  const nz = 1
  const len = Math.hypot(nx, ny, nz) || 1
  return [nx / len, ny / len, nz / len]
}

// ---- presets — the classic drafts, as data ----

export type DraftPresetId = 'plain' | 'basket' | 'twill' | 'denim' | 'satin' | 'herringbone'

export interface DraftPreset {
  id: DraftPresetId
  name: string
  draft: WeaveDraft
}

const seq = (n: number): number[] => Array.from({ length: n }, (_, i) => i)
const lifts = (shafts: number, on: number[]): boolean[] => seq(shafts).map((s) => on.includes(s))

export const DRAFT_PRESETS: DraftPreset[] = [
  // 1/1 tabby — the over-under checkerboard
  { id: 'plain', name: 'Plain', draft: { shafts: 2, treadles: 2, threading: [0, 1], tieUp: [lifts(2, [0]), lifts(2, [1])], treadling: [0, 1] } },
  // 2/2 basket — paired ends + picks, a chunky checker
  { id: 'basket', name: 'Basket', draft: { shafts: 2, treadles: 2, threading: [0, 0, 1, 1], tieUp: [lifts(2, [0]), lifts(2, [1])], treadling: [0, 0, 1, 1] } },
  // 2/2 twill — the balanced diagonal
  { id: 'twill', name: '2/2 twill', draft: { shafts: 4, treadles: 4, threading: seq(4), tieUp: seq(4).map((t) => lifts(4, [t, (t + 1) % 4])), treadling: seq(4) } },
  // 3/1 warp-faced twill — denim's steep warp diagonal
  { id: 'denim', name: '3/1 denim', draft: { shafts: 4, treadles: 4, threading: seq(4), tieUp: seq(4).map((t) => lifts(4, [t, (t + 1) % 4, (t + 2) % 4])), treadling: seq(4) } },
  // 5-end satin — each end bound once per 5 picks, binding points scattered (step 2)
  { id: 'satin', name: '5-end satin', draft: { shafts: 5, treadles: 5, threading: seq(5), tieUp: seq(5).map((t) => lifts(5, seq(5).filter((s) => s !== (2 * t) % 5))), treadling: seq(5) } },
  // point-threaded 2/2 twill — the chevron zigzag
  { id: 'herringbone', name: 'Herringbone', draft: { shafts: 4, treadles: 4, threading: [0, 1, 2, 3, 2, 1], tieUp: seq(4).map((t) => lifts(4, [t, (t + 1) % 4])), treadling: seq(4) } }
]

export const draftPreset = (id: string): DraftPreset | undefined => DRAFT_PRESETS.find((p) => p.id === id)

/** Deep copy (drafts are mutated by the editor; layers must never share one). */
export function cloneDraft(d: WeaveDraft): WeaveDraft {
  return {
    shafts: d.shafts,
    treadles: d.treadles,
    threading: [...d.threading],
    tieUp: d.tieUp.map((row) => [...row]),
    treadling: [...d.treadling]
  }
}

/** Canonical key for a draft — cache identity + structural equality. Pure. */
export function draftKey(d: WeaveDraft): string {
  const tie = d.tieUp.map((row) => row.map((b) => (b ? 1 : 0)).join('')).join('.')
  return `${d.shafts}x${d.treadles}|${d.threading.join(',')}|${tie}|${d.treadling.join(',')}`
}

// ---- renderer-side bakes (mirror weaveTexture's maps + cache idiom) ----

/** Whole drawdown repeats per tile, sized so a thread cell ≈ 1/16 of the tile
 *  (the weaveTexture scale convention, so `weaveScale` reads the same). */
function tileThreads(dd: Drawdown): { threadsU: number; threadsV: number } {
  return {
    threadsU: dd.ends * Math.max(1, Math.round(16 / dd.ends)),
    threadsV: dd.picks * Math.max(1, Math.round(16 / dd.picks))
  }
}

const normalCache = new Map<string, THREE.CanvasTexture>()

/** Bake a tiling normal map for a draft (renderer only). Cached per (draft, strength, size). */
export function makeDraftNormalMap(draft: WeaveDraft, strength = 3, size = 256): THREE.CanvasTexture {
  const key = `${draftKey(draft)}:${strength}:${size}`
  const cached = normalCache.get(key)
  if (cached) return cached

  const dd = drawdown(draft)
  const { threadsU, threadsV } = tileThreads(dd)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [nx, ny, nz] = draftNormal(dd, x / size, y / size, threadsU, threadsV, strength)
      const i = (y * size + x) * 4
      img.data[i] = (nx * 0.5 + 0.5) * 255
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255
      img.data[i + 2] = (nz * 0.5 + 0.5) * 255
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.NoColorSpace // normal maps are linear data
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 4
  normalCache.set(key, tex)
  return tex
}

const roughCache = new Map<string, THREE.CanvasTexture>()

/** Bake a tiling roughness map for a draft (renderer only). Cached per (draft, size). */
export function makeDraftRoughnessMap(draft: WeaveDraft, size = 256): THREE.CanvasTexture {
  const key = `${draftKey(draft)}:${size}`
  const cached = roughCache.get(key)
  if (cached) return cached

  const dd = drawdown(draft)
  const { threadsU, threadsV } = tileThreads(dd)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = draftRoughness(dd, x / size, y / size, threadsU, threadsV)
      const c = Math.max(0, Math.min(255, Math.round(r * 255)))
      const i = (y * size + x) * 4
      img.data[i] = c
      img.data[i + 1] = c
      img.data[i + 2] = c
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.NoColorSpace // roughness is linear data
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 4
  roughCache.set(key, tex)
  return tex
}
