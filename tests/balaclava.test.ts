import { describe, it, expect } from 'vitest'
import { cutoutCells, cutoutRims, deadFromCells, buildTubeGarment, type TubeCutout } from '../src/renderer/cloth/Garment'
import { balaclavaCutouts, garmentTubeSpecs } from '../src/renderer/garments/factory'
import { getGarment } from '../src/renderer/garments/registry'
import { BALACLAVA_FACES, type BalaclavaFace } from '../src/renderer/garments/schema'
import { DEFAULT_PARAMS } from '../src/renderer/garment/templates'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'
import { docFromConfig, serializeDoc, parseDoc } from '../src/renderer/studio/document'
import { defaultConfig } from '../src/renderer/start/design'
import { XPBDSolver } from '../src/renderer/cloth/XPBDSolver'
import { FABRICS } from '../src/renderer/cloth/fabricPresets'

const mann = buildMannequin()

const skiMaskSpec = (face?: BalaclavaFace) => {
  const def = getGarment('ski-mask')
  const p = { ...DEFAULT_PARAMS, ...def.defaults, ...(face ? { faceStyle: face } : {}) }
  return garmentTubeSpecs(def, p, mann.measurements)[0]
}

describe('cutoutCells + deadFromCells', () => {
  it('marks exactly the cells inside the rect', () => {
    // a 10×11-node grid (10 columns of cells × 10 rows); rect covering cells x 2..4, y 3..5
    const cuts: TubeCutout[] = [{ u0: 0.2, u1: 0.5, v0: 0.3, v1: 0.6 }]
    const cells = cutoutCells(cuts, 10, 11)
    expect(cells.size).toBe(9)
    for (const cy of [3, 4, 5]) for (const cx of [2, 3, 4]) expect(cells.has(cy * 10 + cx)).toBe(true)
  })

  it('no cutouts → no cells; a rect off the grid → no cells', () => {
    expect(cutoutCells(undefined, 10, 11).size).toBe(0)
    expect(cutoutCells([{ u0: 2, u1: 3, v0: 2, v1: 3 }], 10, 11).size).toBe(0)
  })

  it('kills exactly the strictly-interior nodes of a 3×3 hole (the 2×2 orphans)', () => {
    const cells = cutoutCells([{ u0: 0.2, u1: 0.5, v0: 0.3, v1: 0.6 }], 10, 11)
    const dead = deadFromCells(cells, 10, 11)
    expect(dead.size).toBe(4)
    for (const iy of [4, 5]) for (const ix of [3, 4]) expect(dead.has(iy * 10 + ix)).toBe(true)
  })

  it('a 1-cell hole orphans nobody (its rim holds every node)', () => {
    const cells = new Set([4 * 10 + 4])
    expect(deadFromCells(cells, 10, 11).size).toBe(0)
  })
})

describe('cutoutRims (the opening binding path)', () => {
  const grid = (i: number): [number, number] => [i % 10, Math.floor(i / 10)]

  it('walks a closed, step-adjacent loop around the hole', () => {
    const rims = cutoutRims([{ u0: 0.2, u1: 0.5, v0: 0.3, v1: 0.6 }], 10, 11)
    expect(rims.length).toBe(1)
    const loop = rims[0]
    expect(loop.length).toBe(12) // a 3×3-cell hole has a 4×4 node boundary
    expect(new Set(loop).size).toBe(loop.length) // no repeats
    for (let k = 0; k < loop.length; k++) {
      const [ax, ay] = grid(loop[k])
      const [bx, by] = grid(loop[(k + 1) % loop.length])
      expect(Math.abs(ax - bx) + Math.abs(ay - by), `step ${k}`).toBe(1) // grid neighbours, loop closed
    }
  })

  it('rim nodes are never dead (the binding always has live particles to ride)', () => {
    const cuts: TubeCutout[] = [{ u0: 0.2, u1: 0.5, v0: 0.3, v1: 0.6 }]
    const cells = cutoutCells(cuts, 10, 11)
    const dead = deadFromCells(cells, 10, 11)
    for (const nIdx of cutoutRims(cuts, 10, 11)[0]) expect(dead.has(nIdx)).toBe(false)
  })

  it('the ski mask exposes one rim per opening', () => {
    const build = buildTubeGarment(skiMaskSpec('three-hole'))
    expect(build.cutRims?.length).toBe(3)
    const open = buildTubeGarment(skiMaskSpec('open-face'))
    expect(open.cutRims?.length).toBe(1)
  })

  it('stiffenAmong tightens exactly the rim-to-rim constraints', () => {
    const build = buildTubeGarment(skiMaskSpec('three-hole'))
    const solver = new XPBDSolver(build.nx, build.ny, build.positions, FABRICS.cotton, { pinned: build.pinnedTop, wrapX: true })
    const touched = solver.stiffenAmong(new Set(build.cutRims!.flat()), 0.2)
    expect(touched).toBeGreaterThan(0)
    expect(solver.stiffenAmong(new Set(), 0.2)).toBe(0)
  })
})

