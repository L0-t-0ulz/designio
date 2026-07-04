import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

/**
 * Studio lighting: a procedural image-based environment (no external HDR asset
 * needed) for soft realistic reflections, a shadow-casting key light, a fill
 * hemisphere light, plus a ground plane and grid.
 */
export function setupEnvironment(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer
): { dispose: () => void } {
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envTexture
  scene.background = new THREE.Color(0x16161c)

  const hemi = new THREE.HemisphereLight(0xffffff, 0x2a2a35, 0.55)
  scene.add(hemi)

  const key = new THREE.DirectionalLight(0xffffff, 2.4)
  key.position.set(3.2, 6.0, 4.0)
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
  scene.add(key)

  const rim = new THREE.DirectionalLight(0x99aaff, 0.5)
  rim.position.set(-4, 3, -3)
  scene.add(rim)

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(8, 96),
    new THREE.MeshStandardMaterial({ color: 0x24242c, roughness: 0.95, metalness: 0 })
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  const grid = new THREE.GridHelper(16, 32, 0x3a3a48, 0x25252e)
  const gridMat = grid.material as THREE.Material
  gridMat.transparent = true
  gridMat.opacity = 0.35
  grid.position.y = 0.001
  scene.add(grid)

  return {
    dispose: () => {
      pmrem.dispose()
      envTexture.dispose()
    }
  }
}
