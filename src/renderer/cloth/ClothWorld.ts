import * as THREE from 'three'
import { type Capsule, closestPointOnSegment } from '../avatar/colliders'
import type { BodyCollider } from './BodyCollider'
import type { FabricParams } from './fabricPresets'

interface Constraint {
  i: number
  j: number
  rest: number
  compliance: number
  bend: boolean
}

/**
 * A general XPBD cloth solver over an arbitrary particle set + explicit
 * constraint list — used for sewn multi-panel garments (patterns), where seams
 * are just extra distance constraints (rest ≈ 0) linking two panels' edges.
 *
 * Built incrementally: `addParticles` (one panel at a time) → `addConstraint` /
 * `stitch` / `pin` → `build()`. The XPBD step math mirrors {@link XPBDSolver}.
 */
export class ClothWorld {
  positions = new Float32Array(0)
  prev = new Float32Array(0)
  vel = new Float32Array(0)
  invMass = new Float32Array(0)
  count = 0

  gravity = new THREE.Vector3(0, -9.81, 0)
  wind = new THREE.Vector3(0, 0, 0)
  substeps = 14
  colliders: Capsule[] = []
  /** Mesh-accurate body collision (once-per-frame corrective on top of capsules). */
  bodyCollider: BodyCollider | null = null
  /** Garment thickness: cloth rests this far off the body surface. */
  bodySkin = 0.008
  groundY = 0.001
  params: FabricParams

  private readonly acc: number[] = []
  private readonly constraints: Constraint[] = []
  private readonly pinned = new Set<number>()
  private lambda = new Float32Array(0)
  private windScale = 0
  private time = 0
  // rest / sleep — settle to a dead stop when windless + still (mirrors XPBDSolver)
  private restFrames = 0
  private framesSinceWake = 0
  private asleep = false
  private colliderSig = 0
  private static readonly SLEEP_VEL = 0.02
  private static readonly SLEEP_FRAMES = 24
  private static readonly FORCE_SLEEP_FRAMES = 300
  private static readonly VMAX = 8
  private readonly _p = new THREE.Vector3()
  private readonly _c = new THREE.Vector3()
  private readonly _bodyOut = new THREE.Vector3()

  constructor(params: FabricParams) {
    this.params = params
  }

  /** Append a panel's particle positions; returns the base index. */
  addParticles(pos: Float32Array): number {
    const base = this.acc.length / 3
    for (let i = 0; i < pos.length; i++) this.acc.push(pos[i])
    return base
  }

  addConstraint(i: number, j: number, rest: number, bend = false): void {
    const compliance = bend ? this.params.bendCompliance : this.params.stretchCompliance
    this.constraints.push({ i, j, rest, compliance, bend })
  }

  /** A seam stitch: pull two particles together (rest ≈ 0, slightly compliant). */
  stitch(i: number, j: number): void {
    this.constraints.push({ i, j, rest: 0, compliance: 2e-4, bend: false })
  }

  pin(i: number): void {
    this.pinned.add(i)
  }

  /** Finalise buffers once all particles/constraints are added. */
  build(): void {
    this.count = this.acc.length / 3
    this.positions = new Float32Array(this.acc)
    this.prev = new Float32Array(this.count * 3)
    this.vel = new Float32Array(this.count * 3)
    this.invMass = new Float32Array(this.count)
    this.windScale = 0.3 / Math.max(1, this.count)
    this.lambda = new Float32Array(this.constraints.length)
    this.applyMass()
    this.prev.set(this.positions)
  }

  applyMass(): void {
    const per = this.params.mass / Math.max(1, this.count)
    const inv = per > 0 ? 1 / per : 0
    for (let k = 0; k < this.count; k++) this.invMass[k] = this.pinned.has(k) ? 0 : inv
  }

  setFabric(params: FabricParams): void {
    this.params = params
    this.applyMass()
    for (const c of this.constraints) {
      if (c.rest > 0) c.compliance = c.bend ? params.bendCompliance : params.stretchCompliance
    }
    this.wake()
  }

  reset(initial: Float32Array): void {
    this.positions.set(initial)
    this.prev.set(initial)
    this.vel.fill(0)
    this.time = 0
    this.wake()
  }

  /** Re-activate after any change (wind, gravity, fabric, respawn, body move). */
  wake(): void {
    this.asleep = false
    this.restFrames = 0
    this.framesSinceWake = 0
  }

  private colliderSignature(): number {
    let s = 0
    for (const c of this.colliders) s += c.a.x + c.a.y + c.a.z + c.b.x + c.b.y + c.b.z + c.radius
    return s
  }

