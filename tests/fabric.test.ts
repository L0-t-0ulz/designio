import { describe, it, expect } from 'vitest'
import {
  FABRIC_LIBRARY,
  fabricToSolverParams,
  getFabric,
  sheenRecipeFromFabric,
  anisotropyAngleForFabric,
  envIntensityForFabric,
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

  it('eveningwear/technical additions: lamé is metal, neoprene is stiff+heavy, sequin-base pairs with sparkle', () => {
    const lame = getFabric('lame')
    expect(lame.metalness).toBeGreaterThan(0.5) // reads as woven foil
    expect(lame.family).toBe('specialty')
    const scuba = getFabric('neoprene')
    expect(scuba.gsm).toBeGreaterThan(getFabric('jersey-knit').gsm) // thick spacer knit
    expect(scuba.bendiness).toBeLessThan(getFabric('jersey-knit').bendiness) // holds sculptural shapes
    expect(fabricToSolverParams(scuba).bendCompliance).toBeLessThan(fabricToSolverParams(getFabric('jersey-knit')).bendCompliance)
    const sequin = getFabric('sequin-base')
    expect(sequin.metalness).toBeGreaterThan(0.3)
    expect(sequin.normalStrength).toBeGreaterThan(0.5) // paillette relief
    // non-metallic cloth stays dielectric in the material
    expect(getFabric('denim').metalness ?? 0).toBe(0)
  })

  it('boiled wool is a felted coating wool — heavy, near-rigid, matte, low-stretch', () => {
    const boiled = getFabric('boiled-wool')
    expect(boiled.id).toBe('boiled-wool')
    expect(boiled.family).toBe('woven') // drapes structured like its melton sibling, not a stretchy knit
    // fulling closes the knit: heavy, matte, and it barely stretches
    expect(boiled.gsm).toBeGreaterThanOrEqual(400)
    expect(boiled.stretch).toBeLessThan(0.1)
    expect(boiled.roughness).toBeGreaterThan(0.9)
    expect(boiled.sheen).toBeLessThan(0.4)
    // felting obscures the stitches — only a faint knit ghost, far softer relief than a raw knit
    expect(boiled.normalStrength).toBeLessThan(getFabric('cable-knit').normalStrength)
    // heavier + denser than a jersey knit, so it drapes with lazier, more structured folds
    const boiledP = fabricToSolverParams(boiled)
    const jerseyP = fabricToSolverParams(getFabric('jersey-knit'))
    expect(boiledP.mass).toBeGreaterThan(jerseyP.mass)
    expect(boiledP.aero).toBeLessThan(jerseyP.aero) // heavy wool ignores the air a light knit catches
  })

  it('corduroy cap fabric is a lighter, chunkier-wale cord than the coat corduroy', () => {
    const cap = getFabric('corduroy-cap')
    const cord = getFabric('corduroy')
    expect(cap.id).toBe('corduroy-cap')
    expect(cap.weave).toBe('corduroy') // same vertical-cord pile weave
    expect(cap.nap).toBe(true) // directional pile, like all corduroy
    expect(cap.gsm).toBeLessThan(cord.gsm) // cap cord is lighter than a coat/pant cord
    // fewer repeats across the (small) cap panel = chunkier wales that still read at hat scale
    expect(cap.weaveScale).toBeLessThan(cord.weaveScale)
    expect(cap.anisotropy).toBeGreaterThan(0) // the pile still streaks the sheen
  })

  it('waxed cotton is a coated rain shell — a partial clearcoat over a stiff cotton', () => {
    const wax = getFabric('waxed-cotton')
    const canvas = getFabric('canvas')
    expect(wax.id).toBe('waxed-cotton')
    expect(wax.family).toBe('woven')
    expect(wax.clearcoat ?? 0).toBeGreaterThan(0) // the waxed sheen
    expect(wax.clearcoat!).toBeLessThan(getFabric('patent').clearcoat!) // a semi-gloss, not patent's mirror lacquer
    expect(wax.roughness).toBeLessThan(canvas.roughness) // waxing smooths a raw cotton canvas
    expect(wax.bendiness).toBeLessThan(0.3) // stiff, water-repellent shell
    // plain cotton stays a pure dielectric (no clearcoat) — waxing is the only difference
    expect(canvas.clearcoat ?? 0).toBe(0)
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

  it('satin is float-dominant with only a shallow binding dip (no hard dot grid)', () => {
    // Satin gets its smooth luster from long high floats bound only occasionally; the
    // binding point must dip only shallowly, or the baked normal map beads into a
    // visible polka-dot grid at range. Scan a tile: floats stay high, and the
    // float→binding contrast is modest (a gentle dimple, not a ~1.0 crater).
    let hi = -Infinity
    let lo = Infinity
    const threads = 16
    for (let i = 0; i < 64; i++) {
      const u = (i + 0.5) / 64
      for (let j = 0; j < 64; j++) {
        const h = weaveHeight('satin', u, (j + 0.5) / 64, threads)
        if (h > hi) hi = h
        if (h < lo) lo = h
      }
    }
    expect(hi).toBeGreaterThan(0.9) // the floats sit proud and near-flat
    expect(lo).toBeGreaterThan(0.6) // even the binding point stays well off the floor
    expect(hi - lo).toBeLessThan(0.35) // shallow contrast → smooth, not a beaded dot grid
  })

  it('waffle has a proud wall over a deep cell (chunky thermal relief reads at scale)', () => {
    const threads = 16
    let hi = -Infinity
    let lo = Infinity
    for (let i = 0; i < 96; i++) {
      const u = (i + 0.5) / 96
      for (let j = 0; j < 96; j++) {
        const h = weaveHeight('waffle', u, (j + 0.5) / 96, threads)
        expect(h).toBeGreaterThanOrEqual(0)
        expect(h).toBeLessThanOrEqual(1)
        if (h > hi) hi = h
        if (h < lo) lo = h
      }
    }
    expect(hi).toBeGreaterThan(0.85) // the honeycomb wall stands proud
    expect(lo).toBeLessThan(0.15) // the cell floor sits deep
    expect(hi - lo).toBeGreaterThan(0.6) // strong relief — not a flat, washed-out grid
  })

  it('leather is a smooth low-relief grain, not a woven crosshatch', () => {
    const threads = 16
    let hi = -Infinity
    let lo = Infinity
    for (let i = 0; i < 96; i++) {
      const u = (i + 0.5) / 96
      for (let j = 0; j < 96; j++) {
        const h = weaveHeight('leather', u, (j + 0.5) / 96, threads)
        expect(h).toBeGreaterThanOrEqual(0)
        expect(h).toBeLessThanOrEqual(1)
        if (h > hi) hi = h
        if (h < lo) lo = h
      }
    }
    // A plain woven crosshatch spans ~0→1; leather grain stays shallow (mostly flat hide).
    expect(hi - lo).toBeLessThan(0.55)
    // and it tiles seamlessly (the coarse undulation uses integer tile frequencies)
    for (const v of [0.2, 0.6]) {
      expect(weaveHeight('leather', 0.999, v, threads)).toBeCloseTo(weaveHeight('leather', 1.999, v, threads), 6)
    }
  })

  it('corduroy runs as continuous vertical cords (wales), not a diagonal twill', () => {
    const threads = 16
    // A cord's profile depends only on the across-wale coordinate; it runs unbroken up
    // the wale — so the same u at different heights (v) must give the same height. That
    // vertical continuity is what makes it read as a cord instead of a diagonal weave.
    for (const u of [0.02, 0.2, 0.37, 0.55, 0.8]) {
      const a = weaveHeight('corduroy', u, 0.1, threads)
      expect(weaveHeight('corduroy', u, 0.6, threads)).toBeCloseTo(a, 6)
      expect(weaveHeight('corduroy', u, 0.95, threads)).toBeCloseTo(a, 6)
    }
    // Across the wale there IS strong relief — a proud rounded crown over a deep valley.
    // Sweep exactly one wale (u·threads: 0→1) so we sample the crown and the valley.
    let hi = -Infinity
    let lo = Infinity
    for (let i = 0; i <= 100; i++) {
      const h = weaveHeight('corduroy', i / 100 / threads, 0.3, threads)
      if (h > hi) hi = h
      if (h < lo) lo = h
    }
    expect(hi).toBeGreaterThan(0.8) // cord crown sits proud
    expect(lo).toBeLessThan(0.2) // deep valley between cords
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

describe('envIntensityForFabric', () => {
  it('a smooth silk reflects the room more than a matte cotton or canvas', () => {
    const silk = envIntensityForFabric(getFabric('silk-charmeuse'))
    const cotton = envIntensityForFabric(getFabric('cotton-poplin'))
    const canvas = envIntensityForFabric(getFabric('canvas'))
    expect(silk).toBeGreaterThan(cotton)
    expect(cotton).toBeGreaterThan(canvas)
  })

  it('stays in a sane band for every library fabric', () => {
    for (const f of FABRIC_LIBRARY) {
      const v = envIntensityForFabric(f)
      expect(v).toBeGreaterThanOrEqual(0.7)
      expect(v).toBeLessThanOrEqual(1.6)
    }
  })
})

describe('anisotropyAngleForFabric', () => {
  it('rotates an anisotropic fabric a quarter-turn to the warp; isotropic stays 0', () => {
    expect(anisotropyAngleForFabric({ ...base, anisotropy: 0 })).toBe(0)
    expect(anisotropyAngleForFabric({ ...base, anisotropy: 0.5 })).toBeCloseTo(Math.PI / 2, 10)
    expect(anisotropyAngleForFabric(getFabric('silk-charmeuse'))).toBeCloseTo(Math.PI / 2, 10) // satin sheen streaks down the warp
    expect(anisotropyAngleForFabric(getFabric('cotton-poplin'))).toBe(0) // isotropic weave
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
