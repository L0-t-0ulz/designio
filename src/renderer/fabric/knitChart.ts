import * as THREE from 'three'

/**
 * Knit stitch designer — author a knit's surface the way a hand-knitter reads a
 * **stitch chart**: a grid of stitch symbols, one cell per stitch (columns =
 * wales, rows = courses, chart row 0 at the bottom like a real chart).
 *
 * - `k` — knit: the smooth V column (raised wale)
 * - `p` — purl: the horizontal bump (recessed, garter texture)
 * - `cl` / `cr` — cable stitch, crossing left / right: a knit column that leans
 *   diagonally through the row, so a run of `cl`/`cr` columns braids
 *
 * The chart tiles across the garment. A pure height field in the same idiom as
 * `weaveTexture`/`weaveDraft` drives baked tiling normal + roughness maps that
 * replace the fabric preset's weave. Colourwork (jacquard/intarsia) is a
 * separate card — this is the *structure* chart only.
 */

export type KnitStitch = 'k' | 'p' | 'cl' | 'cr'

export interface KnitChart {
  /** `rows[course][wale]` — course 0 at the BOTTOM of the chart (knitting order). */
  rows: KnitStitch[][]
}

export const KNIT_STITCHES: KnitStitch[] = ['k', 'p', 'cl', 'cr']
export const MAX_CHART = 32

/** Validate a chart: rectangular, sane size, known symbols. Returns a problem or null. */
export function validateChart(c: KnitChart): string | null {
  if (!Array.isArray(c.rows) || c.rows.length < 1 || c.rows.length > MAX_CHART) return `chart needs 1–${MAX_CHART} rows`
  const w = c.rows[0]?.length ?? 0
  if (w < 1 || w > MAX_CHART) return `chart needs 1–${MAX_CHART} stitches per row`
  for (const row of c.rows) {
    if (row.length !== w) return 'chart rows must all be the same width'
    for (const s of row) if (!KNIT_STITCHES.includes(s)) return `unknown stitch symbol "${s}"`
  }
  return null
}

const fract = (x: number): number => x - Math.floor(x)
const mod = (i: number, n: number): number => ((i % n) + n) % n

/**
 * Chart height at (u, v) with `walesU × coursesV` stitch cells per tile (wrapped
 * onto the chart). Knits read as a smooth raised column with a shallow V notch
 * between the legs; purls as a squat horizontal bump; cables as a knit column
 * displaced sideways through the course, so consecutive cable rows lean into a
 * braid. Pure, in [0, 1].
 */
export function knitHeight(c: KnitChart, u: number, v: number, walesU: number, coursesV: number): number {
  const wales = c.rows[0].length
  const courses = c.rows.length
  const uu = u * walesU
  const vv = v * coursesV
  const wale = mod(Math.floor(uu), wales)
  const course = mod(Math.floor(vv), courses)
  const tu = fract(uu)
  const tv = fract(vv)
  const s = c.rows[course][wale]
  // each course is a row of interlocking loops — a soft vertical wave shared by all stitches
  const courseWave = 0.85 + 0.15 * Math.cos((tv - 0.5) * Math.PI * 2)
  if (s === 'p') {
    // purl — the loop's head faces out: a squat horizontal ridge, sitting low
    return 0.55 * (0.35 + 0.65 * Math.sin(Math.PI * tv)) * (0.8 + 0.2 * Math.sin(Math.PI * tu))
  }
  // knit-family — a raised wale; cables lean the column through the course
  const lean = s === 'cl' ? -1 : s === 'cr' ? 1 : 0
  const centre = 0.5 + 0.32 * lean * (tv - 0.5) * 2
  // two legs of the V: a column ridge with a shallow notch at the centre line;
  // a leaning column also fades at the cell edges so the wale boundary stays
  // continuous (the course boundary's jump is the cable's crossing ledge)
  const across = Math.max(0, 1 - Math.abs(tu - centre) * 2.2) * (lean === 0 ? 1 : Math.sin(Math.PI * tu))
  const notch = 1 - 0.25 * Math.max(0, 1 - Math.abs(tu - centre) * 9)
  const h = (0.25 + 0.75 * across * notch) * courseWave
  // a crossing column sits proud of a plain knit so the braid reads
  return Math.min(1, lean === 0 ? h : h * 1.12)
}

/** Yarn crowns glossier, valleys matte — same contrast convention as the weave maps. */
const ROUGH_CONTRAST = 0.22
export function knitRoughness(c: KnitChart, u: number, v: number, walesU: number, coursesV: number): number {
  return 1 - ROUGH_CONTRAST * knitHeight(c, u, v, walesU, coursesV)
}

/** Unit surface normal from the height field via central differences. Pure. */
export function knitNormal(
  c: KnitChart,
  u: number,
  v: number,
  walesU: number,
  coursesV: number,
  strength: number
): [number, number, number] {
  const e = 0.5 / Math.max(walesU, coursesV)
  const hl = knitHeight(c, u - e, v, walesU, coursesV)
  const hr = knitHeight(c, u + e, v, walesU, coursesV)
  const hd = knitHeight(c, u, v - e, walesU, coursesV)
  const hu = knitHeight(c, u, v + e, walesU, coursesV)
  const nx = (hl - hr) * strength
  const ny = (hd - hu) * strength
  const nz = 1
  const len = Math.hypot(nx, ny, nz) || 1
  return [nx / len, ny / len, nz / len]
}

