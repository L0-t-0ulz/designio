import type { AccessoryKind } from './accessories'

/**
 * The **parametric brim designer** — width · droop/flip · edge wire for the
 * structured hat accessories (fedora 'hat' · bucket · sunhat). Pure unit-frame
 * numbers (1 unit = head radius) consumed by the accessory builders; the same
 * profile drives every brimmed block.
 */
export interface BrimParams {
  /** Brim width multiplier, 0.4 (stingy) … 2.2 (statement). */
  width: number
  /** Droop −1 (flipped up) … 0 (flat) … 1 (heavy droop). */
  droop: number
  /** A wired edge — a crisp rolled rim at the brim's lip. */
  wire: boolean
}

export const DEFAULT_BRIM: BrimParams = { width: 1, droop: 0.35, wire: false }

const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x))

/** Per-kind base geometry (unit head frame): where the brim leaves the crown wall,
 *  how far a width of 1 spreads it, and how tall a full droop runs. */
const BASE: Partial<Record<AccessoryKind, { topR: number; spread: number; droopH: number }>> = {
  hat: { topR: 0.7, spread: 0.62, droopH: 0.3 },
  bucket: { topR: 1.04, spread: 0.46, droopH: 0.3 },
  sunhat: { topR: 1.02, spread: 1.33, droopH: 0.46 }
}

export interface BrimProfile {
  topR: number
  botR: number
  /** Cone height (always positive; `up` says which way it runs). */
  h: number
  /** true = the brim flips up (droop < 0). */
  up: boolean
  /** Edge-wire ring radius (= the brim lip). */
  wireR: number
}

/** The brim cone for a hat kind. Pure; clamped; monotonic in width. */
export function brimProfile(kind: AccessoryKind, p: BrimParams): BrimProfile | null {
  const base = BASE[kind]
  if (!base) return null
  const width = clamp(p.width, 0.4, 2.2)
  const droop = clamp(p.droop, -1, 1)
  const botR = base.topR + base.spread * width
  // droop height scales with the radial RUN so a wide brim actually slopes
  // (a fixed height over a huge spread reads flat)
  const run = (botR - base.topR) / base.spread
  return {
    topR: base.topR,
    botR,
    h: Math.max(0.03, base.droopH * Math.abs(droop) * run),
    up: droop < 0,
    wireR: botR
  }
}
