import * as THREE from 'three'
import { ClothWorld } from '../cloth/ClothWorld'
import { panelGrid, gridConstraints, type Pt } from '../pattern/drawnPanel'
import { fabricToSolverParams, MASS_PER_GSM, type Fabric } from './FabricLibrary'
import type { FabricParams } from '../cloth/fabricPresets'

/**
 * Virtual drape test — the textile lab's two standard benches, so a fabric's
 * physics can be measured, validated and compared like real cloth:
 *
 * - **Circular drape** (Cusick) — MEASURED on the live solver: a cloth disc
 *   dropped over a smaller pedestal; the settled shadow area gives the
 *   **drape coefficient** (DC%) — low for a fluid chiffon, high for a crisp
 *   canvas. The virtual pedestal is a capsule (rounded rim), so absolute
 *   values are comparative, not certified. Deterministic, a few hundred
 *   fixed steps of a small `ClothWorld` (milliseconds).
 * - **Cantilever** (ASTM D1388 / Peirce) — DERIVED analytically: bending
 *   length c from the fabric's flexural rigidity via G = w·c³ (the real
 *   test's governing formula), with G and w recovered from the solver
 *   params through the physical-properties maps. Measured-in-sim strips are
 *   NOT used here: XPBD's 2-away bend constraints don't reproduce physical
 *   thin-strip cantilever stiffness at centimetre scale (every fabric hangs
 *   a strip near-vertical), while garment-scale folds — what the disc bench
 *   measures — do respond to the same parameters.
 *
 * Pure; unit-tested against real-world bending-length ranges.
 */

export interface CantileverResult {
  /** Flexural rigidity G (µN·m), recovered from the solver's bend compliance. */
  flexuralRigidityUNm: number
  /** Peirce bending length c (cm) = (G / w)^⅓ — higher = stiffer. */
  bendingLengthCm: number
}

export interface DrapeResult {
  /** Cusick drape coefficient (%): 100 = a rigid disc, low = fluid folds. */
  coefficientPct: number
  /** Number of nodes sampled in the shadow ring (diagnostic). */
  sampled: number
}

const STEPS = 420
const DT = 1 / 60

/** Peirce cantilever, from the solver params through the physical-property
 *  maps: bendiness ← bend compliance, rigidity ← bendiness (log map), areal
 *  weight ← mass; then c = (G/w)^⅓. */
export function cantileverTest(params: FabricParams): CantileverResult {
  const bendiness = Math.max(0, Math.min(1, (params.bendCompliance - 0.0001) / 0.018))
  const G = 0.8 * Math.pow(150, 1 - bendiness) // µN·m — inverse of physicalProps' rigidity map
  const gsm = params.mass / MASS_PER_GSM
  const w = Math.max(0.05, gsm * 9.81e-3) // areal weight, N/m²
  const c = Math.cbrt((G * 1e-6) / w) // m
  return { flexuralRigidityUNm: G, bendingLengthCm: c * 100 }
}

/** Cusick bench: an 18 cm-radius disc over a 9 cm pedestal (capsule rim). */
export function circularDrapeTest(params: FabricParams): DrapeResult {
  const discR = 0.18
  const pedR = 0.09
  const pedTop = 0.4
  const spacing = 0.012
  // circle outline for the lattice mask
  const outline: Pt[] = Array.from({ length: 48 }, (_, k) => {
    const a = (k / 48) * Math.PI * 2
    return { x: discR * Math.sin(a), y: discR * Math.cos(a) }
  })
  const grid = panelGrid(outline, spacing)
  const cy = (grid.maxY - (grid.rows - 1) * grid.spacing + grid.maxY) / 2 // outline centre y in panel space ≈ 0
  const pos = new Float32Array(grid.count * 3)
  for (let i = 0; i < grid.count; i++) {
    pos[i * 3] = grid.pos2d[i * 2]
    pos[i * 3 + 1] = pedTop + 0.002
    pos[i * 3 + 2] = grid.pos2d[i * 2 + 1] - cy
  }
  const world = new ClothWorld(params)
  world.groundY = 0.001
  world.colliders = [
    { a: new THREE.Vector3(0, 0, 0), b: new THREE.Vector3(0, pedTop - pedR, 0), radius: pedR } // pedestal column, rounded rim at pedTop
  ]
  const base = world.addParticles(pos)
  for (const c of gridConstraints(grid)) world.addConstraint(base + c.i, base + c.j, c.rest, c.bend)
  // the real bench's flat pedestal holds the disc by static friction; the
  // virtual capsule is a frictionless dome, so the disc would slide off —
  // pin the centre nodes to keep it seated (they're inside the pedestal
  // radius, well away from the measured drape ring)
  for (let i = 0; i < grid.count; i++) {
    if (Math.hypot(pos[i * 3], pos[i * 3 + 2]) <= spacing * 1.2) world.pin(base + i)
  }
  world.build()
  for (let f = 0; f < STEPS; f++) world.step(DT)

  // shadow area from the settled XZ radii, averaged per angle bin (the classic
  // paper-shadow trace, discretised)
  const BINS = 36
  const maxR = new Float32Array(BINS)
  for (let i = 0; i < grid.count; i++) {
    const x = world.positions[i * 3]
    const z = world.positions[i * 3 + 2]
    const r = Math.hypot(x, z)
    const bin = Math.floor(((Math.atan2(z, x) + Math.PI) / (2 * Math.PI)) * BINS) % BINS
    if (r > maxR[bin]) maxR[bin] = r
  }
  let shadow = 0
  let sampled = 0
  for (let b = 0; b < BINS; b++) {
    if (maxR[b] > 0) {
      shadow += (Math.PI / BINS) * maxR[b] * maxR[b]
      sampled++
    }
  }
  const discA = Math.PI * discR * discR
  const pedA = Math.PI * pedR * pedR
  const coefficientPct = Math.max(0, Math.min(100, ((shadow - pedA) / (discA - pedA)) * 100))
  return { coefficientPct, sampled }
}

export interface DrapeBenchResult {
  cantilever: CantileverResult
  drape: DrapeResult
}

/** Run both benches for a library fabric. */
export function drapeBench(fabric: Fabric): DrapeBenchResult {
  const params = fabricToSolverParams(fabric)
  return { cantilever: cantileverTest(params), drape: circularDrapeTest(params) }
}

/** One-line readout for the panel / tech pack. */
export function benchSummary(r: DrapeBenchResult): string {
  return `drape coefficient ${r.drape.coefficientPct.toFixed(0)} % · bending length ${r.cantilever.bendingLengthCm.toFixed(1)} cm (G ${r.cantilever.flexuralRigidityUNm.toFixed(1)} µN·m)`
}
