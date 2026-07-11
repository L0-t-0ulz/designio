import * as THREE from 'three'
import { type Capsule, closestPointOnSegment } from '../avatar/colliders'
import type { BodyCollider } from './BodyCollider'
import type { FabricParams } from './fabricPresets'

interface Constraint {
  i: number
  j: number
  rest: number
  compliance: number
  /** true = bending constraint (uses bendCompliance), false = stretch/shear. */
  bend: boolean
  /** 0 = front panel, 1 = back panel (per-panel physics; front unless both ends are back). */
  region: 0 | 1
}

/**
 * Post-contact **normal velocity** for a particle: the inbound (into-surface)
 * component is already removed by the push-out, and any outbound (separating)
 * component is scaled by `restitution` (< 1 = inelastic) so the cloth settles onto the
 * body/ground instead of springing away and jittering. Pure. */
export function contactNormalVelocity(vn: number, restitution: number): number {
  return vn > 0 ? vn * restitution : 0
}

/**
 * Per-row mass multiplier for a **weighted hem** — real couture hangs a chain-weight in
 * the hem so a gown/skirt falls plumb instead of the light edge kicking out. Rows above
 * the bottom band (`t ≤ RAMP`) are unchanged; the bottom band ramps up to `weight` at the
 * hem (`iy = ny−1`). Pinned rows ignore mass, so a wrist-pinned cuff is untouched. Pure. */
export function hemMassScale(iy: number, ny: number, weight: number): number {
  if (weight <= 1 || ny < 2) return 1
  const t = iy / (ny - 1) // 0 = top (pinned edge) … 1 = hem
  const RAMP = 0.85
  if (t <= RAMP) return 1
  return 1 + (weight - 1) * ((t - RAMP) / (1 - RAMP))
}

/**
 * Extended Position-Based Dynamics (XPBD) cloth solver — the same family of
 * technique used by real garment simulators.
 *
 * The cloth is a topological `nx * ny` grid of particles (optionally closed in
 * X to form a tube, e.g. a garment wrapped around the body). Rest lengths are
 * measured from the initial geometry, so flat panels and shaped garments both
 * work. Per fixed frame we run several substeps; each substep:
 *   1. integrate under gravity + wind (wind = force, so lighter fabrics flutter),
 *   2. solve distance constraints (structural / shear / bending),
 *   3. derive velocities from the position delta,
 *   4. resolve collisions against the body capsules + ground with friction,
 *   5. apply velocity damping.
 *
 * Positions are a flat Float32Array shared with the render mesh (zero-copy).
 */
export class XPBDSolver {
  readonly count: number
  readonly positions: Float32Array
  readonly prev: Float32Array
  readonly vel: Float32Array
  readonly invMass: Float32Array

  gravity = new THREE.Vector3(0, -9.81, 0)
  /** Wind as a force (not acceleration): lighter fabrics flutter more. */
  wind = new THREE.Vector3(0, 0, 0)
  /** Trapped-air pressure — an outward acceleration (m/s²) along each particle's
   *  surface normal, so a quilted/puffer panel or a puff sleeve **lofts** off the body
   *  instead of hanging flat. 0 = off (the default); the stretch constraints cap how
   *  far it inflates, so it's stable. */
  pressure = 0
  /** Weighted-hem multiplier — scales the bottom rows' mass so a hem hangs plumb
   *  (couture chain-weight). 1 = uniform (default); set before `applyMass`. */
  hemWeight = 1
  substeps = 14
  colliders: Capsule[] = []
  /** Optional mesh-accurate body collision (the true surface); capsules are the
   * per-substep broadphase, this is a once-per-frame corrective. Null → capsules only. */
  bodyCollider: BodyCollider | null = null
  /** Garment thickness: cloth rests this far off the body surface. */
  bodySkin = 0.011
  groundY = 0.001
  params: FabricParams

