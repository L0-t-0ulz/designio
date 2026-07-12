import { describe, it, expect } from 'vitest'
import { MEASUREMENTS } from '../src/renderer/avatar/Mannequin'
import { DEFAULT_PARAMS, type GarmentParams, type GarmentType } from '../src/renderer/garment/templates'
import { getGarment } from '../src/renderer/garments/registry'
import { garmentTubeSpecs } from '../src/renderer/garments/factory'
import { weaveHeight } from '../src/renderer/fabric/weaveTexture'
import { getFabric } from '../src/renderer/fabric/FabricLibrary'

const spec = (t: GarmentType) => garmentTubeSpecs(getGarment(t), { ...DEFAULT_PARAMS, ...getGarment(t).defaults } as GarmentParams, MEASUREMENTS)[0]

describe('beanie build-out + knit structures', () => {
  it('registers the four variants with distinct silhouettes', () => {
    const classic = spec('beanie')
    const cuffed = spec('cuffed-beanie')
    const slouchy = spec('slouchy-beanie')
    const fisherman = spec('fisherman-beanie')
    expect(cuffed.radiusBottom).toBeGreaterThan(classic.radiusBottom) // the doubled cuff band flares wider
    expect(slouchy.topY - slouchy.bottomY).toBeGreaterThan(classic.topY - classic.bottomY) // extra crown to slouch
    expect(fisherman.topY - fisherman.bottomY).toBeLessThan(classic.topY - classic.bottomY) // docker crop
    expect(getGarment('pom-beanie').pom).toBe(true)
    expect(getGarment('beanie').pom).toBeUndefined()
  })

  it('knit structures: rib has vertical wales, waffle a cell grid, cable braided columns', () => {
    // rib: adjacent columns alternate tall/recessed at the same v
    const ribA = weaveHeight('rib', 0.5 / 16, 0.3, 16)
    const ribB = weaveHeight('rib', 1.5 / 16, 0.3, 16)
    expect(Math.abs(ribA - ribB)).toBeGreaterThan(0.2)
    // rib is v-invariant along a wale (vertical structure)
    expect(weaveHeight('rib', 0.5 / 16, 0.1, 16)).toBeCloseTo(weaveHeight('rib', 0.5 / 16, 0.7 + 0.4 / 16, 16), 1)
    // waffle: cell centres sit deep below the walls
    const wall = weaveHeight('waffle', 0.02 / 16, 0.5 / 16, 16)
    const cell = weaveHeight('waffle', 0.5 / 16, 0.5 / 16, 16)
    expect(wall).toBeGreaterThan(cell + 0.3)
    // cable: the cable pair sits proud of the purl gutter
    const cable = weaveHeight('cable', 0.5 / 16, 0.3, 16)
    const gutter = weaveHeight('cable', 2.5 / 16, 0.3, 16)
    expect(cable).toBeGreaterThan(gutter)
    // all bounded [0, 1]
    for (const w of ['rib', 'waffle', 'cable'] as const) {
      for (let i = 0; i < 40; i++) {
        const h = weaveHeight(w, (i * 0.37) % 1, (i * 0.23) % 1, 16)
        expect(h).toBeGreaterThanOrEqual(0)
        expect(h).toBeLessThanOrEqual(1)
      }
    }
  })

  it('the knit fabrics wear their structures (rib-knit rib, cable-knit cable, waffle-knit waffle)', () => {
    expect(getFabric('rib-knit').weave).toBe('rib')
    expect(getFabric('cable-knit').weave).toBe('cable')
    expect(getFabric('waffle-knit').weave).toBe('waffle')
    expect(getGarment('pom-beanie').defaultFabric).toBe('cable-knit')
  })
})
