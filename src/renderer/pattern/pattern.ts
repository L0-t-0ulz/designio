import * as THREE from 'three'
import type { FabricParams } from '../cloth/fabricPresets'
import { ClothWorld } from '../cloth/ClothWorld'

export interface PatternParams {
  /** Full bust circumference (m) → panel radius R = bust / 2π. */
  bust: number
  /** Garment length top→hem (m). */
  length: number
  /** Y of the top edge (chest). */
  topY: number
  cols: number
  rows: number
}

export const DEFAULT_PATTERN: PatternParams = {
  bust: 1.0,
  length: 0.62,
  topY: 1.34,
  cols: 22,
  rows: 34
}

export interface SewnGarment {
  world: ClothWorld
  geometries: THREE.BufferGeometry[]
  /** Arranged positions, for reset/re-sew. */
  initial: Float32Array
}

/** Flat (unwrapped) 2D layout of the panels, for the schematic editor. */
export interface FlatLayout {
  panelW: number
  panelH: number
  /** cm scale factor for display. */
}

const localDist = (pos: Float32Array, a: number, b: number): number =>
  Math.hypot(pos[a * 3] - pos[b * 3], pos[a * 3 + 1] - pos[b * 3 + 1], pos[a * 3 + 2] - pos[b * 3 + 2])

/** Positions for one half-cylinder panel (θ sweeps its half of the body). */
function panelPositions(
  cols: number,
  rows: number,
  thetaStart: number,
  thetaEnd: number,
  topY: number,
  bottomY: number,
  R: number
): Float32Array {
  const pos = new Float32Array(cols * rows * 3)
  for (let r = 0; r < rows; r++) {
    const y = topY + (bottomY - topY) * (r / (rows - 1))
    for (let c = 0; c < cols; c++) {
      const th = thetaStart + (thetaEnd - thetaStart) * (c / (cols - 1))
      const k = (r * cols + c) * 3
      pos[k] = R * Math.sin(th)
      pos[k + 1] = y
      pos[k + 2] = R * Math.cos(th)
    }
  }
  return pos
}

/** Add structural / shear / bending constraints for one panel grid. */
function addGrid(world: ClothWorld, pos: Float32Array, base: number, cols: number, rows: number): void {
  const g = (c: number, r: number): number => base + r * cols + c
  const l = (c: number, r: number): number => r * cols + c // local (for rest length)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c + 1 < cols) world.addConstraint(g(c, r), g(c + 1, r), localDist(pos, l(c, r), l(c + 1, r)))
      if (r + 1 < rows) world.addConstraint(g(c, r), g(c, r + 1), localDist(pos, l(c, r), l(c, r + 1)))
      if (c + 1 < cols && r + 1 < rows) {
        world.addConstraint(g(c, r), g(c + 1, r + 1), localDist(pos, l(c, r), l(c + 1, r + 1)))
        world.addConstraint(g(c + 1, r), g(c, r + 1), localDist(pos, l(c + 1, r), l(c, r + 1)))
      }
      if (c + 2 < cols) world.addConstraint(g(c, r), g(c + 2, r), localDist(pos, l(c, r), l(c + 2, r)), true)
      if (r + 2 < rows) world.addConstraint(g(c, r), g(c, r + 2), localDist(pos, l(c, r), l(c, r + 2)), true)
    }
  }
}

function panelGeometry(view: Float32Array, cols: number, rows: number): THREE.BufferGeometry {
  const uvs = new Float32Array(cols * rows * 2)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = r * cols + c
      uvs[k * 2] = c / (cols - 1)
      uvs[k * 2 + 1] = 1 - r / (rows - 1)
    }
  }
  const indices: number[] = []
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const tl = r * cols + c
      const tr = tl + 1
      const bl = (r + 1) * cols + c
      const br = bl + 1
      indices.push(tl, bl, tr, tr, bl, br)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(view, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  geo.computeBoundingSphere()
  return geo
}

/**
 * Build a two-panel sewn top: a FRONT and BACK half-cylinder panel arranged
 * around the torso and stitched at the two side seams (and pinned at the chest).
 * This is the pattern → sew → drape loop: two flat panels become one garment.
 */
export function buildSewnTop(params: PatternParams, fabric: FabricParams): SewnGarment {
  const { cols, rows, topY } = params
  const R = params.bust / (2 * Math.PI)
  const bottomY = topY - params.length
  const half = Math.PI / 2

  const front = panelPositions(cols, rows, -half, half, topY, bottomY, R)
  const back = panelPositions(cols, rows, half, 3 * half, topY, bottomY, R)

  const world = new ClothWorld(fabric)
  const frontBase = world.addParticles(front)
  const backBase = world.addParticles(back)

  addGrid(world, front, frontBase, cols, rows)
  addGrid(world, back, backBase, cols, rows)

  // side seams: front's edges meet back's opposite edges (they start co-located)
  for (let r = 0; r < rows; r++) {
    world.stitch(frontBase + r * cols + 0, backBase + r * cols + (cols - 1)) // left
    world.stitch(frontBase + r * cols + (cols - 1), backBase + r * cols + 0) // right
  }
  // pin the chest (top) row of both panels so the top hangs from the body
  for (let c = 0; c < cols; c++) {
    world.pin(frontBase + c)
    world.pin(backBase + c)
  }

  world.build()

  const n = cols * rows
  const frontView = world.positions.subarray(frontBase * 3, (frontBase + n) * 3)
  const backView = world.positions.subarray(backBase * 3, (backBase + n) * 3)
  const geometries = [panelGeometry(frontView, cols, rows), panelGeometry(backView, cols, rows)]

  return { world, geometries, initial: world.positions.slice() }
}

/** Unwrapped panel size (m) for the 2D schematic: width = half-circumference. */
export function flatLayout(params: PatternParams): FlatLayout {
  const R = params.bust / (2 * Math.PI)
  return { panelW: Math.PI * R, panelH: params.length }
}
