import * as THREE from 'three'

/** Repeating textile patterns that tile across the whole garment. */
export type TextilePattern = 'stripe' | 'plaid' | 'check' | 'gingham' | 'polka' | 'camo' | 'herringbone' | 'houndstooth' | 'chevron' | 'argyle' | 'pinstripe' | 'windowpane' | 'glen-check' | 'dot-grid' | 'basketweave' | 'diagonal-stripe'
export const TEXTILE_PATTERNS: TextilePattern[] = ['stripe', 'plaid', 'check', 'gingham', 'polka', 'camo', 'herringbone', 'houndstooth', 'chevron', 'argyle', 'pinstripe', 'windowpane', 'glen-check', 'dot-grid', 'basketweave', 'diagonal-stripe']

/**
 * The pattern's tonal value at a normalized position within one repeat tile —
 * `0` = base colour … `1` = the contrast tone (intermediate values pick tones in
 * between). Pure + periodic (wraps every tile), so it's unit tested; the renderer
 * bakes it into a tiling canvas.
 */
export function textileValue(pattern: TextilePattern, u: number, v: number): number {
  u -= Math.floor(u)
  v -= Math.floor(v)
  switch (pattern) {
    case 'stripe':
      return u < 0.5 ? 0 : 1
    case 'check':
      return u < 0.5 !== v < 0.5 ? 1 : 0
    case 'gingham': // two overlapping stripe sets → 3 tones
      return ((u < 0.5 ? 1 : 0) + (v < 0.5 ? 1 : 0)) / 2
    case 'polka': {
      const dx = u - 0.5
      const dy = v - 0.5
      return dx * dx + dy * dy < 0.05 ? 1 : 0
    }
    case 'plaid': {
      // The thick band straddles the tile seam symmetrically (x<0.04 || x>0.96) so it
      // reads as one continuous stripe across repeats — no seam. The centre + thin bands
      // sit inside the tile, mirror-placed, so they repeat cleanly too.
      const band = (x: number): number => (x < 0.04 || x > 0.96 || (x > 0.46 && x < 0.54) ? 1 : 0)
      const thin = (x: number): number => ((x > 0.22 && x < 0.26) || (x > 0.74 && x < 0.78) ? 1 : 0)
      const bu = band(u)
      const bv = band(v)
      if (bu && bv) return 1
      if (bu || bv) return 0.66
      if (thin(u) || thin(v)) return 0.33
      return 0
    }
    case 'chevron': {
      // zigzag stripes — wide diagonal bands that reverse direction each row block
      const band = Math.floor(v * 3) % 2
      const diag = Math.floor((band === 0 ? u + v : u - v) * 6)
      return ((diag % 2) + 2) % 2 // crisp two-tone, floor-based (seam-robust)
    }
    case 'herringbone': {
      // broken twill — finer diagonal stripes reversing direction every narrow band
      const band = Math.floor(v * 6) % 2
      const diag = Math.floor((band === 0 ? u + v : u - v) * 6)
      return ((diag % 2) + 2) % 2
    }
    case 'houndstooth': {
      // the classic dogtooth 4×4 tessellation (two tones, tiles into 4-point stars)
      const HT = [
        [1, 1, 1, 0],
        [1, 1, 0, 0],
        [1, 0, 0, 1],
        [0, 0, 1, 1]
      ]
      return HT[Math.floor(v * 4) % 4][Math.floor(u * 4) % 4]
    }
    case 'argyle': {
      // a diamond lattice (both diagonals) crossed by thin argyle lines → three tones
      const s = Math.floor((u + v) * 6)
      const d = Math.floor((u - v) * 6)
      const line = (((s % 3) + 3) % 3 === 0 || ((d % 3) + 3) % 3 === 0) ? 1 : 0
      return line ? 1 : ((s + d) % 2 + 2) % 2 ? 0.55 : 0
    }
    case 'pinstripe': {
      // thin, widely-spaced vertical stripes
      return Math.floor(u * 8) % 4 === 0 ? 1 : 0
    }
    case 'windowpane': {
      // a thin line grid — horizontal + vertical rules, widely spaced
      return Math.floor(u * 8) % 4 === 0 || Math.floor(v * 8) % 4 === 0 ? 1 : 0
    }
    case 'glen-check': {
      // Prince-of-Wales — a small check layered over a large one (three tones)
      const small = Math.floor(u * 8) % 2 !== Math.floor(v * 8) % 2 ? 1 : 0
      const large = Math.floor(u * 3) % 2 !== Math.floor(v * 3) % 2 ? 1 : 0
      return (small + large) / 2
    }
    case 'dot-grid': {
      // a fine micro-polka: a small contrast dot at each cell centre
      const fu = u * 6 - Math.floor(u * 6) - 0.5
      const fv = v * 6 - Math.floor(v * 6) - 0.5
      return fu * fu + fv * fv < 0.03 ? 1 : 0
    }
    case 'basketweave': {
      // over-under woven blocks — the fine rib direction flips per block
      const block = ((Math.floor(u * 4) + Math.floor(v * 4)) % 2 + 2) % 2
      return block === 0 ? Math.floor(v * 16) % 2 : Math.floor(u * 16) % 2
    }
    case 'diagonal-stripe': {
      // simple bias stripes running on the diagonal
      return (Math.floor((u + v) * 6) % 2 + 2) % 2
    }
    default: {
      // camo — irregular tonal patches (3 tones). Angular frequencies are integer
      // multiples of 2π so the field is exactly periodic in u and v → the motif tiles
      // seamlessly (the old non-integer frequencies left a hard discontinuity at the seam).
      const TAU = Math.PI * 2
      const n = Math.sin(u * TAU * 2) + Math.cos(v * TAU * 2) + Math.sin((u + v) * TAU * 3)
      return n > 0.6 ? 1 : n > -0.4 ? 0.5 : 0
    }
  }
}

