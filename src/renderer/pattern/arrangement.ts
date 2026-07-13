import type { FabricParams } from '../cloth/fabricPresets'
import { ClothWorld } from '../cloth/ClothWorld'
import type { SewnGarment } from './pattern'
import {
  classifyBoundary,
  drawnGeometry,
  gridConstraints,
  outlineArea,
  panelGrid,
  pointInPolygon,
  resampleOutline,
  ROLE_PIN,
  SKETCH_BASE_Y,
  type DrawnGrid,
  type Pt
} from './drawnPanel'

/**
 * Sewing lines & arrangement — the CLO-style multi-panel workflow, pure math:
 * pattern panels are *placed* around the avatar at named arrangement points
 * (a standoff cylinder centred on an azimuth), *seam lines* pair two panels'
 * edge chains by normalised arc position (mismatched lengths are eased — the
 * longer edge gathers evenly instead of leaving unstitched gaps), and the
 * whole set sews in one `ClothWorld` whose stitches pull the panels together
 * onto the body. The deferred half of the sewn-pattern card, built on the
 * draw-your-own-panel lattice primitives.
 */

/** Where a panel is presented before sewing: an azimuth around the body
 *  (0 = centre front) on a standoff cylinder (× the body radius). */
export interface ArrangementPoint {
  theta: number
  standoff: number
}

/** The stock arrangement points (CLO's front/right/back/left ring). */
export const ARRANGEMENT_POINTS: Record<'front' | 'right' | 'back' | 'left', ArrangementPoint> = {
  front: { theta: 0, standoff: 1.12 },
  right: { theta: Math.PI / 2, standoff: 1.12 },
  back: { theta: Math.PI, standoff: 1.12 },
  left: { theta: (3 * Math.PI) / 2, standoff: 1.12 }
}

/** One pattern panel placed at an arrangement point (outline in the sketch
 *  frame: metres, y body-anchored — `SKETCH_BASE_Y`). */
export interface PlacedPanel {
  outline: Pt[]
  at: ArrangementPoint
  /** Internal cut-outs — real fabric removed, rendered see-through. */
  holes?: Pt[][]
  /** Regions removed AND stitched closed (dart wedges) — sewing the borders
   *  together takes up the fabric so the panel bows into 3D shape. */
  sewnHoles?: Pt[][]
}

export type PanelSide = 'left' | 'right' | 'top' | 'bottom'

/** A seam line: panel `a`'s edge chain sewn to panel `b`'s. */
export interface SeamDef {
  a: number
  aSide: PanelSide
  b: number
  bSide: PanelSide
}

/**
 * The ordered boundary chain along one side of a masked lattice: left/right =
 * the first/last existing node of each row, top→bottom; top/bottom = the
 * first/last existing node of each column, left→right. Lattice spacing is
 * uniform, so chain position ≈ arc length along the edge.
 */
export function boundaryChain(grid: DrawnGrid, side: PanelSide): number[] {
  const { cols, rows, index } = grid
  const chain: number[] = []
  if (side === 'left' || side === 'right') {
    for (let r = 0; r < rows; r++) {
      if (side === 'left') {
        for (let c = 0; c < cols; c++) if (index[r * cols + c] >= 0) { chain.push(index[r * cols + c]); break }
      } else {
        for (let c = cols - 1; c >= 0; c--) if (index[r * cols + c] >= 0) { chain.push(index[r * cols + c]); break }
      }
    }
  } else {
    for (let c = 0; c < cols; c++) {
      if (side === 'top') {
        for (let r = 0; r < rows; r++) if (index[r * cols + c] >= 0) { chain.push(index[r * cols + c]); break }
      } else {
        for (let r = rows - 1; r >= 0; r--) if (index[r * cols + c] >= 0) { chain.push(index[r * cols + c]); break }
      }
    }
  }
  return chain
}

/**
 * Pair two ordered edge chains into stitches by normalised arc position —
 * every node of BOTH chains gets a partner (bidirectional nearest-t match,
 * deduplicated), so unequal edge lengths ease: the longer edge gathers evenly
 * onto the shorter instead of leaving unstitched puckers. Ends pair to ends.
 */