  private readonly constraints: Constraint[] = []
  private readonly lambda: Float32Array
  private pinned: Set<number>
  /** Pinned particles grouped by the body anchor they follow (a sleeve pins its
   *  shoulder ring to the arm + its cuff ring to the hand; most pieces have one group). */
  private pinnedList: number[]
  private pinGroups: { idx: number[]; rest: Float32Array; bindInv: THREE.Matrix4 }[] = []
  private curAnchors: (THREE.Matrix4 | null)[] = []
  private readonly _delta = new THREE.Matrix4()
  private readonly _pin = new THREE.Vector3()
  /** Per-particle surface normals (recomputed once per frame) for aerodynamic drag. */
  private readonly aeroN: Float32Array
  /** Removed particles (e.g. a cut-out): no mass, no constraints. */
  private readonly dead: Set<number>
  /** Closed in X (last column wraps to the first) — a tube/garment. */
  private readonly wrapX: boolean
  /** Per-particle panel: 0 = front (columns [0,½nx)), 1 = back — mirrors `finishTube`'s
   *  visual front/back split, so per-panel physics lines up with per-panel fabric. */
  private readonly panel: Uint8Array
  /** Normalises wind so the slider reads as "wind on a ~0.3 kg reference fabric". */
  private readonly windScale: number
  private time = 0

  // ---- rest / sleep: with no wind and a still body, settle to a dead stop ----
  private restFrames = 0
  private framesSinceWake = 0
  private asleep = false
  /** Whether the last `step()` integrated (particle positions changed this frame). */
  private stepped = true
  private colliderSig = 0
  private static readonly SLEEP_VEL = 0.02 // m/s — below this the cloth is "at rest"
  private static readonly SLEEP_FRAMES = 24 // consecutive still frames before it sleeps
  private static readonly FORCE_SLEEP_FRAMES = 300 // ~5 s: force a rest even if it keeps swaying
  private static readonly VMAX = 8 // m/s velocity cap (stability net; real cloth stays well under)
  private static readonly CONTACT_RESTITUTION = 0.3 // inelastic body/ground contact — cloth settles, doesn't spring off

  // scratch vectors (no per-particle allocation)
  private readonly _p = new THREE.Vector3()
  private readonly _c = new THREE.Vector3()
  private readonly _bodyOut = new THREE.Vector3()

  constructor(
    readonly nx: number,
    readonly ny: number,
    positions: Float32Array,
    params: FabricParams,
    opts: { pinned?: Iterable<number>; dead?: Iterable<number>; wrapX?: boolean } = {}
  ) {
    this.count = nx * ny
    this.windScale = 0.3 / this.count
    this.positions = positions
    this.prev = new Float32Array(this.count * 3)
    this.vel = new Float32Array(this.count * 3)
    this.invMass = new Float32Array(this.count)
    this.aeroN = new Float32Array(this.count * 3)
    this.params = params
    this.pinned = new Set(opts.pinned)
    this.pinnedList = [...this.pinned]
    this.dead = new Set(opts.dead)
    this.wrapX = opts.wrapX ?? false

    // Tag each particle's panel (front/back) by column, matching `finishTube`.
    this.panel = new Uint8Array(this.count)
    if (this.wrapX) {
      const half = Math.floor(nx / 2)
      for (let k = 0; k < this.count; k++) this.panel[k] = k % nx >= half ? 1 : 0
    }

    this.applyMass()
    this.buildConstraints(nx, ny)
    this.lambda = new Float32Array(this.constraints.length)
    this.syncPrev()
  }

  /** Recompute per-particle inverse mass from the current fabric mass (+ a weighted hem). */
  applyMass(): void {
    const base = this.params.mass / this.count
    for (let k = 0; k < this.count; k++) {
      if (this.pinned.has(k) || this.dead.has(k)) {
        this.invMass[k] = 0
        continue
      }
      const iy = (k / this.nx) | 0
      const m = base * hemMassScale(iy, this.ny, this.hemWeight)
      this.invMass[k] = m > 0 ? 1 / m : 0
    }
  }

