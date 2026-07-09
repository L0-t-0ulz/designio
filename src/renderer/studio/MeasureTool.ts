import * as THREE from 'three'
import { MeasureStore, distanceCm, formatCm, midpoint } from './measure'

export type MeasureMode = 'off' | 'measure' | 'annotate'

const LINE_MAT = new THREE.LineBasicMaterial({ color: 0x7c6ff0, depthTest: false, transparent: true })
const POINT_MAT = new THREE.MeshBasicMaterial({ color: 0x7c6ff0, depthTest: false })
const PIN_MAT = new THREE.MeshBasicMaterial({ color: 0xffb347, depthTest: false })
const DOT_GEO = new THREE.SphereGeometry(0.012, 12, 12)

/**
 * The **measure & annotate** tool: click two points on the garment/body to drop a
 * tape-measure line + a cm reading, or drop a pinned note. Gizmos live in a scene
 * group (drawn over everything); the cm / note labels are HTML reprojected to
 * screen each frame. Correctness of the readings is unit-tested via `measure.ts`.
 */
export class MeasureTool {
  readonly store = new MeasureStore()
  private mode: MeasureMode = 'off'
  private readonly group = new THREE.Group()
  private readonly overlay: HTMLElement
  private readonly ray = new THREE.Raycaster()
  private pending: THREE.Vector3 | null = null
  private down: { x: number; y: number } | null = null
  private labels: { anchor: THREE.Vector3; el: HTMLElement }[] = []
  private onChange: (() => void) | null = null

  private readonly container: HTMLElement

  constructor(
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.PerspectiveCamera,
    private readonly canvas: HTMLCanvasElement,
    private readonly getTargets: () => THREE.Object3D[]
  ) {
    this.group.renderOrder = 999
    this.scene.add(this.group)
    this.ray.params.Line = { threshold: 0.01 }
    this.container = canvas.parentElement ?? document.body
    this.overlay = document.createElement('div')
    this.overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:5'
    // Only establish a positioning context if the container has none (don't clobber CSS).
    if (getComputedStyle(this.container).position === 'static') this.container.style.position = 'relative'
    this.container.appendChild(this.overlay)
    this.canvas.addEventListener('pointerdown', this.handleDown)
    this.canvas.addEventListener('pointerup', this.handleUp)
  }

  setMode(mode: MeasureMode): void {
    this.mode = mode
    this.pending = null
    this.canvas.style.cursor = mode === 'off' ? '' : 'crosshair'
    this.rebuild()
  }
  getMode(): MeasureMode {
    return this.mode
  }
  setOnChange(cb: () => void): void {
    this.onChange = cb
  }
  clear(): void {
    this.store.clear()
    this.pending = null
    this.rebuild()
  }
  undo(): void {
    if (this.pending) this.pending = null
    else this.store.removeLast()
    this.rebuild()
  }

  private readonly handleDown = (e: PointerEvent): void => {
    if (this.mode === 'off') return
    this.down = { x: e.clientX, y: e.clientY }
  }
  private readonly handleUp = (e: PointerEvent): void => {
    if (this.mode === 'off' || !this.down) return
    const moved = Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y)
    this.down = null
    if (moved > 5) return // a drag (orbit), not a click
    const hit = this.pick(e)
    if (!hit) return
    if (this.mode === 'measure') {
      if (!this.pending) this.pending = hit
      else {
        this.store.addMeasurement(this.pending, hit)
        this.pending = null
      }
    } else {
      const text = window.prompt('Note')?.trim()
      if (text) this.store.addAnnotation(hit, text)
    }
    this.rebuild()
  }

  /** Raycast a pointer event against the garment/body → the world hit point. */
  private pick(e: PointerEvent): THREE.Vector3 | null {
    const rect = this.canvas.getBoundingClientRect()
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
    this.ray.setFromCamera(ndc, this.camera)
    const hits = this.ray.intersectObjects(this.getTargets(), true)
    return hits.length ? hits[0].point.clone() : null
  }

  /** Rebuild the 3D gizmos + HTML labels from the store (+ the pending point). */
  private rebuild(): void {
    for (const c of this.group.children) (c as THREE.Mesh).geometry?.dispose?.()
    this.group.clear()
    for (const el of this.labels) el.el.remove()
    this.labels = []

    const dot = (p: THREE.Vector3, mat: THREE.Material): void => {
      const m = new THREE.Mesh(DOT_GEO, mat)
      m.position.copy(p)
      m.renderOrder = 999
      this.group.add(m)
    }
    for (const m of this.store.measurements) {
      dot(m.a, POINT_MAT)
      dot(m.b, POINT_MAT)
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([m.a, m.b]), LINE_MAT)
      line.renderOrder = 999
      this.group.add(line)
      this.addLabel(midpoint(m.a, m.b), formatCm(distanceCm(m.a, m.b)), false)
    }
    for (const a of this.store.annotations) {
      dot(a.point, PIN_MAT)
      this.addLabel(a.point, a.text, true)
    }
    if (this.pending) dot(this.pending, POINT_MAT)
    this.onChange?.()
  }

  private addLabel(anchor: THREE.Vector3, text: string, note: boolean): void {
    const el = document.createElement('div')
    el.textContent = text
    el.style.cssText = `position:absolute;transform:translate(-50%,-50%);padding:2px 7px;border-radius:6px;font:11px system-ui,sans-serif;white-space:nowrap;${
      note ? 'background:#ffb347;color:#1b1b22' : 'background:#7c6ff0;color:#fff'
    }`
    this.overlay.appendChild(el)
    this.labels.push({ anchor: anchor.clone(), el })
  }

  /** Reproject the labels onto the canvas each frame (called from the render loop). */
  update(): void {
    if (!this.labels.length) return
    const crect = this.canvas.getBoundingClientRect()
    const prect = this.container.getBoundingClientRect()
    const offX = crect.left - prect.left
    const offY = crect.top - prect.top
    const v = new THREE.Vector3()
    for (const { anchor, el } of this.labels) {
      v.copy(anchor).project(this.camera)
      const visible = v.z < 1 && v.x >= -1.1 && v.x <= 1.1 && v.y >= -1.1 && v.y <= 1.1
      el.style.display = visible ? '' : 'none'
      if (visible) {
        el.style.left = `${offX + ((v.x + 1) / 2) * crect.width}px`
        el.style.top = `${offY + ((1 - v.y) / 2) * crect.height}px`
      }
    }
  }
}
