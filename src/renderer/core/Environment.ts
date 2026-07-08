import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import {
  LIGHTING_PRESETS,
  BACKDROP_PRESETS,
  getLightingPreset,
  getBackdropPreset,
  lampPosition,
  type LightingPreset,
  type BackdropPreset
} from './studioPresets'

export interface EnvironmentHandle {
  setLighting: (id: string) => void
  getLighting: () => string
  setBackdrop: (id: string) => void
  getBackdrop: () => string
  dispose: () => void
}

/** Vertical gradient backdrop (a soft studio cyclorama), as a texture. */
function gradientBackground(stops: [number, string][]): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 512
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createLinearGradient(0, 0, 0, 512)
  for (const [at, color] of stops) grad.addColorStop(at, color)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 2, 512)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Soft radial glow (white centre → transparent) for a floor "light pool". */
function radialGlowTexture(): THREE.Texture {
  const s = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = s
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  grad.addColorStop(0, 'rgba(255,255,255,0.55)')
  grad.addColorStop(0.45, 'rgba(255,255,255,0.16)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, s, s)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/**
 * A clean, colour-accurate product studio (the premium 3D-mockup look): image-based
 * lighting, a soft gradient cyclorama, a cool/warm rim rig, a gently **reflective
 * floor** with a shadow-catcher, a subtle **pedestal**, and a soft **light pool**
 * so the figure reads as a lit hero on a stage. Shared by the studio + the homepage
 * preview so both 3D scenes match.
 */
export function setupEnvironment(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer
): EnvironmentHandle {
  const disposables: { dispose: () => void }[] = []
  const track = <T extends { dispose: () => void }>(o: T): T => (disposables.push(o), o)

  const pmrem = new THREE.PMREMGenerator(renderer)
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envTexture

  const hemi = new THREE.HemisphereLight(0xffffff, 0x8890a0, 0.62)
  scene.add(hemi)

  const key = new THREE.DirectionalLight(0xfff6ec, 1.9)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.camera.near = 0.5
  key.shadow.camera.far = 20
  const extent = 2.6
  key.shadow.camera.left = -extent
  key.shadow.camera.right = extent
  key.shadow.camera.top = extent
  key.shadow.camera.bottom = -extent
  key.shadow.bias = -0.0004
  key.shadow.normalBias = 0.02
  key.shadow.radius = 5
  scene.add(key)

  // Two reusable rim/fill lamps a lighting preset drives (unused ones drop to 0).
  const rims = [new THREE.DirectionalLight(0x9cc0ff, 0), new THREE.DirectionalLight(0xffc79a, 0)]
  for (const r of rims) scene.add(r)

  // Gently reflective floor + a transparent shadow-catcher above it.
  const floor = new Reflector(track(new THREE.CircleGeometry(14, 96)), {
    textureWidth: 1024,
    textureHeight: 1024,
    color: 0x828794,
    clipBias: 0.003
  })
  floor.rotation.x = -Math.PI / 2
  scene.add(floor)
  disposables.push({ dispose: () => floor.dispose() })

  const shadowMat = track(new THREE.ShadowMaterial({ opacity: 0.3 }))
  const shadowCatcher = new THREE.Mesh(track(new THREE.CircleGeometry(14, 96)), shadowMat)
  shadowCatcher.rotation.x = -Math.PI / 2
  shadowCatcher.position.y = 0.001
  shadowCatcher.receiveShadow = true
  scene.add(shadowCatcher)

  // Soft light pool — lifts the figure off the floor with a gentle spotlight glow.
  const poolTex = track(radialGlowTexture())
  const poolMat = track(
    new THREE.MeshBasicMaterial({
      map: poolTex,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  )
  const pool = new THREE.Mesh(track(new THREE.PlaneGeometry(3.2, 3.2)), poolMat)
  pool.rotation.x = -Math.PI / 2
  pool.position.y = 0.004
  scene.add(pool)

  // Subtle pedestal so the piece stands on a product podium.
  const pedMat = track(
    new THREE.MeshStandardMaterial({ color: 0xdfe2ea, roughness: 0.62, metalness: 0 })
  )
  const pedestal = new THREE.Mesh(track(new THREE.CylinderGeometry(0.62, 0.7, 0.08, 72)), pedMat)
  pedestal.position.y = 0.04
  pedestal.castShadow = true
  pedestal.receiveShadow = true
  scene.add(pedestal)

  const grid = new THREE.GridHelper(24, 48, 0x8890a2, 0x9aa0ac)
  const gridMat = grid.material as THREE.Material
  gridMat.transparent = true
  gridMat.opacity = 0.1
  grid.position.y = 0.002
  scene.add(grid)
  disposables.push({ dispose: () => gridMat.dispose() })

  // ---- presets -----------------------------------------------------------------
  let background: THREE.Texture | null = null
  let lightingId = LIGHTING_PRESETS[0].id
  let backdropId = BACKDROP_PRESETS[0].id

  const applyLighting = (p: LightingPreset): void => {
    lightingId = p.id
    renderer.toneMappingExposure = p.exposure
    hemi.intensity = p.hemi
    key.color.setHex(p.key.color)
    key.intensity = p.key.intensity
    key.position.copy(lampPosition(p.key))
    rims.forEach((lamp, i) => {
      const spec = p.rims[i]
      lamp.intensity = spec ? spec.intensity : 0
      if (spec) {
        lamp.color.setHex(spec.color)
        lamp.position.copy(lampPosition(spec))
      }
    })
  }

  const applyBackdrop = (p: BackdropPreset): void => {
    backdropId = p.id
    if (p.transparent) {
      // No backdrop: the renderer clears to alpha 0 → a transparent product cutout.
      scene.background = null
    } else {
      const next = gradientBackground(p.stops)
      scene.background = next
      background?.dispose()
      background = next
    }
    // On a product / floating backdrop hide the stage furniture for a clean shot.
    floor.visible = p.floor
    pool.visible = p.floor
    pedestal.visible = p.floor
    grid.visible = p.floor
  }

  applyLighting(LIGHTING_PRESETS[0])
  applyBackdrop(BACKDROP_PRESETS[0])

  return {
    setLighting: (id) => {
      const p = getLightingPreset(id)
      if (p) applyLighting(p)
    },
    getLighting: () => lightingId,
    setBackdrop: (id) => {
      const p = getBackdropPreset(id)
      if (p) applyBackdrop(p)
    },
    getBackdrop: () => backdropId,
    dispose: () => {
      pmrem.dispose()
      envTexture.dispose()
      background?.dispose()
      for (const d of disposables) d.dispose()
    }
  }
}