  /**
   * Switch fabric in place: update mass + per-constraint compliance. The grid
   * topology is unchanged, so constraints and lambda buffers are reused.
   */
  setFabric(params: FabricParams): void {
    this.params = params
    this.applyMass()
    for (const con of this.constraints) {
      con.compliance = con.bend ? params.bendCompliance : params.stretchCompliance
    }
    this.wake()
  }

  /**
   * Per-panel drape: the **front** and **back** halves of the tube get their own
   * fabric (mass + stretch/bend compliance) so a stiff-front / soft-back garment
   * really drapes differently. Front params drive the aero/wind reference. Falls
   * back to `setFabric(front)` behaviour when the two are equal.
   */
  setPanelFabric(front: FabricParams, back: FabricParams): void {
    this.params = front
    const invFront = front.mass > 0 ? this.count / front.mass : 0
    const invBack = back.mass > 0 ? this.count / back.mass : 0
    for (let k = 0; k < this.count; k++) {
      if (this.pinned.has(k) || this.dead.has(k)) this.invMass[k] = 0
      else this.invMass[k] = this.panel[k] === 1 ? invBack : invFront
    }
    for (const con of this.constraints) {
      const p = con.region === 1 ? back : front
      con.compliance = con.bend ? p.bendCompliance : p.stretchCompliance
    }
    this.wake()
  }

  /** Mean stretch compliance of the front vs back panel constraints, and how many
   *  of each — for diagnostics + per-panel-physics tests. */
  panelCompliance(): { front: number; back: number; frontCount: number; backCount: number } {
    let fs = 0
    let fn = 0
    let bs = 0
    let bn = 0
    for (const con of this.constraints) {
      if (con.bend) continue
      if (con.region === 1) {
        bs += con.compliance
        bn++
      } else {
        fs += con.compliance
        fn++
      }
    }
    return { front: fn ? fs / fn : 0, back: bn ? bs / bn : 0, frontCount: fn, backCount: bn }
  }

  /** Copy positions -> prev and clear velocities (call after respawning). */
  reset(): void {
    this.vel.fill(0)
    this.time = 0
    this.syncPrev()
    this.pinGroups = [] // drop the body binding until re-bound (bindPins/bindPinGroups)
    this.curAnchors = []
    this.wake()
  }

  /**
   * Bind the pinned ring to a body **anchor**: record its world positions relative to
   * `anchor`. Each `step` re-places them at `curAnchor · offset`, so the garment hangs
   * from (and follows) the moving body. Call right after `reset()`/respawn.
   */
  bindPins(anchor: THREE.Matrix4): void {
    this.bindPinGroups([{ idx: this.pinnedList.slice(), anchor }])
  }

  /**
   * Bind several pin **groups**, each to its own anchor (e.g. a sleeve: shoulder ring →
   * arm, cuff ring → hand). Any listed index becomes pinned (kinematic).
   */
  bindPinGroups(groups: { idx: number[]; anchor: THREE.Matrix4 }[]): void {
    let added = false
    for (const g of groups)
      for (const i of g.idx)
        if (!this.pinned.has(i)) {
          this.pinned.add(i)
          added = true
        }
    if (added) {
      this.pinnedList = [...this.pinned]
      this.applyMass()
    }
    this.pinGroups = groups.map((g) => {
      const rest = new Float32Array(g.idx.length * 3)
      for (let j = 0; j < g.idx.length; j++) {
        const i = g.idx[j] * 3
        rest[j * 3] = this.positions[i]
        rest[j * 3 + 1] = this.positions[i + 1]
        rest[j * 3 + 2] = this.positions[i + 2]
      }
      return { idx: g.idx, rest, bindInv: g.anchor.clone().invert() }
    })
    this.curAnchors = groups.map((g) => g.anchor as THREE.Matrix4 | null)
  }

