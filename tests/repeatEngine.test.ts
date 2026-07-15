import { describe, it, expect } from 'vitest'
import { repeatCell, repeatSuperTiles, REPEAT_MODES } from '../src/renderer/fabric/textile'
import {
  captureColorway,
  applyColorway,
  defaultLayer,
  serializeDoc,
  parseDoc,
  docFromConfig
} from '../src/renderer/studio/document'
import { defaultConfig } from '../src/renderer/start/design'

describe('repeat-pattern engine — layout maths', () => {
  it('full-drop is a straight grid (no offset, no flip, 1×1 super-tile)', () => {
    expect(repeatSuperTiles('full-drop')).toBe(1)
    for (const [cx, cy] of [[0, 0], [1, 0], [0, 1], [3, 5]]) {
      expect(repeatCell('full-drop', cx, cy)).toEqual({ ox: 0, oy: 0, flipX: false, flipY: false })
    }
  })

  it('half-drop steps alternate columns down half a tile', () => {
    expect(repeatCell('half-drop', 0, 0).oy).toBe(0) // even column stays
    expect(repeatCell('half-drop', 1, 0).oy).toBe(0.5) // odd column drops half
    expect(repeatCell('half-drop', 2, 0).oy).toBe(0) // back to even
    expect(repeatCell('half-drop', 1, 0).ox).toBe(0) // no horizontal shift
    expect(repeatSuperTiles('half-drop')).toBe(2)
  })

  it('half-brick steps alternate rows across half a tile', () => {
    expect(repeatCell('half-brick', 0, 1).ox).toBe(0.5) // odd row shifts across
    expect(repeatCell('half-brick', 0, 0).ox).toBe(0)
    expect(repeatCell('half-brick', 0, 1).oy).toBe(0) // no vertical shift
  })

  it('mirror flips alternate cells (a book-match)', () => {
    expect(repeatCell('mirror', 0, 0)).toEqual({ ox: 0, oy: 0, flipX: false, flipY: false })
    expect(repeatCell('mirror', 1, 0).flipX).toBe(true)
    expect(repeatCell('mirror', 0, 1).flipY).toBe(true)
    expect(repeatCell('mirror', 1, 1)).toMatchObject({ flipX: true, flipY: true })
  })

  it('negative cell indices wrap parity correctly (seamless across the tile origin)', () => {
    expect(repeatCell('half-drop', -1, 0).oy).toBe(0.5) // -1 is odd
    expect(repeatCell('half-drop', -2, 0).oy).toBe(0) // -2 is even
    expect(repeatCell('mirror', -1, 0).flipX).toBe(true)
  })
})

describe('repeat-pattern engine — persistence', () => {
  it('a colorway + a .dio round-trip carry the repeat mode', () => {
    const l = defaultLayer('dress')
    l.textile = 'polka'
    l.textileRepeat = 'half-drop'
    const cw = captureColorway(l, 'Staggered')
    expect(cw.textileRepeat).toBe('half-drop')
    const l2 = defaultLayer('dress')
    applyColorway(l2, cw)
    expect(l2.textileRepeat).toBe('half-drop')

    const doc = docFromConfig(defaultConfig())
    doc.layers[0].textileRepeat = 'mirror'
    expect(parseDoc(serializeDoc(doc)).layers[0].textileRepeat).toBe('mirror')
  })

  it('exposes the four repeat modes', () => {
    expect(REPEAT_MODES).toEqual(['full-drop', 'half-drop', 'half-brick', 'mirror'])
  })
})
