/**
 * **Shoe last + upper designer** — the parametric last (the foot form a shoe is
 * built over, sized from an EU size) and the upper pattern it wraps: vamp, quarters,
 * tongue, toe cap, heel counter, boot shaft — per style. Pure geometry (last
 * dimensions, panel sizes in cm, leather area) + a printable cut sheet. Unit-tested;
 * File → Export shoe pattern renders it. (The 3D shoe mesh + lasting sim are a
 * follow-up — this is the last + upper spec the maker cuts to. Sole & tread is a
 * separate module.)
 */
export type ShoeStyle = 'oxford' | 'derby' | 'sneaker' | 'boot' | 'loafer'

export interface ShoeLast {
  sizeEU: number
  /** The foot length (cm) the size implies (EU size = 1.5 × last-cm; last = foot + ~1.5 cm). */
  footLengthCm: number
  /** Width across the ball of the foot (cm). */
  footWidthCm: number
  /** Heel-to-ball length (cm) — where the shoe flexes. */
  heelToBallCm: number
  /** Instron/last girth around the ball (cm). */
  ballGirthCm: number
}

/** The last a shoe of an EU size is built over. Pure. */
export function shoeLast(sizeEU: number): ShoeLast {
  const lastCm = (sizeEU * 2) / 3 // EU size = 1.5 × last length (cm)
  const footLengthCm = Math.round((lastCm - 1.5) * 10) / 10 // last = foot + ~1.5 cm allowance
  const footWidthCm = Math.round(footLengthCm * 0.38 * 10) / 10
  return {
    sizeEU,
    footLengthCm,
    footWidthCm,
    heelToBallCm: Math.round(footLengthCm * 0.72 * 10) / 10,
    ballGirthCm: Math.round(footWidthCm * 2.5 * 10) / 10
  }
}

export interface ShoePanel {
  name: string
  wCm: number
  hCm: number
  qty: number
}

/** The upper pattern panels for a style over a last. Pure. */
export function upperPanels(style: ShoeStyle, last: ShoeLast): ShoePanel[] {
  const L = last.footLengthCm
  const W = last.footWidthCm
  const panels: ShoePanel[] = [
    { name: 'Vamp (forepart)', wCm: Math.round(W * 2.4), hCm: Math.round(L * 0.55), qty: 1 },
    { name: 'Quarter (heel side)', wCm: Math.round(L * 0.5), hCm: Math.round(W * 1.6), qty: 2 },
    { name: 'Heel counter', wCm: Math.round(W * 2.2), hCm: Math.round(W * 1.1), qty: 1 }
  ]
  if (style === 'oxford') panels.push({ name: 'Toe cap', wCm: Math.round(W * 2.2), hCm: Math.round(L * 0.28), qty: 1 })
  if (style === 'oxford' || style === 'derby' || style === 'sneaker') panels.push({ name: 'Tongue', wCm: Math.round(W * 1.2), hCm: Math.round(L * 0.4), qty: 1 })
  if (style === 'boot') panels.push({ name: 'Shaft (leg)', wCm: Math.round(last.ballGirthCm * 1.1), hCm: Math.round(L * 0.9), qty: 2 })
  return panels
}

/** Total upper leather (m²) — panels × qty, +12% waste (leather nests poorly). Pure. */
export function upperMaterialM2(style: ShoeStyle, last: ShoeLast): number {
  const cm2 = upperPanels(style, last).reduce((s, p) => s + p.wCm * p.hCm * p.qty, 0)
  return Math.round((cm2 / 10000) * 1.12 * 1000) / 1000
}

/** One-line summary of a shoe last + upper. Pure. */
export function shoeSummary(style: ShoeStyle, last: ShoeLast): string {
  return `${style} · EU ${last.sizeEU} · last ${last.footLengthCm} cm · ${upperPanels(style, last).length} upper panels · ${upperMaterialM2(style, last).toFixed(3)} m²`
}

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

/** A printable shoe upper cut sheet as HTML. Pure. */
export function shoeCutSheetHTML(style: ShoeStyle, last: ShoeLast): string {
  const rows = upperPanels(style, last)
    .map((p) => `<tr><td>${esc(p.name)}</td><td>${p.wCm} × ${p.hCm}</td><td>${p.qty}</td></tr>`)
    .join('')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<title>${esc(style)} — shoe upper pattern</title>
<style>body{font:14px/1.5 system-ui,sans-serif;color:#16161a;margin:32px;max-width:640px}h1{text-transform:capitalize}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:6px 10px;text-align:left}</style>
</head><body>
<h1>${esc(style)} — EU ${last.sizeEU}</h1>
<p>Last: foot ${last.footLengthCm} cm · width ${last.footWidthCm} cm · heel-to-ball ${last.heelToBallCm} cm · ball girth ${last.ballGirthCm} cm</p>
<p>Upper leather: ${upperMaterialM2(style, last).toFixed(3)} m²</p>
<h3>Upper — cut panels (cm)</h3>
<table><thead><tr><th>Panel</th><th>W × H</th><th>Qty</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`
}