  /** The anchor each pin group follows this frame (null → that group stays fixed). */
  setPinAnchors(anchors: (THREE.Matrix4 | null)[]): void {
    this.curAnchors = anchors
  }
  /** Single-group convenience — the whole pinned ring follows one anchor. */
  setAnchor(anchor: THREE.Matrix4 | null): void {
    if (this.curAnchors.length <= 1) this.curAnchors = [anchor]
    else this.curAnchors[0] = anchor
  }

  /** Re-place each pinned group at its current anchor; returns true if any moved. */
  private applyPins(): boolean {
    let moved = false
    for (let gi = 0; gi < this.pinGroups.length; gi++) {
      const cur = this.curAnchors[gi]
      if (!cur) continue
      const g = this.pinGroups[gi]
      this._delta.multiplyMatrices(cur, g.bindInv)
      for (let j = 0; j < g.idx.length; j++) {
        this._pin.set(g.rest[j * 3], g.rest[j * 3 + 1], g.rest[j * 3 + 2]).applyMatrix4(this._delta)
        const i = g.idx[j] * 3
        if (this._pin.x !== this.positions[i] || this._pin.y !== this.positions[i + 1] || this._pin.z !== this.positions[i + 2]) {
          moved = true
          this.positions[i] = this.prev[i] = this._pin.x
          this.positions[i + 1] = this.prev[i + 1] = this._pin.y
          this.positions[i + 2] = this.prev[i + 2] = this._pin.z
        }
      }
    }
    return moved
  }

  private strainCounts: Float32Array | null = null
  /**
   * Per-particle signed **strain** into `out` (length ≥ `count`): the average over
   * the stretch constraints touching each particle of `(currentLen − rest)/rest`.
   * Positive = stretched (the cloth is **tight** there), negative = slack (loose).
   */
  strain(out: Float32Array): void {
    const n = this.count
    for (let k = 0; k < n; k++) out[k] = 0
    const counts = (this.strainCounts ??= new Float32Array(n))
    counts.fill(0)
    for (const con of this.constraints) {
      if (con.bend || con.rest <= 1e-9) continue
      const s = (this.restLength(con.i, con.j) - con.rest) / con.rest
      out[con.i] += s
      out[con.j] += s
      counts[con.i]++
      counts[con.j]++
    }
    for (let k = 0; k < n; k++) if (counts[k] > 0) out[k] /= counts[k]
  }

  /**
   * The **max stretch-constraint residual** `|currentLen − rest|` in metres over the
   * (non-bending) distance constraints — how far the solve is from satisfying them.
   * A convergence gauge: more substeps/iterations should drive it down. Read-only.
   */
  maxResidual(): number {
    let mx = 0
    for (const con of this.constraints) {
      if (con.bend || con.rest <= 1e-9) continue
      const r = Math.abs(this.restLength(con.i, con.j) - con.rest)
      if (r > mx) mx = r
    }
    return mx
  }

  /** True once the cloth has settled to rest (drape is stable) — for measuring a settled fit. */
  get settled(): boolean {
    return this.asleep
  }

  /** Whether the render mesh needs a refresh this frame: true when this step integrated
   *  (`stepped`) OR the cloth is awake — the latter catches a piece a post-step collision
   *  woke (`ClothCollision` calls `wake()` on any particle it moves). False only while
   *  fully at rest, so the per-frame normals recompute + GPU re-upload is skipped then. */
  get advanced(): boolean {
    return this.stepped || !this.asleep
  }

  /** Re-activate the solver after any change (wind, gravity, fabric, respawn, body move). */
  wake(): void {
    this.asleep = false
    this.restFrames = 0
    this.framesSinceWake = 0
  }

  /** Cheap fingerprint of the collider poses — changes when the body moves/resizes. */
  private colliderSignature(): number {
    let s = 0
    for (const c of this.colliders) s += c.a.x + c.a.y + c.a.z + c.b.x + c.b.y + c.b.z + c.radius
    return s
  }

