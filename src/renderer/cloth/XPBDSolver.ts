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
 * Per fixed frame we run several substeps; each substep:
 *   1. integrate particles under gravity + wind (symplectic Euler),
 *   2. solve distance constraints (structural, shear, bending) with per-frame
 *      compliance so stiffness is (mostly) independent of substep count,
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
  wind = new THREE.Vector3(0, 0, 0)
  substeps = 14
  colliders: Capsule[] = []
  groundY = 0.001
  params: FabricParams

  private readonly constraints: Constraint[] = []
  private readonly lambda: Float32Array
  private readonly pinned: Set<number>
  /** Removed particles (e.g. the poncho neck hole): no mass, no constraints. */
  private readonly dead: Set<number>

  // scratch vectors (no per-particle allocation)
  private readonly _p = new THREE.Vector3()
  private readonly _c = new THREE.Vector3()

  constructor(
    readonly nx: number,
    readonly ny: number,
    spacing: number,
    positions: Float32Array,
    params: FabricParams,
    opts: { pinned?: Iterable<number>; dead?: Iterable<number> } = {}
  ) {
    this.count = nx * ny
    this.positions = positions
    this.prev = new Float32Array(this.count * 3)
    this.vel = new Float32Array(this.count * 3)
    this.invMass = new Float32Array(this.count)
    this.params = params
    this.pinned = new Set(opts.pinned)
    this.dead = new Set(opts.dead)

    this.applyMass()
    this.buildConstraints(nx, ny, spacing)
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
    this.syncPrev()
  }

  private syncPrev(): void {
    this.prev.set(this.positions)
  }

  private buildConstraints(nx: number, ny: number, spacing: number): void {
    const stretch = this.params.stretchCompliance
    const bend = this.params.bendCompliance
    const idx = (ix: number, iy: number): number => iy * nx + ix
    const diag = spacing * Math.SQRT2

    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        // structural (right / down)
        if (ix + 1 < nx) this.addConstraint(idx(ix, iy), idx(ix + 1, iy), spacing, stretch, false)
        if (iy + 1 < ny) this.addConstraint(idx(ix, iy), idx(ix, iy + 1), spacing, stretch, false)
        // shear (both diagonals of each cell)
        if (ix + 1 < nx && iy + 1 < ny) {
          this.addConstraint(idx(ix, iy), idx(ix + 1, iy + 1), diag, stretch, false)
          this.addConstraint(idx(ix + 1, iy), idx(ix, iy + 1), diag, stretch, false)
        }
        // bending (skip-one, softer)
        if (ix + 2 < nx) this.addConstraint(idx(ix, iy), idx(ix + 2, iy), spacing * 2, bend, true)
        if (iy + 2 < ny) this.addConstraint(idx(ix, iy), idx(ix, iy + 2), spacing * 2, bend, true)
      }
    }
  }

  private addConstraint(
    i: number,
    j: number,
    rest: number,
    compliance: number,
    bend: boolean
  ): void {
    // Skip constraints touching a removed particle (the neck hole).
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
    const gx = this.gravity.x + this.wind.x
    const gy = this.gravity.y + this.wind.y
    const gz = this.gravity.z + this.wind.z

    // 1. integrate
    for (let k = 0; k < count; k++) {
      const i = k * 3
      if (im[k] === 0) {
        prev[i] = pos[i]
        prev[i + 1] = pos[i + 1]
        prev[i + 2] = pos[i + 2]
        continue
      }
      vel[i] += gx * dt
      vel[i + 1] += gy * dt
      vel[i + 2] += gz * dt
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
