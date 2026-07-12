/**
 * **QC spec sheet** — the inspection one-pager a factory QC line measures a batch
 * against: every point of measure with its graded spec + tolerance, blank
 * *measured* cells, pass/fail ticks, an AQL note and an inspector signature line.
 * Built from the same graded POM the tech pack prints, so the numbers a garment
 * is inspected to are exactly the numbers it was drafted to. Pure + unit-tested.
 */

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export interface QcRow {
  label: string
  /** Graded spec (cm) at the inspected size. */
  specCm: number
  /** Half-tolerance (± cm). */
  tolCm: number
}

export interface QcSheetData {
  name: string
  styleRef: string
  size: string
  fabricName: string
  rows: QcRow[]
  /** Sampling note, e.g. 'AQL 2.5 — general inspection level II'. */
  aql?: string
}

/** Acceptance bounds for one point (spec ± tol), cents-of-cm rounded. */
export function qcBounds(specCm: number, tolCm: number): { min: number; max: number } {
  const r = (v: number): number => Math.round(v * 100) / 100
  return { min: r(specCm - tolCm), max: r(specCm + tolCm) }
}

/** The printable QC inspection sheet (5 sample columns per point). */
export function qcSheetHTML(d: QcSheetData): string {
  const rows = d.rows
    .map((r) => {
      const b = qcBounds(r.specCm, r.tolCm)
      const blanks = '<td class="m"></td>'.repeat(5)
      return `<tr><td>${esc(r.label)}</td><td>${r.specCm.toFixed(1)}</td><td>±${r.tolCm.toFixed(1)}</td><td>${b.min.toFixed(1)}–${b.max.toFixed(1)}</td>${blanks}<td class="pf"></td></tr>`
    })
    .join('\n      ')
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>${esc(d.name)} — QC inspection sheet</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  body { font: 12px/1.4 system-ui, sans-serif; color: #16161a; margin: 0; }
  h1 { font-size: 18px; margin: 0; }
  .meta { color: #6b6e78; margin: 2px 0 12px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #c9cbd4; padding: 4px 8px; text-align: left; }
  th { background: #f0f0f3; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
  td.m { min-width: 46px; } /* blank measured cells the inspector fills in */
  td.pf { min-width: 56px; }
  .aql { margin: 10px 0 0; font-size: 11.5px; color: #44464e; }
  .sig { margin-top: 26px; display: flex; gap: 48px; }
  .sig span { border-top: 1px solid #16161a; padding-top: 4px; min-width: 200px; font-size: 11px; color: #44464e; }
</style>
<h1>QC inspection — ${esc(d.name)}</h1>
<p class="meta">Style ${esc(d.styleRef)} · size ${esc(d.size)} · ${esc(d.fabricName)} · measurements in cm</p>
<table>
  <tr><th>Point of measure</th><th>Spec</th><th>Tol</th><th>Accept range</th><th>#1</th><th>#2</th><th>#3</th><th>#4</th><th>#5</th><th>Pass / fail</th></tr>
      ${rows}
</table>
<p class="aql">${esc(d.aql ?? 'AQL 2.5 — general inspection level II · measure garments laid flat, relaxed')}</p>
<div class="sig"><span>Inspector · date</span><span>Factory · batch</span></div>
</html>
`
}
