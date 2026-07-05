import type { Fabric } from '../fabric/FabricLibrary'
import { weaveHeight } from '../fabric/weaveTexture'
import type { GarmentIcon } from '../garments/schema'

// Clean, recognisable garment silhouettes (viewBox 0 0 200 300), symmetric about x=100.
export const GARMENT_SIL: Record<GarmentIcon, string> = {
  // fit-and-flare dress: shoulders + short sleeves, nipped waist, A-line skirt
  dress:
    'M70,46 L84,46 Q100,62 116,46 L130,46 L164,76 L146,100 L134,88 L128,132 L168,268 L32,268 L72,132 L66,88 L54,100 L36,76 Z',
  // t-shirt: neckline dip, short sleeves, straight body
  top: 'M70,46 L84,46 Q100,62 116,46 L130,46 L164,76 L146,100 L134,88 L134,182 L66,182 L66,88 L54,100 L36,76 Z',
  // A-line skirt with a waistband
  skirt: 'M68,58 L132,58 L132,72 L126,72 L160,266 L40,266 L74,72 L68,72 Z',
  // tapered trousers with a waistband + centre crotch notch
  pants: 'M66,58 L134,58 L134,72 L128,72 L120,266 L106,266 L100,150 L94,266 L80,266 L72,72 L66,72 Z'
}

/** SVG markup for a garment silhouette icon. */
export function garmentSvg(icon: GarmentIcon): string {
  return `<svg viewBox="0 0 200 300"><path d="${GARMENT_SIL[icon]}"/></svg>`
}

/** A textured fabric swatch thumbnail (base colour + a procedural weave hint). */
export function fabricSwatchCanvas(f: Fabric, w = 120, h = 44): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  const r = (f.color >> 16) & 255
  const g = (f.color >> 8) & 255
  const b = f.color & 255
  const img = ctx.createImageData(w, h)
  const threads = 26
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const shade = (weaveHeight(f.weave, x / w, y / h, threads) - 0.5) * 46 * f.normalStrength
      const i = (y * w + x) * 4
      img.data[i] = Math.max(0, Math.min(255, r + shade))
      img.data[i + 1] = Math.max(0, Math.min(255, g + shade))
      img.data[i + 2] = Math.max(0, Math.min(255, b + shade))
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, 'rgba(255,255,255,' + (0.12 + f.sheen * 0.12) + ')')
  grad.addColorStop(0.5, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
  return c
}
