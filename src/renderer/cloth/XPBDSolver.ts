import * as THREE from 'three'
import { type Capsule, closestPointOnSegment } from '../avatar/colliders'
import type { FabricParams } from './fabricPresets'

interface Constraint {
  i: number
  j: number
  rest: number
  compliance: number
  /** true = bending constraint (uses bendCompliance), false = stretch/shear. */
  bend: boolean
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
  substeps = 14
  colliders: Capsule[] = []
  groundY = 0.001
  params: FabricParams

  private readonly constraints: Constraint[] = []
  private readonly lambda: Float32Array
  private readonly pinned: Set<number>
  /** Removed particles (e.g. a cut-out): no mass, no constraints. */
  private readonly dead: Set<number>
  /** Closed in X (last column wraps to the first) — a tube/garment. */
  private readonly wrapX: boolean
  /** Normalises wind so the slider reads as "wind on a ~0.3 kg reference fabric". */
  private readonly windScale: number
  private time = 0

  // scratch vectors (no per-particle allocation)
  private readonly _p = new THREE.Vector3()
  private readonly _c = new THREE.Vector3()

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
    this.params = params
    this.pinned = new Set(opts.pinned)
    this.dead = new Set(opts.dead)
    this.wrapX = opts.wrapX ?? false

    this.applyMass()
    this.buildConstraints(nx, ny)
    this.lambda = new Float32Array(this.constraints.length)
    this.syncPrev()
  }

  /** Recompute per-particle inverse mass from the current fabric mass. */
  applyMass(): void {
    const perParticle = this.params.mass / this.count
    const inv = perParticle > 0 ? 1 / perParticle : 0
    for (let k = 0; k < this.count; k++) {
      this.invMass[k] = this.pinned.has(k) || this.dead.has(k) ? 0 : inv
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
  }

  /** Copy positions -> prev and clear velocities (call after respawning). */
  reset(): void {
    this.vel.fill(0)
    this.time = 0
    this.syncPrev()
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
    this.constraints.push({ i, j, rest, compliance, bend })
  }

  /** Advance the simulation by `dt` seconds using `substeps` internal steps. */
  step(dt: number): void {
    const sub = dt / this.substeps
    for (let s = 0; s < this.substeps; s++) this.substep(sub)
  }

  private substep(dt: number): void {
    const { positions: pos, prev, vel, invMass: im, count } = this
    this.time += dt

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

    // 5. damping
    const damp = Math.max(0, 1 - this.params.damping * dt)
    for (let k = 0; k < count; k++) {
      const i = k * 3
      vel[i] *= damp
      vel[i + 1] *= damp
      vel[i + 2] *= damp
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
        if (dist >= cap.radius) continue

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
        const pen = cap.radius - dist
        pos[i] += nx * pen
        pos[i + 1] += ny * pen
        pos[i + 2] += nz * pen
        this._p.set(pos[i], pos[i + 1], pos[i + 2])

        // split velocity into normal / tangential; kill inward normal, damp tangent
        const vn = vel[i] * nx + vel[i + 1] * ny + vel[i + 2] * nz
        const vnOut = vn > 0 ? vn : 0
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
