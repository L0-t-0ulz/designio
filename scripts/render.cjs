// Headless render API — batch-render designs from a JSON manifest, no GUI.
//   npm run render -- manifest.json
// Manifest shape: { "jobs": [ { "out": "shot.png", "garment": "dress", "fabric": "satin",
//   "view": "3d|pattern|render", "pose": "...", "light": "...", "backdrop": "...",
//   "anim": "idle|walk|turn", "finish": "sparkle=sequins", "waitMs": 6000 }, ... ] }
// The query/wait logic mirrors src/renderer/export/renderApi.ts (which is unit-tested).
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const electron = path.join(root, 'node_modules', '.bin', 'electron')
const capture = path.join(__dirname, 'capture.cjs')

const manifestPath = process.argv[2]
if (!manifestPath) {
  console.error('usage: node scripts/render.cjs <manifest.json>')
  process.exit(2)
}
const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
if (!raw || !Array.isArray(raw.jobs)) {
  console.error('Render manifest must be { "jobs": [ … ] }')
  process.exit(2)
}

function query(j) {
  const p = ['start=0']
  if (j.garment) p.push('garment=' + encodeURIComponent(j.garment))
  if (j.fabric) p.push('fabric=' + encodeURIComponent(j.fabric))
  if (typeof j.color === 'number') p.push('color=' + (j.color >>> 0).toString(16).padStart(6, '0').slice(-6))
  if (j.view === 'pattern') p.push('view=pattern')
  else if (j.view === 'render') p.push('view=render')
  if (j.pose) p.push('pose=' + encodeURIComponent(j.pose))
  if (j.anim) p.push('anim=' + j.anim)
  if (j.light) p.push('light=' + encodeURIComponent(j.light))
  if (j.backdrop) p.push('backdrop=' + encodeURIComponent(j.backdrop))
  if (j.finish) p.push(String(j.finish).replace(/^[?&]/, ''))
  return p.join('&')
}
function wait(j) {
  if (j.waitMs != null) return Math.max(500, Math.min(90000, j.waitMs))
  if (j.view === 'pattern') return 4500
  if (j.anim === 'turn') return 3500
  return 6000
}

let failed = 0
for (const j of raw.jobs) {
  if (!j || typeof j.out !== 'string' || !/\.png$/i.test(j.out)) {
    console.error('✗ each job needs an "out" ending in .png:', JSON.stringify(j && j.out))
    failed++
    continue
  }
  const out = path.resolve(root, j.out)
  const q = query(j)
  console.log(`▶ ${j.out}  ?${q}`)
  const r = spawnSync(electron, [capture, out, String(wait(j)), q], { stdio: 'inherit' })
  if (r.status !== 0) {
    failed++
    console.error('✗ failed:', j.out)
  }
}
console.log(failed ? `\n${failed} job(s) failed.` : `\n✓ ${raw.jobs.length} job(s) rendered.`)
process.exit(failed ? 1 : 0)
