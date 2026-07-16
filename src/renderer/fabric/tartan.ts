/**
 * Tartan **sett designer** — a real sett (thread-count stripes) woven in 2/2 twill,
 * the authentic way a tartan is defined. A sett is an ordered list of coloured stripes
 * with thread counts; a **reflective** sett (the classic Scottish kind) mirrors about
 * its two pivot threads to make the symmetric repeat, and the 2/2 twill interlacement
 * blends the warp + weft colours on the diagonal (solid blocks where a colour crosses
 * itself, a tweedy half-and-half hatch where two differ). Pure + unit-tested; the
 * renderer bakes it into the design-art albedo behind the prints (like `textile`/`ombre`).
 */

/** One stripe in a sett — a colour (sRGB hex) spanning `count` warp/weft threads. */
export interface SettStripe {
  color: number
  count: number
}

/**
 * A tartan sett. `symmetric` (default true) is a **reflective** sett: the thread
 * sequence mirrors about its two pivot threads (first + last, not repeated on the
 * fold — the authentic convention). `false` = an asymmetric / repeating sett.
 */
export interface TartanSett {
  stripes: SettStripe[]
  symmetric?: boolean
}

export type TartanKind = 'black-watch' | 'royal-stewart' | 'hunting' | 'dress-blue' | 'camel-check' | 'grey' | 'macleod' | 'buffalo-plaid' | 'prince-of-wales' | 'gingham'
export const TARTAN_KINDS: TartanKind[] = ['black-watch', 'royal-stewart', 'hunting', 'dress-blue', 'camel-check', 'grey', 'macleod', 'buffalo-plaid', 'prince-of-wales', 'gingham']

// Conventional tartan palette (sRGB).
const NAVY = 0x1e2a44
const GREEN = 0x24492c
const BLACK = 0x111318
const RED = 0x9c1f2b
const YELLOW = 0xd8b23c
const WHITE = 0xe9e7df
const AZURE = 0x3f6fa3
const CAMEL = 0xc7a86a
const CHARCOAL = 0x2b2b30
const GREY = 0x8b8b91

const s = (color: number, count: number): SettStripe => ({ color, count })

/** Preset half-setts (the reflective engine mirrors them into the full symmetric repeat). */
export const TARTAN_SETTS: Record<TartanKind, TartanSett> = {
  'black-watch': { stripes: [s(NAVY, 24), s(BLACK, 6), s(GREEN, 24), s(BLACK, 6)] },
  'royal-stewart': {
    stripes: [s(RED, 56), s(BLACK, 4), s(YELLOW, 4), s(BLACK, 4), s(WHITE, 4), s(AZURE, 4), s(RED, 8), s(WHITE, 4), s(RED, 8), s(BLACK, 4)]
  },
  hunting: { stripes: [s(GREEN, 40), s(BLACK, 6), s(NAVY, 16), s(GREEN, 6), s(RED, 4), s(GREEN, 6)] },
  'dress-blue': { stripes: [s(NAVY, 32), s(WHITE, 6), s(AZURE, 16), s(WHITE, 6), s(BLACK, 4)] },
  'camel-check': { stripes: [s(CAMEL, 40), s(WHITE, 4), s(BLACK, 8), s(CAMEL, 4), s(RED, 4), s(BLACK, 8)] },
  grey: { stripes: [s(GREY, 28), s(CHARCOAL, 8), s(WHITE, 4), s(CHARCOAL, 8)] },
  // the loud MacLeod — a bright yellow ground barred with black + a red overcheck
  macleod: { stripes: [s(YELLOW, 36), s(BLACK, 8), s(YELLOW, 4), s(BLACK, 8), s(RED, 4), s(BLACK, 8)] },
  // buffalo plaid — the big even red/black lumberjack check
  'buffalo-plaid': { stripes: [s(RED, 32), s(BLACK, 32)] },
  // Prince of Wales — a fine grey/charcoal glen-check with a faint azure overcheck
  'prince-of-wales': { stripes: [s(GREY, 16), s(BLACK, 4), s(WHITE, 4), s(BLACK, 4), s(CHARCOAL, 12), s(AZURE, 2)] },
  // gingham as a tartan sett — an even white/navy check
  gingham: { stripes: [s(WHITE, 16), s(NAVY, 16)] }
}

/**
 * Expand a sett into its full thread-colour sequence. A reflective sett appends the
 * reverse of the interior threads (dropping the two pivot threads, which sit on the
 * fold and aren't doubled) so the repeat reads perfectly symmetric. Pure.
 */
export function expandSett(sett: TartanSett): number[] {
  const base: number[] = []
  for (const st of sett.stripes) {
    const n = Math.max(0, Math.round(st.count))
    for (let i = 0; i < n; i++) base.push(st.color)
  }
  if (sett.symmetric === false || base.length < 3) return base
  return base.concat(base.slice(1, base.length - 1).reverse())
}

/**
 * The woven colour at warp thread `i`, weft thread `j` for a 2/2 (right-hand) twill:
 * the warp shows on top where `(i − j) mod 4 < 2`, else the weft shows. Warp + weft
 * share the sett (tartan is balanced), so equal-colour crossings read solid and
 * unequal ones hatch on the twill diagonal. Wraps on the sett length. Pure.
 */
export function tartanColorAt(threads: number[], i: number, j: number): number {
  const n = threads.length
  if (n === 0) return 0
  const wrap = (k: number): number => ((k % n) + n) % n
  const warpOnTop = ((((i - j) % 4) + 4) % 4) < 2
  return threads[wrap(warpOnTop ? i : j)]
}

/**
 * Bake a tartan across a 2D canvas (renderer only). Threads are sized so ~`repeats`
 * full setts span the canvas, and each thread crossing takes its 2/2-twill colour —
 * so the woven diagonal + colour blends emerge at the thread grid.
 */
export function paintTartan(ctx: CanvasRenderingContext2D, size: number, kind: TartanKind, repeats = 4): void {
  const threads = expandSett(TARTAN_SETTS[kind] ?? TARTAN_SETTS['black-watch'])
  const threadPx = Math.max(2, Math.round(size / (Math.max(1, threads.length) * repeats)))
  const img = ctx.createImageData(size, size)
  const data = img.data
  for (let y = 0; y < size; y++) {
    const j = Math.floor(y / threadPx)
    for (let x = 0; x < size; x++) {
      const c = tartanColorAt(threads, Math.floor(x / threadPx), j)
      const o = (y * size + x) * 4
      data[o] = (c >> 16) & 255
      data[o + 1] = (c >> 8) & 255
      data[o + 2] = c & 255
      data[o + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
}