export function pairSeam(a: number[], b: number[]): Array<[number, number]> {
  if (a.length === 0 || b.length === 0) return []
  const nearest = (k: number, from: number[], to: number[]): number =>
    to[from.length === 1 ? 0 : Math.round((k / (from.length - 1)) * (to.length - 1))]
  const seen = new Set<string>()
  const pairs: Array<[number, number]> = []
  const add = (i: number, j: number): void => {
    const key = `${i}:${j}`
    if (!seen.has(key)) {
      seen.add(key)
      pairs.push([i, j])
    }
  }
  for (let k = 0; k < a.length; k++) add(a[k], nearest(k, a, b))
  for (let k = 0; k < b.length; k++) add(nearest(k, b, a), b[k])
  return pairs
}

/**
 * Place a panel's lattice at its arrangement point: wrapped arc-length-true
 * (θ = at.theta + x/r) on the standoff cylinder r = standoff·R, y body-anchored
 * (world y = baseY + panel y).
 */
export function placePanel(grid: DrawnGrid, R: number, at: ArrangementPoint, baseY: number): Float32Array {
  const r = R * at.standoff
  const out = new Float32Array(grid.count * 3)
  for (let i = 0; i < grid.count; i++) {
    const th = at.theta + grid.pos2d[i * 2] / r
    out[i * 3] = r * Math.sin(th)
    out[i * 3 + 1] = baseY + grid.pos2d[i * 2 + 1]
    out[i * 3 + 2] = r * Math.cos(th)
  }
  return out
}

export interface ArrangementOpts {
  /** Full bust circumference (m) — the body radius the standoff scales. */
  bust: number
  /** World y of panel y=0 (default `SKETCH_BASE_Y`). */
  baseY?: number
  spacing?: number
  samples?: number
  /** Pin each panel's top band so the arrangement hangs while stitching (default true). */
  pinTop?: boolean
}

/** Resample one outline and mask its lattice (minus any holes/dart wedges).
 *  The outline is taken AS DRAWN relative to its arrangement azimuth (no
 *  centring) — a style-line piece's x offset encodes its place in the original
 *  panel, so split pieces present side by side instead of stacking. */
function prepareGrid(outline: Pt[], spacing: number, samples: number, holes: Pt[][]): DrawnGrid {
  const sampled = resampleOutline(outline, samples)
  if (sampled.length < 3 || Math.abs(outlineArea(sampled)) < spacing * spacing * 4) {
    throw new Error('arranged panel outline is degenerate')
  }
  return panelGrid(sampled, spacing, holes)
}

/**
 * Stitch pairs that close a removed region (a dart wedge): for every lattice
 * row the region spans, the nearest surviving node on each side pairs up.
 * Sewing those pairs pulls the wedge shut — real fabric take-up, the panel
 * bows out of plane like a sewn dart. Pure over the masked lattice.
 */
export function closeRegionStitches(grid: DrawnGrid, region: Pt[]): Array<[number, number]> {
  const { cols, rows, index, spacing, minX, maxY } = grid
  const pairs: Array<[number, number]> = []
  for (let r = 0; r < rows; r++) {
    const y = maxY - r * spacing
    let firstIn = -1
    let lastIn = -1
    for (let c = 0; c < cols; c++) {
      if (pointInPolygon({ x: minX + c * spacing, y }, region)) {
        if (firstIn < 0) firstIn = c
        lastIn = c
      }
    }
    if (firstIn < 0) continue
    let left = -1
    for (let c = firstIn - 1; c >= 0; c--) {
      if (index[r * cols + c] >= 0) {
        left = index[r * cols + c]
        break
      }
    }
    let right = -1
    for (let c = lastIn + 1; c < cols; c++) {
      if (index[r * cols + c] >= 0) {
        right = index[r * cols + c]
        break
      }
    }
    if (left >= 0 && right >= 0 && left !== right) pairs.push([left, right])
  }
  return pairs
}

/**
 * Sew an arranged panel set into one garment: every panel gets the standard
 * lattice constraint recipe at its placement, every seam line becomes stitch
 * constraints over its eased pairing, and the shared `ClothWorld` drapes the
 * lot onto the body — the same `SewnGarment` shape `PatternController` drives.
 */