describe('balaclavaCutouts', () => {
  const m = mann.measurements
  const topY = m.neckY + m.headR * 2.7
  const bottomY = m.neckY - 0.02

  it('produces the right opening count per style, all rects inside the tube', () => {
    const counts: Record<BalaclavaFace, number> = { full: 0, eyes: 2, 'three-hole': 3, 'open-face': 1 }
    for (const face of BALACLAVA_FACES) {
      const cuts = balaclavaCutouts(face, topY, bottomY, m)
      expect(cuts.length, face).toBe(counts[face])
      for (const c of cuts) {
        expect(c.u0).toBeGreaterThan(0)
        expect(c.u1).toBeLessThan(1)
        expect(c.v0).toBeGreaterThan(0)
        expect(c.v1).toBeLessThan(1)
        expect(c.u1).toBeGreaterThan(c.u0)
        expect(c.v1).toBeGreaterThan(c.v0)
      }
    }
  })

  it('the eye holes sit symmetric about centre-front (u = 0.25), above the mouth', () => {
    const [l, r, mouth] = balaclavaCutouts('three-hole', topY, bottomY, m)
    expect((l.u0 + l.u1) / 2 + (r.u0 + r.u1) / 2).toBeCloseTo(0.5, 5)
    expect(l.u1).toBeLessThan(0.25)
    expect(r.u0).toBeGreaterThan(0.25)
    // v runs top→down: the mouth's band starts below the eyes'
    expect(mouth.v0).toBeGreaterThan(l.v1)
  })
})

describe('the ski-mask garment', () => {
  it('is a crown headTube with real face holes — the mesh drops quads per style', () => {
    const counts = (['full', 'eyes', 'three-hole', 'open-face'] as BalaclavaFace[]).map((face) => {
      const spec = skiMaskSpec(face)
      expect(spec).toBeDefined()
      const build = buildTubeGarment(spec)
      return build.geometry.getIndex()!.count
    })
    const [full, eyes, three, open] = counts
    expect(eyes).toBeLessThan(full) // eye holes dropped quads
    expect(three).toBeLessThan(eyes) // + the mouth
    expect(open).toBeLessThan(eyes) // the open face drops the most
  })

  it('bellies past the head radius at face height so it spawns off the face', () => {
    const spec = skiMaskSpec()
    expect(spec.radiusWaist).toBeGreaterThan(mann.measurements.headR)
  })

  it('drapes finite + bounded on the body with its holes cut (dead particles pinned)', () => {
    const spec = skiMaskSpec('three-hole')
    const build = buildTubeGarment(spec)
    expect(build.cutCells && build.cutCells.size).toBeGreaterThan(0)
    const solver = new XPBDSolver(build.nx, build.ny, build.positions, FABRICS.cotton, {
      pinned: build.pinnedTop,
      wrapX: true,
      dead: deadFromCells(build.cutCells!, build.nx, build.ny) // orphaned interior particles, as the controller wires it
    })
    solver.colliders = mann.colliders
    solver.bodyCollider = mann.bodyCollider
    for (let i = 0; i < 150; i++) solver.step(1 / 60)
    let mx = 0
    for (let k = 0; k < build.positions.length; k++) mx = Math.max(mx, Math.abs(build.positions[k]))
    expect(Number.isFinite(mx)).toBe(true)
    expect(mx).toBeLessThan(3)
  }, 20000)

  it('the faceStyle param overrides the definition default', () => {
    const three = buildTubeGarment(skiMaskSpec()).geometry.getIndex()!.count // def default: three-hole
    const full = buildTubeGarment(skiMaskSpec('full')).geometry.getIndex()!.count
    expect(full).toBeGreaterThan(three)
  })
})

