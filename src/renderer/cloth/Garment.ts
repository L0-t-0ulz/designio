import * as THREE from 'three'
import { adaptiveRingT } from './adaptiveMesh'

export type NecklineStyle = 'strapless' | 'scoop' | 'crew' | 'v' | 'one-shoulder'
/** Pleat / gather styles (the pleats library; active when the `pleats` detail is on). */
export type PleatStyle = 'knife' | 'box' | 'accordion' | 'cartridge' | 'gather' | 'shirr' | 'smock'

/**
 * The radial fold modulation for a pleat style at circumferential angle `a` (and, for
 * height-varying styles, the ring fraction `t` — 0 top … 1 hem) — a periodic wave in
 * ≈[-1, 1] baked into the tube's rest shape, so the cloth solver holds the folds
 * (they're the rest state). `N` folds are chosen to stay crisp at RADIAL = 60 (≥ 4
 * samples/fold). Pure, so it's unit tested.
 */
/**
 * Pressed trouser-crease profile — sharp ridges at the **front (π/2)** and **back
 * (3π/2)** of a leg tube's cross-section, ~0 at the sides, so the leg reads as a
 * tailored, fore-aft-creased trouser instead of a round cylinder. 0…1.
 */
export function creaseWave(a: number): number {
  return Math.abs(Math.sin(a)) ** 12 // high power = a narrow, pressed ridge
}

export function pleatWave(a: number, style: PleatStyle, t = 0): number {
  const N = { knife: 12, box: 8, accordion: 15, cartridge: 15, gather: 12, shirr: 24, smock: 10 }[style]
  const u = (a / (2 * Math.PI)) * N
  const f = u - Math.floor(u) // 0..1 within a fold
  switch (style) {
    case 'knife': // pressed one direction → a sawtooth
      return f * 2 - 1
    case 'box': // alternating flat out / flat in
      return f < 0.5 ? 1 : -1
    case 'accordion': // symmetric zig-zag
      return 1 - 4 * Math.abs(f - 0.5)
    case 'cartridge': // rounded gathered tubes
      return Math.sin(f * Math.PI * 2)
    case 'shirr': // shirring — many fine, regular elastic gathers (tight + uniform)
      return Math.sin(f * Math.PI * 2)
    case 'smock': {
      // smocking — a honeycomb lattice: pinch points on a grid, alternate rows offset
      // half a cell so the gathers form diamonds down the height (uses `t`).
      const rows = 7
      const shift = Math.floor(t * rows) % 2 === 0 ? 0 : 0.5
      const g = (u + shift) - Math.floor(u + shift)
      return Math.cos(g * Math.PI * 2)
    }
    default: // gather — irregular rounded gathering
      return Math.sin(f * Math.PI * 2) * (0.7 + 0.3 * Math.sin(a * 7))
  }
}

export interface TubeSpec {
  /** Number of rings top→bottom (=> ny). */
  rings: number
  /** Segments around the tube (=> nx, closed loop). */
  radial: number
  topY: number
  bottomY: number
  radiusTop: number
  radiusBottom: number
  centerX?: number
  centerZ?: number
  /** Neckline: shapes the top edge (straps at the shoulders, a dip for the neck). */
  neckline?: NecklineStyle
  /** Shoulder height — the straps rise to here for non-strapless necklines. */
  shoulderY?: number
  /** Optional cinched-waist radius (bust → waist → hip hourglass). */
  radiusWaist?: number
  /** Fraction of the height where the waist sits (0 top … 1 hem). */
  waistT?: number
  /** Pleat/gather fold pattern baked into the rest shape (opens toward the hem). */
  pleat?: PleatStyle
  /** Pressed trouser crease — sharp fore/aft ridges baked into the rest cross-section. */
  crease?: boolean
  /** Hem shape — high-low · shirttail · handkerchief curves on the bottom edge. */
  hemShape?: HemShape
  /** Functional opening: the centre-front seam is left unsewn (an open placket/zip) —
   *  the quad column at `openSeamColumn` is skipped and the solver cuts the matching
   *  constraints, so the garment really gaps and hangs open. */
  openFront?: boolean
  /** Cut-out openings (a balaclava's eye/mouth holes): quads inside are dropped and
   *  fully-orphaned particles go dead, so the holes are real — you see through them. */
  cutouts?: TubeCutout[]
  /** Spawn-shape clamp for full-head pieces (a balaclava): every ring's rest radius
   *  is kept outside this sphere's cross-section, so the tube spawns ON the skull
   *  dome instead of inside it (a deep-inside spawn resolves to the wrong side). */
  dome?: { cy: number; r: number }
  /** Extra anchor pins at (u, v) tube fractions — a balaclava grips the nose
   *  bridge + chin so it can't spin around the rotationally-symmetric head. */
  extraPins?: Array<{ u: number; v: number }>
  /** Multi-stop radius profile (t ascending, exclusive of the ends) — richer shaping
   *  than the single waist: a balaclava's face belly + under-jaw nip. Wins over
   *  radiusWaist when present. */
  radiusStops?: Array<{ t: number; r: number }>
  /** Chew the cut-out edges (a distressed mask): rim-adjacent quads drop by a
   *  deterministic hash, and the neat binding is skipped — raw frayed holes. */
  fray?: boolean
}

