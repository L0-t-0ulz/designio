import { pickBuckle, hardwareForWidth } from '../garments/strapHardware'

/**
 * **Handbag / tote builder** — the parametric spec for a bag and the flat pattern it
 * unwraps to: a box body (front · back · gusset wrapping the sides + base) + handles.
 * Pure geometry (panel dimensions in cm, material area, handle length) + a hardware
 * BOM drawn from the strap library + a printable cut sheet. Unit-tested; File →
 * Export bag pattern renders the sheet. (The 3D bag mesh is a follow-up; this is the
 * spec + pattern + BOM the maker cuts to.)
 */
export type BagStyle = 'tote' | 'handbag' | 'crossbody' | 'clutch'

export interface BagSpec {
  style: BagStyle
  widthCm: number
  heightCm: number
  /** Depth of the bag (the gusset width). */
  gussetCm: number
  /** Handle drop (cm) — 0 for a clutch (no handle). */
  handleDropCm: number
  /** Strap width (mm) — sizes the hardware. */
  strapMm: number
}

const STYLE_DEFAULTS: Record<BagStyle, Omit<BagSpec, 'style'>> = {
  tote: { widthCm: 40, heightCm: 35, gussetCm: 12, handleDropCm: 22, strapMm: 25 },
  handbag: { widthCm: 30, heightCm: 22, gussetCm: 10, handleDropCm: 14, strapMm: 20 },
  crossbody: { widthCm: 24, heightCm: 18, gussetCm: 7, handleDropCm: 55, strapMm: 20 },
  clutch: { widthCm: 26, heightCm: 15, gussetCm: 4, handleDropCm: 0, strapMm: 15 }
}

/** A bag spec for a style (defaults), overridable. Pure. */
export function bagSpec(style: BagStyle, over: Partial<BagSpec> = {}): BagSpec {
  return { style, ...STYLE_DEFAULTS[style], ...over }
}

export interface BagPanel {
  name: string
  wCm: number
  hCm: number
  /** How many to cut. */
  qty: number
}

/**
 * The flat pattern panels: front + back (body), a single wrap gusset (two sides + the
 * base, so length = height + width + height), and the handle straps. Pure.
 */
export function bagPanels(spec: BagSpec): BagPanel[] {
  const panels: BagPanel[] = [
    { name: 'Body (front/back)', wCm: spec.widthCm, hCm: spec.heightCm, qty: 2 },
    { name: 'Gusset (sides + base)', wCm: spec.gussetCm, hCm: spec.heightCm * 2 + spec.widthCm, qty: 1 }
  ]
  if (spec.handleDropCm > 0) {
    // a handle loop is 2× the drop + a little to anchor each end
    panels.push({ name: 'Handle', wCm: spec.strapMm / 10, hCm: spec.handleDropCm * 2 + 8, qty: 2 })
  }
  return panels
}

/** Total shell material (m²) — every panel × its quantity, +8% waste. Pure. */
export function bagMaterialM2(spec: BagSpec): number {
  const cm2 = bagPanels(spec).reduce((s, p) => s + p.wCm * p.hCm * p.qty, 0)
  return Math.round((cm2 / 10000) * 1.08 * 1000) / 1000
}

/** The bag's metal hardware, drawn from the strap library. Pure. */
export function bagHardware(spec: BagSpec): { label: string }[] {
  const out: { label: string }[] = []
  if (spec.handleDropCm > 0) {
    const ring = hardwareForWidth(spec.strapMm, 'ring')
    out.push({ label: `4 × ${ring.name.toLowerCase()} (${ring.widthMm} mm handle anchors)` })
  }
  if (spec.style === 'crossbody') {
    const hook = hardwareForWidth(spec.strapMm, 'hook')
    out.push({ label: `2 × ${hook.name.toLowerCase()} (detachable strap)` })
  }
  const clasp = spec.style === 'clutch' ? hardwareForWidth(spec.strapMm, 'clasp') : pickBuckle(spec.strapMm)
  out.push({ label: `1 × ${clasp.name.toLowerCase()} (closure)` })
  return out
}

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

/** A printable bag cut sheet (panels + material + hardware) as HTML. Pure. */
export function bagCutSheetHTML(spec: BagSpec): string {
  const rows = bagPanels(spec)
    .map((p) => `<tr><td>${esc(p.name)}</td><td>${p.wCm.toFixed(1)} × ${p.hCm.toFixed(1)}</td><td>${p.qty}</td></tr>`)
    .join('')
  const hw = bagHardware(spec).map((h) => `<li>${esc(h.label)}</li>`).join('')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<title>${esc(spec.style)} — bag pattern</title>
<style>body{font:14px/1.5 system-ui,sans-serif;color:#16161a;margin:32px;max-width:640px}h1{text-transform:capitalize}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:6px 10px;text-align:left}</style>
</head><body>
<h1>${esc(spec.style)} bag</h1>
<p>${spec.widthCm} × ${spec.heightCm} × ${spec.gussetCm} cm · shell ${bagMaterialM2(spec).toFixed(3)} m²</p>
<h3>Cut panels (cm)</h3>
<table><thead><tr><th>Panel</th><th>W × H</th><th>Qty</th></tr></thead><tbody>${rows}</tbody></table>
<h3>Hardware</h3><ul>${hw}</ul>
</body></html>`
}