describe('beanie fit (cuff roll + slouch)', () => {
  const spec = (over: Record<string, number>) => {
    const def = getGarment('beanie')
    return garmentTubeSpecs(def, { ...DEFAULT_PARAMS, ...def.defaults, ...over }, mann.measurements)[0]
  }

  it('slouch adds crown length and eases the gather toward the slouchy variant', () => {
    const base = spec({})
    const slouched = spec({ slouch: 1 })
    expect(slouched.bottomY).toBeLessThan(base.bottomY) // longer drop
    expect(slouched.radiusTop).toBeGreaterThan(base.radiusTop) // the proven slouchy gather (0.13 → ~0.17)
  })

  it('a rolled cuff widens the band and eats drop length', () => {
    const base = spec({})
    const cuffed = spec({ cuffHeight: 1 })
    expect(cuffed.radiusBottom).toBeGreaterThan(base.radiusBottom)
    expect(cuffed.bottomY).toBeGreaterThan(base.bottomY) // rolling up shortens
  })

  it('defaults unchanged when the params are absent, and a slouched beanie still drapes bounded', () => {
    const def = getGarment('beanie')
    const a = spec({})
    const b = garmentTubeSpecs(def, { ...DEFAULT_PARAMS, ...def.defaults }, mann.measurements)[0]
    expect(a.radiusTop).toBe(b.radiusTop)
    const build = buildTubeGarment(spec({ slouch: 1, cuffHeight: 1 }))
    const solver = new XPBDSolver(build.nx, build.ny, build.positions, FABRICS.cotton, { pinned: build.pinnedTop, wrapX: true })
    solver.colliders = mann.colliders
    solver.bodyCollider = mann.bodyCollider
    for (let i = 0; i < 150; i++) solver.step(1 / 60)
    let mx = 0
    for (let k = 0; k < build.positions.length; k++) mx = Math.max(mx, Math.abs(build.positions[k]))
    expect(Number.isFinite(mx)).toBe(true)
    expect(mx).toBeLessThan(3)
  }, 20000)
})

describe('balaclava convertible fold', () => {
  const spec = (worn?: 'down' | 'rolled') => {
    const def = getGarment('ski-mask')
    return garmentTubeSpecs(def, { ...DEFAULT_PARAMS, ...def.defaults, ...(worn ? { balaclavaWorn: worn } : {}) }, mann.measurements)[0]
  }

  it('rolled re-specs the mask as a rolled-band beanie — short, fat band, no face holes', () => {
    const down = spec()
    const rolled = spec('rolled')
    expect(rolled.bottomY).toBeGreaterThan(down.bottomY) // much shorter (crown coverage only)
    expect(rolled.radiusBottom).toBeGreaterThan(down.radiusBottom) // the doubled roll band
    expect(rolled.cutouts).toBeUndefined() // the holes ride inside the roll
    expect(rolled.extraPins).toBeUndefined() // no face grips when rolled
    expect(down.cutouts?.length).toBe(3) // worn down is unchanged
  })

  it('rolled still spawns on the dome and drapes bounded', () => {
    const rolled = spec('rolled')
    expect(rolled.dome).toBeDefined()
    const build = buildTubeGarment(rolled)
    const solver = new XPBDSolver(build.nx, build.ny, build.positions, FABRICS.cotton, { pinned: build.pinnedTop, wrapX: true })
    solver.colliders = mann.colliders
    solver.bodyCollider = mann.bodyCollider
    for (let i = 0; i < 150; i++) solver.step(1 / 60)
    let mx = 0
    for (let k = 0; k < build.positions.length; k++) mx = Math.max(mx, Math.abs(build.positions[k]))
    expect(Number.isFinite(mx)).toBe(true)
    expect(mx).toBeLessThan(3)
  }, 20000)
})

