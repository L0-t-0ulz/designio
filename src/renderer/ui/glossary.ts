/**
 * **In-app term glossary** — a curated dictionary of the garment / fabric /
 * construction / pattern / production words the studio uses, so a designer new to
 * the trade can look one up without leaving the app. The data + search are pure
 * (no DOM) so they're unit-tested; `ui/glossaryOverlay` renders the modal.
 */
export type GlossaryCategory = 'construction' | 'pattern' | 'fabric' | 'finish' | 'production'

export const GLOSSARY_CATEGORIES: { id: GlossaryCategory; label: string }[] = [
  { id: 'construction', label: 'Construction' },
  { id: 'pattern', label: 'Pattern & drafting' },
  { id: 'fabric', label: 'Fabric & weave' },
  { id: 'finish', label: 'Surface & finish' },
  { id: 'production', label: 'Production' }
]

export interface GlossaryEntry {
  term: string
  category: GlossaryCategory
  def: string
}

export const GLOSSARY: GlossaryEntry[] = [
  // construction
  { term: 'Ease', category: 'construction', def: 'The extra room a garment adds over the body measurement — wearing ease to move, plus design ease for the intended looseness.' },
  { term: 'Dart', category: 'construction', def: 'A stitched folded wedge that takes up fabric to shape flat cloth to the body’s curves (bust, waist, shoulder).' },
  { term: 'Seam allowance', category: 'construction', def: 'The margin of fabric between the stitch line and the cut edge, so the seam has something to be sewn into (often 1 cm).' },
  { term: 'Hem', category: 'construction', def: 'The finished bottom (or sleeve) edge, usually folded under and stitched so it won’t fray.' },
  { term: 'Facing', category: 'construction', def: 'A shaped piece that finishes a raw edge (neckline, armhole) on the inside so no raw edge shows.' },
  { term: 'Interfacing', category: 'construction', def: 'A stiffening layer fused or sewn inside collars, cuffs and plackets to add body and hold a crisp shape.' },
  { term: 'Placket', category: 'construction', def: 'The finished opening of a garment — e.g. the buttoned front of a shirt or the slit at a cuff.' },
  { term: 'Yoke', category: 'construction', def: 'A shaped panel across the shoulders (or hips) that carries the fullness of the pieces seamed to it.' },
  { term: 'Princess seam', category: 'construction', def: 'A curved seam running from the shoulder or armhole over the bust to the hem, shaping a fitted bodice without darts.' },
  { term: 'Pleat', category: 'construction', def: 'A fold of fabric pressed or stitched in to control fullness — knife, box, accordion or cartridge.' },
  { term: 'Gather', category: 'construction', def: 'Fabric drawn up along a thread to a shorter length, creating soft even fullness (a gathered skirt or sleeve head).' },
  { term: 'Topstitch', category: 'construction', def: 'A visible line of stitching on the face of the garment — decorative and/or holding a seam or edge flat.' },
  { term: 'Godet', category: 'construction', def: 'A triangular panel set into a seam or slash to add flare at the hem without widening the whole piece.' },
  { term: 'Gusset', category: 'construction', def: 'A small piece (often diamond-shaped) inset at a stress point — an underarm or crotch — to add room and ease movement.' },

  // pattern & drafting
  { term: 'Grainline', category: 'pattern', def: 'The arrow on a pattern piece marking the warp (lengthwise) direction; pieces are cut aligned to it so they hang right.' },
  { term: 'Bias', category: 'pattern', def: 'The 45° diagonal to the grain. Fabric stretches most on the bias, so bias-cut garments cling and drape fluidly.' },
  { term: 'Notch', category: 'pattern', def: 'A small mark on a pattern/panel edge used to match and align seams when sewing two pieces together.' },
  { term: 'Block (sloper)', category: 'pattern', def: 'A basic fitted pattern with no style lines or seam allowance — the foundation a designer develops styles from.' },
  { term: 'Gore', category: 'pattern', def: 'A tapered panel, wide at one end and narrow at the other — the shaped segments of a flared skirt or a hat crown.' },
  { term: 'Grading', category: 'pattern', def: 'Scaling a base pattern up and down through the size run by set increments at each point of measure.' },
  { term: 'Truing', category: 'pattern', def: 'Cleaning up a drafted pattern so seam lengths match and lines flow smoothly across the seams they join.' },
  { term: 'Walking the seam', category: 'pattern', def: 'Rotating one pattern piece along another edge-to-edge to check the two seams are the same length and marks align.' },

  // fabric & weave
  { term: 'GSM', category: 'fabric', def: 'Grams per square metre — a fabric’s areal weight. Heavier GSM hangs with larger, lazier folds.' },
  { term: 'Drape', category: 'fabric', def: 'How fluidly a fabric falls under its own weight — from a stiff crisp canvas to a liquid silk charmeuse.' },
  { term: 'Warp & weft', category: 'fabric', def: 'The two thread sets of a woven cloth: warp runs lengthwise (with the grain), weft crosses it selvedge to selvedge.' },
  { term: 'Selvedge', category: 'fabric', def: 'The tightly-woven self-finished edge running down each side of a length of woven fabric, parallel to the warp.' },
  { term: 'Nap', category: 'fabric', def: 'A raised directional pile (velvet, corduroy, suede) that shades differently up vs down — so pieces are cut one way.' },
  { term: 'Twill', category: 'fabric', def: 'A weave with a diagonal rib (denim, gabardine), from the weft floating over two-plus warps and stepping over each row.' },
  { term: 'Satin weave', category: 'fabric', def: 'A weave with long floats and few interlacings, giving a smooth lustrous face — the basis of satin and charmeuse.' },
  { term: 'Hand', category: 'fabric', def: 'How a fabric feels to the touch and manipulate — crisp, soft, dry, springy — driven by the fibre, yarn and finish.' },

  // surface & finish
  { term: 'Appliqué', category: 'finish', def: 'A fabric shape stitched onto the garment as decoration, often with a satin-stitch border tacking down its edge.' },
  { term: 'Ombré', category: 'finish', def: 'A graduated dip-dye where the colour fades from one tone to another across the garment.' },
  { term: 'Duotone', category: 'finish', def: 'A two-tone image treatment mapping the fabric’s light-to-dark range onto a ramp between a shadow and a highlight colour.' },
  { term: 'Discharge print', category: 'finish', def: 'A print that removes (bleaches) the dye where it prints, leaving a soft pale motif instead of laying ink on top.' },
  { term: 'Foil print', category: 'finish', def: 'A bright metallic transfer bonded to the fabric with heat and adhesive for a reflective, shiny mark.' },
  { term: 'Colorway', category: 'finish', def: 'One colour/fabric variant of a single design — the same style offered in several colour stories.' },

  // production
  { term: 'Tech pack', category: 'production', def: 'The specification document a factory works from — measurements, construction, materials, trims and care.' },
  { term: 'BOM', category: 'production', def: 'Bill of materials — the itemised list of every fabric, trim and component a garment consumes, with quantities.' },
  { term: 'Marker', category: 'production', def: 'The layout of all the pattern pieces nested on the fabric width for cutting, optimised to waste as little as possible.' },
  { term: 'Point of measure (POM)', category: 'production', def: 'A defined place a garment is measured (chest, waist, sleeve length) with a spec value and tolerance for QC.' }
]

/** Case-insensitive search over term + definition; empty query returns all. Pure. */
export function searchGlossary(query: string, entries: GlossaryEntry[] = GLOSSARY): GlossaryEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return entries.slice()
  return entries.filter((e) => e.term.toLowerCase().includes(q) || e.def.toLowerCase().includes(q))
}

/** Group entries by category, in the canonical category order. Pure. */
export function glossaryByCategory(entries: GlossaryEntry[] = GLOSSARY): { id: GlossaryCategory; label: string; entries: GlossaryEntry[] }[] {
  return GLOSSARY_CATEGORIES.map((c) => ({ ...c, entries: entries.filter((e) => e.category === c.id) })).filter((g) => g.entries.length > 0)
}
