/**
 * The **5-panel vs 6-panel cap** construction — where the crown's panel seams
 * run, as pure azimuth math (radians from centre-front, 1 unit = head radius).
 * A 6-panel cap seams straight down centre-front (the classic dad cap); a
 * 5-panel keeps one wide clean front panel (the camp cap), so its first seams
 * sit half a panel out. The accessory builder lays a ridge + twin topstitch
 * rows along each seam meridian.
 */
export type CapPanelCount = 5 | 6
export const CAP_PANEL_COUNTS: CapPanelCount[] = [5, 6]
export const DEFAULT_CAP_PANELS: CapPanelCount = 6

const TAU = Math.PI * 2

/** Seam azimuths for an n-panel crown, evenly spaced. Pure. */
export function panelSeamAzimuths(n: CapPanelCount): number[] {
  const step = TAU / n
  const offset = n === 5 ? step / 2 : 0 // 5-panel: no centre-front seam
  return Array.from({ length: n }, (_, i) => (offset + i * step) % TAU)
}

/** Whether a layout leaves the front panel clean (no seam within ±¼ panel of centre-front). */
export function hasCleanFront(n: CapPanelCount): boolean {
  const quarter = TAU / n / 4
  return panelSeamAzimuths(n).every((a) => Math.min(a, TAU - a) > quarter)
}
