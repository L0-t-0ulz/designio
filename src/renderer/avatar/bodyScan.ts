/**
 * **3D body-scan import** — turn a scanned body mesh (an OBJ point cloud) into the
 * measurements that drive the mannequin: overall height + chest / waist / hip girth,
 * read by slicing the cloud at the right heights and measuring each ring's girth (its
 * bounding ellipse perimeter). Pure parsing + geometry (no DOM) so it's unit-tested;
 * the studio applies the derived measurements to resize the avatar. (Full mesh
 * fitting is a follow-up — this extracts the body measurements a scan is imported for.)
 */
export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface ScanMeasurements {
  heightCm: number
  chestCm: number
  waistCm: number
  hipCm: number
}

/** Parse the `v x y z` vertex lines of a Wavefront OBJ into points. Pure. */
export function parseScanOBJ(text: string): Vec3[] {
  const out: Vec3[] = []
  for (const line of text.split('\n')) {
    if (line[0] !== 'v' || (line[1] !== ' ' && line[1] !== '\t')) continue
    const p = line.slice(2).trim().split(/\s+/)
    const x = parseFloat(p[0])
    const y = parseFloat(p[1])
    const z = parseFloat(p[2])
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) out.push({ x, y, z })
  }
  return out
}

/** Ramanujan's ellipse-perimeter approximation from the two semi-axes. Pure. */
export function ellipsePerimeter(a: number, b: number): number {
  const h = ((a - b) / (a + b)) ** 2
  return Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)))
}

/**
 * Girth (cm) of the body at a height fraction `yFrac` (0 = feet, 1 = crown): slice a
 * band of points around that height, take the ring's x/z half-extents as the ellipse
 * axes, and return its perimeter. Assumes metres in → cm out. Pure.
 */
export function sliceGirthCm(verts: Vec3[], yFrac: number, bandFrac = 0.03): number {
  if (!verts.length) return 0
  let minY = Infinity
  let maxY = -Infinity
  for (const v of verts) {
    if (v.y < minY) minY = v.y
    if (v.y > maxY) maxY = v.y
  }
  const h = maxY - minY
  const yc = minY + yFrac * h
  const band = Math.max(1e-4, bandFrac * h)
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  let n = 0
  for (const v of verts) {
    if (Math.abs(v.y - yc) > band) continue
    n++
    if (v.x < minX) minX = v.x
    if (v.x > maxX) maxX = v.x
    if (v.z < minZ) minZ = v.z
    if (v.z > maxZ) maxZ = v.z
  }
  if (n === 0) return 0
  const a = (maxX - minX) / 2
  const b = (maxZ - minZ) / 2
  return Math.round(ellipsePerimeter(a, b) * 100 * 10) / 10
}

/** Derive height + chest/waist/hip girth from a scanned point cloud. Pure. */
export function scanToMeasurements(verts: Vec3[]): ScanMeasurements {
  let minY = Infinity
  let maxY = -Infinity
  for (const v of verts) {
    if (v.y < minY) minY = v.y
    if (v.y > maxY) maxY = v.y
  }
  const heightCm = verts.length ? Math.round((maxY - minY) * 100 * 10) / 10 : 0
  return {
    heightCm,
    chestCm: sliceGirthCm(verts, 0.72), // upper torso
    waistCm: sliceGirthCm(verts, 0.62), // natural waist
    hipCm: sliceGirthCm(verts, 0.52) // hips / seat
  }
}
