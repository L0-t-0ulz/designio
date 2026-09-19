import { describe, it, expect } from 'vitest'
import { parseLayout, serializeLayout, DEFAULT_LAYOUT, PANEL_DENSITIES, type ShellLayout } from '../src/renderer/shell/layoutStore'

describe('studio shell layout persistence', () => {
  it('round-trips a valid 3-column layout', () => {
    const l: ShellLayout = { sizes: [20, 55, 25], leftVisible: false, rightVisible: true, density: 'compact' }
    expect(parseLayout(serializeLayout(l))).toEqual(l)
  })

  it('falls back to defaults for null / invalid input', () => {
    expect(parseLayout(null)).toEqual(DEFAULT_LAYOUT)
    expect(parseLayout('not json')).toEqual(DEFAULT_LAYOUT)
    // wrong-length / out-of-range sizes are rejected → default sizes
    expect(parseLayout('{"sizes":[60,40]}').sizes).toEqual(DEFAULT_LAYOUT.sizes)
    expect(parseLayout('{"sizes":[999,1,1]}').sizes).toEqual(DEFAULT_LAYOUT.sizes)
  })

  it('defaults visibility to true when omitted', () => {
    const l = parseLayout('{"sizes":[18,56,26]}')
    expect(l.leftVisible).toBe(true)
    expect(l.rightVisible).toBe(true)
    expect(l.sizes).toEqual([18, 56, 26])
  })

  it('defaults a layout saved before density existed to comfortable', () => {
    // the stored key is shared with older builds — an upgrade must not land the user
    // in a density they never chose
    expect(parseLayout('{"sizes":[18,56,26],"leftVisible":true,"rightVisible":true}').density).toBe('comfortable')
    expect(DEFAULT_LAYOUT.density).toBe('comfortable')
  })

  it('keeps a stored density', () => {
    for (const d of PANEL_DENSITIES) {
      expect(parseLayout(`{"density":"${d}"}`).density).toBe(d)
    }
  })

  it('rejects a junk density rather than passing it through to a CSS class', () => {
    for (const junk of ['"cosy"', '7', 'null', 'true', '{}']) {
      expect(parseLayout(`{"density":${junk}}`).density).toBe('comfortable')
    }
  })

  it('round-trips density through serialize/parse', () => {
    for (const d of PANEL_DENSITIES) {
      const l: ShellLayout = { ...DEFAULT_LAYOUT, density: d }
      expect(parseLayout(serializeLayout(l)).density).toBe(d)
    }
  })

  it('does not share the default layout object between calls', () => {
    const a = parseLayout(null)
    a.density = 'compact'
    expect(parseLayout(null).density).toBe('comfortable')
    expect(DEFAULT_LAYOUT.density).toBe('comfortable')
  })
})