/** A sphere's cross-section radius at height `y` (0 outside the sphere). Pure. */
export function domeCross(dome: { cy: number; r: number }, y: number): number {
  const d = dome.r * dome.r - (y - dome.cy) * (y - dome.cy)
  return d > 0 ? Math.sqrt(d) : 0
}

/** A rectangular opening in tube-fraction space — `u` around the tube (0…1,
 *  centre-front ≈ 0.25) · `v` down it (0 top … 1 hem). */
export interface TubeCutout {
  u0: number
  u1: number
  v0: number
  v1: number
}

/** The quad cells (cy·nx+cx) whose centre falls inside any cutout rect — the cells
 *  `tubeIndices` drops (same mechanism as tearing, decided at build time). Pure. */
export function cutoutCells(cutouts: TubeCutout[] | undefined, nx: number, ny: number): Set<number> {
  const cells = new Set<number>()
  if (!cutouts?.length || ny < 2) return cells
  for (let cy = 0; cy < ny - 1; cy++) {
    const v = (cy + 0.5) / (ny - 1)
    for (let cx = 0; cx < nx; cx++) {
      const u = (cx + 0.5) / nx
      for (const c of cutouts) {
        if (u >= c.u0 && u <= c.u1 && v >= c.v0 && v <= c.v1) {
          cells.add(cy * nx + cx)
          break
        }
      }
    }
  }
  return cells
}

/**
 * The ordered node loop around each cutout's rim — the path a **binding**
 * (the ribbed elastic edge finishing a balaclava's eye/mouth holes) traces.
 * Cutouts sit on the tube's front, away from the wrap seam, so rects don't
 * wrap; the loop runs top edge → right → bottom → left, closed. Pure.
 */
export function cutoutRims(cutouts: TubeCutout[] | undefined, nx: number, ny: number): number[][] {
  const rims: number[][] = []
  if (!cutouts?.length || ny < 2) return rims
  for (const c of cutouts) {
    // the covered cell rect — same centre-inside test as `cutoutCells`
    let cx0 = Infinity
    let cx1 = -Infinity
    let cy0 = Infinity
    let cy1 = -Infinity
    for (let cy = 0; cy < ny - 1; cy++) {
      const v = (cy + 0.5) / (ny - 1)
      if (v < c.v0 || v > c.v1) continue
      for (let cx = 0; cx < nx; cx++) {
        const u = (cx + 0.5) / nx
        if (u < c.u0 || u > c.u1) continue
        cx0 = Math.min(cx0, cx)
        cx1 = Math.max(cx1, cx)
        cy0 = Math.min(cy0, cy)
        cy1 = Math.max(cy1, cy)
      }
    }
    if (cx0 > cx1 || cy0 > cy1) continue // the rect covers no cells at this resolution
    const loop: number[] = []
    const node = (ix: number, iy: number): number => iy * nx + ((ix + nx) % nx)
    for (let ix = cx0; ix <= cx1 + 1; ix++) loop.push(node(ix, cy0)) // top, left → right
    for (let iy = cy0 + 1; iy <= cy1 + 1; iy++) loop.push(node(cx1 + 1, iy)) // right, down
    for (let ix = cx1; ix >= cx0; ix--) loop.push(node(ix, cy1 + 1)) // bottom, right → left
    for (let iy = cy1; iy >= cy0 + 1; iy--) loop.push(node(cx0, iy)) // left, back up
    rims.push(loop)
  }
  return rims
}

/**
 * Chew a cut set's edges for a **distressed** look: every cell bordering the cut
 * (wrap-aware) joins it when its deterministic hash clears the threshold — ragged,
 * repeatable frayed holes with no RNG (golden-CI safe). Pure.
 */
export function frayedCells(cells: ReadonlySet<number>, nx: number, ny: number, amount = 0.42): Set<number> {
  const out = new Set(cells)
  const hash = (n: number): number => {
    let h = (n * 2654435761) >>> 0
    h ^= h >> 13
    h = (h * 2246822519) >>> 0
    return ((h ^ (h >> 16)) >>> 0) / 4294967295
  }
  for (const c of cells) {
    const cx = c % nx
    const cy = Math.floor(c / nx)
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const ny2 = cy + dy
      if (ny2 < 0 || ny2 > ny - 2) continue
      const n = ny2 * nx + ((cx + dx + nx) % nx)
      if (!cells.has(n) && hash(n) < amount) out.add(n)
    }
  }
  return out
}

/** Grid nodes orphaned by a cut — every one of their (in-range) surrounding cells is
 *  dropped, so no quad or constraint holds them: they go **dead** (invMass 0, skipped
 *  by constraints + collision, invisible since their quads are gone). Pure. */
export function deadFromCells(cells: ReadonlySet<number>, nx: number, ny: number): Set<number> {
  const dead = new Set<number>()
  if (!cells.size) return dead
  const isCut = (cx: number, cy: number): boolean =>
    cy < 0 || cy > ny - 2 || cells.has(cy * nx + ((cx + nx) % nx))
  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      if (isCut(ix - 1, iy - 1) && isCut(ix, iy - 1) && isCut(ix - 1, iy) && isCut(ix, iy)) dead.add(iy * nx + ix)
    }
  }
  return dead
}

