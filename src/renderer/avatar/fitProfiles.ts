import type { BodyParams } from './Mannequin'
import { bodyToMeasurements, type BodyMeasurementsCm } from './measure'

/**
 * **Per-customer fit profiles** — named measurement sets (a client, a fit model,
 * yourself) saved in the app and applied to the avatar in one click, so a designer
 * can flip between the people they cut for. Pairs with made-to-measure (typing the
 * numbers), the size recommendation (which size fits *this* person) and the fit
 * views. Pure parse/upsert/remove helpers are unit-tested; only load/save touch
 * localStorage.
 */

export interface FitProfile {
  id: string
  name: string
  bodyType: 'female' | 'male'
  measurements: BodyMeasurementsCm
}

export function newProfileId(): string {
  return 'fp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7)
}

/** Capture the current avatar as a named profile. */
export function profileFromBody(name: string, body: BodyParams, id = newProfileId()): FitProfile {
  return { id, name: name.trim() || 'Unnamed', bodyType: body.bodyType === 'male' ? 'male' : 'female', measurements: bodyToMeasurements(body) }
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** Parse a saved profile list — junk-tolerant (corrupt JSON / malformed entries dropped). */
export function parseProfiles(text: string | null): FitProfile[] {
  if (!text) return []
  try {
    const raw = JSON.parse(text) as Partial<FitProfile>[]
    if (!Array.isArray(raw)) return []
    return raw.filter(
      (p): p is FitProfile =>
        !!p &&
        typeof p.id === 'string' &&
        typeof p.name === 'string' &&
        (p.bodyType === 'female' || p.bodyType === 'male') &&
        !!p.measurements &&
        isNum(p.measurements.height) &&
        isNum(p.measurements.bust) &&
        isNum(p.measurements.waist) &&
        isNum(p.measurements.hips)
    )
  } catch {
    return []
  }
}

export function serializeProfiles(list: FitProfile[]): string {
  return JSON.stringify(list)
}

/** Insert or replace by id (name-updated profiles keep their place). */
export function upsertProfile(list: FitProfile[], p: FitProfile): FitProfile[] {
  const i = list.findIndex((x) => x.id === p.id)
  if (i === -1) return [...list, p]
  const out = [...list]
  out[i] = p
  return out
}

export function removeProfile(list: FitProfile[], id: string): FitProfile[] {
  return list.filter((p) => p.id !== id)
}

// ---- persistence (the only impure part) ----
const STORE_KEY = 'dio-fit-profiles'

export function loadProfiles(): FitProfile[] {
  try {
    return parseProfiles(localStorage.getItem(STORE_KEY))
  } catch {
    return []
  }
}

export function saveProfiles(list: FitProfile[]): void {
  try {
    localStorage.setItem(STORE_KEY, serializeProfiles(list))
  } catch {
    /* storage blocked — the session keeps the in-memory list */
  }
}
