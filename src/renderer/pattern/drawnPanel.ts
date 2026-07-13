import * as THREE from 'three'
import type { FabricParams } from '../cloth/fabricPresets'
import { ClothWorld } from '../cloth/ClothWorld'
import type { SewnGarment } from './pattern'

/**
 * Draw-your-own panel — the pure math behind the sketch pad: a hand-drawn 2D
 * outline (panel space, metres, y up) becomes a masked particle lattice with
 * the standard grid constraint recipe, its boundary classified into side seams
 * (stitched front↔back) · shoulder pins (hang from the body) · open hem, then
 * wrapped front + back around the torso and sewn in a `ClothWorld` — the same
 * pattern → sew → drape loop as `buildSewnTop`, for any silhouette you sketch.
 * Everything up to `buildDrawnPanel` is pure and unit-tested.
 */

export interface Pt {
  x: number
  y: number
}

/** Boundary roles per particle (Uint8Array values). */
export const ROLE_FREE = 0 // interior, or an open edge (neckline scoop)
export const ROLE_SEAM = 1 // side edge — stitched to the matching back-panel particle
export const ROLE_PIN = 2 // top edge — pinned so the garment hangs from the body
export const ROLE_HEM = 3 // bottom edge — open

export interface DrawnGrid {
  cols: number
  rows: number
  spacing: number
  /** cols×rows lattice → particle index, -1 outside the outline. Row 0 is the TOP. */
  index: Int32Array
  /** [x, y] per particle, panel space (m). */
  pos2d: Float32Array
  count: number
  /** Lattice origin: col 0 = minX, row 0 = maxY (rows step down). */
  minX: number
  maxY: number
}

/**
 * Mirror a half-outline (drawn on x ≥ axisX, top→bottom) across the vertical
 * axis into one closed symmetric polygon: the half, then its reflection walked
 * back bottom→top. Points hugging the axis aren't duplicated.
 */
export function mirrorOutline(half: Pt[], axisX = 0, eps = 1e-4): Pt[] {
  const out: Pt[] = []
  for (const p of half) {
    const q = { x: Math.max(axisX, p.x), y: p.y }
    const prev = out[out.length - 1]
    if (!prev || Math.hypot(q.x - prev.x, q.y - prev.y) > eps) out.push(q)
  }
  for (let i = out.length - 1; i >= 0; i--) {
    const p = out[i]
    if (p.x - axisX > eps) out.push({ x: 2 * axisX - p.x, y: p.y })
  }
  return out
}

/** Even arc-length resample of a closed polygon to exactly n vertices. */
export function resampleOutline(poly: Pt[], n: number): Pt[] {
  const m = poly.length
  const seg: number[] = []
  let total = 0
  for (let i = 0; i < m; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % m]
    const d = Math.hypot(b.x - a.x, b.y - a.y)
    seg.push(d)
    total += d
  }
  if (total <= 0) return poly.slice(0, n)
  const out: Pt[] = []
  const step = total / n
  let acc = 0 // distance walked into the current segment
  let i = 0
  for (let k = 0; k < n; k++) {
    const target = k * step
    while (acc + seg[i] < target && i < m - 1) {
      acc += seg[i]
      i++
    }
    const a = poly[i]
    const b = poly[(i + 1) % m]
    const t = seg[i] > 0 ? (target - acc) / seg[i] : 0
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
  }
  return out
}

/** Ray-cast point-in-polygon (closed poly, no repeated last vertex). */
export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

/** Signed polygon area (shoelace) — used to reject degenerate sketches. */
export function outlineArea(poly: Pt[]): number {
  let s = 0
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) s += (poly[j].x + poly[i].x) * (poly[j].y - poly[i].y)
  return s / 2
}

/**
 * Mask a regular lattice over the outline's bounding box: a node exists where
 * it falls inside the polygon. Nodes with no 4-neighbour at all are dropped
 * (a free-floating particle can't be constrained).
 */
export function panelGrid(outline: Pt[], spacing: number): DrawnGrid {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const p of outline) {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  }
  const cols = Math.max(2, Math.round((maxX - minX) / spacing) + 1)
  const rows = Math.max(2, Math.round((maxY - minY) / spacing) + 1)
  const inside = new Uint8Array(cols * rows)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p = { x: minX + c * spacing, y: maxY - r * spacing }
      if (pointInPolygon(p, outline)) inside[r * cols + c] = 1
    }
  }
  // drop isolated nodes, then compact into particle indices
  const index = new Int32Array(cols * rows).fill(-1)
  const pos: number[] = []
  let count = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!inside[r * cols + c]) continue
      const nb =
        (c > 0 && inside[r * cols + c - 1]) ||
        (c + 1 < cols && inside[r * cols + c + 1]) ||
        (r > 0 && inside[(r - 1) * cols + c]) ||
        (r + 1 < rows && inside[(r + 1) * cols + c])
      if (!nb) continue
      index[r * cols + c] = count++
      pos.push(minX + c * spacing, maxY - r * spacing)
    }
  }
  return { cols, rows, spacing, index, pos2d: new Float32Array(pos), count, minX, maxY }
}

