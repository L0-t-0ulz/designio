import { describe, it, expect, beforeEach } from 'vitest'
import { registerPlugin, loadedPlugins, clearPlugins, runPlugins, type PluginContext, type DesignioPlugin } from '../src/renderer/plugins'
import type { Fabric } from '../src/renderer/fabric/FabricLibrary'

const fab = (id: string): Fabric => ({
  id, name: id, family: 'woven', gsm: 150, stretch: 0.1, bendiness: 0.4, friction: 0.5,
  color: 0x808080, roughness: 0.8, sheen: 0.5, sheenRoughness: 0.5, weave: 'plain', weaveScale: 200, normalStrength: 0.5, anisotropy: 0, transmission: 0
})

const collectCtx = () => {
  const fabrics: Fabric[] = []
  const colors: unknown[] = []
  const textiles: [string, string][] = []
  const ctx: PluginContext = {
    addFabric: (f) => fabrics.push(f),
    addNamedColor: (c) => colors.push(c),
    addTextileAlias: (a, b) => textiles.push([a, b])
  }
  return { ctx, fabrics, colors, textiles }
}

describe('plugin API', () => {
  beforeEach(() => clearPlugins())

  it('registers a plugin and dedupes by id', () => {
    const p: DesignioPlugin = { id: 'p1', name: 'One', setup: () => {} }
    expect(registerPlugin(p)).toBe(true)
    expect(registerPlugin({ ...p })).toBe(false) // duplicate id
    expect(loadedPlugins().map((x) => x.id)).toEqual(['p1'])
  })

  it('rejects malformed plugins', () => {
    expect(registerPlugin({ id: '', name: 'x', setup: () => {} })).toBe(false)
    // @ts-expect-error missing setup
    expect(registerPlugin({ id: 'y', name: 'y' })).toBe(false)
  })

  it('runPlugins applies each setup + tallies what it added', () => {
    registerPlugin({ id: 'fabs', name: 'Fabrics', setup: (ctx) => { ctx.addFabric(fab('a')); ctx.addFabric(fab('b')); ctx.addNamedColor({ code: 'X-1', name: 'X', hex: 0x112233 }) } })
    const { ctx, fabrics, colors } = collectCtx()
    const res = runPlugins(ctx)
    expect(fabrics.map((f) => f.id)).toEqual(['a', 'b'])
    expect(colors).toHaveLength(1)
    expect(res[0]).toMatchObject({ id: 'fabs', ok: true, added: { fabrics: 2, colors: 1, textiles: 0 } })
  })

  it('a throwing plugin is caught, not fatal, and reported', () => {
    registerPlugin({ id: 'ok', name: 'OK', setup: (ctx) => ctx.addFabric(fab('z')) })
    registerPlugin({ id: 'bad', name: 'Bad', setup: () => { throw new Error('boom') } })
    const { ctx, fabrics } = collectCtx()
    const res = runPlugins(ctx)
    expect(fabrics.map((f) => f.id)).toEqual(['z']) // the good one still applied
    expect(res.find((r) => r.id === 'bad')).toMatchObject({ ok: false, error: 'boom' })
    expect(res.find((r) => r.id === 'ok')?.ok).toBe(true)
  })
})