  /**
   * After a step, sleep the cloth once it has been still (and windless) long
   * enough — so at default settings the garment hangs perfectly still instead of
   * drifting/jittering forever. Any wind, body motion, or edit wakes it again.
   */
  private updateRest(): void {
    if (this.wind.lengthSq() > 1e-6) {
      this.restFrames = 0
      this.framesSinceWake = 0 // wind → stay awake and flutter
      return
    }
    this.framesSinceWake++
    const { vel, invMass: im, count } = this
    let maxSq = 0
    for (let k = 0; k < count; k++) {
      if (im[k] === 0) continue
      const i = k * 3
      const s = vel[i] * vel[i] + vel[i + 1] * vel[i + 1] + vel[i + 2] * vel[i + 2]
      if (s > maxSq) maxSq = s
    }
    if (maxSq < XPBDSolver.SLEEP_VEL * XPBDSolver.SLEEP_VEL) this.restFrames++
    else this.restFrames = 0
    // Sleep once settled, OR force it after a few seconds so a garment that keeps
    // gently swaying still comes to rest at default and stays static until changed.
    if (this.restFrames >= XPBDSolver.SLEEP_FRAMES || this.framesSinceWake >= XPBDSolver.FORCE_SLEEP_FRAMES) {
      this.vel.fill(0) // dead stop — no residual drift
      this.asleep = true
    }
  }

  private syncPrev(): void {
    this.prev.set(this.positions)
  }

  private restLength(a: number, b: number): number {
    const ia = a * 3
    const ib = b * 3
    return Math.hypot(
      this.positions[ia] - this.positions[ib],
      this.positions[ia + 1] - this.positions[ib + 1],
      this.positions[ia + 2] - this.positions[ib + 2]
    )
  }

