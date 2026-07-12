import type { ManufactureBundle, ManufactureLayer } from './manufacture'

/**
 * **Factory pack** — the whole outfit as one versioned, machine-readable JSON a
 * production pipeline can ingest without scraping HTML: schema-stamped, explicit
 * units in every key name, the sourceable BOM (suppliers + lead times), graded
 * POM, cost, sustainability, and the flat pattern embedded as **DXF-AAMA**
 * (boundary layer 1 / internals 8 — the interchange Gerber · Lectra · Optitex
 * import). Pure + unit-tested.
 */

export const FACTORY_PACK_SCHEMA = 'designio.factory-pack'
export const FACTORY_PACK_VERSION = 1

interface FactoryGarment {
  style: string
  sampleSize: string
  bom: Array<{ material: string; role: string; supplier?: string; leadWeeksMin?: number; leadWeeksMax?: number }>
  measurementsCm: Array<{ point: string; cm: number }>
  pomCm?: { sizes: string[]; rows: Array<{ point: string; tolCm: number; bySize: Record<string, number> }> }
  costUsd?: { fabric: number; thread: number; trims: number; labour: number; overhead: number; total: number }
  sustainability?: { fibre: string; group: string; recyclable: boolean; circularScore: number; waterL: number; co2Kg: number }
  /** Flat pattern in DXF-AAMA layers (1 = boundary, 8 = internal) for CAD import. */
  patternDxfAama?: string
}

function garment(l: ManufactureLayer & { supplier?: { source: string; leadWeeksMin: number; leadWeeksMax: number }; patternDxfAama?: string }): FactoryGarment {
  const bom: FactoryGarment['bom'] = [
    { material: `${l.fabricName} · ${l.gsm} gsm`, role: 'body', supplier: l.supplier?.source, leadWeeksMin: l.supplier?.leadWeeksMin, leadWeeksMax: l.supplier?.leadWeeksMax }
  ]
  for (const p of l.parts ?? []) bom.push({ material: p.fabric, role: p.part })
  if (l.trim) bom.push({ material: l.trim, role: 'trim' })
  return {
    style: l.name,
    sampleSize: l.size,
    bom,
    measurementsCm: l.metrics.rows.map((r) => ({ point: r.label, cm: r.cm })),
    pomCm: l.pom ? { sizes: l.pom.sizes, rows: l.pom.rows.map((r) => ({ point: r.label, tolCm: r.tolCm, bySize: r.bySize })) } : undefined,
    costUsd: l.cost ? { fabric: l.cost.fabric, thread: l.cost.thread, trims: l.cost.trims, labour: l.cost.labour, overhead: l.cost.overhead, total: l.cost.total } : undefined,
    sustainability: l.sustainability
      ? {
          fibre: l.sustainability.passport.fibre,
          group: l.sustainability.passport.group,
          recyclable: l.sustainability.passport.recyclable,
          circularScore: l.sustainability.circularScore,
          waterL: l.sustainability.footprint.waterL,
          co2Kg: l.sustainability.footprint.co2Kg
        }
      : undefined,
    patternDxfAama: l.patternDxfAama
  }
}

/** The versioned factory-pack document (pretty-printed for diffs + inspection). */
export function factoryPackJSON(bundle: ManufactureBundle): string {
  return JSON.stringify(
    {
      schema: FACTORY_PACK_SCHEMA,
      version: FACTORY_PACK_VERSION,
      title: bundle.title,
      body: bundle.body,
      garments: bundle.layers.map((l) => garment(l))
    },
    null,
    2
  )
}
