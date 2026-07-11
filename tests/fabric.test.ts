import { describe, it, expect } from 'vitest'
import {
  FABRIC_LIBRARY,
  fabricToSolverParams,
  getFabric,
  sheenRecipeFromFabric,
  type Fabric
} from '../src/renderer/fabric/FabricLibrary'
import { weaveHeight, weaveNormal, weaveRoughness, toksvigRoughness } from '../src/renderer/fabric/weaveTexture'

const base: Fabric = {
  id: 'x',
  name: 'X',
  family: 'woven',
  gsm: 150,
  stretch: 0.2,
  bendiness: 0.5,
  friction: 0.5,
  color: 0x808080,
  roughness: 0.8,
  sheen: 0.5,
  sheenRoughness: 0.5,
  weave: 'plain',
  weaveScale: 200,
  normalStrength: 0.5,
  anisotropy: 0,
  transmission: 0
}

describe('fabricToSolverParams', () => {
  it('maps weight to mass and passes friction/colour through', () => {
    const p = fabricToSolverParams({ ...base, gsm: 200, friction: 0.42, color: 0x123456 })
    expect(p.mass).toBeCloseTo(200 * 0.0015, 6)
    expect(p.friction).toBe(0.42)
    expect(p.color).toBe(0x123456)
    expect(p.mass).toBeGreaterThanOrEqual(0.05) // clamped floor
  })

  it('is monotonic in the physical properties', () => {
    const heavier = fabricToSolverParams({ ...base, gsm: 400 })
    const lighter = fabricToSolverParams({ ...base, gsm: 60 })
    expect(heavier.mass).toBeGreaterThan(lighter.mass)

    const stretchy = fabricToSolverParams({ ...base, stretch: 0.9 })
    const rigid = fabricToSolverParams({ ...base, stretch: 0.0 })
    expect(stretchy.stretchCompliance).toBeGreaterThan(rigid.stretchCompliance)

    const soft = fabricToSolverParams({ ...base, bendiness: 1 })
    const crisp = fabricToSolverParams({ ...base, bendiness: 0 })
    expect(soft.bendCompliance).toBeGreaterThan(crisp.bendCompliance)
  })

  it('aerodynamic drag rises for light, fluid, sheer fabrics', () => {
    const light = fabricToSolverParams({ ...base, gsm: 40 })
    const heavy = fabricToSolverParams({ ...base, gsm: 400 })
    expect(light.aero).toBeGreaterThan(heavy.aero)

    const fluid = fabricToSolverParams({ ...base, bendiness: 1 })
    const crisp = fabricToSolverParams({ ...base, bendiness: 0 })
    expect(fluid.aero).toBeGreaterThan(crisp.aero)

    const sheer = fabricToSolverParams({ ...base, transmission: 0.6 })
    const opaque = fabricToSolverParams({ ...base, transmission: 0 })
    expect(sheer.aero).toBeGreaterThan(opaque.aero)

    // real fabrics: chiffon catches far more air than denim
    expect(fabricToSolverParams(getFabric('chiffon')).aero).toBeGreaterThan(fabricToSolverParams(getFabric('denim')).aero)
  })
})

describe('FABRIC_LIBRARY', () => {
  it('has well-formed entries', () => {
    expect(FABRIC_LIBRARY.length).toBeGreaterThanOrEqual(8)
    for (const f of FABRIC_LIBRARY) {
      expect(f.id && f.name).toBeTruthy()
      expect(f.gsm).toBeGreaterThan(0)
      for (const v of [f.stretch, f.bendiness, f.friction, f.anisotropy, f.transmission]) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      }
      expect(f.weaveScale).toBeGreaterThan(0)
    }
  })

  it('getFabric falls back to the first entry for unknown ids', () => {
    expect(getFabric('nope')).toBe(FABRIC_LIBRARY[0])
    expect(getFabric('denim').id).toBe('denim')
  })
})

describe('weave texture math', () => {
  it('produces unit normals that always face outward (+Z)', () => {
    for (const uv of [
      [0.1, 0.2],
      [0.5, 0.5],
      [0.73, 0.31]
    ]) {
      const n = weaveNormal('plain', uv[0], uv[1], 16, 3)
      const len = Math.hypot(n[0], n[1], n[2])
      expect(len).toBeCloseTo(1, 5)
      expect(n[2]).toBeGreaterThan(0) // height-field normal never points inward
    }
  })

  it('gives different micro-surfaces for different weaves', () => {
    const h1 = weaveHeight('plain', 0.3, 0.3, 16)
    const h2 = weaveHeight('twill', 0.3, 0.3, 16)
    expect(h1).not.toBeCloseTo(h2, 3)
  })
})

