import { deflateSync, inflateSync, strToU8, strFromU8 } from 'fflate'
import type { ProjectDoc } from './document'
import { serializeDoc, parseDoc } from './document'

/**
 * **Share by link** — encode a whole design into a compact, URL-safe token so it can
 * be shared with a plain link (the design travels *in* the link — no server needed).
 * The doc JSON is DEFLATE-compressed then base64url-encoded; decoding reverses it.
 * Pure (compression + base64, no network/DOM) so the round-trip is unit-tested; the
 * studio copies `#share=<token>` to the clipboard and decodes it on load.
 *
 * (A real cloud *sync* backend — accounts, live storage — is a separate service; this
 * is the offline share-by-link half, which needs no infrastructure.)
 */
function bytesToB64url(u8: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)
  const bin = atob(b64)
  const u8 = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i)
  return u8
}

/** Encode a project doc → a URL-safe share token (DEFLATE + base64url). Pure. */
export function encodeShare(doc: ProjectDoc): string {
  return bytesToB64url(deflateSync(strToU8(serializeDoc(doc)), { level: 9 }))
}

/** Decode a share token back into a project doc (throws on a corrupt token). Pure. */
export function decodeShare(token: string): ProjectDoc {
  return parseDoc(strFromU8(inflateSync(b64urlToBytes(token))))
}

/** A full share URL (`<base>#share=<token>`) for a doc. Pure. */
export function shareUrl(doc: ProjectDoc, base: string): string {
  return `${base.replace(/#.*$/, '')}#share=${encodeShare(doc)}`
}

/** Pull the share token out of a URL/hash string, or null if none. Pure. */
export function shareTokenFrom(urlOrHash: string): string | null {
  const m = urlOrHash.match(/[#?&]share=([A-Za-z0-9\-_]+)/)
  return m ? m[1] : null
}
