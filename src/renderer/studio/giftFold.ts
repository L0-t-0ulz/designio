/**
 * Scarf **gift-fold render** — a flat, neatly-folded product shot for a line sheet.
 * Rather than the draped 3D scarf, this presents the scarf the way it's photographed
 * folded on a table for a lookbook: a portrait folded body with a turned-down corner
 * showing a second layer, on a soft studio ground. The layout maths are pure so
 * they're unit-tested; `main` composites the live fabric albedo into the shapes.
 */

/** A pixel rectangle. */
export interface FoldRect {
  x: number
  y: number
  w: number
  h: number
}

/** The gift-fold layout for a `w×h` canvas — every shape in canvas pixels. */
export interface GiftFoldLayout {
  /** The neutral ground behind the fold. */
  canvas: FoldRect
  /** The folded scarf body (portrait). */
  body: FoldRect
  /** The turned-down top corner (a right triangle, 3 points) showing the underside. */
  corner: [number, number][]
  /** A horizontal belly band across the lower body (a label wrap). */
  band: FoldRect
  /** Soft contact shadow under the body. */
  shadow: FoldRect
  /** Horizontal crease lines (y-positions) across the body — where the folds stack. */
  creases: number[]
  /** Relative shade multipliers (1 = the fabric as-is; <1 = darker underside/band). */
  shade: { body: number; corner: number; band: number }
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v))

/**
 * Lay out the gift fold for a `w×h` canvas. The body is a centred portrait rectangle
 * (`bodyFrac` of the smaller dimension wide, 4:5 tall), a `cornerFrac`-sized triangle
 * turns down from its top-right, a belly band crosses the lower third, and a soft
 * shadow sits under it. Pure + deterministic.
 */
export function giftFoldLayout(w: number, h: number, bodyFrac = 0.52): GiftFoldLayout {
  const W = Math.max(1, w)
  const H = Math.max(1, h)
  const bw = clamp01(bodyFrac) * Math.min(W, H)
  const bh = bw * 1.25 // 4:5 portrait
  const bx = (W - bw) / 2
  const by = (H - bh) / 2
  const body: FoldRect = { x: bx, y: by, w: bw, h: bh }

  // Turned-down corner: a right triangle from the top-right, folding toward the body.
  const c = bw * 0.34 // corner leg length
  const corner: [number, number][] = [
    [bx + bw - c, by], // along the top edge
    [bx + bw, by], // the top-right pivot
    [bx + bw, by + c] // down the right edge
  ]

  // Belly band across the lower third (a wrapped label).
  const bandH = bh * 0.16
  const band: FoldRect = { x: bx, y: by + bh * 0.6, w: bw, h: bandH }

  // Contact shadow — a touch wider than the body, offset down.
  const shadow: FoldRect = { x: bx - bw * 0.04, y: by + bh - bh * 0.03, w: bw * 1.08, h: bh * 0.09 }

  // Fold creases — the visible stacked folds of the flat-folded scarf.
  const creases = [0.25, 0.5, 0.75].map((t) => by + bh * t)

  return {
    canvas: { x: 0, y: 0, w: W, h: H },
    body,
    corner,
    band,
    shadow,
    creases,
    shade: { body: 1, corner: 0.82, band: 0.7 }
  }
}

const hexStr = (n: number): string => '#' + ((n >>> 0) & 0xffffff).toString(16).padStart(6, '0')

/**
 * Composite the gift-fold onto a 2D canvas (renderer-only): a soft studio ground +
 * contact shadow, the folded body filled with the live fabric albedo (or its base
 * colour), fold-crease shading, a wrapped belly band, and the turned-down underside
 * corner. `albedo` is the scarf's live design-art image (fabric look + pattern); pass
 * `null` for a plain colour fold.
 */
export function renderGiftFold(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  opts: { color: number; albedo: CanvasImageSource | null }
): void {
  const L = giftFoldLayout(w, h)
  const { color, albedo } = opts
  const dims = albedo as { width?: number; height?: number } | null

  // Studio ground.
  const bg = ctx.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, '#eaeaee')
  bg.addColorStop(1, '#d2d2d8')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  // Soft contact shadow.
  ctx.save()
  ctx.filter = `blur(${Math.max(2, Math.round(w * 0.012))}px)`
  ctx.fillStyle = 'rgba(0,0,0,0.26)'
  ctx.beginPath()
  ctx.ellipse(L.shadow.x + L.shadow.w / 2, L.shadow.y + L.shadow.h / 2, L.shadow.w / 2, L.shadow.h / 2, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Fill a rect with the albedo (cover, aspect-preserving) or the base colour, then a shade overlay.
  const fillFabric = (r: FoldRect, shade: number): void => {
    ctx.save()
    ctx.beginPath()
    ctx.rect(r.x, r.y, r.w, r.h)
    ctx.clip()
    if (albedo && dims?.width && dims?.height) {
      const iw = dims.width
      const ih = dims.height
      const s = Math.max(r.w / iw, r.h / ih)
      ctx.drawImage(albedo, r.x + (r.w - iw * s) / 2, r.y + (r.h - ih * s) / 2, iw * s, ih * s)
    } else {
      ctx.fillStyle = hexStr(color)
      ctx.fillRect(r.x, r.y, r.w, r.h)
    }
    if (shade < 1) {
      ctx.fillStyle = `rgba(0,0,0,${(1 - shade).toFixed(3)})`
      ctx.fillRect(r.x, r.y, r.w, r.h)
    }
    ctx.restore()
  }

  // The folded body + soft side-shading (folded cloth catching the light).
  fillFabric(L.body, L.shade.body)
  ctx.save()
  ctx.beginPath()
  ctx.rect(L.body.x, L.body.y, L.body.w, L.body.h)
  ctx.clip()
  const side = ctx.createLinearGradient(L.body.x, 0, L.body.x + L.body.w, 0)
  side.addColorStop(0, 'rgba(0,0,0,0.13)')
  side.addColorStop(0.5, 'rgba(255,255,255,0.05)')
  side.addColorStop(1, 'rgba(0,0,0,0.15)')
  ctx.fillStyle = side
  ctx.fillRect(L.body.x, L.body.y, L.body.w, L.body.h)
  ctx.restore()

  // Fold creases.
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'
  ctx.lineWidth = Math.max(1, w * 0.002)
  for (const y of L.creases) {
    ctx.beginPath()
    ctx.moveTo(L.body.x, y)
    ctx.lineTo(L.body.x + L.body.w, y)
    ctx.stroke()
  }

  // Wrapped belly band + its edges.
  fillFabric(L.band, L.shade.band)
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'
  ctx.lineWidth = Math.max(1, w * 0.0015)
  ctx.strokeRect(L.band.x, L.band.y, L.band.w, L.band.h)

  // Turned-down underside corner + its fold crease.
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(L.corner[0][0], L.corner[0][1])
  ctx.lineTo(L.corner[1][0], L.corner[1][1])
  ctx.lineTo(L.corner[2][0], L.corner[2][1])
  ctx.closePath()
  ctx.clip()
  fillFabric(L.body, L.shade.corner)
  ctx.restore()
  ctx.strokeStyle = 'rgba(0,0,0,0.22)'
  ctx.lineWidth = Math.max(1, w * 0.002)
  ctx.beginPath()
  ctx.moveTo(L.corner[0][0], L.corner[0][1])
  ctx.lineTo(L.corner[2][0], L.corner[2][1])
  ctx.stroke()
}
