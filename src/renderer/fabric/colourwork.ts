/**
 * Intarsia / colourwork — placed colour blocks in the knit. A **colour chart**:
 * a small grid of yarn indices (a cell per stitch, course 0 at the chart
 * bottom) over a palette of yarn colours, worked one of two ways:
 *
 * - **fair-isle** — the chart tiles the whole garment (an allover jacquard;
 *   palette index 0 is the ground yarn),
 * - **intarsia** — the chart is a single placed block on the front (index 0
 *   cells are transparent, the garment's own albedo shows through).
 *
 * The pure `colourworkIndex` field maps a canvas UV to a palette index (or −1 =
 * keep the base albedo); `paintColourwork` bakes it into the design-art canvas
 * behind the prints, exactly like a textile pattern. Structure stays with the
 * knit chart / weave draft (normal maps) — this is the colour layer, so the two
 * compose into a true jacquard.
 */

export type ColourworkMode = 'fairisle' | 'intarsia'

export interface ColourworkChart {
  mode: ColourworkMode
  /** Yarn colours (hex). Index 0 = the ground yarn (intarsia: cells of 0 are transparent). */
  palette: number[]
  /** `cells[course][stitch]` — palette indices; course 0 at the BOTTOM of the chart. */
  cells: number[][]
}

export const MAX_COLOURWORK = 32
export const MAX_YARNS = 6

/** Stitch cells across the garment for a tiling fair-isle chart. */
export const FAIRISLE_STITCHES = 48
/** The intarsia block: centred on the front (u≈0.25 is centre-front), chest height. */
export const INTARSIA_CENTRE_U = 0.25
export const INTARSIA_CENTRE_V = 0.38
export const INTARSIA_WIDTH = 0.24

/** Validate a chart's structure. Returns a human-readable problem, or null. */
export function validateColourwork(c: ColourworkChart): string | null {
  if (c.mode !== 'fairisle' && c.mode !== 'intarsia') return 'unknown colourwork mode'
  if (!Array.isArray(c.palette) || c.palette.length < 2 || c.palette.length > MAX_YARNS) return `palette needs 2–${MAX_YARNS} yarns`
  if (!Array.isArray(c.cells) || c.cells.length < 1 || c.cells.length > MAX_COLOURWORK) return `chart needs 1–${MAX_COLOURWORK} rows`
  const w = c.cells[0]?.length ?? 0
  if (w < 1 || w > MAX_COLOURWORK) return `chart needs 1–${MAX_COLOURWORK} stitches per row`
  for (const row of c.cells) {
    if (row.length !== w) return 'chart rows must all be the same width'
    for (const i of row) if (!Number.isInteger(i) || i < 0 || i >= c.palette.length) return 'a cell references a missing yarn'
  }
  return null
}

const mod = (i: number, n: number): number => ((i % n) + n) % n

/**
 * Palette index at canvas (u, v), or −1 = keep the base albedo. The design
 * canvas is sampled mirrored on the garment, so columns are flipped here and
 * charts read as authored. `v` runs down the canvas (garment top at v = 0);
 * course 0 (the chart bottom) is worked first, so rows count up from below.
 * Pure.
 */
export function colourworkIndex(c: ColourworkChart, u: number, v: number): number {
  const w = c.cells[0].length
  const h = c.cells.length
  if (c.mode === 'fairisle') {
    const cell = 1 / FAIRISLE_STITCHES
    const col = mod(-Math.floor(u / cell) - 1, w) // mirrored sampling → flip columns
    const row = mod(Math.floor((1 - v) / cell), h)
    return c.cells[row][col]
  }
  // intarsia — one placed block on the front
  const cell = INTARSIA_WIDTH / w
  const left = INTARSIA_CENTRE_U - INTARSIA_WIDTH / 2
  const top = INTARSIA_CENTRE_V - (h * cell) / 2
  const col = Math.floor((u - left) / cell)
  const row = Math.floor((v - top) / cell)
  if (col < 0 || col >= w || row < 0 || row >= h) return -1
  const idx = c.cells[h - 1 - row][w - 1 - col] // row 0 = block top = last course; mirrored columns
  return idx === 0 ? -1 : idx
}

/** Canonical key for a chart — cache identity + structural equality. Pure. */
export function colourworkKey(c: ColourworkChart): string {
  return `${c.mode}|${c.palette.map((p) => p.toString(16)).join(',')}|${c.cells.map((r) => r.join('')).join('.')}`
}

/** Deep copy (charts are mutated by the editor; layers must never share one). */
export function cloneColourwork(c: ColourworkChart): ColourworkChart {
  return { mode: c.mode, palette: [...c.palette], cells: c.cells.map((r) => [...r]) }
}

