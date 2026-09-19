import type { Measurements } from '../avatar/Mannequin'
import type { CameraPose } from './cameraBookmarks'

/**
 * **Standard orthographic-style views** — front, back and the two sides, framed on the
 * whole figure from the live body measurements, so they follow a resize or a body-type
 * change the way the anatomy shots do.
 *
 * These are the framings a designer flips between constantly while checking a
 * silhouette; orbiting back to "dead-on front" by hand is fiddly and never quite
 * square. Pure + unit-tested; the quick-view buttons in the status bar apply them.
 */

export type StandardViewId = 'front' | 'back' | 'left' | 'right'

export interface StandardView {
  id: StandardViewId
  /** Button face — short, because the status bar is tight. */
  label: string
  /** Screen-reader / tooltip text. */
  title: string
  pose: CameraPose
}

/** Spherical azimuth 0 puts the camera on +z, facing the body's front — the same
 *  convention `anatomyShots` uses. */
const FRONT = 0
const BACK = Math.PI
/** The body's left is the viewer's right at azimuth 0, so "left" orbits to -x. */
const LEFT = -Math.PI / 2
const RIGHT = Math.PI / 2

/** Dead level with the figure's middle — what makes these read as elevations rather
 *  than a casual orbit. */
const LEVEL = Math.PI / 2

/**
 * How far back to sit. Driven by the figure's height so a taller body is framed the
 * same way, with a floor so a collapsed or zero-height measurement set can never
 * produce a degenerate (or negative) orbit distance.
 */
export function figureDistance(m: Measurements): number {
  const height = Math.max(m.crownY, 0)
  const width = Math.max(m.shoulderHalfX, m.hipHalfX, 0) * 2
  // height drives it; width only matters for an unusually broad figure
  return Math.max(0.6, height * 1.45, width * 3)
}

/** The point to orbit around — mid-torso, so head and hem are both comfortably in. */
function figureTarget(m: Measurements): [number, number, number] {
  return [0, Math.max(m.crownY, 0) / 2, 0]
}

/** The four elevations, in the order the buttons appear. */
export function standardViews(m: Measurements): StandardView[] {
  const distance = figureDistance(m)
  const target = figureTarget(m)
  const view = (id: StandardViewId, label: string, title: string, azimuth: number): StandardView => ({
    id,
    label,
    title,
    pose: { azimuth, polar: LEVEL, distance, target }
  })
  return [
    view('front', 'F', 'Front view', FRONT),
    view('back', 'B', 'Back view', BACK),
    view('left', 'L', 'Left side view', LEFT),
    view('right', 'R', 'Right side view', RIGHT)
  ]
}

/** One view by id, or undefined. */
export function standardView(m: Measurements, id: StandardViewId): StandardView | undefined {
  return standardViews(m).find((v) => v.id === id)
}
