import * as THREE from 'three'
import { XPBDSolver } from '../cloth/XPBDSolver'
import { fabricToSolverParams, type Fabric } from '../fabric/FabricLibrary'
import { fillSwatch, rodPins } from '../studio/drapeSwatch'

/**
 * **Drape swatch comparator** — two cloth squares hung over short rods, simulated
 * live side by side, so any two fabrics' drape can be compared directly (a stiff
 * denim shoulders out; a chiffon collapses into folds). Its own tiny scene +
 * renderer inside an overlay; the RAF loop and GL context are disposed on close.
 */

const NX = 22
const NY = 26
const W = 0.24
const H = 0.3
const TOP_Y = 0.34

interface Swatch {
  solver: XPBDSolver
  geometry: THREE.BufferGeometry
  material: THREE.MeshStandardMaterial
  label: HTMLElement
}

let overlay: HTMLElement | null = null
let raf = 0
let renderer: THREE.WebGLRenderer | null = null

export function closeDrapeComparator(): void {
  cancelAnimationFrame(raf)
  renderer?.dispose()
  renderer = null
  overlay?.remove()
  overlay = null
}

function buildSwatch(scene: THREE.Scene, fabric: Fabric, cx: number, label: HTMLElement): Swatch {
  const positions = new Float32Array(NX * NY * 3)
  fillSwatch(positions, NX, NY, W, H, TOP_Y, cx)
  const solver = new XPBDSolver(NX, NY, positions, fabricToSolverParams(fabric), { wrapX: false, pinned: rodPins(NX).map((ix) => ix) })
  solver.colliders = []
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const indices: number[] = []
  for (let iy = 0; iy < NY - 1; iy++) {
    for (let ix = 0; ix < NX - 1; ix++) {
      const tl = iy * NX + ix
      indices.push(tl, tl + NX, tl + 1, tl + 1, tl + NX, tl + NX + 1)
    }
  }
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  const material = new THREE.MeshStandardMaterial({ color: fabric.color, roughness: fabric.roughness, side: THREE.DoubleSide })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.frustumCulled = false
  scene.add(mesh)
  // the short rod it hangs over
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, W * 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x8a8f9c, metalness: 0.7, roughness: 0.4 }))
  rod.rotation.z = Math.PI / 2
  rod.position.set(cx, TOP_Y + 0.004, 0)
  scene.add(rod)
  label.textContent = `${fabric.name} · ${fabric.gsm} gsm`
  return { solver, geometry, material, label }
}

function retarget(s: Swatch, fabric: Fabric, cx: number): void {
  // re-hang the square in the new cloth (same grid, fresh params + rest state)
  fillSwatch(s.solver.positions, NX, NY, W, H, TOP_Y, cx)
  s.solver.reset()
  s.solver.setFabric(fabricToSolverParams(fabric))
  s.material.color.set(fabric.color)
  s.material.roughness = fabric.roughness
  s.label.textContent = `${fabric.name} · ${fabric.gsm} gsm`
}

export interface DrapeComparatorOpts {
  current: Fabric
  library: readonly Fabric[]
}

/** Open the comparator (Esc / click-outside closes; the GL context is disposed). */
export function openDrapeComparator(opts: DrapeComparatorOpts): void {
  closeDrapeComparator()
  overlay = document.createElement('div')
  overlay.className = 'dio-shortcuts-overlay'
  overlay.setAttribute('role', 'dialog')
  const card = document.createElement('div')
  card.className = 'dio-shortcuts-card'
  const h = document.createElement('h2')
  h.textContent = 'Drape comparator'
  card.appendChild(h)

  const canvas = document.createElement('canvas')
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setSize(520, 340)
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x17171c)
  const camera = new THREE.PerspectiveCamera(32, 520 / 340, 0.01, 5)
  camera.position.set(0, 0.16, 0.72)
  camera.lookAt(0, 0.16, 0)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3a44, 0.9))
  const key = new THREE.DirectionalLight(0xffffff, 1.4)
  key.position.set(0.4, 0.8, 0.7)
  scene.add(key)

  const labels = document.createElement('div')
  labels.className = 'dio-drape-labels'
  const labelA = document.createElement('span')
  const labelB = document.createElement('span')
  labels.append(labelA, labelB)

  const a = buildSwatch(scene, opts.current, -0.17, labelA)
  const startB = opts.library.find((f) => f.id !== opts.current.id) ?? opts.current
  const b = buildSwatch(scene, startB, 0.17, labelB)

  // fabric B picker — compare the current cloth against anything in the library
  const select = document.createElement('select')
  select.className = 'dio-mtm-select'
  for (const f of opts.library) {
    const o = document.createElement('option')
    o.textContent = f.name
    o.selected = f.id === startB.id
    select.append(o)
  }
  select.addEventListener('change', () => {
    const f = opts.library[select.selectedIndex]
    if (f) retarget(b, f, 0.17)
  })

  card.append(canvas, labels, select)
  const hint = document.createElement('p')
  hint.className = 'dio-shortcuts-hint'
  hint.textContent = 'Left: the garment fabric · right: pick any cloth — hung over short rods, live'
  card.appendChild(hint)

  overlay.appendChild(card)
  overlay.addEventListener('pointerdown', (e) => {
    if (e.target === overlay) closeDrapeComparator()
  })
  document.body.appendChild(overlay)

  const tick = (): void => {
    if (!renderer) return
    a.solver.step(1 / 60)
    b.solver.step(1 / 60)
    a.geometry.attributes.position.needsUpdate = true
    b.geometry.attributes.position.needsUpdate = true
    a.geometry.computeVertexNormals()
    b.geometry.computeVertexNormals()
    renderer.render(scene, camera)
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
}
