/**
 * **Buttons & closures designer** — the closure decor as data: how many buttons,
 * how big, what colour; the zip tape + pull colours. Absent fields keep the
 * classic look byte-for-byte. The count/size maths is pure + unit-tested; the
 * stack's buildClosure reads it and colours through small cached material maps.
 */

export interface ClosureDesign {
  /** Button count (2…9). Absent = auto from the placket height (~one per 8.5 cm). */
  buttons?: number
  /** Button diameter in mm (8…30). Absent = the classic 13 mm shell. */
  buttonMm?: number
  buttonColor?: number
  zipColor?: number
  pullColor?: number
}

/** The button count: requested (clamped 2…9) or the classic auto-by-height rule. */
export function buttonCount(placketHeightM: number, requested?: number): number {
  if (requested !== undefined) return Math.max(2, Math.min(9, Math.round(requested)))
  return Math.max(3, Math.round(placketHeightM / 0.085))
}

const BASE_BUTTON_MM = 13 // the classic shell button the lathe profile is authored at

/** Scale factor vs the authored button profile for a requested diameter. */
export function buttonScale(buttonMm?: number): number {
  if (buttonMm === undefined) return 1
  return Math.max(8, Math.min(30, buttonMm)) / BASE_BUTTON_MM
}
