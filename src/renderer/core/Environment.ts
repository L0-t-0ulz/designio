import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

/** Vertical gradient backdrop (a soft studio cyclorama), as a texture. */
function gradientBackground(top: string, bottom: string): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 512
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createLinearGradient(0, 0, 0, 512)
  grad.addColorStop(0, top)
  grad.addColorStop(1, bottom)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 2, 512)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/**
 * A neutral, evenly-lit studio (the look garment software uses): image-based
 * environment for soft reflections, a gradient cyclorama backdrop, a soft
 * shadow-casting key light, fill + rim, and a subtle floor with contact shadow.
 */
export function setupEnvironment(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer
): { dispose: () => void } {
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envTexture

  const background = gradientBackground('#aab0be', '#4a4e58')
  scene.background = background

  const hemi = new THREE.HemisphereLight(0xffffff, 0x54586a, 0.8)
  scene.add(hemi)

  const key = new THREE.DirectionalLight(0xfff6ec, 2.6)
  key.position.set(3.2, 6.0, 4.2)
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
  key.shadow.radius = 5 // softer penumbra
  scene.add(key)

  const fill = new THREE.DirectionalLight(0xdfe6ff, 0.7)
  fill.position.set(-4, 2.5, 2)
  scene.add(fill)

  const rim = new THREE.DirectionalLight(0xffffff, 0.9)
  rim.position.set(-2, 3.5, -5)
  scene.add(rim)

  // Soft neutral floor that mainly reads as a contact shadow.
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(10, 96),
    new THREE.MeshStandardMaterial({ color: 0x6c7180, roughness: 0.9, metalness: 0 })
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  const grid = new THREE.GridHelper(20, 40, 0x8890a0, 0x60646f)
  const gridMat = grid.material as THREE.Material
  gridMat.transparent = true
  gridMat.opacity = 0.25
  grid.position.y = 0.002
  scene.add(grid)

  return {
    dispose: () => {
      pmrem.dispose()
      envTexture.dispose()
      background.dispose()
    }
  }
}