/** The quad column whose boundary sits nearest centre-front (+z, angle π/2) — where
 *  an open placket/zip splits the tube. Columns sit at angle 2π·ix/nx, so the cell
 *  between ix and ix+1 closest to a quarter-turn is the front seam. */
export function openSeamColumn(nx: number): number {
  return Math.round(nx / 4 - 0.5)
}

/** Hem shapes — how the bottom edge curves (front = angle π/2). */
export type HemShape = 'straight' | 'high-low' | 'shirttail' | 'handkerchief' | 'ear-flap' | 'point-front'
export const HEM_SHAPES: HemShape[] = ['straight', 'high-low', 'shirttail', 'handkerchief', 'ear-flap', 'point-front']

/** Per-angle hem height: straight, a high-low sweep (front lifts, back trails),
 *  shirttail side vents, or handkerchief points hanging at the diagonals. */
export function bottomEdge(spec: TubeSpec, angle: number): number {
  const shape = spec.hemShape ?? 'straight'
  if (shape === 'straight') return spec.bottomY
  const h = Math.max(0.08, spec.topY - spec.bottomY) // the drama scales with garment height
  const front = Math.max(0, Math.sin(angle))
  const back = Math.max(0, -Math.sin(angle))
  let y = spec.bottomY
  if (shape === 'high-low') y += h * 0.22 * front - h * 0.1 * back
  else if (shape === 'shirttail') y += h * 0.16 * Math.abs(Math.cos(angle)) ** 1.5
  else if (shape === 'ear-flap') y -= h * 0.42 * Math.abs(Math.cos(angle)) ** 3 // deep side flaps (a chullo's ears)
  else if (shape === 'point-front') y -= h * 0.5 * front ** 2.5 // one triangle point at centre-front (a bandana)
  else y -= h * 0.14 * Math.abs(Math.sin(2 * angle)) ** 1.2 // handkerchief points
  return Math.max(0.05, y)
}

/** Per-angle top-edge height: straps at the sides (shoulders), a dip for the neck. */
export function topEdge(spec: TubeSpec, angle: number): number {
  const style = spec.neckline ?? 'strapless'
  if (style === 'strapless') return spec.topY
  const shoulderY = spec.shoulderY ?? spec.topY
  const side = Math.abs(Math.cos(angle)) // 1 at the sides (shoulders), 0 front/back
  const front = Math.max(0, Math.sin(angle)) // 1 at centre-front
  let dip: number
  if (style === 'crew') dip = 0.055 * (1 - side ** 0.55)
  else if (style === 'scoop') dip = 0.13 * (1 - side)
  else if (style === 'one-shoulder') {
    // asymmetric: the wearer's left shoulder (-x, angle pi) keeps its strap; the
    // edge sweeps down across the chest to below the right armpit (+x, angle 0)
    const toRight = 0.5 + 0.5 * Math.cos(angle)
    dip = 0.17 * toRight ** 1.3
  } else dip = 0.09 * (1 - side) + 0.12 * front * (1 - side) // v: deeper at the front
  return shoulderY - dip
}

/** Radius along the height: a straight lerp, an optional cinched waist, or a
 *  multi-stop piecewise profile (`radiusStops`, which wins when present). */
export function radiusAt(spec: TubeSpec, t: number): number {
  if (spec.radiusStops?.length) {
    let prevT = 0
    let prevR = spec.radiusTop
    for (const stop of spec.radiusStops) {
      if (t <= stop.t) return prevR + (stop.r - prevR) * ((t - prevT) / Math.max(1e-6, stop.t - prevT))
      prevT = stop.t
      prevR = stop.r
    }
    return prevR + (spec.radiusBottom - prevR) * ((t - prevT) / Math.max(1e-6, 1 - prevT))
  }
  if (spec.radiusWaist == null) return spec.radiusTop + (spec.radiusBottom - spec.radiusTop) * t
  const wt = spec.waistT ?? 0.45
  if (t <= wt) return spec.radiusTop + (spec.radiusWaist - spec.radiusTop) * (t / wt)
  return spec.radiusWaist + (spec.radiusBottom - spec.radiusWaist) * ((t - wt) / (1 - wt))
}

/**
 * The tube's index buffer: front columns [0, nx/2) then back columns as two
 * contiguous blocks → material groups 0 (front, +z) / 1 (back, −z), split at the
 * side seams (per-panel fabric). `openFront` skips the centre-front quad column
 * (functional opening); `torn` skips individual cells (cy·nx+cx) — **cloth
 * tearing** regenerates the buffer through this same emitter so tears, the slit
 * and the panel split always agree.
 */
