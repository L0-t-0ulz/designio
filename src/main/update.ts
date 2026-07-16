/**
 * **Auto-update — version logic.** The pure, testable core of the desktop
 * auto-updater: parse/compare semantic versions, decide whether a fetched release
 * is newer than the running app, and derive the release channel (stable / beta /
 * alpha) from a prerelease tag. The Electron main process feeds these the running
 * `app.getVersion()` and the latest version from the update feed to decide whether
 * to prompt. (The update *server / feed* + code signing are external infra — see the
 * `build.publish` config in package.json; this is the packaging + decision slice.)
 */
export interface SemVer {
  major: number
  minor: number
  patch: number
  /** Dot-separated prerelease identifiers (e.g. `beta.2`), or [] for a release. */
  prerelease: string[]
}

/** Parse `1.2.3` / `1.2.3-beta.4` (a leading `v` is tolerated). Null if malformed. */
export function parseVersion(v: string): SemVer | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(v.trim())
  if (!m) return null
  return { major: +m[1], minor: +m[2], patch: +m[3], prerelease: m[4] ? m[4].split('.') : [] }
}

/** Compare one prerelease identifier per semver §11 (numeric < alphanumeric). */
function cmpId(a: string, b: string): number {
  const na = /^\d+$/.test(a)
  const nb = /^\d+$/.test(b)
  if (na && nb) return Math.sign(+a - +b)
  if (na) return -1 // numeric identifiers always rank lower
  if (nb) return 1
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * Semver precedence: -1 if `a` < `b`, 1 if `a` > `b`, 0 if equal. Unparseable
 * versions sort last (treated as lowest) so a bad feed never triggers an update.
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const pa = parseVersion(a)
  const pb = parseVersion(b)
  if (!pa && !pb) return 0
  if (!pa) return -1
  if (!pb) return 1
  for (const k of ['major', 'minor', 'patch'] as const) {
    if (pa[k] !== pb[k]) return pa[k] < pb[k] ? -1 : 1
  }
  // a version WITH a prerelease has lower precedence than the same without one
  if (pa.prerelease.length === 0 && pb.prerelease.length === 0) return 0
  if (pa.prerelease.length === 0) return 1
  if (pb.prerelease.length === 0) return -1
  const n = Math.max(pa.prerelease.length, pb.prerelease.length)
  for (let i = 0; i < n; i++) {
    const ia = pa.prerelease[i]
    const ib = pb.prerelease[i]
    if (ia === undefined) return -1 // fewer identifiers → lower precedence
    if (ib === undefined) return 1
    const c = cmpId(ia, ib)
    if (c !== 0) return c < 0 ? -1 : 1
  }
  return 0
}

/** True when `latest` is a strictly newer release than the running `current`. */
export function isUpdateAvailable(current: string, latest: string): boolean {
  return compareVersions(latest, current) > 0
}

export type ReleaseChannel = 'stable' | 'beta' | 'alpha'

/** The release channel from a version's prerelease tag (no tag → stable). */
export function releaseChannel(v: string): ReleaseChannel {
  const p = parseVersion(v)
  if (!p || p.prerelease.length === 0) return 'stable'
  const tag = p.prerelease[0].toLowerCase()
  if (tag.startsWith('alpha')) return 'alpha'
  return 'beta' // beta / rc / anything else prerelease
}

/**
 * Should the running app take this feed release? Only when it's newer AND on a
 * channel the user follows — a stable user is never pushed a beta.
 */
export function shouldOfferUpdate(current: string, latest: string, followBeta = false): boolean {
  if (!isUpdateAvailable(current, latest)) return false
  const ch = releaseChannel(latest)
  if (ch === 'stable') return true
  return followBeta // prereleases only for opted-in users
}