/**
 * Classify each particle's boundary role. A node missing its up-neighbour
 * inside the top band pins (shoulder/chest edge); otherwise a missing left or
 * right neighbour is a side seam; otherwise a missing down-neighbour is the
 * open hem; interior nodes (and open scoops below the band) are free.
 */
export function classifyBoundary(grid: DrawnGrid, topBand = 0.15): Uint8Array {
  const { cols, rows, index } = grid
  const roles = new Uint8Array(grid.count)
  const pinRows = topBand * (rows - 1)
  const at = (c: number, r: number): number => (c < 0 || r < 0 || c >= cols || r >= rows ? -1 : index[r * cols + c])
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = index[r * cols + c]
      if (i < 0) continue
      const missUp = at(c, r - 1) < 0
      const missDown = at(c, r + 1) < 0
      const missLeft = at(c - 1, r) < 0
      const missRight = at(c + 1, r) < 0
      if (missUp && r <= pinRows) roles[i] = ROLE_PIN
      else if (missLeft || missRight) roles[i] = ROLE_SEAM
      else if (missDown) roles[i] = ROLE_HEM
    }
  }
  return roles
}

export interface GridConstraint {
  i: number
  j: number
  rest: number
  bend: boolean
}

/** The standard cloth recipe over the masked lattice: structural + shear + bend,
 *  only where both endpoints exist. Rest lengths are the flat 2D distances — the
 *  drawn shape IS the rest shape. */
export function gridConstraints(grid: DrawnGrid): GridConstraint[] {
  const { cols, rows, index, pos2d } = grid
  const out: GridConstraint[] = []
  const at = (c: number, r: number): number => (c < 0 || r < 0 || c >= cols || r >= rows ? -1 : index[r * cols + c])
  const dist = (i: number, j: number): number =>
    Math.hypot(pos2d[i * 2] - pos2d[j * 2], pos2d[i * 2 + 1] - pos2d[j * 2 + 1])
  const link = (i: number, j: number, bend: boolean): void => {
    if (i >= 0 && j >= 0) out.push({ i, j, rest: dist(i, j), bend })
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = at(c, r)
      if (i < 0) continue
      link(i, at(c + 1, r), false)
      link(i, at(c, r + 1), false)
      link(i, at(c + 1, r + 1), false) // shear
      const right = at(c + 1, r)
      if (right >= 0) link(right, at(c, r + 1), false) // anti-shear
      link(i, at(c + 2, r), true) // bend
      link(i, at(c, r + 2), true)
    }
  }
  return out
}

/** Triangle indices over the lattice: full cells → two tris, three-corner cells
 *  → one, so the drawn boundary renders without stair-step holes. */
export function gridTriangles(grid: DrawnGrid): number[] {
  const { cols, rows, index } = grid
  const tris: number[] = []
  const at = (c: number, r: number): number => index[r * cols + c]
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const tl = at(c, r)
      const tr = at(c + 1, r)
      const bl = at(c, r + 1)
      const br = at(c + 1, r + 1)
      const have = (tl >= 0 ? 1 : 0) + (tr >= 0 ? 1 : 0) + (bl >= 0 ? 1 : 0) + (br >= 0 ? 1 : 0)
      if (have === 4) tris.push(tl, bl, tr, tr, bl, br)
      else if (have === 3) {
        if (tl < 0) tris.push(tr, bl, br)
        else if (tr < 0) tris.push(tl, bl, br)
        else if (bl < 0) tris.push(tl, br, tr)
        else tris.push(tl, bl, tr)
      }
    }
  }
  return tris
}

/** World y of the sketch pad's panel y=0 (the hem baseline): the pad's body
 *  guide puts the shoulder at panel 0.66 → world 1.5, waist 0.36 → 1.2. */
export const SKETCH_BASE_Y = 0.84

/**
 * Wrap the flat panel onto a body-radius cylinder, arc length preserved
 * (θ = x/R): the front centred at θ=0, the back mirrored about the world x
 * axis (θ = π − x/R) so equal panel-x lands on the same world side and seam
 * particle i stitches straight to its twin. Panel y is body-anchored:
 * world y = baseY + panel y, so a sketch drawn over the pad's body guide
 * lands on the mannequin at the height it was drawn.
 */
export function wrapDrawn(grid: DrawnGrid, R: number, side: 'front' | 'back', baseY: number): Float32Array {
  const out = new Float32Array(grid.count * 3)
  for (let i = 0; i < grid.count; i++) {
    const x = grid.pos2d[i * 2]
    const y = grid.pos2d[i * 2 + 1]
    const th = side === 'front' ? x / R : Math.PI - x / R
    out[i * 3] = R * Math.sin(th)
    out[i * 3 + 1] = baseY + y
    out[i * 3 + 2] = R * Math.cos(th)
  }
  return out
}

