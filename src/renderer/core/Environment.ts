import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'

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
 * A clean, bright product studio (the premium 3D-mockup look): image-based
 * lighting, a soft gradient cyclorama, a subtle cool/warm rim rig, and a gently
 * **reflective floor** with a shadow-catcher on top so contact shadows read.
 */
export function setupEnvironment(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer
): { dispose: () => void } {
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envTexture

  const background = gradientBackground('#dee1e8', '#a9aeba')
  scene.background = background

  const hemi = new THREE.HemisphereLight(0xffffff, 0x8890a0, 0.75)
  scene.add(hemi)

  const key = new THREE.DirectionalLight(0xfff6ec, 2.0)
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
  key.shadow.radius = 5
  scene.add(key)

  const coolRim = new THREE.DirectionalLight(0x9cc0ff, 0.6)
  coolRim.position.set(-4, 3, -4)
  scene.add(coolRim)
  const warmRim = new THREE.DirectionalLight(0xffc79a, 0.35)
  warmRim.position.set(4.5, 1.6, -2)
  scene.add(warmRim)

  // Gently reflective floor + a transparent shadow-catcher above it.
  const floor = new Reflector(new THREE.CircleGeometry(14, 96), {
    textureWidth: 1024,
    textureHeight: 1024,
    color: 0x8f95a3,
    clipBias: 0.003
  })
  floor.rotation.x = -Math.PI / 2
  scene.add(floor)

  const shadowCatcher = new THREE.Mesh(
    new THREE.CircleGeometry(14, 96),
    new THREE.ShadowMaterial({ opacity: 0.28 })
  )
  shadowCatcher.rotation.x = -Math.PI / 2
  shadowCatcher.position.y = 0.001
  shadowCatcher.receiveShadow = true
  scene.add(shadowCatcher)

  const grid = new THREE.GridHelper(24, 48, 0x8890a2, 0x9aa0ac)
  const gridMat = grid.material as THREE.Material
  gridMat.transparent = true
  gridMat.opacity = 0.12
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
