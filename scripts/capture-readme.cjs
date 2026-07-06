// Regenerates every screenshot referenced by README.md from the current build, to
// the same paths, at fixed framing (deterministic) — so the docs stay in sync with
// the app. Run: `npm run capture` (builds first), or `node scripts/capture-readme.cjs`.
const { spawnSync } = require('node:child_process')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const electron = path.join(root, 'node_modules', '.bin', 'electron')
const capture = path.join(__dirname, 'capture.cjs')

// [outFile, waitMs, deepLink]. `still=1` freezes the start-page turntable; `start=0`
// deep-links straight into the studio (fixed camera + deterministic cloth settle).
const shots = [
  ['docs/homepage.png', 4000, ''],
  ['docs/projects.png', 3500, 'page=projects&demo=1'],
  ['docs/catalog-start.png', 4000, 'page=start&still=1'],
  ['docs/fabrics-start.png', 7000, 'garment=dress&fabric=velvet&start=0'],
  ['docs/catalog-gown.png', 7000, 'garment=gown&fabric=satin&start=0'],
  ['docs/catalog-jumpsuit.png', 7000, 'garment=jumpsuit&fabric=denim&start=0'],
  ['docs/model-female.png', 6000, 'garment=skirt&fabric=denim&start=0'],
  ['docs/model-male.png', 6000, 'garment=skirt&fabric=denim&bodyType=male&start=0'],
  ['docs/bvh-dress.png', 7000, 'garment=dress&fabric=satin&start=0'],
  ['docs/closeup.png', 6000, 'garment=top&fabric=satin&closeup=1&start=0'],
  ['docs/pattern.png', 6000, 'mode=pattern&fabric=cotton-poplin&start=0'],
  ['docs/pattern-2d.png', 4000, 'garment=dress&fabric=satin&start=0&view=pattern']
]

let failed = 0
for (const [out, wait, search] of shots) {
  const outPath = path.join(root, out)
  console.log(`\n▶ ${out}  (${wait}ms)  ?${search}`)
  const r = spawnSync(electron, [capture, outPath, String(wait), search], { stdio: 'inherit' })
  if (r.status !== 0) {
    failed++
    console.error(`✗ failed: ${out}`)
  }
}
console.log(failed ? `\n${failed} shot(s) failed.` : `\n✓ all ${shots.length} README images regenerated.`)
process.exit(failed ? 1 : 0)
