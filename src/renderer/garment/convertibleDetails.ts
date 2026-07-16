/**
 * **Convertible details** — construction that lets one garment be worn two ways: a
 * roll-up sleeve (long ↔ rolled, held by a tab + button), a zip-off leg (trousers ↔
 * shorts, a separating zip at the thigh), a stowaway hood (up ↔ hidden in the collar),
 * a convertible collar (open ↔ buttoned to the throat). This derives which convertible
 * details a garment's construction supports + the hardware each needs. Pure (no DOM)
 * so it's unit-tested; the tech pack lists them.
 */
export interface ConvertibleDetail {
  name: string
  /** The two worn configurations. */
  states: [string, string]
  /** The hardware the conversion needs. */
  hardware: string
}

export interface ConvertibleConstruction {
  hasSleeves?: boolean
  hasLegs?: boolean
  hood?: boolean
  collar?: boolean
}

/** The convertible details a garment's construction supports. Pure. */
export function convertibleDetailsFor(c: ConvertibleConstruction): ConvertibleDetail[] {
  const out: ConvertibleDetail[] = []
  if (c.hasSleeves) out.push({ name: 'Roll-up sleeve', states: ['full length', 'rolled + tabbed'], hardware: 'sleeve tab + button' })
  if (c.hasLegs) out.push({ name: 'Zip-off leg', states: ['trousers', 'shorts'], hardware: 'separating thigh zip' })
  if (c.hood) out.push({ name: 'Stowaway hood', states: ['hood up', 'zipped into the collar'], hardware: 'collar zip' })
  if (c.collar) out.push({ name: 'Convertible collar', states: ['open', 'buttoned to the throat'], hardware: 'throat-latch button' })
  return out
}

/** A one-line tech-pack note of the convertible details. Pure. */
export function convertibleNote(details: ConvertibleDetail[]): string {
  if (!details.length) return ''
  return details.map((d) => `${d.name.toLowerCase()} (${d.states.join(' ↔ ')})`).join('; ')
}