// ---- presets — the classic stitch patterns, as data ----

export type KnitPresetId = 'stockinette' | 'garter' | 'rib-1x1' | 'rib-2x2' | 'seed' | 'cable' | 'moss' | 'basketweave' | 'chevron' | 'bobble'

export interface KnitPreset {
  id: KnitPresetId
  name: string
  chart: KnitChart
}

const rows = (pattern: string[]): KnitChart => ({
  // written top-down for readability; charts store course 0 at the bottom
  rows: [...pattern].reverse().map((r) => r.split('') as KnitStitch[])
})
const cableRows = (pattern: string[][]): KnitChart => ({ rows: [...pattern].reverse() as KnitStitch[][] })

export const KNIT_PRESETS: KnitPreset[] = [
  { id: 'stockinette', name: 'Stockinette', chart: rows(['kk', 'kk']) },
  // garter — knit every hand-row: alternating smooth/purl-bump courses
  // (authored top-down: purl course above, knit course at the chart bottom)
  { id: 'garter', name: 'Garter', chart: rows(['pp', 'kk']) },
  { id: 'rib-1x1', name: '1×1 rib', chart: rows(['kp', 'kp']) },
  { id: 'rib-2x2', name: '2×2 rib', chart: rows(['kkpp', 'kkpp']) },
  // seed / moss — k and p alternate every stitch AND every course
  { id: 'seed', name: 'Seed', chart: rows(['kp', 'pk']) },
  // a 4-stitch cable panel in purl gutters; the cross leans right for 2 courses
  // of every 4, then knits straight (the classic rope)
  {
    id: 'cable',
    name: 'Cable rope',
    chart: cableRows([
      ['p', 'p', 'k', 'k', 'k', 'k', 'p', 'p'],
      ['p', 'p', 'k', 'k', 'k', 'k', 'p', 'p'],
      ['p', 'p', 'cr', 'cr', 'cl', 'cl', 'p', 'p'],
      ['p', 'p', 'k', 'k', 'k', 'k', 'p', 'p']
    ])
  },
  // moss (double seed) — seed worked two courses at a time, so the k/p checker doubles up
  { id: 'moss', name: 'Moss', chart: rows(['kp', 'kp', 'pk', 'pk']) },
  // basketweave — knit/purl blocks alternating every two courses → a woven look
  { id: 'basketweave', name: 'Basketweave', chart: rows(['kkpp', 'kkpp', 'ppkk', 'ppkk']) },
  // chevron — knit stitches zigzag through a purl ground into a V
  { id: 'chevron', name: 'Chevron', chart: rows(['kpppppk', 'pkpppkp', 'ppkpkpp', 'pppkppp', 'ppkpkpp', 'pkpppkp']) },
  // bobble — raised purl clusters (bobbles) scattered on a stockinette ground
  { id: 'bobble', name: 'Bobble', chart: rows(['kppkkk', 'kppkkk', 'kkkkkk', 'kkkkpp', 'kkkkpp', 'kkkkkk']) }
]

export const knitPreset = (id: string): KnitPreset | undefined => KNIT_PRESETS.find((p) => p.id === id)

/** Deep copy (charts are mutated by the editor; layers must never share one). */
export function cloneChart(c: KnitChart): KnitChart {
  return { rows: c.rows.map((r) => [...r]) }
}

/** Canonical key for a chart — cache identity + structural equality. Pure. */
export function chartKey(c: KnitChart): string {
  return c.rows.map((r) => r.join('')).join('|')
}

// ---- renderer-side bakes (mirror the weave maps' cache idiom) ----

/** Whole chart repeats per tile, a stitch cell ≈ 1/12 tile (knit stitches are
 *  chunkier than woven threads, so slightly coarser than the weave's 1/16). */
function tileStitches(c: KnitChart): { walesU: number; coursesV: number } {
  const wales = c.rows[0].length
  const courses = c.rows.length
  return {
    walesU: wales * Math.max(1, Math.round(12 / wales)),
    coursesV: courses * Math.max(1, Math.round(12 / courses))
  }
}

const normalCache = new Map<string, THREE.CanvasTexture>()

/** Bake a tiling normal map for a chart (renderer only). Cached per (chart, strength, size). */
export function makeChartNormalMap(chart: KnitChart, strength = 3, size = 256): THREE.CanvasTexture {
  const key = `${chartKey(chart)}:${strength}:${size}`
  const cached = normalCache.get(key)
  if (cached) return cached

  const { walesU, coursesV } = tileStitches(chart)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [nx, ny, nz] = knitNormal(chart, x / size, y / size, walesU, coursesV, strength)
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

/** Bake a tiling roughness map for a chart (renderer only). Cached per (chart, size). */
export function makeChartRoughnessMap(chart: KnitChart, size = 256): THREE.CanvasTexture {
  const key = `${chartKey(chart)}:${size}`
  const cached = roughCache.get(key)
  if (cached) return cached

  const { walesU, coursesV } = tileStitches(chart)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = knitRoughness(chart, x / size, y / size, walesU, coursesV)
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
