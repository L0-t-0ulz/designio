/**
 * **Focus pull** — maps a rack-focus slider (0…1) to a depth-of-field focus
 * distance swept around the subject: 0 racks to the near foreground (half the
 * orbit distance), 0.5 lands exactly on the subject, 1 racks past it to the
 * background (double). Exponential so the pull feels even through the sweep —
 * each half of the slider is one stop of distance. Pure + unit-tested.
 */
export function focusDistance(t: number, subjectDist: number): number {
  const u = Math.max(0, Math.min(1, t))
  return subjectDist * 2 ** ((u - 0.5) * 2)
}
