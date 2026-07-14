import * as THREE from 'three'
import { WebGLPathTracer, GradientEquirectTexture } from 'three-gpu-pathtracer'
import type { Viewport } from './Viewport'
import { pathTracePlan, type PathTraceQuality } from './pathTracePlan'

/**
 * Offline **path-traced hero render** — a physically-based, GPU path-traced still
 * of the current view (true global illumination, soft shadows, accurate glossy
 * reflections + fabric sheen), a step up from the rasterised {@link Viewport.renderStill}.
 *
 * The path tracer (three-gpu-pathtracer) bakes the whole posed scene into a BVH and
 * converges over N accumulated samples. It's offline: the caller pauses the studio
 * loop, we take over the canvas, converge, then read the canvas to a PNG. A soft
 * gradient studio dome drives the environment light (the live viewport's PMREM env
 * is a packed texture, not an equirect the tracer can sample), swapped in for the
 * trace and restored after.
 */
export interface PathTraceOptions {
  /** Output width in px (height follows the camera aspect). Default: the live canvas size. */
  width?: number
  /** Quality preset → sample budget + bounces + tiling. Default 'high'. */
  quality?: PathTraceQuality
  /** 0…1 progress as samples accumulate (samples, target). */
  onProgress?: (samples: number, target: number) => void
  /** Cooperative cancel — checked between samples. */
  signal?: { cancelled: boolean }
}

let tracer: WebGLPathTracer | null = null
let tracerRenderer: THREE.WebGLRenderer | null = null
let studioEnv: GradientEquirectTexture | null = null

/** A soft studio dome (bright key overhead → gentle floor bounce) for GI fill. */
function studioDome(): GradientEquirectTexture {
  if (studioEnv) return studioEnv
  const t = new GradientEquirectTexture(1024)
  t.topColor.set(0xf2f4f7) // near-white ceiling
  t.bottomColor.set(0x3a3d42) // dim floor bounce
  t.exponent = 1.4
  t.update()
  studioEnv = t
  return t
}

const nextFrame = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()))

/**
 * Hide every mesh the tracer can't sample — the `Reflector` floor + shadow-catcher
 * (a `ShaderMaterial` / `ShadowMaterial` have no PBR `color`, which crashes the
 * material bake) and any other non-PBR helper. Only `MeshStandardMaterial` /
 * `MeshPhysicalMaterial` (fabric · skin · GLB body · trims · accessories) survive.
 * Returns a restore fn (call it after the trace). The generator uses `traverseVisible`,
 * so `visible = false` is enough to exclude a mesh.
 */
function hideUntraceable(scene: THREE.Scene): () => void {
  const hidden: THREE.Object3D[] = []
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh || !o.visible) return
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    const traceable = mats.length > 0 && mats.every((m) => (m as THREE.MeshStandardMaterial | undefined)?.isMeshStandardMaterial)
    if (!traceable) {
      o.visible = false
      hidden.push(o)
    }
  })
  return () => {
    for (const o of hidden) o.visible = true
  }
}

/**
 * Converge a path-traced still of the viewport's current pose + camera and return a
 * PNG data URL. Assumes the caller has paused the render loop (we own the canvas until
 * this resolves). Restores the renderer size + scene environment before returning.
 */
export async function renderPathTraced(viewport: Viewport, opts: PathTraceOptions = {}): Promise<string> {
  const renderer = viewport.renderer
  const scene = viewport.scene
  const camera = viewport.camera

  // (Re)build the tracer if the renderer changed (shader compile is cached across calls).
  if (!tracer || tracerRenderer !== renderer) {
    tracer = new WebGLPathTracer(renderer)
    tracer.renderDelay = 0 // offline — no rasterised warm-up delay
    tracer.fadeDuration = 0
    tracer.minSamples = 1
    tracer.dynamicLowRes = false
    tracerRenderer = renderer
  }
  const plan = pathTracePlan(opts.quality ?? 'high', opts.width ?? renderer.domElement.width)
  tracer.bounces = plan.bounces
  tracer.transmissiveBounces = plan.transmissiveBounces
  tracer.renderScale = 1
  tracer.tiles.set(plan.tiles, plan.tiles)

  // Size the backing buffer to the requested output (WYSIWYG camera, supersampled).
  const prevRatio = renderer.getPixelRatio()
  const prevSize = new THREE.Vector2()
  renderer.getSize(prevSize)
  const W = Math.round(plan.width)
  const H = Math.max(1, Math.round(W / camera.aspect))
  renderer.setPixelRatio(1)
  renderer.setSize(W, H, false)

  // Swap in the equirect studio dome so the tracer has a real environment to sample
  // (keep a transparent backdrop transparent). Restore the live env afterwards.
  const prevEnv = scene.environment
  const prevEnvIntensity = scene.environmentIntensity
  scene.environment = studioDome()
  scene.environmentIntensity = 1
  const restoreVisibility = hideUntraceable(scene)

  try {
    tracer.setScene(scene, camera)
    const target = plan.samples
    const startT = performance.now()
    const MAX_MS = 90_000 // hard wall-clock ceiling so a stall can't hang the app
    while (tracer.samples < target) {
      if (opts.signal?.cancelled) break
      if (performance.now() - startT > MAX_MS) break
      tracer.renderSample()
      opts.onProgress?.(Math.min(tracer.samples, target), target)
      await nextFrame() // yield: let the canvas paint + the GPU breathe
    }
    // Final sample + read in the SAME tick — no yield, so the drawing buffer still
    // holds the image (the renderer has no preserveDrawingBuffer).
    tracer.renderSample()
    const out = document.createElement('canvas')
    out.width = W
    out.height = H
    out.getContext('2d')?.drawImage(renderer.domElement, 0, 0)
    return out.toDataURL('image/png')
  } finally {
    restoreVisibility()
    scene.environment = prevEnv
    scene.environmentIntensity = prevEnvIntensity
    renderer.setPixelRatio(prevRatio)
    renderer.setSize(prevSize.x, prevSize.y, false)
  }
}
