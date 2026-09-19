import { describe, it, expect } from 'vitest'
import { trimCard, trimTotals, type TrimCardInput } from '../src/renderer/export/trimCard'

const base = (over: Partial<TrimCardInput> = {}): TrimCardInput => ({
  seamCm: 400,
  threadM: 11,
  bodyColor: 0x224466,
  ...over
})

const items = (inp: TrimCardInput): string[] => trimCard(inp).map((l) => l.item)

describe('trim card', () => {
  it('always lists thread and the labels a garment legally needs', () => {
    const got = items(base())
    expect(got).toContain('Sewing thread (tex 40)')
    expect(got).toContain('Woven care/composition label')
    expect(got).toContain('Brand label')
  })

  it('sources no closure when the garment has none', () => {
    // the failure this guards: a garment with its closure switched off still
    // ordering buttons, which a hand-kept card does constantly
    expect(items(base()).some((i) => /button|zip/i.test(i))).toBe(false)
  })

  it('lists buttons for a button closure, counted from the placket', () => {
    const card = trimCard(base({ closure: 'button', placketHeightM: 0.42 }))
    const button = card.find((l) => l.item.startsWith('Shell button'))!
    expect(button.qty).toBe(5) // 0.42 / 0.085 ≈ 5
    expect(button.unit).toBe('pcs')
    expect(button.placement).toMatch(/placket/i)
  })

  it('honours an explicit button count and diameter', () => {
    const card = trimCard(base({ closure: 'button', closureDesign: { buttons: 7, buttonMm: 20 } }))
    const button = card.find((l) => l.item.startsWith('Shell button'))!
    expect(button.qty).toBe(7)
    expect(button.item).toBe('Shell button, 20 mm')
  })

  it('lists a zip and its pull for a zip closure, and no buttons', () => {
    const got = items(base({ closure: 'zip' }))
    expect(got).toContain('Separating zip')
    expect(got).toContain('Zip pull')
    expect(got.some((i) => i.startsWith('Shell button'))).toBe(false)
  })

  it('uses the designed closure colours, falling back to the body colour', () => {
    const designed = trimCard(base({ closure: 'zip', closureDesign: { zipColor: 0xff0000, pullColor: 0x00ff00 } }))
    expect(designed.find((l) => l.item === 'Separating zip')!.color).toBe(0xff0000)
    expect(designed.find((l) => l.item === 'Zip pull')!.color).toBe(0x00ff00)
    const plain = trimCard(base({ closure: 'zip', bodyColor: 0x123456 }))
    expect(plain.find((l) => l.item === 'Separating zip')!.color).toBe(0x123456)
  })

  it('adds a line per construction flag, and only for the flags that are on', () => {
    for (const [flag, expected] of [
      ['drawstring', 'Drawstring cord, 5 mm'],
      ['waistband', 'Waistband elastic, 35 mm'],
      ['ribbing', 'Rib knit trim'],
      ['fringe', 'Fringe trim'],
      ['lined', 'Lining fabric']
    ] as const) {
      expect(items(base({ [flag]: true }))).toContain(expected)
      expect(items(base())).not.toContain(expected)
    }
  })

  it('scales piping with the seam length rather than guessing a constant', () => {
    const short = trimCard(base({ piping: true, seamCm: 200 })).find((l) => l.item.startsWith('Corded piping'))!
    const long = trimCard(base({ piping: true, seamCm: 800 })).find((l) => l.item.startsWith('Corded piping'))!
    expect(long.qty).toBeGreaterThan(short.qty)
  })

  it('prefers the contrast trim colour for trim-coloured items', () => {
    const card = trimCard(base({ ribbing: true, trimColor: 0xabcdef }))
    expect(card.find((l) => l.item === 'Rib knit trim')!.color).toBe(0xabcdef)
  })

  it('carries hardware through, skipping zero counts', () => {
    const card = trimCard(base({ hardware: [{ label: '6 × rivet (hip pockets)', count: 6 }, { label: '0 × snap', count: 0 }] }))
    expect(items(base({ hardware: [{ label: '6 × rivet (hip pockets)', count: 6 }] }))).toContain('6 × rivet (hip pockets)')
    expect(card.some((l) => l.item === '0 × snap')).toBe(false)
  })

  it('puts closures first — they have the longest lead time', () => {
    const card = trimCard(base({ closure: 'button', drawstring: true }))
    expect(card[0].kind).toBe('closure')
  })

  it('reports the thread it was given, so the card and the cost sheet agree', () => {
    expect(trimCard(base({ threadM: 17.25 })).find((l) => l.kind === 'thread')!.qty).toBe(17.3)
  })

  it('never emits a negative or missing quantity', () => {
    const card = trimCard(base({ seamCm: -50, threadM: -3, piping: true, closure: 'button', drawstring: true, waistband: true, ribbing: true, fringe: true, lined: true }))
    for (const l of card) {
      expect(l.qty).toBeGreaterThanOrEqual(0)
      expect(Number.isFinite(l.qty)).toBe(true)
      expect(l.item.length).toBeGreaterThan(0)
      expect(l.placement.length).toBeGreaterThan(0)
    }
  })
})

describe('trim totals', () => {
  it('sums pieces and metres separately — they are not addable', () => {
    const t = trimTotals(trimCard(base({ closure: 'button', closureDesign: { buttons: 5 } })))
    expect(t.pcs).toBe(7) // 5 buttons + 2 labels
    expect(t.metres).toBe(11) // thread
  })

  it('is zero for an empty card', () => {
    expect(trimTotals([])).toEqual({ pcs: 0, metres: 0 })
  })
})
