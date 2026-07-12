/**
 * **Line sheet** — the printable wholesale one-pager a brand hands a buyer: hero
 * shot, style name/ref, fabric + fibre, colourway swatches, the size run, key
 * graded measurements, and landed cost with suggested wholesale/retail pricing.
 * Pure + unit-tested; `main` gathers the live data (the same calls the
 * manufacturing pack uses) and saves the HTML for print-to-PDF.
 */

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Standard keystone-style pricing from the landed cost: wholesale 2×, retail 2.2× wholesale. */
export function suggestedPrices(landedCost: number): { wholesale: number; retail: number } {
  const round = (v: number): number => Math.round(v * 100) / 100
  const wholesale = round(Math.max(0, landedCost) * 2)
  return { wholesale, retail: round(wholesale * 2.2) }
}

export interface LineSheetItem {
  name: string
  styleRef: string
  /** Data-URL hero still (ghost/product shot works beautifully). */
  hero: string
  fabricName: string
  fibre: string
  sizes: string[]
  colourways: { hex: string; label: string }[]
  /** Key graded measurements at the base size. */
  specs: { label: string; cm: number }[]
  landedCost: number
  care: string[]
}

/** The printable line-sheet document (print-CSS, one page per item). */
export function lineSheetHTML(item: LineSheetItem): string {
  const p = suggestedPrices(item.landedCost)
  const swatches = item.colourways
    .map((c) => `<span class="sw" style="background:${esc(c.hex)}" title="${esc(c.label)}"></span>`)
    .join('')
  const sizes = item.sizes.map((s) => `<span class="chip">${esc(s)}</span>`).join('')
  const specs = item.specs.map((r) => `<tr><td>${esc(r.label)}</td><td>${r.cm.toFixed(1)} cm</td></tr>`).join('')
  const care = item.care.map((c) => `<li>${esc(c)}</li>`).join('')
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>${esc(item.name)} — line sheet</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font: 13px/1.45 system-ui, sans-serif; color: #16161a; margin: 0; }
  .sheet { display: grid; grid-template-columns: 46% 1fr; gap: 24px; }
  img.hero { width: 100%; border-radius: 6px; background: #f4f4f6; }
  h1 { font-size: 22px; margin: 0 0 2px; }
  .ref { color: #6b6e78; margin: 0 0 14px; }
  h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b6e78; margin: 16px 0 6px; }
  .sw { display: inline-block; width: 22px; height: 22px; border-radius: 50%; margin-right: 6px; border: 1px solid #d5d6dc; }
  .chip { display: inline-block; padding: 2px 8px; border: 1px solid #d5d6dc; border-radius: 10px; margin: 0 4px 4px 0; font-size: 12px; }
  table { border-collapse: collapse; }
  td { padding: 2px 14px 2px 0; }
  ul { margin: 4px 0 0; padding-left: 16px; }
  .price td { font-weight: 600; }
  footer { margin-top: 18px; font-size: 10.5px; color: #9a9ca6; }
</style>
<div class="sheet">
  <div><img class="hero" src="${item.hero}" alt="${esc(item.name)}"></div>
  <div>
    <h1>${esc(item.name)}</h1>
    <p class="ref">Style ${esc(item.styleRef)}</p>
    <h2>Fabric</h2>${esc(item.fabricName)} · ${esc(item.fibre)}
    <h2>Colourways</h2>${swatches}
    <h2>Size run</h2>${sizes}
    <h2>Key measurements</h2>
    <table>${specs}</table>
    <h2>Pricing (USD)</h2>
    <table class="price">
      <tr><td>Landed cost</td><td>$${item.landedCost.toFixed(2)}</td></tr>
      <tr><td>Suggested wholesale</td><td>$${p.wholesale.toFixed(2)}</td></tr>
      <tr><td>Suggested retail</td><td>$${p.retail.toFixed(2)}</td></tr>
    </table>
    <h2>Care</h2>
    <ul>${care}</ul>
  </div>
</div>
<footer>DesignIO line sheet · measurements graded from the live construction · print to PDF at 100%</footer>
</html>
`
}