  private updateRest(): void {
    if (this.wind.lengthSq() > 1e-6) {
      this.restFrames = 0
      this.framesSinceWake = 0
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
    if (maxSq < ClothWorld.SLEEP_VEL * ClothWorld.SLEEP_VEL) this.restFrames++
    else this.restFrames = 0
    if (this.restFrames >= ClothWorld.SLEEP_FRAMES || this.framesSinceWake >= ClothWorld.FORCE_SLEEP_FRAMES) {
      this.vel.fill(0)
      this.asleep = true
    }
  }

  step(dt: number): void {
    const sig = this.colliderSignature()
    if (sig !== this.colliderSig) {
      this.colliderSig = sig
      this.wake()
    }
    if (this.asleep) return
    const sub = dt / this.substeps
    for (let s = 0; s < this.substeps; s++) this.substep(sub)
    if (this.bodyCollider?.ready) this.solveBody()
    this.updateRest()
  }

  /** Mesh-accurate body contact (once per frame); mirrors {@link XPBDSolver.solveBody}. */
  private solveBody(): void {
    const { positions: pos, vel, invMass: im, count } = this
    const bc = this.bodyCollider!
    const skin = this.bodySkin
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
      let nx = r.x - px
      let ny = r.y - py
      let nz = r.z - pz
      const l = Math.hypot(nx, ny, nz)
      if (l > 1e-8) {
        nx /= l
        ny /= l
        nz /= l
        const vn = vel[i] * nx + vel[i + 1] * ny + vel[i + 2] * nz
        if (vn < 0) {
          vel[i] -= vn * nx
          vel[i + 1] -= vn * ny
          vel[i + 2] -= vn * nz
        }
      }
    }
  }

  private substep(dt: number): void {
    const { positions: pos, prev, vel, invMass: im, count } = this
    this.time += dt
    const gx = this.gravity.x
    const gy = this.gravity.y
    const gz = this.gravity.z
    const gust = 1 + 0.4 * Math.sin(this.time * 2.1) + 0.18 * Math.sin(this.time * 5.3)
    const wx = this.wind.x * this.windScale * gust
    const wy = this.wind.y * this.windScale * gust
    const wz = this.wind.z * this.windScale * gust

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

    const invDt = 1 / dt
    for (let k = 0; k < count; k++) {
      if (im[k] === 0) continue
      const i = k * 3
      vel[i] = (pos[i] - prev[i]) * invDt
      vel[i + 1] = (pos[i + 1] - prev[i + 1]) * invDt
      vel[i + 2] = (pos[i + 2] - prev[i + 2]) * invDt
    }

    this.solveCollisions()

    // damping + stability net (cap velocity, keep positions in a sane box) — mirrors XPBDSolver
    const damp = Math.max(0, 1 - this.params.damping * dt)
    const VMAX2 = ClothWorld.VMAX * ClothWorld.VMAX
    for (let k = 0; k < count; k++) {
      const i = k * 3
      vel[i] *= damp
      vel[i + 1] *= damp
      vel[i + 2] *= damp
      const v2 = vel[i] * vel[i] + vel[i + 1] * vel[i + 1] + vel[i + 2] * vel[i + 2]
      if (v2 > VMAX2) {
        const s = ClothWorld.VMAX / Math.sqrt(v2)
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
        if (dist >= cap.radius + this.bodySkin) continue // rest a garment-thickness off the body (matches solveBody + XPBDSolver)
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
        const pen = cap.radius + this.bodySkin - dist // push out to the skin offset, not the bare surface
        pos[i] += nx * pen
        pos[i + 1] += ny * pen
        pos[i + 2] += nz * pen
        this._p.set(pos[i], pos[i + 1], pos[i + 2])
        const vn = vel[i] * nx + vel[i + 1] * ny + vel[i + 2] * nz
        const vnOut = vn > 0 ? vn : 0
        const keep = 1 - friction
        vel[i] = (vel[i] - vn * nx) * keep + vnOut * nx
        vel[i + 1] = (vel[i + 1] - vn * ny) * keep + vnOut * ny
        vel[i + 2] = (vel[i + 2] - vn * nz) * keep + vnOut * nz
      }
      if (pos[i + 1] < this.groundY) {
        pos[i + 1] = this.groundY
        if (vel[i + 1] < 0) vel[i + 1] = 0
        vel[i] *= 1 - friction
        vel[i + 2] *= 1 - friction
      }
    }
  }
}