  private buildConstraints(nx: number, ny: number): void {
    const stretch = this.params.stretchCompliance
    const bend = this.params.bendCompliance
    const idx = (ix: number, iy: number): number => iy * nx + ix
    const add = (a: number, b: number, isBend: boolean): void =>
      this.addConstraint(a, b, this.restLength(a, b), isBend ? bend : stretch, isBend)

    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        const r1 = this.wrapX ? (ix + 1) % nx : ix + 1
        const r2 = this.wrapX ? (ix + 2) % nx : ix + 2
        const hasR1 = this.wrapX || ix + 1 < nx
        const hasR2 = this.wrapX || ix + 2 < nx

        // structural (right / down)
        if (hasR1) add(idx(ix, iy), idx(r1, iy), false)
        if (iy + 1 < ny) add(idx(ix, iy), idx(ix, iy + 1), false)
        // shear (both diagonals of the cell)
        if (hasR1 && iy + 1 < ny) {
          add(idx(ix, iy), idx(r1, iy + 1), false)
          add(idx(r1, iy), idx(ix, iy + 1), false)
        }
        // bending (skip-one, softer)
        if (hasR2) add(idx(ix, iy), idx(r2, iy), true)
        if (iy + 2 < ny) add(idx(ix, iy), idx(ix, iy + 2), true)
      }
    }
  }

  private addConstraint(i: number, j: number, rest: number, compliance: number, bend: boolean): void {
    // Skip constraints touching a removed particle.
    if (this.dead.has(i) || this.dead.has(j)) return
    // Back panel only when *both* ends are back — side-seam constraints stay front.
    const region: 0 | 1 = this.panel[i] === 1 && this.panel[j] === 1 ? 1 : 0
    this.constraints.push({ i, j, rest, compliance, bend, region })
  }

  /** Advance the simulation by `dt` seconds using `substeps` internal steps. */
  step(dt: number): void {
    // Follow the body: re-place pinned particles at the current anchor (the garment
    // hangs from the moving shoulders/waist), and wake if the body moved.
    if (this.applyPins()) this.wake()
    const sig = this.colliderSignature()
    if (sig !== this.colliderSig) {
      this.colliderSig = sig
      this.wake()
    }
    if (this.asleep) {
      this.stepped = false // resting: hold the settled drape, spend no cycles
      return
    }
    this.stepped = true

    if (this.params.aero > 0 || this.pressure > 0) this.computeNormals() // once per frame, reused across substeps + pressure
    const sub = dt / this.substeps
    for (let s = 0; s < this.substeps; s++) this.substep(sub)
    if (this.bodyCollider?.ready) this.solveBody()
    this.updateRest()
  }

  /** Per-particle unit surface normals from the grid neighbours (for aero drag). */
  private computeNormals(): void {
    const { positions: pos, nx, ny } = this
    const n = this.aeroN
    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        const rx = this.wrapX ? (ix + 1) % nx : Math.min(ix + 1, nx - 1)
        const lx = this.wrapX ? (ix - 1 + nx) % nx : Math.max(ix - 1, 0)
        const ri = (iy * nx + rx) * 3
        const li = (iy * nx + lx) * 3
        const di = (Math.min(iy + 1, ny - 1) * nx + ix) * 3
        const ui = (Math.max(iy - 1, 0) * nx + ix) * 3
        const tx0 = pos[ri] - pos[li]
        const tx1 = pos[ri + 1] - pos[li + 1]
        const tx2 = pos[ri + 2] - pos[li + 2]
        const ty0 = pos[di] - pos[ui]
        const ty1 = pos[di + 1] - pos[ui + 1]
        const ty2 = pos[di + 2] - pos[ui + 2]
        let a = tx1 * ty2 - tx2 * ty1
        let b = tx2 * ty0 - tx0 * ty2
        let c = tx0 * ty1 - tx1 * ty0
        const l = Math.hypot(a, b, c) || 1
        a /= l
        b /= l
        c /= l
        const k = (iy * nx + ix) * 3
        n[k] = a
        n[k + 1] = b
        n[k + 2] = c
      }
    }
  }

  /**
   * Mesh-accurate body contact (once per frame): push any particle that has
   * penetrated the true body surface back out to the skin offset, remove the velocity
   * heading *further into* the body, and damp the **tangential** slide by the fabric's
   * friction — so a grippy knit **clings** to the body while a slippery satin slides.
   */
  private solveBody(): void {
    const { positions: pos, vel, invMass: im, count } = this
    const bc = this.bodyCollider!
    const skin = this.bodySkin
    const keep = 1 - this.params.friction // grippy fabric grips the body; slippery slides
    const out = this._bodyOut
    for (let k = 0; k < count; k++) {
      if (im[k] === 0) continue
      const i = k * 3
      const px = pos[i]
      const py = pos[i + 1]
      const pz = pos[i + 2]
      const r = bc.resolve(px, py, pz, skin, out)
      if (!r) continue
      pos[i] = r.x
      pos[i + 1] = r.y
      pos[i + 2] = r.z
      // outward push direction ≈ surface normal → cancel inward velocity only
      let nx = r.x - px
      let ny = r.y - py
      let nz = r.z - pz
      const l = Math.hypot(nx, ny, nz)
      if (l > 1e-8) {
        nx /= l
        ny /= l
        nz /= l
        const vn = vel[i] * nx + vel[i + 1] * ny + vel[i + 2] * nz
        const vnOut = vn > 0 ? vn : 0 // remove the inward component, keep any outward
        vel[i] = (vel[i] - vn * nx) * keep + vnOut * nx
        vel[i + 1] = (vel[i + 1] - vn * ny) * keep + vnOut * ny
        vel[i + 2] = (vel[i + 2] - vn * nz) * keep + vnOut * nz
      }
    }
  }

  private substep(dt: number): void {
    const { positions: pos, prev, vel, invMass: im, count, aeroN } = this
    this.time += dt
    const aero = this.params.aero
    const press = this.pressure

    // Gravity is a pure (mass-independent) acceleration.
    const gx = this.gravity.x
    const gy = this.gravity.y
    const gz = this.gravity.z
    // Wind is a force with a gentle temporal gust; per particle it becomes an
    // acceleration = force * invMass, so lighter fabrics blow around more.
    const gust = 1 + 0.4 * Math.sin(this.time * 2.1) + 0.18 * Math.sin(this.time * 5.3)
    const wx = this.wind.x * this.windScale * gust
    const wy = this.wind.y * this.windScale * gust
    const wz = this.wind.z * this.windScale * gust

    // 1. integrate
    for (let k = 0; k < count; k++) {
      const i = k * 3
      const w = im[k]
      if (w === 0) {
        prev[i] = pos[i]
        prev[i + 1] = pos[i + 1]
        prev[i + 2] = pos[i + 2]
        continue
      }
      vel[i] += (gx + wx * w) * dt
      vel[i + 1] += (gy + wy * w) * dt
      vel[i + 2] += (gz + wz * w) * dt
      // Aerodynamic drag: air resists the sheet moving broadside — remove the
      // velocity component along the surface normal (edge-on sway is untouched), so
      // light/sheer fabrics float + billow + lag and heavy ones follow near-rigid.
      if (aero > 0) {
        const n0 = aeroN[i]
        const n1 = aeroN[i + 1]
        const n2 = aeroN[i + 2]
        const f = aero * (vel[i] * n0 + vel[i + 1] * n1 + vel[i + 2] * n2) * dt
        vel[i] -= f * n0
        vel[i + 1] -= f * n1
        vel[i + 2] -= f * n2
      }
      // Trapped-air pressure — a sustained outward push along the surface normal so
      // quilted/puffer panels + puff sleeves loft off the body (applied after aero so
      // the drag doesn't cancel it; capped by the stretch constraints at equilibrium).
      if (press > 0) {
        vel[i] += aeroN[i] * press * dt
        vel[i + 1] += aeroN[i + 1] * press * dt
        vel[i + 2] += aeroN[i + 2] * press * dt
      }
      prev[i] = pos[i]
      prev[i + 1] = pos[i + 1]
      prev[i + 2] = pos[i + 2]
      pos[i] += vel[i] * dt
      pos[i + 1] += vel[i + 1] * dt
      pos[i + 2] += vel[i + 2] * dt
    }

    // 2. solve distance constraints (single Gauss-Seidel pass; XPBD "small steps")
    this.lambda.fill(0)
    const invDt2 = 1 / (dt * dt)
    const cs = this.constraints
    for (let c = 0; c < cs.length; c++) {
      const con = cs[c]
      const wi = im[con.i]
      const wj = im[con.j]
      const wsum = wi + wj
      if (wsum === 0) continue

      const i = con.i * 3
      const j = con.j * 3
      let dx = pos[i] - pos[j]
      let dy = pos[i + 1] - pos[j + 1]
      let dz = pos[i + 2] - pos[j + 2]
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
      if (d < 1e-9) continue

      const alpha = con.compliance * invDt2
      const dLambda = -(d - con.rest + alpha * this.lambda[c]) / (wsum + alpha)
      this.lambda[c] += dLambda

      const scale = dLambda / d
      dx *= scale
      dy *= scale
      dz *= scale
      pos[i] += wi * dx
      pos[i + 1] += wi * dy
      pos[i + 2] += wi * dz
      pos[j] -= wj * dx
      pos[j + 1] -= wj * dy
      pos[j + 2] -= wj * dz
    }

    // 3. velocities from position delta
    const invDt = 1 / dt
    for (let k = 0; k < count; k++) {
      if (im[k] === 0) continue
      const i = k * 3
      vel[i] = (pos[i] - prev[i]) * invDt
      vel[i + 1] = (pos[i + 1] - prev[i + 1]) * invDt
      vel[i + 2] = (pos[i + 2] - prev[i + 2]) * invDt
    }

    // 4. collisions (body capsules + ground), with friction
    this.solveCollisions()

    // 5. damping + a stability net: cap velocity and keep positions in a sane box
    // around the body, so a garment can never diverge/"fly away" (e.g. a long gown
    // oscillating between the legs). Real cloth at 1 g never needs these limits.
    const damp = Math.max(0, 1 - this.params.damping * dt)
    const VMAX2 = XPBDSolver.VMAX * XPBDSolver.VMAX
    for (let k = 0; k < count; k++) {
      const i = k * 3
      vel[i] *= damp
      vel[i + 1] *= damp
      vel[i + 2] *= damp
      const v2 = vel[i] * vel[i] + vel[i + 1] * vel[i + 1] + vel[i + 2] * vel[i + 2]
      if (v2 > VMAX2) {
        const s = XPBDSolver.VMAX / Math.sqrt(v2)
        vel[i] *= s
        vel[i + 1] *= s
        vel[i + 2] *= s
      }
      if (im[k] === 0) continue
      pos[i] = pos[i] < -1.5 ? -1.5 : pos[i] > 1.5 ? 1.5 : pos[i]
      pos[i + 1] = pos[i + 1] < -0.5 ? -0.5 : pos[i + 1] > 2.3 ? 2.3 : pos[i + 1]
      pos[i + 2] = pos[i + 2] < -1.5 ? -1.5 : pos[i + 2] > 1.5 ? 1.5 : pos[i + 2]
    }
  }

  private solveCollisions(): void {
    const { positions: pos, vel, invMass: im, count } = this
    const friction = this.params.friction

    for (let k = 0; k < count; k++) {
      if (im[k] === 0) continue
      const i = k * 3
      this._p.set(pos[i], pos[i + 1], pos[i + 2])

      for (const cap of this.colliders) {
        closestPointOnSegment(this._p, cap.a, cap.b, this._c)
        let nx = this._p.x - this._c.x
        let ny = this._p.y - this._c.y
        let nz = this._p.z - this._c.z
        let dist = Math.sqrt(nx * nx + ny * ny + nz * nz)
        // keep cloth a garment-thickness off the capsule too (broadphase in GLB/animation
        // mode, where the mesh collider is off) so the body doesn't poke through.
        const R = cap.radius + this.bodySkin
        if (dist >= R) continue

        if (dist < 1e-6) {
          nx = 0
          ny = 1
          nz = 0
          dist = 1
        }
        const inv = 1 / dist
        nx *= inv
        ny *= inv
        nz *= inv

        // push out to the surface
        const pen = R - dist
        pos[i] += nx * pen
        pos[i + 1] += ny * pen
        pos[i + 2] += nz * pen
        this._p.set(pos[i], pos[i + 1], pos[i + 2])

        // split velocity into normal / tangential; kill inward normal, damp the
        // outbound normal (inelastic contact) so cloth settles onto the body, damp tangent
        const vn = vel[i] * nx + vel[i + 1] * ny + vel[i + 2] * nz
        const vnOut = contactNormalVelocity(vn, XPBDSolver.CONTACT_RESTITUTION)
        const keep = 1 - friction
        const tx = (vel[i] - vn * nx) * keep
        const ty = (vel[i + 1] - vn * ny) * keep
        const tz = (vel[i + 2] - vn * nz) * keep
        vel[i] = tx + vnOut * nx
        vel[i + 1] = ty + vnOut * ny
        vel[i + 2] = tz + vnOut * nz
      }

      // ground plane
      if (pos[i + 1] < this.groundY) {
        pos[i + 1] = this.groundY
        if (vel[i + 1] < 0) vel[i + 1] = 0
        vel[i] *= 1 - friction
        vel[i + 2] *= 1 - friction
      }
    }
  }
}