export function tubeIndices(nx: number, ny: number, opts: { openFront?: boolean; torn?: ReadonlySet<number> } = {}): { indices: number[]; frontCount: number } {
  const indices: number[] = []
  const cut = opts.openFront ? openSeamColumn(nx) : -1
  const quad = (ix: number, iy: number): void => {
    if (ix === cut) return
    if (opts.torn?.has(iy * nx + ix)) return
    const ixr = (ix + 1) % nx // wrap the seam closed
    const tl = iy * nx + ix
    const tr = iy * nx + ixr
    const bl = (iy + 1) * nx + ix
    const br = (iy + 1) * nx + ixr
    indices.push(tl, bl, tr, tr, bl, br)
  }
  const half = Math.floor(nx / 2)
  for (let iy = 0; iy < ny - 1; iy++) for (let ix = 0; ix < half; ix++) quad(ix, iy)
  const frontCount = indices.length
  for (let iy = 0; iy < ny - 1; iy++) for (let ix = half; ix < nx; ix++) quad(ix, iy)
  return { indices, frontCount }
}

/** The grid cells (cy·nx+cx) bordering a torn constraint (i,j) — the quads to drop.
 *  Horizontal pairs border the cells above+below the edge; vertical pairs the cells
 *  left+right; a sheared diagonal names its own cell. Wrap-aware in x. */
export function tornCellsForPair(i: number, j: number, nx: number, ny: number): number[] {
  const ax = i % nx
  const ay = Math.floor(i / nx)
  const bx = j % nx
  const by = Math.floor(j / nx)
  const cells: number[] = []
  const push = (cx: number, cy: number): void => {
    if (cy >= 0 && cy < ny - 1) cells.push(cy * nx + ((cx + nx) % nx))
  }
  const dxRaw = (bx - ax + nx) % nx
  const dx = dxRaw > nx / 2 ? dxRaw - nx : dxRaw // signed shortest x span
  const dy = by - ay
  const lx = dx >= 0 ? ax : bx // left column of the span (wrap-aware)
  const ty = Math.min(ay, by)
  if (Math.abs(dx) === 1 && dy === 0) {
    push(lx, ay - 1) // the edge between two columns borders the cell above…
    push(lx, ay) // …and below
  } else if (dx === 0 && Math.abs(dy) === 1) {
    push(ax - 1, ty) // the edge between two rows borders the cell left…
    push(ax, ty) // …and right
  } else if (Math.abs(dx) === 1 && Math.abs(dy) === 1) {
    push(lx, ty) // a sheared diagonal lives inside one cell
  }
  return cells
}

export interface TubeBuild {
  geometry: THREE.BufferGeometry
  /** Position attribute's backing array — the solver mutates it in place. */
  positions: Float32Array
  nx: number
  ny: number
  /** Indices of the top ring — pinned so the garment hangs from the shoulders. */
  pinnedTop: number[]
  /** Build-time cut-out cells (already dropped from the index buffer) — the
   *  controller seeds `piece.torn` + the solver's dead set from these. */
  cutCells?: Set<number>
  /** Ordered rim node loops per cutout — the binding traces + stiffens these. */
  cutRims?: number[][]
}

/** Adaptive-remeshing ring heights for a body tube (packs rings where the
 *  silhouette bends — waist cinch / flare); uniform for a straight cone. */
export function tubeRingT(spec: TubeSpec): number[] {
  return adaptiveRingT((t) => radiusAt(spec, t), spec.rings)
}

/**
 * Writes tube particle positions: `rings` horizontal loops from `topY` to
 * `bottomY`, each a circle of `radial` points whose radius lerps top→bottom
 * (a slight A-line). Rings are placed by `tubeRingT` (adaptive remeshing).
 * Shared by the initial build and by respawn.
 */
export function fillTube(positions: Float32Array, spec: TubeSpec, ringT: number[] = tubeRingT(spec)): void {
  const { rings, radial } = spec
  const cx = spec.centerX ?? 0
  const cz = spec.centerZ ?? 0
  for (let iy = 0; iy < rings; iy++) {
    const t = ringT[iy]
    const r0 = radiusAt(spec, t)
    // pleats: fold the cross-section radially, opening toward the hem (cinched up top).
    // smocking is an all-over lattice, so it keeps a gentle, near-uniform amplitude.
    const amp = spec.pleat ? (spec.pleat === 'smock' ? 0.05 + 0.05 * t : 0.14 * t) : 0
    for (let ix = 0; ix < radial; ix++) {
      const a = (ix / radial) * Math.PI * 2
      let r = spec.pleat ? r0 * (1 + amp * pleatWave(a, spec.pleat, t)) : r0
      if (spec.crease) r *= 1 + 0.07 * creaseWave(a) // pressed fore/aft trouser crease
      const top = topEdge(spec, a) // per-column top so the neckline is shaped
      const y = top + (bottomEdge(spec, a) - top) * t // per-column hem (high-low · shirttail · handkerchief)
      if (spec.dome) r = Math.max(r, domeCross(spec.dome, y) + 0.004) // spawn on/off the skull, never inside
      const k = (iy * radial + ix) * 3
      positions[k] = cx + Math.cos(a) * r
      positions[k + 1] = y
      positions[k + 2] = cz + Math.sin(a) * r
    }
  }
}

