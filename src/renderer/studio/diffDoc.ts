import type { ProjectDoc, GarmentLayerData, BodyData } from './document'

/**
 * **Version compare** — a human-readable diff between two saved `ProjectDoc`s (e.g.
 * a snapshot vs the working design), so a designer can see exactly what changed
 * between versions. Pure (no DOM) so it's unit-tested; the version-history panel
 * renders the returned lines.
 */
const hex = (n: number): string => '#' + (n >>> 0).toString(16).padStart(6, '0').slice(-6)

const BODY_FIELDS: { key: keyof BodyData; label: string }[] = [
  { key: 'bodyType', label: 'Body type' },
  { key: 'height', label: 'Height' },
  { key: 'build', label: 'Build' },
  { key: 'bust', label: 'Bust' },
  { key: 'waist', label: 'Waist' },
  { key: 'hips', label: 'Hips' }
]

/** Per-layer fields worth surfacing in a diff (construction + appearance). */
const LAYER_FIELDS: { key: keyof GarmentLayerData; label: string; color?: boolean }[] = [
  { key: 'garmentType', label: 'Garment' },
  { key: 'fabricId', label: 'Fabric' },
  { key: 'color', label: 'Colour', color: true },
  { key: 'size', label: 'Size' },
  { key: 'neckline', label: 'Neckline' },
  { key: 'sleeve', label: 'Sleeve' },
  { key: 'sleeveShape', label: 'Sleeve shape' },
  { key: 'collar', label: 'Collar' },
  { key: 'cuff', label: 'Cuff' },
  { key: 'pocket', label: 'Pocket' },
  { key: 'pleats', label: 'Pleats' },
  { key: 'lined', label: 'Lined' },
  { key: 'trim', label: 'Trim' },
  { key: 'textile', label: 'Textile' },
  { key: 'ombre', label: 'Ombré' },
  { key: 'wear', label: 'Wear' },
  { key: 'sparkle', label: 'Sparkle' },
  { key: 'duotone', label: 'Duotone' }
]

const show = (v: unknown, isColor: boolean): string => {
  if (v === undefined || v === false) return '—'
  if (v === true) return 'on'
  if (isColor && typeof v === 'number') return hex(v)
  if (typeof v === 'number') return String(Math.round(v * 1000) / 1000)
  return String(v)
}

/**
 * A list of human-readable difference lines between doc `a` (older) and `b` (newer):
 * body changes, per-layer field changes, and added/removed layers. Empty = identical.
 * Pure.
 */
export function diffDocs(a: ProjectDoc, b: ProjectDoc): string[] {
  const out: string[] = []

  for (const f of BODY_FIELDS) {
    const av = a.body?.[f.key]
    const bv = b.body?.[f.key]
    if (av !== bv) out.push(`${f.label}: ${show(av, false)} → ${show(bv, false)}`)
  }

  const na = a.layers?.length ?? 0
  const nb = b.layers?.length ?? 0
  const common = Math.min(na, nb)
  for (let i = 0; i < common; i++) {
    const la = a.layers[i]
    const lb = b.layers[i]
    for (const f of LAYER_FIELDS) {
      const av = la[f.key]
      const bv = lb[f.key]
      if (av !== bv) out.push(`Layer ${i + 1} ${f.label.toLowerCase()}: ${show(av, !!f.color)} → ${show(bv, !!f.color)}`)
    }
  }
  for (let i = common; i < nb; i++) out.push(`Added layer ${i + 1}: ${b.layers[i].garmentType}`)
  for (let i = common; i < na; i++) out.push(`Removed layer ${i + 1}: ${a.layers[i].garmentType}`)

  return out
}

/** A one-line summary (`N changes` / `No changes`). Pure. */
export function diffSummary(a: ProjectDoc, b: ProjectDoc): string {
  const n = diffDocs(a, b).length
  return n === 0 ? 'No changes' : `${n} change${n === 1 ? '' : 's'}`
}
