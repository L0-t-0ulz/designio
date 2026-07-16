import { describe, it, expect } from 'vitest'
import { parseVersion, compareVersions, isUpdateAvailable, releaseChannel, shouldOfferUpdate } from '../src/main/update'

describe('auto-update version logic', () => {
  it('parses semver with an optional v prefix + prerelease', () => {
    expect(parseVersion('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3, prerelease: [] })
    expect(parseVersion('v0.1.0-beta.2')).toEqual({ major: 0, minor: 1, patch: 0, prerelease: ['beta', '2'] })
    expect(parseVersion('nope')).toBeNull()
    expect(parseVersion('1.2')).toBeNull()
  })

  it('orders versions by semver precedence', () => {
    expect(compareVersions('1.0.0', '1.0.1')).toBe(-1)
    expect(compareVersions('1.2.0', '1.1.9')).toBe(1)
    expect(compareVersions('2.0.0', '2.0.0')).toBe(0)
    // a prerelease has LOWER precedence than the release
    expect(compareVersions('1.0.0-beta.1', '1.0.0')).toBe(-1)
    // numeric prerelease identifiers order numerically, and fewer < more
    expect(compareVersions('1.0.0-beta.2', '1.0.0-beta.10')).toBe(-1)
    expect(compareVersions('1.0.0-alpha', '1.0.0-alpha.1')).toBe(-1)
  })

  it('malformed versions sort lowest so a bad feed never triggers an update', () => {
    expect(isUpdateAvailable('1.0.0', 'garbage')).toBe(false)
    expect(compareVersions('garbage', '1.0.0')).toBe(-1)
  })

  it('flags a newer release as an available update', () => {
    expect(isUpdateAvailable('0.1.0', '0.2.0')).toBe(true)
    expect(isUpdateAvailable('0.2.0', '0.2.0')).toBe(false)
    expect(isUpdateAvailable('0.2.0', '0.1.9')).toBe(false)
  })

  it('reads the release channel from the prerelease tag', () => {
    expect(releaseChannel('1.0.0')).toBe('stable')
    expect(releaseChannel('1.0.0-beta.1')).toBe('beta')
    expect(releaseChannel('1.0.0-rc.1')).toBe('beta')
    expect(releaseChannel('1.0.0-alpha.3')).toBe('alpha')
  })

  it('never pushes a prerelease to a stable-channel user', () => {
    expect(shouldOfferUpdate('1.0.0', '1.1.0')).toBe(true) // newer stable
    expect(shouldOfferUpdate('1.0.0', '1.1.0-beta.1')).toBe(false) // beta, not opted in
    expect(shouldOfferUpdate('1.0.0', '1.1.0-beta.1', true)).toBe(true) // opted into beta
    expect(shouldOfferUpdate('1.0.0', '1.0.0')).toBe(false) // same version
  })
})