describe('weaveRoughness (procedural roughness map)', () => {
  it('makes yarn crowns glossier than valleys, all encodable in [0,1]', () => {
    // scan a tile: the crown (max height) must be glossier (lower roughness) than
    // the valley (min height); every value must be a valid roughnessMap multiplier.
    let crownRough = Infinity
    let valleyRough = -Infinity
    let hiH = -Infinity
    let loH = Infinity
    for (let i = 0; i < 64; i++) {
      const u = (i + 0.5) / 64
      for (let j = 0; j < 64; j++) {
        const v = (j + 0.5) / 64
        const r = weaveRoughness('plain', u, v, 16)
        expect(r).toBeGreaterThan(0)
        expect(r).toBeLessThanOrEqual(1)
        const h = weaveHeight('plain', u, v, 16)
        if (h > hiH) { hiH = h; crownRough = r }
        if (h < loH) { loH = h; valleyRough = r }
      }
    }
    expect(crownRough).toBeLessThan(valleyRough)
  })

  it('differentiates by weave type', () => {
    const plain = weaveRoughness('plain', 0.3, 0.3, 16)
    const twill = weaveRoughness('twill', 0.3, 0.3, 16)
    expect(plain).not.toBeCloseTo(twill, 2)
  })
})

describe('toksvigRoughness (specular AA)', () => {
  it('lifts roughness with normal strength, never below the input, clamped ≤ 1', () => {
    const weak = toksvigRoughness(0.5, 0.2)
    const strong = toksvigRoughness(0.5, 0.9)
    expect(strong).toBeGreaterThan(weak)
    expect(weak).toBeGreaterThanOrEqual(0.5)
    expect(toksvigRoughness(0.98, 1)).toBeLessThanOrEqual(1)
  })
})

describe('sheenRecipeFromFabric', () => {
  it('silk glows brighter + sharper than a woven with the same inputs', () => {
    const silk = sheenRecipeFromFabric({ ...base, family: 'silk' })
    const woven = sheenRecipeFromFabric({ ...base, family: 'woven' })
    expect(silk.sheen).toBeGreaterThan(woven.sheen)
    expect(silk.sheenRoughness).toBeLessThan(woven.sheenRoughness)
  })

  it('napped specialty (velvet) is the most lustrous family', () => {
    const velvet = sheenRecipeFromFabric({ ...base, family: 'specialty', nap: true })
    for (const fam of ['woven', 'silk', 'knit'] as const) {
      expect(velvet.sheen).toBeGreaterThan(sheenRecipeFromFabric({ ...base, family: fam }).sheen)
    }
  })

  it('returns finite, in-range numbers for every library fabric', () => {
    for (const f of FABRIC_LIBRARY) {
      const r = sheenRecipeFromFabric(f)
      for (const v of [r.sheen, r.sheenRoughness, r.tintSat, r.tintLift]) {
        expect(Number.isFinite(v)).toBe(true)
      }
      expect(r.sheen).toBeGreaterThanOrEqual(0)
      expect(r.sheen).toBeLessThanOrEqual(1)
      expect(r.sheenRoughness).toBeGreaterThanOrEqual(0)
      expect(r.sheenRoughness).toBeLessThanOrEqual(1)
    }
  })
})

describe('fabric library families', () => {
  it('every fabric declares a family and all families are populated', () => {
    const fams = new Set(FABRIC_LIBRARY.map((f) => f.family))
    for (const fam of ['woven', 'silk', 'knit', 'specialty'] as const) {
      expect(fams.has(fam)).toBe(true)
    }
    expect(FABRIC_LIBRARY.length).toBeGreaterThanOrEqual(20)
  })

  it('stiff fabrics derive a stiffer bend than fluid ones (distinct drape)', () => {
    const denim = fabricToSolverParams(getFabric('denim'))
    const chiffon = fabricToSolverParams(getFabric('chiffon'))
    expect(denim.bendCompliance).toBeLessThan(chiffon.bendCompliance)
    expect(denim.mass).toBeGreaterThan(chiffon.mass) // denim heavier
  })
})
