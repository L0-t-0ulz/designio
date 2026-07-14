import { describe, it, expect } from 'vitest'
import { strawRecipe } from '../src/renderer/avatar/straw'
import { drawdown, validateDraft } from '../src/renderer/fabric/weaveDraft'

describe('the straw weave material — the sun-hat plait recipe', () => {
  it('plaits with a valid 2/2 basket draft — paired ends and picks', () => {
    const r = strawRecipe()
    expect(validateDraft(r.draft)).toBeNull()
    const dd = drawdown(r.draft)
    // the basket signature: 2×2 blocks — neighbours pair up along both axes
    expect(dd.up[0][0]).toBe(dd.up[0][1])
    expect(dd.up[0][0]).toBe(dd.up[1][0])
    expect(dd.up[0][0]).not.toBe(dd.up[0][2]) // and flip at the next pair
    expect(dd.up[0][0]).not.toBe(dd.up[2][0])
  })

  it('reads dry: matte base, a mild straw sheen, coarse repeats', () => {
    const r = strawRecipe()
    expect(r.roughness).toBeGreaterThanOrEqual(0.7)
    expect(r.sheen).toBeGreaterThan(0)
    expect(r.sheen).toBeLessThan(0.6) // dry shine, not satin
    expect(r.sheenRoughness).toBeGreaterThan(0.4)
    expect(r.repeats).toBeGreaterThanOrEqual(10) // coarse enough to read as plait
    expect(r.repeats).toBeLessThanOrEqual(40)
    expect(r.normalStrength).toBeGreaterThan(2) // chunky straw relief
  })
})
