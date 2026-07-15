import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { MEASUREMENTS, buildMannequin } from '../src/renderer/avatar/Mannequin'
import { DEFAULT_PARAMS, type GarmentType } from '../src/renderer/garment/templates'
import { getGarment, GARMENTS, GARMENT_IDS } from '../src/renderer/garments/registry'
import { garmentTubeSpecs, headTubeToSpec, buildGarment, scarfToSpec } from '../src/renderer/garments/factory'
import type { HeadTubePiece } from '../src/renderer/garments/schema'
import { pieceAnchor } from '../src/renderer/garment/GarmentController'
import { buildScarf, fillScarf, type ScarfSpec } from '../src/renderer/cloth/Garment'
import { XPBDSolver } from '../src/renderer/cloth/XPBDSolver'
import { FABRICS } from '../src/renderer/cloth/fabricPresets'
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

  it('every garment builds valid geometry with each of its supported detail toggles on', () => {
    // Guards the `supports` caps: a garment must never claim a construction option that
    // renders broken (throws / degenerate / NaN) when the user toggles it on.
    const mann = buildMannequin()
    const BOOL_DETAILS = ['collar', 'cuff', 'pleats', 'dart', 'pocket', 'hem', 'closure', 'lined', 'interfaced', 'facing', 'drawstring', 'ruffles', 'boning', 'ribbing', 'yoke', 'princess'] as const
    for (const t of GARMENT_IDS) {
      const def = getGarment(t)
      const supports = def.supports as Record<string, boolean | undefined>
      const base = { ...DEFAULT_PARAMS, ...def.defaults }
      for (const d of BOOL_DETAILS) {
        if (!supports[d]) continue
        const p = { ...base, [d]: true } as GarmentParams
        const pieces = buildGarment(def, p, mann.measurements, mann.colliders)
        expect(pieces.length, `${t} + ${d} built no pieces`).toBeGreaterThan(0)
        for (const pc of pieces) {
          const pos = pc.build.positions
          let ok = pos.length > 0
          for (let k = 0; k < pos.length; k++) if (!Number.isFinite(pos[k])) ok = false
          expect(ok, `${t} + ${d} produced a non-finite / empty build`).toBe(true)
        }
      }
    }
  }, 20000)

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

