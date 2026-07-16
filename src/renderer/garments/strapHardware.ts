/**
 * **Strap & buckle hardware library** — the catalogue of metal fastenings a strap,
 * belt or bag draws from: buckles, rings, sliders, tri-glides, snap-hooks. Each entry
 * carries the strap width it suits + a note. Pure data + a fit picker + a BOM helper
 * (compatible with the tech-pack hardware line), so a belted garment lists the right
 * buckle for its strap width. The bag/strap builders draw from the same catalogue.
 */
export type StrapCategory = 'buckle' | 'ring' | 'slider' | 'clasp' | 'hook'

export interface StrapHardware {
  id: string
  name: string
  category: StrapCategory
  /** Nominal strap width it fits (mm). */
  widthMm: number
  note: string
}

export const STRAP_HARDWARE: StrapHardware[] = [
  { id: 'pin-buckle-20', name: 'Pin buckle', category: 'buckle', widthMm: 20, note: 'classic prong belt buckle' },
  { id: 'pin-buckle-30', name: 'Pin buckle', category: 'buckle', widthMm: 30, note: 'classic prong belt buckle' },
  { id: 'pin-buckle-40', name: 'Pin buckle', category: 'buckle', widthMm: 40, note: 'wide prong belt buckle' },
  { id: 'roller-buckle-38', name: 'Roller buckle', category: 'buckle', widthMm: 38, note: 'rolling prong — less strap wear' },
  { id: 'cam-buckle-25', name: 'Cam buckle', category: 'buckle', widthMm: 25, note: 'quick-release webbing cam' },
  { id: 'd-ring-25', name: 'D-ring', category: 'ring', widthMm: 25, note: 'anchor / double-D fastening' },
  { id: 'o-ring-20', name: 'O-ring', category: 'ring', widthMm: 20, note: 'strap junction ring' },
  { id: 'slider-25', name: 'Slide adjuster', category: 'slider', widthMm: 25, note: 'length-adjust tri-glide' },
  { id: 'tri-glide-38', name: 'Tri-glide', category: 'slider', widthMm: 38, note: 'webbing length adjuster' },
  { id: 'snap-hook-20', name: 'Snap hook', category: 'hook', widthMm: 20, note: 'swivel lobster clasp' },
  { id: 'lobster-clasp-15', name: 'Lobster clasp', category: 'clasp', widthMm: 15, note: 'detachable strap clasp' },
  { id: 'magnetic-clasp-20', name: 'Magnetic clasp', category: 'clasp', widthMm: 20, note: 'bag flap magnet' }
]

/** Hardware of a category that fits a strap width (nearest at or above, else the widest). Pure. */
export function hardwareForWidth(widthMm: number, category: StrapCategory): StrapHardware {
  const inCat = STRAP_HARDWARE.filter((h) => h.category === category).sort((a, b) => a.widthMm - b.widthMm)
  return inCat.find((h) => h.widthMm >= widthMm) ?? inCat[inCat.length - 1]
}

/** The buckle best fitting a strap width. Pure. */
export function pickBuckle(strapWidthMm: number): StrapHardware {
  return hardwareForWidth(strapWidthMm, 'buckle')
}

/**
 * The belt hardware BOM (tech-pack hardware lines): the buckle for the strap width,
 * plus a keeper loop. Pure.
 */
export function beltHardwareBOM(strapWidthMm: number): { label: string }[] {
  const buckle = pickBuckle(strapWidthMm)
  return [{ label: `1 × ${buckle.name.toLowerCase()} (${buckle.widthMm} mm belt)` }, { label: '1 × keeper loop' }]
}