describe('pom customizer persistence', () => {
  it('pomScale / pomColor / pomFur survive a .dio round trip', () => {
    const doc = docFromConfig(defaultConfig())
    doc.layers[0].pomScale = 1.6
    doc.layers[0].pomColor = 0xffffff
    doc.layers[0].pomFur = true
    const back = parseDoc(serializeDoc(doc))
    expect(back.layers[0].pomScale).toBe(1.6)
    expect(back.layers[0].pomColor).toBe(0xffffff)
    expect(back.layers[0].pomFur).toBe(true)
  })
})

describe('cuff patch persistence', () => {
  it('cuffPatch survives a .dio round trip', () => {
    const doc = docFromConfig(defaultConfig())
    doc.layers[0].cuffPatch = 'leather'
    const back = parseDoc(serializeDoc(doc))
    expect(back.layers[0].cuffPatch).toBe('leather')
  })
})

describe('brimmed beanie', () => {
  it('is a crown headTube with the visor flag, and drapes bounded', () => {
    const def = getGarment('brimmed-beanie')
    expect(def.visor).toBe(true)
    const spec = garmentTubeSpecs(def, { ...DEFAULT_PARAMS, ...def.defaults }, mann.measurements)[0]
    const build = buildTubeGarment(spec)
    const solver = new XPBDSolver(build.nx, build.ny, build.positions, FABRICS.cotton, { pinned: build.pinnedTop, wrapX: true })
    solver.colliders = mann.colliders
    solver.bodyCollider = mann.bodyCollider
    for (let i = 0; i < 150; i++) solver.step(1 / 60)
    let mx = 0
    for (let k = 0; k < build.positions.length; k++) mx = Math.max(mx, Math.abs(build.positions[k]))
    expect(Number.isFinite(mx)).toBe(true)
    expect(mx).toBeLessThan(3)
  }, 20000)
})

describe('twisted headband', () => {
  it('is an open-crown band at the forehead (not a dome), and drapes bounded', () => {
    const def = getGarment('headband')
    expect(def.twist).toBe(true)
    const spec = garmentTubeSpecs(def, { ...DEFAULT_PARAMS, ...def.defaults }, mann.measurements)[0]
    expect(spec.topY).toBeLessThan(mann.measurements.crownY - 0.05) // sits below the crown
    expect(spec.topY - spec.bottomY).toBeGreaterThan(0.05) // a real band, not a strip
    expect(spec.topY - spec.bottomY).toBeLessThan(0.12)
    expect(spec.radiusTop).toBeGreaterThan(mann.measurements.headR) // wraps the head, no gathered dome
    const build = buildTubeGarment(spec)
    const solver = new XPBDSolver(build.nx, build.ny, build.positions, FABRICS.cotton, { pinned: build.pinnedTop, wrapX: true })
    solver.colliders = mann.colliders
    solver.bodyCollider = mann.bodyCollider
    for (let i = 0; i < 150; i++) solver.step(1 / 60)
    let mx = 0
    for (let k = 0; k < build.positions.length; k++) mx = Math.max(mx, Math.abs(build.positions[k]))
    expect(Number.isFinite(mx)).toBe(true)
    expect(mx).toBeLessThan(3)
  }, 20000)
})

describe('scarf dimension designer', () => {
  it('scarfWidth scales the panel width (and its lattice rows) through gradeParams', async () => {
    const { scarfToSpec } = await import('../src/renderer/garments/factory')
    const { gradeParams, defaultLayer } = await import('../src/renderer/studio/document')
    const pc = { kind: 'scarfPanel' as const, width: 0.24, tailHi: 0.3, tailLo: 0.55, wrapEase: 0.02 }
    const l = defaultLayer('scarf')
    const base = scarfToSpec(pc, gradeParams(l), mann.measurements)
    l.scarfWidth = 1.8
    const wide = scarfToSpec(pc, gradeParams(l), mann.measurements)
    expect(wide.width).toBeCloseTo(base.width * 1.8, 5)
    expect(wide.ny).toBeGreaterThan(base.ny)
  })
})
