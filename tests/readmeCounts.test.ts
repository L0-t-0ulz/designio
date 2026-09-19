import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { GARMENTS } from '../src/renderer/garments/registry'
import { FABRIC_LIBRARY } from '../src/renderer/fabric/FabricLibrary'

/**
 * The README and the homepage both quote catalogue sizes. Those numbers were written
 * down by hand and had drifted well behind the registries (the homepage still claimed
 * 16 garments and 24 fabrics). The homepage now counts them; the README can't, so
 * this test is what stops it going stale again.
 */
const readme = readFileSync(join(__dirname, '..', 'README.md'), 'utf8')

describe('README catalogue counts', () => {
  it('quotes the real number of garments everywhere it mentions one', () => {
    const claims = [...readme.matchAll(/(\d+)[ -]garments?\b/g)].map((m) => Number(m[1]))
    expect(claims.length).toBeGreaterThan(0)
    for (const n of claims) expect(n).toBe(GARMENTS.length)
  })

  it('quotes the real number of fabrics everywhere it mentions one', () => {
    const claims = [...readme.matchAll(/(\d+) fabrics\b/g)].map((m) => Number(m[1]))
    expect(claims.length).toBeGreaterThan(0)
    for (const n of claims) expect(n).toBe(FABRIC_LIBRARY.length)
  })

  it('keeps the table-of-contents anchors pointing at headings that exist', () => {
    // the counts are baked into the anchors, so updating one and not the other
    // silently breaks the link
    for (const [, anchor] of readme.matchAll(/\]\(#([a-z0-9-]+)\)/g)) {
      const heading = [...readme.matchAll(/^#{2,4} (.+)$/gm)]
        .map(([, text]) =>
          text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .trim()
            // each space becomes its own hyphen — GitHub does not collapse runs,
            // which is why a heading with an em dash anchors as "a--b"
            .replace(/ /g, '-')
        )
        .includes(anchor)
      expect(heading, `no heading for #${anchor}`).toBe(true)
    }
  })
})
