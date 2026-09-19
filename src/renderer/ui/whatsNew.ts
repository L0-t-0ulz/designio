/**
 * **What's new** — the release feed the studio shows after an update, so a returning
 * designer finds out what changed without reading the repo. The notes and the
 * "which of these has this user already seen" logic are pure (no DOM) so they're
 * unit-tested; `ui/whatsNewOverlay` renders the modal.
 *
 * Entries are newest first and keyed by `id`; there is no release tagging yet, so the
 * id is the date the work shipped. `seen` stores the id of the newest note the user
 * has been shown — everything above it in the list is what's new to them.
 */
export interface ReleaseNote {
  /** Stable identifier, newest first — the date the work shipped (ISO `yyyy-mm-dd`). */
  id: string
  date: string
  headline: string
  changes: string[]
}

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    id: '2026-09-18',
    date: '2026-09-18',
    headline: 'The glossary is a keypress away',
    changes: [
      '⌘/Ctrl+G opens the term glossary — rebind it, like every other shortcut, from the ? overlay'
    ]
  },
  {
    id: '2026-07-17',
    date: '2026-07-17',
    headline: 'Wear and surface finishes',
    changes: [
      'Enzyme-wash and stone-wash wear finishes, alongside faded, acid-wash, distressed and adaptive',
      'Glitter sparkle and pearlescent iridescence',
      'Diagonal ombré direction, and an overlay blend mode for prints'
    ]
  },
  {
    id: '2026-07-16',
    date: '2026-07-16',
    headline: 'Yarns, weaves, knits and tartans',
    changes: [
      'Four weave types — basketweave, houndstooth, bird’s-eye dobby, piqué',
      'Four yarn presets — mohair-brushed, slub, bouclé, metallic-blend',
      'Four tartan setts — MacLeod, buffalo plaid, Prince of Wales, gingham',
      'Four colourwork presets and four knit-chart presets'
    ]
  },
  {
    id: '2026-07-15',
    date: '2026-07-15',
    headline: 'Cloth-sim headwear, prints and the term glossary',
    changes: [
      'Boiled wool, waxed cotton and cap corduroy join the fabric library',
      'Durag, satin bonnet and hijab under-cap, plus the headwear pattern suite (gore crown · band · brim → SVG/DXF)',
      'Thermochromic, reflective piping and duotone surfaces, and puff / discharge / foil prints',
      'A repeat-pattern engine — half-drop, brick and mirror',
      'A unisex body block, and an in-app glossary of the trade’s vocabulary'
    ]
  },
  {
    id: '2026-07-14',
    date: '2026-07-14',
    headline: 'The structured-hat studio',
    changes: [
      'Ski masks and balaclavas, and the structured hats — cowboy, top hat, bowler, boonie, baker boy, visor',
      'Crown shapes, hat bands, cap bill and panels, and straw weave, all on the parametric brim'
    ]
  },
  {
    id: '2026-07-12',
    date: '2026-07-12',
    headline: 'Fit analysis and production paperwork',
    changes: [
      'The fit-analysis trio, and functional openings that can tear',
      'The production paperwork loop and the capture suite',
      'Storm wind, walk styles, posture presets and a rebindable shortcut editor'
    ]
  }
]

/** The newest note, or null when there are none. */
export function latestRelease(notes: ReleaseNote[] = RELEASE_NOTES): ReleaseNote | null {
  return notes[0] ?? null
}

/** The notes newer than `seen` — everything when `seen` is null or is not a known id
 *  (a hand-edited or downgraded value shows the whole feed rather than nothing). */
export function releasesSince(seen: string | null, notes: ReleaseNote[] = RELEASE_NOTES): ReleaseNote[] {
  if (!seen) return [...notes]
  const at = notes.findIndex((n) => n.id === seen)
  return at === -1 ? [...notes] : notes.slice(0, at)
}

/** Whether `seen` is behind the feed at all. */
export function hasUnseenReleases(seen: string | null, notes: ReleaseNote[] = RELEASE_NOTES): boolean {
  return releasesSince(seen, notes).length > 0
}

/** Whether to open the modal unprompted. A first run (`seen === null`) deliberately
 *  does not: a brand-new user has no "before" to be told about, and the tour is
 *  already introducing the studio. */
export function shouldAutoOpen(seen: string | null, notes: ReleaseNote[] = RELEASE_NOTES): boolean {
  return seen !== null && hasUnseenReleases(seen, notes)
}

// ---- persistence (the only impure part) ----
const STORE_KEY = 'dio-whatsnew-seen-v1'

export function loadSeenRelease(): string | null {
  try {
    return localStorage.getItem(STORE_KEY)
  } catch {
    return null // storage blocked — treat as a first run and stay quiet
  }
}

/** Remember that the feed has been read up to `id` (default: the newest note). */
export function markReleasesSeen(id?: string): void {
  const to = id ?? latestRelease()?.id
  if (!to) return
  try {
    localStorage.setItem(STORE_KEY, to)
  } catch {
    /* storage full/blocked — the modal just shows again next launch */
  }
}
