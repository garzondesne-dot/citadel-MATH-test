// 🗡 다시 만든 스킬 같은 장면 비교 (TV 원본 · 같은 순간 6칸) → <폴더>/skill-cmp.png + 스킬마다 움직이는 webp(skill-<스킬>.webp · 평가판용)
//   npm run build → vite preview → NODE_PATH=$(npm root -g) node tools/fxbake/skillcmp.cjs <폴더> slash spin …
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const [OUT = '.', ...SK] = process.argv.slice(2), TMP = fs.mkdtempSync('/tmp/skillcmp-');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), p = await (await b.newContext({ viewport: { width: 480, height: 300 } })).newPage();
  await p.goto('http://localhost:4173/?role=fxbake'); await p.waitForSelector('.bake[data-ready="true"]', { timeout: 30000 }); await p.addStyleTag({ content: '.beta-pill,.srv,.newbuild{display:none!important}' });
  const rows = [];
  for (const k of SK) {
    const dur = await p.evaluate((k) => window.__bake.durSkill(k), k), TS = [0.06, 0.14, 0.24, 0.34, 0.5, 0.7].map((x) => +(x * dur / 0.7).toFixed(3)), row = [];
    for (const t of TS) { await p.evaluate(([t, k]) => window.__bake.sceneNew(0, t, undefined, k), [t, k]); const f = path.join(TMP, `${k}-${t}.png`); await p.locator('.bake canvas').screenshot({ path: f }); row.push(f); }
    rows.push(row);
    if (process.env.ANIM !== '0') { const n = Math.ceil((dur + 0.4) * 20), fr = [];
      for (let i = 0; i < n; i++) { await p.evaluate(([t, k]) => window.__bake.sceneNew(0, t, undefined, k), [i / 20, k]); const f = path.join(TMP, `an-${k}-${String(i).padStart(2, '0')}.png`); await p.locator('.bake canvas').screenshot({ path: f }); fr.push(f); }
      execFileSync('python3', ['-I', '-c', `import sys\nfrom PIL import Image\nims=[Image.open(f).convert('RGB') for f in sys.argv[2:]]\nims=ims+[ims[0]]*12\nims[0].save(sys.argv[1],save_all=True,append_images=ims[1:],duration=50,loop=0,quality=80)`, path.join(OUT, `skill-${k}.webp`), ...fr]); }
  }
  execFileSync('python3', ['-I', '-c', `import sys,json\nfrom PIL import Image, ImageDraw\nrows=json.loads(sys.argv[2]);names=sys.argv[3].split(',')\nw,h=480,300\nW=Image.new('RGB',(w*len(rows[0])+80,h*len(rows)),(20,20,26))\nd=ImageDraw.Draw(W)\nfor r,row in enumerate(rows):\n  d.text((8,r*h+140),names[r],fill=(245,184,74))\n  for c,f in enumerate(row): W.paste(Image.open(f).convert('RGB'),(80+c*w,r*h))\nW.save(sys.argv[1])`, path.join(OUT, 'skill-cmp.png'), JSON.stringify(rows), SK.join(',')]);
  console.log('ok', OUT); await b.close();
})();
