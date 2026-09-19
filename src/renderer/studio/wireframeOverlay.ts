import * as THREE from 'three'

/**
 * **Wireframe over shaded** — the mesh's edges drawn on top of the shaded surface,
 * rather than instead of it (which is what `material.wireframe` gives you). Useful for
 * reading how dense the cloth tessellation is in a fold while still seeing the fabric.
 *
 * The line geometry **shares the mesh's position attribute** instead of copying it, so
 * the overlay follows the cloth solver for free: when `updateMeshes()` flags the
 * attribute dirty, the one GPU buffer both draw calls read is the one that was updated.
 * A copied `WireframeGeometry` would freeze at the pose it was built in.
 *
 * `triangleEdgeIndex` — the only part with any logic in it — is pure and unit-tested.
 */

/** The wireframe's line colour. Dark enough to read over pale fabric, and rendered
 *  with depth test on so edges on the far side of a fold stay hidden. */
const LINE_COLOR = 0x1b2330
const LINE_OPACITY = 0.55

/** Marks the `LineSegments` this module adds, so it can find its own again. */
const OVERLAY_FLAG = '__dioWireframeOverlay'

/**
 * Unique triangle edges as flat vertex-index pairs.
 *
 * Every interior edge is shared by two triangles, so emitting all three edges of each
 * triangle would draw most of them twice; pairs are keyed order-independently
 * (`min,max`) and deduped. Degenerate edges (a vertex to itself) are dropped.
 *
 * `index` null means a non-indexed geometry, where each run of three vertices is its
 * own triangle and nothing is shared — there every triangle contributes its three
 * edges, and coincident edges cannot be detected by index at all.
 */
export function triangleEdgeIndex(index: ArrayLike<number> | null, vertexCount: number): number[] {
  const out: number[] = []
  const seen = new Set<number>()
  const triCount = index ? Math.floor(index.length / 3) : Math.floor(vertexCount / 3)

  const push = (a: number, b: number): void => {
    if (a === b) return // degenerate
    const lo = a < b ? a : b
    const hi = a < b ? b : a
    // one number per edge rather than a string key: far less garbage on a 10k-face mesh
    const key = lo * vertexCount + hi
    if (seen.has(key)) return
    seen.add(key)
    out.push(a, b)
  }

  for (let t = 0; t < triCount; t++) {
    const a = index ? index[t * 3] : t * 3
    const b = index ? index[t * 3 + 1] : t * 3 + 1
    const c = index ? index[t * 3 + 2] : t * 3 + 2
    if (a >= vertexCount || b >= vertexCount || c >= vertexCount) continue // out-of-range triangle
    push(a, b)
    push(b, c)
    push(c, a)
  }
  return out
}

/** Whether an object is one of our overlays. */
function isOverlay(o: THREE.Object3D): boolean {
  return (o as unknown as Record<string, unknown>)[OVERLAY_FLAG] === true
}

function overlayOf(mesh: THREE.Mesh): THREE.LineSegments | undefined {
  return mesh.children.find(isOverlay) as THREE.LineSegments | undefined
}

/** Build (or reuse) the edge overlay for one mesh. Returns null if the mesh has no
 *  position attribute to hang lines off. */
function ensureOverlay(mesh: THREE.Mesh): THREE.LineSegments | null {
  const src = mesh.geometry
  const position = src.getAttribute('position')
  if (!position) return null

  const existing = overlayOf(mesh)
  // A garment change rebuilds the cloth geometry, leaving an overlay bound to the old
  // attribute — which would then be frozen in the previous garment's shape. Rebuild
  // when the attribute it shares is no longer the mesh's own.
  if (existing) {
    if (existing.geometry.getAttribute('position') === position) return existing
    removeOverlay(mesh)
  }

  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', position) // shared on purpose — see the file comment
  geom.setIndex(triangleEdgeIndex(src.getIndex()?.array ?? null, position.count))

  const line = new THREE.LineSegments(
    geom,
    new THREE.LineBasicMaterial({ color: LINE_COLOR, transparent: true, opacity: LINE_OPACITY, depthWrite: false })
  )
  line.name = 'wireframe-overlay'
  ;(line as unknown as Record<string, unknown>)[OVERLAY_FLAG] = true
  // the lines sit exactly on the surface, so draw them after it to win the depth tie
  line.renderOrder = (mesh.renderOrder ?? 0) + 1
  line.frustumCulled = false // the shared attribute makes the cached bounds unreliable
  mesh.add(line)
  return line
}

/** Drop a mesh's overlay and free its own geometry — never the shared attribute, which
 *  still belongs to the mesh. */
function removeOverlay(mesh: THREE.Mesh): void {
  const line = overlayOf(mesh)
  if (!line) return
  mesh.remove(line)
  line.geometry.dispose()
  ;(line.material as THREE.Material).dispose()
}

/** Show or hide the edge overlay across a set of objects (each subtree is walked, so
 *  passing a garment's root meshes is enough). */
export function setWireframeOverlay(objects: THREE.Object3D[], on: boolean): void {
  for (const root of objects) {
    root.traverse((o) => {
      if (isOverlay(o) || !(o as THREE.Mesh).isMesh) return
      if (on) ensureOverlay(o as THREE.Mesh)
      else removeOverlay(o as THREE.Mesh)
    })
  }
}

/** Whether any of these objects currently carries an overlay. */
export function hasWireframeOverlay(objects: THREE.Object3D[]): boolean {
  for (const root of objects) {
    let found = false
    root.traverse((o) => {
      if (!found && isOverlay(o)) found = true
    })
    if (found) return true
  }
  return false
}
