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
  ['docs/puffer.png', 6500, 'garment=coat&fabric=canvas&quilt=diamond&start=0'],
  ['docs/closeup.png', 6000, 'garment=top&fabric=satin&closeup=1&start=0'],
  ['docs/waffle-knit.png', 4500, 'garment=top&fabric=waffle-knit&closeup=1&start=0'],
  ['docs/pattern.png', 6000, 'mode=pattern&fabric=cotton-poplin&start=0'],
  ['docs/pattern-2d.png', 4000, 'garment=dress&fabric=satin&start=0&view=pattern'],
  ['docs/detail.png', 6000, 'garment=long-sleeve&fabric=oxford&start=0&collar=1&cuff=1&dart=1&pocket=1'],
  ['docs/parts.png', 6000, 'garment=long-sleeve&fabric=denim&start=0&sleeveFabric=leather&trim=1&trimColor=d9c27e'],
  ['docs/prints.png', 6000, 'garment=dress&fabric=jersey&start=0&prints=demo&closeup=1'],
  ['docs/catalog-coat.png', 7000, 'garment=coat&fabric=wool-flannel&start=0'],
  ['docs/body-glb.png', 7000, 'garment=dress&fabric=silk-charmeuse&start=0'],
  ['docs/panels.png', 6000, 'garment=dress&fabric=jersey-knit&backFabric=leather&start=0'],
  ['docs/outfit.png', 6000, 'garment=skirt&fabric=denim&layers=top&start=0'],
  ['docs/walk.png', 3200, 'garment=dress&fabric=satin&anim=walk&start=0'],
  // Avatar customization
  ['docs/body-curvy.png', 6000, 'garment=dress&fabric=crepe&bodyPreset=curvy&start=0'],
  ['docs/skin-tone.png', 5000, 'garment=tank&fabric=jersey-knit&skin=deep&undertone=warm&start=0'],
  ['docs/hair-face.png', 5000, 'garment=top&fabric=jersey-knit&hair=afro&face=1&start=0'],
  ['docs/pose.png', 6000, 'garment=gown&fabric=satin&pose=weight-shift&start=0'],
  // Accessories, headwear & neckwear
  ['docs/accessories.png', 4500, 'garment=dress&fabric=satin&accessories=hat,belt,shoes,bag&start=0'],
  ['docs/headwear.png', 4500, 'garment=long-sleeve&fabric=wool-flannel&accessories=beanie,scarf&start=0'],
  ['docs/balaclava.png', 4500, 'garment=long-sleeve&fabric=jersey-knit&accessories=balaclava&start=0'],
  ['docs/beanie-cloth.png', 6000, 'garment=beanie&fabric=rib-knit&start=0'],
  // The structured-hat studio
  ['docs/hats-fedora.png', 5000, 'garment=top&fabric=jersey-knit&accessories=hat&crownShape=teardrop&hatBand=grosgrain&bandTrim=bow&bandColor=7a2233&closeup=head&headDist=0.9&start=0'],
  ['docs/hats-cowboy.png', 5000, 'garment=top&fabric=jersey-knit&accessories=cowboy&closeup=head&headDist=1.0&start=0'],
  ['docs/hats-straw.png', 5000, 'garment=top&fabric=jersey-knit&accessories=sunhat&brimWidth=1.5&brimDroop=0.55&brimWire=1&bandTrim=bow&closeup=head&headDist=1.05&start=0'],
  // Surface finishes
  ['docs/textile-plaid.png', 6000, 'garment=dress&fabric=wool-flannel&textile=plaid&start=0'],
  ['docs/tartan.png', 6000, 'garment=dress&fabric=wool-flannel&tartan=royal-stewart&start=0'],
  ['docs/ombre.png', 6500, 'garment=gown&fabric=chiffon&ombre=top-down&start=0'],
  ['docs/wear.png', 6000, 'garment=top&fabric=denim&wear=acid-wash&start=0'],
  ['docs/wet.png', 6000, 'garment=dress&fabric=cotton-poplin&wet=1&start=0'],
  ['docs/sequins.png', 6000, 'garment=gown&fabric=satin&sparkle=sequins&start=0'],
  ['docs/iridescent.png', 6000, 'garment=dress&fabric=satin&iridescent=holographic&start=0'],
  ['docs/lace.png', 6000, 'garment=dress&fabric=organza&lace=chantilly&start=0'],
  ['docs/quilt.png', 6000, 'garment=bomber&fabric=satin&quilt=diamond&start=0'],
  ['docs/fur.png', 6000, 'garment=coat&fabric=wool-flannel&fur=shearling&start=0'],
  // Cloth-sim headwear (the head-framed Face shot)
  ['docs/ski-mask-jacquard.png', 11000, 'garment=ski-mask&colourwork=skull&closeup=head&headDist=0.42&start=0'],
  ['docs/beanie-custom.png', 11000, 'garment=pom-beanie&pomScale=1.6&pomFur=1&pomColor=f2efe6&cuffPatch=woven&closeup=head&headDist=0.5&start=0'],
  ['docs/gaiter-headband.png', 11000, 'garment=chullo&closeup=head&headDist=0.5&start=0'],
  ['docs/scarf-fringe.png', 9000, 'garment=scarf&fringe=1&start=0'],
  // Scarf worn-states + the cowl-to-hood
  ['docs/scarf-blanket.png', 9000, 'garment=scarf&fabric=wool-flannel&scarfBlanket=1&start=0'],
  ['docs/scarf-double.png', 9000, 'garment=scarf&fabric=wool-flannel&scarfDouble=1&closeup=head&headDist=0.95&start=0'],
  ['docs/cowl-hood.png', 9000, 'garment=snood&fabric=cable-knit&snoodWorn=hood&closeup=head&headDist=1.1&start=0'],
  // The weave & knit design studio
  ['docs/weave-draft.png', 6000, 'garment=dress&fabric=cotton-poplin&closeup=1&weaveDraft=herringbone&start=0'],
  ['docs/colourwork.png', 6000, 'garment=top&fabric=jersey-knit&knitChart=stockinette&colourwork=fairisle&start=0'],
  ['docs/yarn-chunky.png', 6500, 'garment=dress&fabric=jersey-knit&yarn=chunky&start=0'],
  // Lighting & backdrops
  ['docs/light-dramatic.png', 6000, 'garment=gown&fabric=satin&light=dramatic&start=0'],
  ['docs/light-runway.png', 6000, 'garment=dress&fabric=crepe&light=runway&start=0'],
  ['docs/backdrop.png', 6000, 'garment=dress&fabric=satin&backdrop=blush&start=0'],
  // Analysis & fit tools
  ['docs/heatmap.png', 6000, 'garment=dress&fabric=denim&heatmap=1&start=0'],
  ['docs/pressure.png', 9000, 'garment=gown&fabric=satin&pressure=1&start=0'],
  ['docs/wrinkles.png', 6000, 'garment=dress&fabric=linen&wrinkles=1&start=0'],
  // Motion & shots
  ['docs/render-tab.png', 5000, 'garment=gown&fabric=satin&light=runway&view=render&start=0'],
  ['docs/path-traced.png', 90000, 'garment=gown&fabric=satin&light=runway&pathtrace=1&ptQuality=high&freezeAt=2.5&start=0'], // the offline GI trace needs ~60s to converge
  ['docs/wind.png', 3500, 'garment=dress&fabric=chiffon&wind=runway&anim=idle&start=0']
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