describe('activewear — sports bra · high-waist leggings · swimsuit', () => {
  const withDefaults = (t: GarmentType): GarmentParams => ({ ...DEFAULT_PARAMS, ...getGarment(t).defaults })

  it('registers the three garments in their categories with a stretch default fabric', () => {
    expect(getGarment('sports-bra').category).toBe('top')
    expect(getGarment('high-waist-leggings').category).toBe('bottom')
    expect(getGarment('swimsuit').category).toBe('onepiece')
    for (const id of ['sports-bra', 'high-waist-leggings', 'swimsuit'] as GarmentType[]) {
      expect(getGarment(id).defaultFabric).toBe('spandex')
    }
  })

  it('sports bra: a short band ending near the underbust (chest90), snugger than a tank', () => {
    const bra = specs('sports-bra', withDefaults('sports-bra'))[0]
    const tank = specs('tank', withDefaults('tank'))[0]
    expect(bra.bottomY).toBeGreaterThan(tank.bottomY) // cropped well above a tank's hem
    const braEase = getGarment('sports-bra').defaults.ease ?? 0
    expect(bra.radiusBottom).toBeCloseTo(MEASUREMENTS.chestR * 0.9 + braEase, 5) // underbust band (compression ease), not a hip flare
    expect(bra.radiusBottom).toBeLessThan(tank.radiusBottom)
  })

  it('high-waist leggings: a waist-anchored rise panel over two snug legs (3 tubes)', () => {
    const tubes = specs('high-waist-leggings', withDefaults('high-waist-leggings'))
    expect(tubes.length).toBe(3) // rise panel + 2 legs
    const rise = tubes[0]
    expect(rise.topY).toBeCloseTo(MEASUREMENTS.waistY, 5) // sits at the natural waist
    expect(rise.bottomY).toBeLessThan(MEASUREMENTS.hipY) // overlaps past the hip — no gap to the legs
    const legs = tubes.slice(1)
    expect(legs[0].centerX).toBeLessThan(0)
    expect(legs[1].centerX).toBeGreaterThan(0)
    // second-skin: at least as tight at the ankle as classic (zero-ease) leggings
    expect(legs[0].radiusBottom).toBeLessThanOrEqual(specs('leggings', withDefaults('leggings'))[0].radiusBottom)
  })

  it('swimsuit: one snug cinched tube from the shoulders past the hip — no trailing length', () => {
    const suit = specs('swimsuit', withDefaults('swimsuit'))[0]
    expect(suit.radiusWaist).toBeDefined() // hourglass cinch
    expect(suit.bottomY).toBeLessThan(MEASUREMENTS.hipY)
    expect(suit.bottomY).toBeGreaterThan(MEASUREMENTS.hipY - 0.25) // …but stops near the seat, not a dress
    expect(getGarment('swimsuit').supports.length).toBeUndefined() // fixed hem — no length slider
    // fixed drop: length has no effect
    const long = specs('swimsuit', { ...withDefaults('swimsuit'), length: 1 })[0]
    expect(long.bottomY).toBeCloseTo(suit.bottomY, 10)
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

  it('the beanie garment builds one crown piece (a Head) that routes to the head anchor', () => {
    const mann = buildMannequin()
    const def = getGarment('beanie')
    const pieces = buildGarment(def, { ...DEFAULT_PARAMS, ...def.defaults }, mann.measurements, mann.colliders)
    expect(pieces.map((pc) => pc.name)).toEqual(['Head'])
    expect(pieceAnchor('Head', 0, 1.7, mann.measurements.chestY, mann.measurements.hipY)).toBe('head')
  })

  it('the beanie caps the crown — a well-gathered top so the head dome is covered (not an open cone)', () => {
    const mann = buildMannequin()
    const def = getGarment('beanie')
    const spec = garmentTubeSpecs(def, { ...DEFAULT_PARAMS, ...def.defaults }, mann.measurements)[0]
    // Gathered small at the crown + widening over the head. A ratio near ~0.1 caps the dome;
    // the old open cone (topScale 0.38 → ratio ~0.29) left the crown bare, so guard below it.
    expect(spec.radiusTop).toBeLessThan(spec.radiusBottom * 0.22)
    expect(spec.topY).toBeGreaterThan(mann.measurements.neckY + mann.measurements.headR) // up at the crown, not the neck
  })
})

describe('scarf (flat draped panel)', () => {
  const mann = buildMannequin()
  const spec = (length = 0.6): ScarfSpec =>
    scarfToSpec({ kind: 'scarfPanel', width: 0.16, wrapEase: 0.035, tailHi: 0.3, tailLo: 0.6 }, { ...DEFAULT_PARAMS, length }, mann.measurements)
  const colY = (pos: Float32Array, s: ScarfSpec, ix: number): number => {
    let y = 0
    for (let iy = 0; iy < s.ny; iy++) y += pos[(iy * s.nx + ix) * 3 + 1]
    return y / s.ny
  }
  const colZ = (pos: Float32Array, s: ScarfSpec, ix: number): number => {
    let z = 0
    for (let iy = 0; iy < s.ny; iy++) z += pos[(iy * s.nx + ix) * 3 + 2]
    return z / s.ny
  }

  it('fills a finite, spread, non-degenerate panel', () => {
    const s = spec()
    const pos = new Float32Array(s.nx * s.ny * 3)
    fillScarf(pos, s)
    for (let i = 0; i < pos.length; i++) expect(Number.isFinite(pos[i])).toBe(true)
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (let k = 0; k < s.nx * s.ny; k++) {
      minX = Math.min(minX, pos[k * 3])
      maxX = Math.max(maxX, pos[k * 3])
      minY = Math.min(minY, pos[k * 3 + 1])
      maxY = Math.max(maxY, pos[k * 3 + 1])
    }
    expect(maxX - minX).toBeGreaterThan(0.1) // wraps around the neck horizontally
    expect(maxY - minY).toBeGreaterThan(0.2) // collar down to the tail tips
  })

  it('the two length-ends are front tails hanging below the neck; the middle is the collar', () => {
    const s = spec()
    const pos = new Float32Array(s.nx * s.ny * 3)
    fillScarf(pos, s)
    expect(colY(pos, s, 0)).toBeLessThan(s.neckY - 0.15) // left tail hangs
    expect(colY(pos, s, s.nx - 1)).toBeLessThan(s.neckY - 0.15) // right tail hangs
    expect(colZ(pos, s, 0)).toBeGreaterThan(0.1) // in front of the body
    expect(colZ(pos, s, s.nx - 1)).toBeGreaterThan(0.1)
    expect(Math.abs(colY(pos, s, Math.floor(s.nx / 2)) - s.neckY)).toBeLessThan(0.05) // collar at the neck
  })

  it('longer length hangs the tails lower', () => {
    const short = spec(0.1)
    const long = spec(1)
    const ps = new Float32Array(short.nx * short.ny * 3)
    const pl = new Float32Array(long.nx * long.ny * 3)
    fillScarf(ps, short)
    fillScarf(pl, long)
    expect(colY(pl, long, 0)).toBeLessThan(colY(ps, short, 0))
  })

  it('buildScarf pins the collar (an open panel — the tail ends stay free)', () => {
    const b = buildScarf(spec())
    expect(b.pinnedTop.length).toBeGreaterThan(0)
    expect(b.pinnedTop.length).toBeLessThan(b.nx * b.ny) // not everything pinned — the tails drape
  })

  it('drapes bounded on the body (no explosion)', () => {
    const s = spec()
    const b = buildScarf(s)
    const solver = new XPBDSolver(b.nx, b.ny, b.positions, FABRICS.cotton, { pinned: b.pinnedTop, wrapX: false })
    solver.colliders = mann.colliders
    solver.bodyCollider = mann.bodyCollider
    for (let i = 0; i < 160; i++) solver.step(1 / 60)
    let mx = 0
    for (let i = 0; i < b.positions.length; i++) mx = Math.max(mx, Math.abs(b.positions[i]))
    expect(Number.isFinite(mx)).toBe(true)
    expect(mx).toBeLessThan(3)
  }, 20000)

  it('scarfDouble sets the double wrap; the knot wins when both are worn', () => {
    const pc = { kind: 'scarfPanel', width: 0.16, wrapEase: 0.035, tailHi: 0.3, tailLo: 0.6 } as const
    expect(scarfToSpec(pc, { ...DEFAULT_PARAMS, scarfDouble: true }, mann.measurements).double).toBe(true)
    const both = scarfToSpec(pc, { ...DEFAULT_PARAMS, scarfDouble: true, scarfKnot: true }, mann.measurements)
    expect(both.double).toBeFalsy() // the knot takes over
    expect(both.knot).toBe(true)
  })

  it('scarfBlanket makes an oversized draped panel; it wins over the knot/double wrap', () => {
    const pc = { kind: 'scarfPanel', width: 0.16, wrapEase: 0.035, tailHi: 0.3, tailLo: 0.6 } as const
    const plain = scarfToSpec(pc, DEFAULT_PARAMS, mann.measurements)
    const blanket = scarfToSpec(pc, { ...DEFAULT_PARAMS, scarfBlanket: true }, mann.measurements)
    expect(blanket.blanket).toBe(true)
    expect(blanket.width).toBeGreaterThan(plain.width * 3) // an oversized hanging panel, not a band
    // blanket takes over even if the knot/double are also set
    expect(scarfToSpec(pc, { ...DEFAULT_PARAMS, scarfBlanket: true, scarfKnot: true, scarfDouble: true }, mann.measurements).blanket).toBe(true)
  })
})

describe('pieceAnchor (pin routing)', () => {
  const torsoY = 1.34
  const hipY = 0.95
  it('crown headwear pins to the head, a neck cowl to the torso (rests on the shoulders)', () => {
    expect(pieceAnchor('Head', 0, 1.72, torsoY, hipY)).toBe('head')
    expect(pieceAnchor('Cowl', 0, 1.5, torsoY, hipY)).toBe('torso') // not head — sits on the body
  })
  it('sleeves pin to the near arm (−x = left)', () => {
    expect(pieceAnchor('Left sleeve', -0.2, 1.4, torsoY, hipY)).toBe('armL')
    expect(pieceAnchor('Right sleeve', 0.2, 1.4, torsoY, hipY)).toBe('armR')
  })
  it('a bodice pins to torso, a skirt to hip (by which is nearer)', () => {
    expect(pieceAnchor('Body', 0, 1.4, torsoY, hipY)).toBe('torso')
    expect(pieceAnchor('Body', 0, 1.0, torsoY, hipY)).toBe('hip')
  })
})