export function buildArrangedGarment(
  panels: PlacedPanel[],
  seams: SeamDef[],
  opts: ArrangementOpts,
  fabric: FabricParams
): SewnGarment {
  if (panels.length === 0) throw new Error('no panels to arrange')
  const spacing = opts.spacing ?? 0.02
  const samples = opts.samples ?? 96
  const baseY = opts.baseY ?? SKETCH_BASE_Y
  const R = opts.bust / (2 * Math.PI)

  const world = new ClothWorld(fabric)
  const grids: DrawnGrid[] = []
  const bases: number[] = []
  for (const panel of panels) {
    const holes = [...(panel.holes ?? []), ...(panel.sewnHoles ?? [])]
    const grid = prepareGrid(panel.outline, spacing, samples, holes)
    const base = world.addParticles(placePanel(grid, R, panel.at, baseY))
    for (const con of gridConstraints(grid)) world.addConstraint(base + con.i, base + con.j, con.rest, con.bend)
    if (opts.pinTop !== false) {
      const roles = classifyBoundary(grid, undefined, holes)
      for (let i = 0; i < grid.count; i++) if (roles[i] === ROLE_PIN) world.pin(base + i)
    }
    for (const wedge of panel.sewnHoles ?? []) {
      for (const [i, j] of closeRegionStitches(grid, wedge)) world.stitch(base + i, base + j)
    }
    grids.push(grid)
    bases.push(base)
  }
  for (const seam of seams) {
    const chainA = boundaryChain(grids[seam.a], seam.aSide)
    const chainB = boundaryChain(grids[seam.b], seam.bSide)
    for (const [i, j] of pairSeam(chainA, chainB)) world.stitch(bases[seam.a] + i, bases[seam.b] + j)
  }
  world.build()

  const geometries = grids.map((grid, k) => {
    const view = world.positions.subarray(bases[k] * 3, bases[k] * 3 + grid.count * 3)
    // panels facing away from the camera-side get flipped winding via their azimuth
    const flip = Math.cos(panels[k].at.theta) < 0
    return drawnGeometry(view, grid, flip)
  })
  return { world, geometries, initial: world.positions.slice() }
}

/** The demo arrangement (`?arranged=demo`) — a four-panel colour-block bodice:
 *  a waisted front, a straight back, and two narrow side panels whose straight
 *  edges are SHORTER than the front's waist-curved edge, so the side seams
 *  visibly ease/gather. Strapless: each panel's top band pins. */
export function demoArrangement(): { panels: PlacedPanel[]; seams: SeamDef[] } {
  const top = 0.48
  const hem = 0.06
  const waistY = 0.28
  // waisted front/back: hourglass hexagon (widths: 0.17 top, 0.13 waist, 0.16 hem)
  const blocked = (wTop: number, wWaist: number, wHem: number): Pt[] => [
    { x: -wTop, y: top },
    { x: wTop, y: top },
    { x: wWaist, y: waistY },
    { x: wHem, y: hem },
    { x: -wHem, y: hem },
    { x: -wWaist, y: waistY }
  ]
  const side: Pt[] = [
    { x: -0.055, y: top },
    { x: 0.055, y: top },
    { x: 0.055, y: hem },
    { x: -0.055, y: hem }
  ]
  const panels: PlacedPanel[] = [
    { outline: blocked(0.17, 0.13, 0.16), at: ARRANGEMENT_POINTS.front },
    { outline: side, at: ARRANGEMENT_POINTS.right },
    { outline: blocked(0.17, 0.13, 0.16), at: ARRANGEMENT_POINTS.back },
    { outline: side, at: ARRANGEMENT_POINTS.left }
  ]
  // around the ring: front.right→rightPanel.left, rightPanel.right→back.left, …
  const seams: SeamDef[] = [
    { a: 0, aSide: 'right', b: 1, bSide: 'left' },
    { a: 1, aSide: 'right', b: 2, bSide: 'left' },
    { a: 2, aSide: 'right', b: 3, bSide: 'left' },
    { a: 3, aSide: 'right', b: 0, bSide: 'left' }
  ]
  return { panels, seams }
}
