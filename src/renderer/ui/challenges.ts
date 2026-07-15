/**
 * **Community challenges** — a curated set of design briefs to spark ideas and
 * practise: each is a theme, a one-line brief, a few constraints, and a suggested
 * starting garment. The data + lookup are pure (no DOM) so they're unit-tested;
 * `ui/challengesOverlay` renders the browser and can seed a starting garment.
 * (Submissions, voting and a live feed need a backend — this is the brief library.)
 */
export interface Challenge {
  id: string
  title: string
  theme: string
  brief: string
  constraints: string[]
  /** A registry garment id to start from. */
  startGarment: string
}

export const CHALLENGES: Challenge[] = [
  {
    id: 'monochrome',
    title: 'Total monochrome',
    theme: 'Colour',
    brief: 'Build a head-to-toe look in a single colour — let texture do the talking.',
    constraints: ['One hue across every layer', 'At least two different fabrics', 'No prints'],
    startGarment: 'coat'
  },
  {
    id: 'one-fabric',
    title: 'One fabric, one garment',
    theme: 'Restraint',
    brief: 'Design a hero piece cut entirely from a single fabric — the cut is the story.',
    constraints: ['A single fabric', 'A construction detail (dart, pleat or yoke)', 'No trim'],
    startGarment: 'dress'
  },
  {
    id: 'evening',
    title: 'After dark',
    theme: 'Eveningwear',
    brief: 'A show-stopping evening look with a light-catching finish.',
    constraints: ['A silk or specialty fabric', 'A sparkle or iridescent finish', 'Floor-length'],
    startGarment: 'gown'
  },
  {
    id: 'utility',
    title: 'Field utility',
    theme: 'Functional',
    brief: 'A rugged, pocket-heavy piece built for the outdoors.',
    constraints: ['A heavy woven (canvas, denim or waxed cotton)', 'At least two pockets', 'A functional closure'],
    startGarment: 'cargo'
  },
  {
    id: 'knit',
    title: 'All-day knit',
    theme: 'Knitwear',
    brief: 'A cosy knit with real stitch character.',
    constraints: ['A knit fabric', 'A knit-chart or colourwork surface', 'Ribbed trims'],
    startGarment: 'cardigan'
  },
  {
    id: 'headwear',
    title: 'Crown it',
    theme: 'Headwear',
    brief: 'Design a piece of cloth-sim headwear that reads instantly.',
    constraints: ['A head-covering garment', 'A distinctive fabric', 'A trim or finish'],
    startGarment: 'beanie'
  },
  {
    id: 'print',
    title: 'Print statement',
    theme: 'Surface',
    brief: 'Let a bold placed print or repeat pattern carry the whole design.',
    constraints: ['A textile pattern or a placed print', 'A simple silhouette', 'Two colourways'],
    startGarment: 'top'
  },
  {
    id: 'tailored',
    title: 'Sharp tailoring',
    theme: 'Tailoring',
    brief: 'A crisp, structured jacket that holds its shape.',
    constraints: ['An interfaced or lined garment', 'A collar', 'A worsted or suiting fabric'],
    startGarment: 'blazer'
  }
]

/** Case-insensitive search over title/theme/brief/constraints; empty → all. Pure. */
export function searchChallenges(query: string, list: Challenge[] = CHALLENGES): Challenge[] {
  const q = query.trim().toLowerCase()
  if (!q) return list.slice()
  return list.filter(
    (c) => c.title.toLowerCase().includes(q) || c.theme.toLowerCase().includes(q) || c.brief.toLowerCase().includes(q) || c.constraints.some((x) => x.toLowerCase().includes(q))
  )
}

/** A challenge by id, or undefined. Pure. */
export function getChallenge(id: string): Challenge | undefined {
  return CHALLENGES.find((c) => c.id === id)
}