/**
 * Builds a closed tube garment (a sleeveless dress/tunic) wrapped around the
 * body. Topologically an `nx(radial) * ny(rings)` grid that wraps in X; the
 * returned `positions` is the geometry's own buffer for zero-copy simulation.
 */
/** Build the wrapped-tube geometry (uvs + closed-seam indices) + pinned top ring.
 *  `ringT` (adaptive ring heights) drives the vertical UV so a placed print stays
 *  at its physical height even when the rings are packed non-uniformly. */
function finishTube(positions: Float32Array, nx: number, ny: number, ringT?: number[], openFront = false, cutCells?: Set<number>): TubeBuild {
  const uvs = new Float32Array(nx * ny * 2)
  for (let iy = 0; iy < ny; iy++) {
    const v = 1 - (ringT ? ringT[iy] : ny > 1 ? iy / (ny - 1) : 0)
    for (let ix = 0; ix < nx; ix++) {
      const k = iy * nx + ix
      uvs[k * 2] = ix / nx
      uvs[k * 2 + 1] = v
    }
  }
  const { indices, frontCount } = tubeIndices(nx, ny, { openFront, torn: cutCells?.size ? cutCells : undefined })

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.addGroup(0, frontCount, 0) // front panel
  geometry.addGroup(frontCount, indices.length - frontCount, 1) // back panel
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()

  const pinnedTop: number[] = []
  for (let ix = 0; ix < nx; ix++) pinnedTop.push(ix) // iy = 0
  return { geometry, positions, nx, ny, pinnedTop, cutCells }
}

/**
 * Builds a closed tube garment (dress/tunic) wrapped around the body. The
 * returned `positions` is the geometry's own buffer for zero-copy simulation.
 */
export function buildTubeGarment(spec: TubeSpec): TubeBuild {
  const positions = new Float32Array(spec.radial * spec.rings * 3)
  const ringT = tubeRingT(spec)
  fillTube(positions, spec, ringT)
  let cut = cutoutCells(spec.cutouts, spec.radial, spec.rings)
  if (spec.fray && cut.size) cut = frayedCells(cut, spec.radial, spec.rings)
  const build = finishTube(positions, spec.radial, spec.rings, ringT, spec.openFront, cut.size ? cut : undefined)
  // a frayed mask loses its neat bound edge — raw chewed holes, no binding/stiffening
  if (cut.size && !spec.fray) build.cutRims = cutoutRims(spec.cutouts, spec.radial, spec.rings)
  for (const pin of spec.extraPins ?? []) {
    const ix = ((Math.round(pin.u * spec.radial) % spec.radial) + spec.radial) % spec.radial
    let iy = 0
    for (let k = 1; k < spec.rings; k++) if (Math.abs(ringT[k] - pin.v) < Math.abs(ringT[iy] - pin.v)) iy = k
    const idx = iy * spec.radial + ix
    if (!build.pinnedTop.includes(idx)) build.pinnedTop.push(idx)
  }
  return build
}

/** A tube that follows an arbitrary segment a→b (e.g. a sleeve along the arm). */
export interface AxisTubeSpec {
  rings: number
  radial: number
  a: THREE.Vector3
  b: THREE.Vector3
  radiusStart: number
  radiusEnd: number
  /** Optional non-linear radius along the sleeve (t = 0 at `a` … 1 at `b`) for
   * shaped sleeves (puff/bishop/bell/…). Falls back to the start→end lerp. */
  profile?: (t: number) => number
}

/** The radius along a sleeve's axis (the shaped `profile`, else a start→end lerp). */
function axisRadius(spec: AxisTubeSpec, t: number): number {
  return spec.profile ? spec.profile(t) : spec.radiusStart + (spec.radiusEnd - spec.radiusStart) * t
}

/** Adaptive-remeshing ring heights for a sleeve (packs rings along a shaped
 *  profile — puff/bishop/bell); uniform for a straight lerp. */
export function axisTubeRingT(spec: AxisTubeSpec): number[] {
  return adaptiveRingT((t) => axisRadius(spec, t), spec.rings)
}

