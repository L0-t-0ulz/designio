import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { MEASUREMENTS, buildMannequin } from '../src/renderer/avatar/Mannequin'
import { DEFAULT_PARAMS, type GarmentType } from '../src/renderer/garment/templates'
import { getGarment, GARMENTS, GARMENT_IDS } from '../src/renderer/garments/registry'
import { garmentTubeSpecs, headTubeToSpec, buildGarment } from '../src/renderer/garments/factory'
import type { HeadTubePiece } from '../src/renderer/garments/schema'
import { FABRIC_LIBRARY } from '../src/renderer/fabric/FabricLibrary'
import { fillTube, fillAxisTube, buildTubeGarment } from '../src/renderer/cloth/Garment'
import type { GarmentParams } from '../src/renderer/garment/templates'

const specs = (t: GarmentType, p: GarmentParams = DEFAULT_PARAMS): ReturnType<typeof garmentTubeSpecs> =>
  garmentTubeSpecs(getGarment(t), p, MEASUREMENTS)

describe('garment construction (schema + factory)', () => {
  it('tops/dresses carry a neckline + shoulder line; a dress has a cinched waist', () => {
    const dress = specs('dress')[0]
    const top = specs('top')[0]
    expect(dress.neckline).toBe('scoop')
    expect(dress.shoulderY).toBe(MEASUREMENTS.shoulderY)
    expect(dress.radiusWaist).toBeLessThan(dress.radiusTop) // waist cinched vs bust
    expect(top.neckline).toBe('scoop')
  })

  it('the neckline lifts the shoulders above the front dip', () => {
    const radial = 40
    const rings = 16
    const pos = new Float32Array(radial * rings * 3)
    fillTube(pos, {
      rings,
      radial,
      topY: 1.44,
      bottomY: 0.7,
      radiusTop: 0.16,
      radiusBottom: 0.2,
      neckline: 'scoop',
      shoulderY: 1.44
    })
    const sideY = pos[0 * 3 + 1] // ix=0 → a=0 (side / shoulder)
    const frontY = pos[Math.round(radial / 4) * 3 + 1] // a≈π/2 (centre-front)
    expect(sideY).toBeGreaterThan(frontY + 0.02)
  })

  it('a built tube splits into two material groups (front +z, back −z panels)', () => {
    const radial = 40
    const rings = 16
    const build = buildTubeGarment({ rings, radial, topY: 1.4, bottomY: 0.7, radiusTop: 0.16, radiusBottom: 0.2 })
    const groups = build.geometry.groups
    const idxCount = build.geometry.getIndex()!.count
    expect(groups).toHaveLength(2)
    expect(groups[0]).toMatchObject({ start: 0, materialIndex: 0 })
    expect(groups[1]).toMatchObject({ start: groups[0].count, materialIndex: 1 })
    expect(groups[0].count + groups[1].count).toBe(idxCount) // tile the whole index
    const half = Math.floor(radial / 2)
    expect(groups[0].count).toBe(half * (rings - 1) * 6) // front = first half of columns
    expect(groups[1].count).toBe((radial - half) * (rings - 1) * 6)
  })

  it('a sleeve (axis tube) builds rings perpendicular to the arm axis', () => {
    const radial = 16
    const rings = 8
    const pos = new Float32Array(radial * rings * 3)
    fillAxisTube(pos, {
      rings,
      radial,
      a: new THREE.Vector3(0, 1, 0),
      b: new THREE.Vector3(0.4, 1, 0), // axis = +x
      radiusStart: 0.06,
      radiusEnd: 0.06
    })
    for (let ix = 0; ix < radial; ix++) {
      const x = pos[ix * 3]
      const y = pos[ix * 3 + 1]
      const z = pos[ix * 3 + 2]
      expect(Math.abs(x)).toBeLessThan(1e-6) // ring ⟂ to the +x axis
      expect(Math.hypot(y - 1, z)).toBeCloseTo(0.06, 5) // at the tube radius
    }
  })
})

describe('garment registry + factory', () => {
  it('every definition is data-valid (id/name/pieces/supports)', () => {
    for (const g of GARMENTS) {
      expect(g.id).toBeTruthy()
      expect(g.name).toBeTruthy()
      expect(g.pieces.length).toBeGreaterThan(0)
      expect(g.supports).toBeTruthy()
    }
  })

  it('produces the right number of tube pieces per type', () => {
    expect(specs('dress').length).toBe(1)
    expect(specs('skirt').length).toBe(1)
    expect(specs('top').length).toBe(1)
    expect(specs('pants').length).toBe(2) // two legs
  })

  it('every catalog garment produces geometrically valid tube pieces', () => {
    for (const t of GARMENT_IDS) {
      for (const spec of specs(t)) {
        expect(spec.topY).toBeGreaterThan(spec.bottomY)
        expect(spec.radiusTop).toBeGreaterThan(0)
        expect(spec.radiusBottom).toBeGreaterThan(0)
        expect(spec.rings).toBeGreaterThanOrEqual(10)
        expect(spec.radial).toBeGreaterThan(3)
      }
    }
  })

  it('length makes the hem lower', () => {
    const short = specs('dress', { ...DEFAULT_PARAMS, length: 0.1 })[0]
    const long = specs('dress', { ...DEFAULT_PARAMS, length: 0.95 })[0]
    expect(long.bottomY).toBeLessThan(short.bottomY)
  })

  it('pants legs are offset left and right of centre', () => {
    const [l, r] = specs('pants')
    expect(Math.sign(l.centerX ?? 0)).toBe(-Math.sign(r.centerX ?? 0))
    expect(Math.abs(l.centerX ?? 0)).toBeCloseTo(MEASUREMENTS.hipHalfX, 6)
  })
})

