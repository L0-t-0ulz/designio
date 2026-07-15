import { describe, it, expect } from 'vitest'
import { encodeShare, decodeShare, shareUrl, shareTokenFrom } from '../src/renderer/studio/shareLink'
import { docFromConfig, serializeDoc } from '../src/renderer/studio/document'
import { defaultConfig } from '../src/renderer/start/design'

describe('share by link', () => {
  it('round-trips a doc through encode → decode', () => {
    const doc = docFromConfig(defaultConfig())
    doc.layers[0].fabricId = 'satin'
    doc.layers[0].color = 0x123456
    doc.body.hips = 1.2
    const token = encodeShare(doc)
    const back = decodeShare(token)
    // parseDoc normalises, so compare the meaningful fields
    expect(back.layers[0].fabricId).toBe('satin')
    expect(back.layers[0].color).toBe(0x123456)
    expect(back.body.hips).toBe(1.2)
    // full serialisation matches (both go through the same parse/serialise)
    expect(serializeDoc(back)).toBe(serializeDoc(doc))
  })

  it('produces a URL-safe token (no +, /, or = padding)', () => {
    const token = encodeShare(docFromConfig(defaultConfig()))
    expect(token).toMatch(/^[A-Za-z0-9\-_]+$/)
    expect(token).not.toContain('+')
    expect(token).not.toContain('=')
  })

  it('compresses — the token is smaller than the raw JSON', () => {
    const doc = docFromConfig(defaultConfig())
    expect(encodeShare(doc).length).toBeLessThan(serializeDoc(doc).length)
  })

  it('shareUrl builds <base>#share=<token> and replaces any old hash', () => {
    const doc = docFromConfig(defaultConfig())
    const url = shareUrl(doc, 'https://app.example/studio#old=1')
    expect(url.startsWith('https://app.example/studio#share=')).toBe(true)
    expect(url).not.toContain('#old=1')
  })

  it('shareTokenFrom extracts the token from a hash or query', () => {
    expect(shareTokenFrom('https://x/y#share=AbC-_123')).toBe('AbC-_123')
    expect(shareTokenFrom('?share=Zzz9&x=1')).toBe('Zzz9')
    expect(shareTokenFrom('https://x/y')).toBeNull()
  })

  it('decodeShare of shareTokenFrom(shareUrl(...)) recovers the doc', () => {
    const doc = docFromConfig(defaultConfig())
    doc.layers[0].size = 'L'
    const token = shareTokenFrom(shareUrl(doc, 'https://app/studio'))!
    expect(decodeShare(token).layers[0].size).toBe('L')
  })
})