/** A contrast tone for a base colour — darker + a touch more saturated (tonal print). */
function contrastOf(base: number): THREE.Color {
  const c = new THREE.Color(base)
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  return new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s + 0.08), Math.max(0.05, hsl.l - 0.34))
}

/**
 * Repeat count for a base tiling at a user scale — `scale` > 1 enlarges the motif
 * (fewer, bigger repeats), < 1 shrinks it (more repeats). Clamped 0.25…4. Pure.
 */
export function textileTiles(baseTiles: number, scale = 1): number {
  const s = Math.max(0.25, Math.min(4, scale || 1))
  return Math.max(1, Math.round(baseTiles / s))
}

/**
 * **Repeat layout** — how a base tile is stepped into the repeat: a straight grid
 * (`full-drop`), alternate columns dropped half a tile (`half-drop` — the classic
 * wallpaper/textile stagger), alternate rows shifted half (`half-brick`), or
 * alternate cells mirrored (`mirror` — a book-match that hides the tile seam).
 */
export type RepeatMode = 'full-drop' | 'half-drop' | 'half-brick' | 'mirror'
export const REPEAT_MODES: RepeatMode[] = ['full-drop', 'half-drop', 'half-brick', 'mirror']

/** The base-tile offset (in tile units) + mirror flags for cell (cx, cy) under a repeat mode. Pure. */
export function repeatCell(mode: RepeatMode, cx: number, cy: number): { ox: number; oy: number; flipX: boolean; flipY: boolean } {
  const oddCol = (((cx % 2) + 2) % 2) === 1
  const oddRow = (((cy % 2) + 2) % 2) === 1
  switch (mode) {
    case 'half-drop':
      return { ox: 0, oy: oddCol ? 0.5 : 0, flipX: false, flipY: false }
    case 'half-brick':
      return { ox: oddRow ? 0.5 : 0, oy: 0, flipX: false, flipY: false }
    case 'mirror':
      return { ox: 0, oy: 0, flipX: oddCol, flipY: oddRow }
    default:
      return { ox: 0, oy: 0, flipX: false, flipY: false }
  }
}

/** The seamless super-tile size (in base tiles per side) for a repeat mode. Pure. */
export function repeatSuperTiles(mode: RepeatMode): number {
  return mode === 'full-drop' ? 1 : 2
}

/** Compose a base tile into a seamless super-tile for a repeat mode (renderer). */
function buildSuperTile(base: HTMLCanvasElement, mode: RepeatMode): HTMLCanvasElement {
  const TS = base.width
  const n = repeatSuperTiles(mode)
  const sup = document.createElement('canvas')
  sup.width = sup.height = n * TS
  const s = sup.getContext('2d')!
  // draw a covering grid with an extra ring so the offset/mirrored edges wrap seamlessly
  for (let cy = -1; cy <= n; cy++) {
    for (let cx = -1; cx <= n; cx++) {
      const { ox, oy, flipX, flipY } = repeatCell(mode, cx, cy)
      s.save()
      s.translate((cx + ox) * TS, (cy + oy) * TS)
      if (flipX || flipY) {
        s.translate(flipX ? TS : 0, flipY ? TS : 0)
        s.scale(flipX ? -1 : 1, flipY ? -1 : 1)
      }
      s.drawImage(base, 0, 0)
      s.restore()
    }
  }
  return sup
}

/**
 * Paint a seamless repeating textile pattern across a 2D canvas (renderer only) —
 * bakes one repeat tile from `textileValue` then tiles it, at a user `scale`
 * (motif size) + `rotation` (degrees) applied to the repeat.
 */
export function paintTextile(ctx: CanvasRenderingContext2D, size: number, pattern: TextilePattern, base: number, tiles = 10, scale = 1, rotation = 0, repeat: RepeatMode = 'full-drop'): void {
  const TS = Math.max(24, Math.round(size / textileTiles(tiles, scale)))
  const tile = document.createElement('canvas')
  tile.width = tile.height = TS
  const tctx = tile.getContext('2d')!
  const img = tctx.createImageData(TS, TS)
  const b = new THREE.Color(base)
  const c = contrastOf(base)
  const mix = new THREE.Color()
  for (let y = 0; y < TS; y++) {
    for (let x = 0; x < TS; x++) {
      const val = textileValue(pattern, x / TS, y / TS)
      mix.copy(b).lerp(c, val)
      const i = (y * TS + x) * 4
      img.data[i] = mix.r * 255
      img.data[i + 1] = mix.g * 255
      img.data[i + 2] = mix.b * 255
      img.data[i + 3] = 255
    }
  }
  tctx.putImageData(img, 0, 0)
  // apply the repeat layout (half-drop stagger · half-brick · mirror book-match) by
  // composing the base tile into a seamless super-tile; full-drop uses the base tile
  const unit = repeat === 'full-drop' ? tile : buildSuperTile(tile, repeat)
  const fill = ctx.createPattern(unit, 'repeat')!
  if (rotation && typeof DOMMatrix !== 'undefined' && fill.setTransform) {
    fill.setTransform(new DOMMatrix().rotate(rotation)) // rotate the whole repeat (stripes/plaids on the bias)
  }
  ctx.fillStyle = fill
  ctx.fillRect(0, 0, size, size)
}
