/**
 * **Sample order** — the spec + quantity request a designer sends a factory for a
 * sample run: style + fabric, the colourway × size quantity grid, the sample
 * stage (proto → SMS → PPS), target dates and ship-to/notes blocks. Pairs with
 * the tech pack (how to make it), the QC sheet (how to inspect it) and the line
 * sheet (how to sell it). Pure + unit-tested; print-CSS A4 for print-to-PDF.
 */

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export const SAMPLE_STAGES = ['Proto', 'SMS (salesman sample)', 'PPS (pre-production)'] as const

export interface SampleOrderData {
  name: string
  styleRef: string
  fabricName: string
  fibre: string
  sizes: string[]
  colourways: { hex: string; label: string }[]
  /** Pre-filled qty per colourway at the base size (the rest stay blank). */
  baseSize: string
  baseQty?: number
}

/** Total pre-filled sample quantity (base qty × colourways). */
export function sampleTotal(colourways: number, baseQty = 1): number {
  return Math.max(0, colourways) * Math.max(0, baseQty)
}

/** The printable sample-order document. */
export function sampleOrderHTML(d: SampleOrderData): string {
  const qty = d.baseQty ?? 1
  const head = d.sizes.map((s) => `<th>${esc(s)}</th>`).join('')
  const rows = d.colourways
    .map((c) => {
      const cells = d.sizes.map((s) => `<td class="q">${s === d.baseSize ? qty : ''}</td>`).join('')
      return `<tr><td><span class="sw" style="background:${esc(c.hex)}"></span>${esc(c.label)}</td>${cells}</tr>`
    })
    .join('\n      ')
  const stages = SAMPLE_STAGES.map((s) => `<label><span class="box"></span>${esc(s)}</label>`).join('')
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>${esc(d.name)} — sample order</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font: 12.5px/1.45 system-ui, sans-serif; color: #16161a; margin: 0; }
  h1 { font-size: 18px; margin: 0; }
  .meta { color: #6b6e78; margin: 2px 0 14px; }
  h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b6e78; margin: 16px 0 6px; }
  table { border-collapse: collapse; }
  th, td { border: 1px solid #c9cbd4; padding: 4px 10px; text-align: left; }
  th { background: #f0f0f3; font-size: 11px; }
  td.q { min-width: 40px; text-align: center; }
  .sw { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 7px; border: 1px solid #c9cbd4; vertical-align: -1px; }
  .stages label { margin-right: 22px; }
  .box { display: inline-block; width: 12px; height: 12px; border: 1.5px solid #16161a; border-radius: 2px; margin-right: 6px; vertical-align: -1px; }
  .lines div { border-bottom: 1px solid #c9cbd4; height: 22px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
  footer { margin-top: 18px; font-size: 10.5px; color: #9a9ca6; }
</style>
<h1>Sample order — ${esc(d.name)}</h1>
<p class="meta">Style ${esc(d.styleRef)} · ${esc(d.fabricName)} · ${esc(d.fibre)}</p>
<h2>Sample stage</h2>
<div class="stages">${stages}</div>
<h2>Quantities (colourway × size)</h2>
<table>
  <tr><th>Colourway</th>${head}</tr>
      ${rows}
</table>
<div class="grid2">
  <div><h2>Target dates</h2><div class="lines"><div></div><div></div></div></div>
  <div><h2>Ship to</h2><div class="lines"><div></div><div></div></div></div>
</div>
<h2>Notes (construction · fit comments · print placement)</h2>
<div class="lines"><div></div><div></div><div></div></div>
<footer>DesignIO sample order · attach the tech pack + flat pattern from File → Export for manufacturing</footer>
</html>
`
}