describe('catalog additions — tapered bottoms + new silhouettes', () => {
  // Each garment built with its OWN defaults (which drive the taper/fit).
  const withDefaults = (t: GarmentType): GarmentParams => ({ ...DEFAULT_PARAMS, ...getGarment(t).defaults })
  const ankleR = (t: GarmentType): number => specs(t, withDefaults(t))[0].radiusBottom

  it('registers the new garments in their categories', () => {
    const ids = new Set(GARMENT_IDS)
    for (const id of ['polo', 'slim-pants', 'joggers', 'leggings', 'cardigan', 'bomber']) {
      expect(ids.has(id)).toBe(true)
    }
    expect(getGarment('slim-pants').category).toBe('bottom')
    expect(getGarment('polo').category).toBe('top')
    expect(getGarment('cardigan').category).toBe('outerwear')
    expect(getGarment('bomber').category).toBe('outerwear')
  })

  it('every defaultFabric refers to a real fabric (no typos)', () => {
    for (const g of GARMENTS) {
      if (g.defaultFabric) expect(FABRIC_LIBRARY.some((f) => f.id === g.defaultFabric)).toBe(true)
    }
  })

  it('slim trousers + leggings taper narrower at the ankle than wide-leg', () => {
    const wide = ankleR('wide-leg')
    expect(ankleR('slim-pants')).toBeLessThan(wide)
    expect(ankleR('leggings')).toBeLessThan(wide)
    expect(ankleR('leggings')).toBeLessThan(ankleR('slim-pants')) // leggings the tightest (zero ease)
  })

  it('joggers taper + expose a ribbed ankle cuff and drawstring waistband', () => {
    const j = getGarment('joggers')
    expect(j.supports.ribbing).toBe(true)
    expect(j.defaults.ribbing).toBe(true)
    expect(j.defaults.waistband).toBe(true)
    expect(ankleR('joggers')).toBeLessThan(ankleR('wide-leg'))
  })
})

describe('headTube (headwear / neckwear)', () => {
  const neckPiece: HeadTubePiece = { kind: 'headTube', anchor: 'neck', dropHi: 0.14, dropLo: 0.34, topScale: 1.6, botScale: 2.8 }
  const crownPiece: HeadTubePiece = { kind: 'headTube', anchor: 'crown', dropHi: 0.1, dropLo: 0.2, topScale: 0.5, botScale: 1.2 }

  it('a neck cowl tube sits around the neck — radii from the neck measurement, flaring onto the shoulders', () => {
    const m = MEASUREMENTS
    const spec = headTubeToSpec(neckPiece, DEFAULT_PARAMS, m)
    expect(spec.topY).toBeCloseTo(m.neckY, 5)
    expect(spec.bottomY).toBeLessThan(spec.topY)
    expect(spec.bottomY).toBeGreaterThan(m.chestY - 0.05) // stays up around the neck, not the belly
    expect(spec.radiusTop).toBeGreaterThan(m.neckR) // clears the neck
    expect(spec.radiusBottom).toBeGreaterThan(spec.radiusTop) // flares out
    expect(spec.rings).toBeGreaterThanOrEqual(10) // denser rings so a short piece still drapes
  })

  it('a crown tube caps the head (up above the neck, gathered small at the top)', () => {
    const m = MEASUREMENTS
    const spec = headTubeToSpec(crownPiece, DEFAULT_PARAMS, m)
    expect(spec.topY).toBeGreaterThan(m.neckY) // up at the crown
    expect(spec.radiusTop).toBeLessThan(spec.radiusBottom) // gathered crown → wider over the head
  })

  it('length drops the hem lower (drapes further down)', () => {
    const m = MEASUREMENTS
    const short = headTubeToSpec(neckPiece, { ...DEFAULT_PARAMS, length: 0.1 }, m)
    const long = headTubeToSpec(neckPiece, { ...DEFAULT_PARAMS, length: 1 }, m)
    expect(long.bottomY).toBeLessThanOrEqual(short.bottomY)
  })

  it('the snood garment builds one head piece (a Cowl) with a pinned top ring', () => {
    const mann = buildMannequin()
    const def = getGarment('snood')
    const p = { ...DEFAULT_PARAMS, ...def.defaults }
    expect(garmentTubeSpecs(def, p, mann.measurements)).toHaveLength(1)
    const pieces = buildGarment(def, p, mann.measurements, mann.colliders)
    expect(pieces.map((pc) => pc.name)).toEqual(['Cowl'])
    expect(pieces[0].build.pinnedTop.length).toBeGreaterThan(0)
  })
})