/** Writes rings perpendicular to the a→b axis, radius lerping start→end. */
export function fillAxisTube(positions: Float32Array, spec: AxisTubeSpec, ringT: number[] = axisTubeRingT(spec)): void {
  const { rings, radial, a, b } = spec
  const axis = new THREE.Vector3().subVectors(b, a)
  axis.multiplyScalar(1 / (axis.length() || 1))
  const up = Math.abs(axis.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
  const u = new THREE.Vector3().crossVectors(up, axis).normalize()
  const v = new THREE.Vector3().crossVectors(axis, u).normalize()
  for (let iy = 0; iy < rings; iy++) {
    const t = ringT[iy]
    const cx = a.x + (b.x - a.x) * t
    const cy = a.y + (b.y - a.y) * t
    const cz = a.z + (b.z - a.z) * t
    const r = axisRadius(spec, t)
    for (let ix = 0; ix < radial; ix++) {
      const ang = (ix / radial) * Math.PI * 2
      const c = Math.cos(ang) * r
      const s = Math.sin(ang) * r
      const k = (iy * radial + ix) * 3
      positions[k] = cx + u.x * c + v.x * s
      positions[k + 1] = cy + u.y * c + v.y * s
      positions[k + 2] = cz + u.z * c + v.z * s
    }
  }
}

export function buildAxisTube(spec: AxisTubeSpec): TubeBuild {
  const positions = new Float32Array(spec.radial * spec.rings * 3)
  const ringT = axisTubeRingT(spec)
  fillAxisTube(positions, spec, ringT)
  return finishTube(positions, spec.radial, spec.rings, ringT)
}

/**
 * A **flat scarf panel** — an open (non-wrapping) `nx(length) × ny(width)` grid whose
 * centreline drapes once around the back of the neck with the two ends hanging down the
 * front. Unlike a tube it doesn't close in X, so it solves with `wrapX: false` and the
 * two length-ends are free tails.
 */
export interface ScarfSpec {
  /** Particles along the scarf length (×) / across its width (rows). */
  nx: number
  ny: number
  neckY: number
  /** Wrap radius around the neck. */
  wrapR: number
  /** Band width (m). */
  width: number
  /** How far the front tails hang below the neck. */
  tailLen: number
  /** Z of the front where the tails hang. */
  tailZ: number
  /** The Parisian knot — fold in half, wrap the neck doubled, tails through the bight. */
  knot?: boolean
  /** The double wrap — the strip spirals TWICE around the neck (knot wins if both set). */
  double?: boolean
  /** The blanket-scarf shoulder drape — an oversized square draped over both shoulders,
   *  hanging down front + back like a ruana (overrides knot/double). */
  blanket?: boolean
}

// The wrap (collar) occupies the middle of the length; the two ends are the front tails.
const WRAP_A = 0.25
const WRAP_B = 0.75
/** Wrap angle at length param `u` — front-left → around the back → front-right (~234°). */
function wrapTheta(u: number): number {
  return -0.35 * Math.PI - ((u - WRAP_A) / (WRAP_B - WRAP_A)) * (1.3 * Math.PI)
}
/** The scarf centreline at length param `u` ∈ [0,1] (into `out`). */
function scarfCentre(u: number, s: ScarfSpec, out: THREE.Vector3): THREE.Vector3 {
  if (u >= WRAP_A && u <= WRAP_B) {
    const th = wrapTheta(u)
    return out.set(Math.sin(th) * s.wrapR, s.neckY, Math.cos(th) * s.wrapR)
  }
  // a front tail: lerp from the collar's front end (join) forward + down to the hanging tip
  const left = u < WRAP_A
  const th = wrapTheta(left ? WRAP_A : WRAP_B)
  const ex = Math.sin(th) * s.wrapR
  const ez = Math.cos(th) * s.wrapR
  const s01 = left ? u / WRAP_A : (1 - u) / (1 - WRAP_B) // 1 at the join … 0 at the tip
  const tipX = (left ? -1 : 1) * s.wrapR * 0.6
  return out.set(
    tipX + (ex - tipX) * s01,
    s.neckY - s.tailLen + s.tailLen * s01,
    s.tailZ + (ez - s.tailZ) * s01 // tip well in front of the chest (clear of the torso)
  )
}
/** Width direction at `u`: vertical on the collar (band height), horizontal on the tails
 *  (flat hanging ribbon), smoothly blended between — robust, never degenerate. */
function scarfWidthDir(u: number, out: THREE.Vector3): THREE.Vector3 {
  let tail = 0
  if (u < WRAP_A) tail = Math.min(1, (WRAP_A - u) / 0.12)
  else if (u > WRAP_B) tail = Math.min(1, (u - WRAP_B) / 0.12)
  return out.set(tail, 1 - tail, 0).normalize() // X on the tail, Y on the collar
}

// ---- the Parisian knot — fold at u=0.5, doubled wrap, tails through the bight ----
// Fractions of each HALF (t = |u−0.5|/0.5): the bight U, then the full doubled
// neck wrap (each half sweeps ~1.72π so the two layers overlap all round), then
// the hanging tail threading the U.
const KNOT_FB = 0.2
const KNOT_WK = 0.52

/** The knot centreline at length param `u` ∈ [0,1] (fold = 0.5). Pure. */
export function knotCentre(u: number, s: ScarfSpec, out: THREE.Vector3): THREE.Vector3 {
  const half = u >= 0.5 ? 1 : -1
  const t = Math.abs(u - 0.5) / 0.5
  const z0 = s.tailZ
  if (t < KNOT_FB) {
    // the bight U: fold tip below the chin → up to the neck-front join
    const k = t / KNOT_FB
    return out.set(half * 0.05 * k, s.neckY - 0.16 + k * 0.14, z0 + (s.wrapR - z0) * k * 0.55)
  }
  if (t < KNOT_FB + KNOT_WK) {
    // the doubled collar: front → all the way around the neck → front again
    const k = (t - KNOT_FB) / KNOT_WK
    const th = half * (0.12 + k * 1.72) * Math.PI
    const r = s.wrapR + (half > 0 ? 0.013 : 0) // layered, never coincident
    return out.set(Math.sin(th) * r, s.neckY, Math.cos(th) * r)
  }
  // the tail: wrap exit → down through the bight opening → hang in front
  const k = (t - KNOT_FB - KNOT_WK) / (1 - KNOT_FB - KNOT_WK)
  const exTh = half * (0.12 + 1.72) * Math.PI
  const ex = Math.sin(exTh) * s.wrapR
  const ez = Math.cos(exTh) * s.wrapR
  return out.set(ex + (-half * 0.025 - ex) * k, s.neckY - k * s.tailLen, ez + (z0 - 0.028 - ez) * k)
}

/**
 * The stitch pairs that lock the knot — each tail pinned to its side of the
 * bight where it threads the loop ("pinned at the loop like the real knot").
 * Mid-width row; pure + unit-tested.
 */
export function parisianPinPairs(nx: number, ny: number): [number, number][] {
  const row = Math.floor(ny / 2) * nx
  const col = (u: number): number => Math.max(0, Math.min(nx - 1, Math.round(u * (nx - 1))))
  const pairs: [number, number][] = []
  for (const half of [-1, 1]) {
    const uTail = 0.5 + half * 0.5 * (KNOT_FB + KNOT_WK + 0.3 * (1 - KNOT_FB - KNOT_WK))
    const uBight = 0.5 + half * 0.5 * (KNOT_FB * 0.5)
    pairs.push([row + col(uTail), row + col(uBight)])
  }
  return pairs
}

// ---- the double wrap — the strip spirals twice around the neck ----
// A bigger share of the strip lives in the wrap (the tails come out shorter,
// like a real double-wrapped scarf), sweeping ~3.3π as an outward + downward
// spiral so the second turn spawns cleanly OVER the first (never coincident —
// the particle repulsion then keeps the layers apart, so it stays stable).
const DBL_A = 0.18
const DBL_B = 0.82
const DBL_SWEEP = 3.3 * Math.PI

/** The double-wrap centreline at length param `u` ∈ [0,1]. Pure. */
export function doubleCentre(u: number, s: ScarfSpec, out: THREE.Vector3): THREE.Vector3 {
  const spiral = (k: number): THREE.Vector3 => {
    // k ∈ [0,1] along the wrap: front-left → 3.3π around → front-right
    const th = -0.35 * Math.PI - k * DBL_SWEEP
    const r = s.wrapR + 0.016 * k // outward — the later turn lies over the earlier
    return out.set(Math.sin(th) * r, s.neckY + 0.014 - 0.028 * k, Math.cos(th) * r)
  }
  if (u >= DBL_A && u <= DBL_B) return spiral((u - DBL_A) / (DBL_B - DBL_A))
  // a front tail: from the wrap's end forward + down to the hanging tip
  const left = u < DBL_A
  spiral(left ? 0 : 1)
  const ex = out.x
  const ey = out.y
  const ez = out.z
  const s01 = left ? u / DBL_A : (1 - u) / (1 - DBL_B) // 1 at the join … 0 at the tip
  const tailDrop = s.tailLen * 0.55 // the double wrap eats strip length — shorter tails
  const tipX = (left ? -1 : 1) * s.wrapR * 0.55
  return out.set(tipX + (ex - tipX) * s01, ey - tailDrop + tailDrop * s01, s.tailZ + (ez - s.tailZ) * s01)
}

// ---- the blanket-scarf shoulder drape — an oversized square worn as a ruana ----
// The strip's LENGTH is a "rail" arcing over both shoulders (front-left → over the
// left shoulder → behind the neck → over the right shoulder → front-right); its
// WIDTH then hangs straight DOWN from the rail, so the big panel drapes over the
// shoulders and falls front + back. The rail's shoulder span is what gets pinned.
/** The blanket rail (the top edge resting on the shoulders) at length param `u` ∈ [0,1]. Pure. */
export function blanketCentre(u: number, s: ScarfSpec, out: THREE.Vector3): THREE.Vector3 {
  const sx = s.wrapR * 3.2 // shoulder half-span (the rail reaches well past the shoulders — an oversized square)
  const shoulderY = s.neckY - 0.01
  const P: [number, number, number][] = [
    [-sx, s.neckY - 0.04, s.tailZ], // front-left top (wide, out over the shoulder)
    [-sx * 0.92, shoulderY, 0], // over the left shoulder
    [0, s.neckY + 0.03, -s.wrapR * 1.2], // behind the neck
    [sx * 0.92, shoulderY, 0], // over the right shoulder
    [sx, s.neckY - 0.04, s.tailZ] // front-right top
  ]
  const seg = Math.min(3, Math.max(0, Math.floor(u * 4)))
  const k = u * 4 - seg
  const a = P[seg]
  const b = P[seg + 1]
  return out.set(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k)
}
// The rail's shoulder-to-shoulder span that rests on the body (pinned); the front
// tips (outside this) hang free.
const BLANKET_PIN_A = 0.18
const BLANKET_PIN_B = 0.82

const _sp = new THREE.Vector3()
const _sw = new THREE.Vector3()

/** Writes the flat scarf grid (length × width). */
export function fillScarf(positions: Float32Array, s: ScarfSpec): void {
  for (let ix = 0; ix < s.nx; ix++) {
    const u = s.nx > 1 ? ix / (s.nx - 1) : 0.5
    if (s.blanket) {
      // the rail arcs over the shoulders; the width hangs straight DOWN from it
      // (row 0 = the rail, the last row = the hem), so the big panel drapes as a ruana
      blanketCentre(u, s, _sp)
      for (let iy = 0; iy < s.ny; iy++) {
        const drop = (s.ny > 1 ? iy / (s.ny - 1) : 0) * s.width
        const k = (iy * s.nx + ix) * 3
        positions[k] = _sp.x
        positions[k + 1] = _sp.y - drop
        positions[k + 2] = _sp.z
      }
      continue
    }
    if (s.knot) {
      knotCentre(u, s, _sp)
      // the hanging sections (the bight U AND the tails) lie flat like ribbons;
      // only the collar wrap stands as a vertical band
      const t = Math.abs(u - 0.5) / 0.5
      const flat = Math.min(1, Math.max(0, Math.max((KNOT_FB + 0.05 - t) / 0.05, (t - (KNOT_FB + KNOT_WK - 0.05)) / 0.05)))
      _sw.set(flat, 1 - flat, 0).normalize()
    } else if (s.double) {
      doubleCentre(u, s, _sp)
      const flat = Math.min(1, Math.max(0, Math.max((DBL_A - u) / 0.06, (u - DBL_B) / 0.06)))
      _sw.set(flat, 1 - flat, 0).normalize()
    } else {
      scarfCentre(u, s, _sp)
      scarfWidthDir(u, _sw)
    }
    for (let iy = 0; iy < s.ny; iy++) {
      const w = (s.ny > 1 ? iy / (s.ny - 1) - 0.5 : 0) * s.width
      const k = (iy * s.nx + ix) * 3
      positions[k] = _sp.x + _sw.x * w
      positions[k + 1] = _sp.y + _sw.y * w
      positions[k + 2] = _sp.z + _sw.z * w
    }
  }
}

/** Finish an **open** flat panel (no X-wrap) — one material group; `pinned` particles kept fixed. */
function finishPanel(positions: Float32Array, nx: number, ny: number, pinned: number[]): TubeBuild {
  const uvs = new Float32Array(nx * ny * 2)
  for (let iy = 0; iy < ny; iy++)
    for (let ix = 0; ix < nx; ix++) {
      const k = iy * nx + ix
      uvs[k * 2] = nx > 1 ? ix / (nx - 1) : 0
      uvs[k * 2 + 1] = ny > 1 ? 1 - iy / (ny - 1) : 0
    }
  const indices: number[] = []
  for (let iy = 0; iy < ny - 1; iy++)
    for (let ix = 0; ix < nx - 1; ix++) {
      const tl = iy * nx + ix
      const tr = iy * nx + ix + 1
      const bl = (iy + 1) * nx + ix
      const br = (iy + 1) * nx + ix + 1
      indices.push(tl, bl, tr, tr, bl, br)
    }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.addGroup(0, indices.length, 0)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return { geometry, positions, nx, ny, pinnedTop: pinned }
}

/** Build the flat scarf panel, pinning the back-of-neck strip so the wrap stays on. */
export function buildScarf(s: ScarfSpec): TubeBuild {
  const positions = new Float32Array(s.nx * s.ny * 3)
  fillScarf(positions, s)
  // Pin the collar (a stable band that follows the body); for the knot that's the
  // doubled wrap only — the bight U and the threaded tails drape freely. The
  // double wrap pins both turns' BACK halves (spawn z < 0) so the spiral rides
  // the neck while the front crossings + tails drape on the repulsion.
  const pinned: number[] = []
  const _pc = new THREE.Vector3()
  if (s.blanket) {
    // pin the whole RAIL (top edge) so the panel hangs symmetrically from the
    // shoulders/back (a free-hanging corner would fold asymmetrically); the second
    // row is pinned only across the shoulder span so the front panels can still swing
    for (let ix = 0; ix < s.nx; ix++) {
      const u = s.nx > 1 ? ix / (s.nx - 1) : 0.5
      pinned.push(ix) // row 0 — the full top edge
      if (s.ny > 1 && u >= BLANKET_PIN_A && u <= BLANKET_PIN_B) pinned.push(s.nx + ix)
    }
    return finishPanel(positions, s.nx, s.ny, pinned)
  }
  for (let ix = 0; ix < s.nx; ix++) {
    const u = s.nx > 1 ? ix / (s.nx - 1) : 0.5
    const t = Math.abs(u - 0.5) / 0.5
    let inCollar: boolean
    if (s.knot) inCollar = t > KNOT_FB + 0.02 && t < KNOT_FB + KNOT_WK - 0.02
    else if (s.double) inCollar = u >= DBL_A && u <= DBL_B && doubleCentre(u, s, _pc).z < 0
    else inCollar = Math.abs(u - 0.5) < 0.26
    if (inCollar) for (let iy = 0; iy < s.ny; iy++) pinned.push(iy * s.nx + ix)
  }
  return finishPanel(positions, s.nx, s.ny, pinned)
}