// ---- presets — classic colourwork, as data ----

export type ColourworkPresetId = 'fairisle' | 'argyle' | 'zigzag' | 'heart' | 'star'

export interface ColourworkPreset {
  id: ColourworkPresetId
  name: string
  chart: ColourworkChart
}

/** Author rows top-down as digit strings; charts store course 0 at the bottom. */
const rows = (pattern: string[]): number[][] => [...pattern].reverse().map((r) => r.split('').map(Number))

export const COLOURWORK_PRESETS: ColourworkPreset[] = [
  {
    id: 'fairisle',
    name: 'Fair Isle band',
    chart: {
      mode: 'fairisle',
      palette: [0xe8e0cf, 0x2f4160, 0xa8393f], // cream ground · navy · madder red
      cells: rows([
        '01100110',
        '10011001',
        '02200220',
        '22022022',
        '02200220',
        '10011001',
        '01100110'
      ])
    }
  },
  {
    id: 'argyle',
    name: 'Argyle',
    chart: {
      mode: 'fairisle',
      palette: [0x3a3f47, 0xbfa878, 0x8a4b5e], // charcoal ground · camel · berry
      cells: rows([
        '00011000',
        '00111100',
        '01111110',
        '12111121',
        '01111110',
        '00111100',
        '00011000',
        '20000002'
      ])
    }
  },
  {
    id: 'zigzag',
    name: 'Zigzag',
    chart: {
      mode: 'fairisle',
      palette: [0xd8cbb0, 0x59616b], // oat ground · slate
      cells: rows(['10001000', '11011101', '01110111', '00100010'])
    }
  },
  {
    id: 'heart',
    name: 'Heart (intarsia)',
    chart: {
      mode: 'intarsia',
      palette: [0x000000, 0xa8393f], // ground (transparent) · crimson
      cells: rows([
        '001101100',
        '011111110',
        '111111111',
        '111111111',
        '011111110',
        '001111100',
        '000111000',
        '000010000'
      ])
    }
  },
  {
    id: 'star',
    name: 'Star (intarsia)',
    chart: {
      mode: 'intarsia',
      palette: [0x000000, 0xefe6d2], // ground (transparent) · ivory
      cells: rows([
        '000010000',
        '000111000',
        '111111111',
        '011111110',
        '000111000',
        '001101100',
        '011000110'
      ])
    }
  }
]

export const colourworkPreset = (id: string): ColourworkPreset | undefined => COLOURWORK_PRESETS.find((p) => p.id === id)

// ---- renderer-side paint (into the design-art albedo canvas) ----

const hex = (n: number): string => '#' + n.toString(16).padStart(6, '0')

/**
 * Paint the colourwork onto the design-art canvas (behind the prints). Cells are
 * painted as crisp stitch blocks — the stepped edge is the authentic jacquard
 * look; alternate courses shade a touch darker so flat colour fields keep a
 * knitted feel. The knit-chart/weave normal map layers the 3D on top.
 */
export function paintColourwork(ctx: CanvasRenderingContext2D, size: number, c: ColourworkChart): void {
  const shade = (colour: number, row: number): string => {
    if (row % 2 === 0) return hex(colour)
    const r = (colour >> 16) & 0xff
    const g = (colour >> 8) & 0xff
    const b = colour & 0xff
    return `rgb(${Math.round(r * 0.94)},${Math.round(g * 0.94)},${Math.round(b * 0.94)})`
  }
  if (c.mode === 'fairisle') {
    const cell = size / FAIRISLE_STITCHES
    const across = FAIRISLE_STITCHES
    const down = Math.ceil(size / cell)
    for (let y = 0; y < down; y++) {
      for (let x = 0; x < across; x++) {
        const idx = colourworkIndex(c, (x + 0.5) / across, (y + 0.5) / down)
        ctx.fillStyle = shade(c.palette[idx], y)
        ctx.fillRect(Math.floor(x * cell), Math.floor(y * cell), Math.ceil(cell), Math.ceil(cell))
      }
    }
    return
  }
  // intarsia — paint only the block's non-ground cells
  const w = c.cells[0].length
  const h = c.cells.length
  const cell = (INTARSIA_WIDTH / w) * size
  const left = (INTARSIA_CENTRE_U - INTARSIA_WIDTH / 2) * size
  const top = (INTARSIA_CENTRE_V * size) - (h * cell) / 2
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const idx = c.cells[h - 1 - row][w - 1 - col]
      if (idx === 0) continue
      ctx.fillStyle = shade(c.palette[idx], row)
      ctx.fillRect(Math.floor(left + col * cell), Math.floor(top + row * cell), Math.ceil(cell), Math.ceil(cell))
    }
  }
}