/** Render geometry over a masked lattice (position view + panel-space UVs) —
 *  shared with the multi-panel arrangement builder. */
export function drawnGeometry(view: Float32Array, grid: DrawnGrid, flipWinding: boolean): THREE.BufferGeometry {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (let i = 0; i < grid.count; i++) {
    minX = Math.min(minX, grid.pos2d[i * 2])
    maxX = Math.max(maxX, grid.pos2d[i * 2])
    minY = Math.min(minY, grid.pos2d[i * 2 + 1])
    maxY = Math.max(maxY, grid.pos2d[i * 2 + 1])
  }
  const w = Math.max(1e-6, maxX - minX)
  const h = Math.max(1e-6, maxY - minY)
  const uvs = new Float32Array(grid.count * 2)
  for (let i = 0; i < grid.count; i++) {
    uvs[i * 2] = (grid.pos2d[i * 2] - minX) / w
    uvs[i * 2 + 1] = (grid.pos2d[i * 2 + 1] - minY) / h
  }
  const tris = gridTriangles(grid)
  if (flipWinding) for (let t = 0; t < tris.length; t += 3) [tris[t + 1], tris[t + 2]] = [tris[t + 2], tris[t + 1]]
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(view, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geo.setIndex(tris)
  geo.computeVertexNormals()
  geo.computeBoundingSphere()
  return geo
}

export interface DrawnPanelOpts {
  /** Full bust circumference (m) — sets the wrap radius, like `PatternParams.bust`. */
  bust: number
  /** World y of panel y=0 (default `SKETCH_BASE_Y`, the sketch pad's frame). */
  baseY?: number
  /** Lattice pitch (m). */
  spacing?: number
  /** Outline resample count. */
  samples?: number
}

/**
 * Sew a drawn outline into a front + back garment on the body — the drawn-panel
 * counterpart of `buildSewnTop`, returning the same `SewnGarment` shape so
 * `PatternController` can drive it unchanged.
 */
export function buildDrawnPanel(outline: Pt[], opts: DrawnPanelOpts, fabric: FabricParams): SewnGarment {
  const spacing = opts.spacing ?? 0.02
  const sampled = resampleOutline(outline, opts.samples ?? 96)
  if (sampled.length < 3 || Math.abs(outlineArea(sampled)) < spacing * spacing * 4) {
    throw new Error('drawn outline is degenerate — sketch a larger closed shape')
  }
  // centre on x=0 so the wrap puts the sketch's middle at centre-front — a
  // mirrored sketch is already centred, a freeform one usually isn't
  let minX = Infinity
  let maxX = -Infinity
  for (const p of sampled) {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
  }
  const midX = (minX + maxX) / 2
  const poly = sampled.map((p) => ({ x: p.x - midX, y: p.y }))
  const grid = panelGrid(poly, spacing)
  if (grid.count < 4) throw new Error('drawn outline is too small for the cloth lattice')
  const roles = classifyBoundary(grid)
  const R = opts.bust / (2 * Math.PI)
  const baseY = opts.baseY ?? SKETCH_BASE_Y

  const front = wrapDrawn(grid, R, 'front', baseY)
  const back = wrapDrawn(grid, R, 'back', baseY)

  const world = new ClothWorld(fabric)
  const frontBase = world.addParticles(front)
  const backBase = world.addParticles(back)
  for (const con of gridConstraints(grid)) {
    world.addConstraint(frontBase + con.i, frontBase + con.j, con.rest, con.bend)
    world.addConstraint(backBase + con.i, backBase + con.j, con.rest, con.bend)
  }
  for (let i = 0; i < grid.count; i++) {
    if (roles[i] === ROLE_SEAM) world.stitch(frontBase + i, backBase + i)
    else if (roles[i] === ROLE_PIN) {
      world.pin(frontBase + i)
      world.pin(backBase + i)
    }
  }
  world.build()

  const n3 = grid.count * 3
  const frontView = world.positions.subarray(frontBase * 3, frontBase * 3 + n3)
  const backView = world.positions.subarray(backBase * 3, backBase * 3 + n3)
  const geometries = [drawnGeometry(frontView, grid, false), drawnGeometry(backView, grid, true)]
  return { world, geometries, initial: world.positions.slice() }
}

/** The demo sketch (`?drawnPanel=demo`) — a waisted scoop tank, right half (m).
 *  The scoop dips well below the pin band so the neckline stays open. */
export function demoOutline(): Pt[] {
  const half: Pt[] = [
    { x: 0, y: 0.54 }, // centre of the scoop neckline
    { x: 0.05, y: 0.62 },
    { x: 0.1, y: 0.66 }, // shoulder
    { x: 0.13, y: 0.58 }, // armhole
    { x: 0.155, y: 0.5 }, // chest
    { x: 0.13, y: 0.34 }, // waist
    { x: 0.16, y: 0.14 }, // flare
    { x: 0.17, y: 0 }, // hem corner
    { x: 0, y: 0 } // centre hem
  ]
  return mirrorOutline(half)
}
