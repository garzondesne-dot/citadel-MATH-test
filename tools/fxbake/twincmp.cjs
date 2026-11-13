// 🌙 쌍월 참 시제품 A · B · C 같은 장면 비교 (TV 원본 · 같은 순간 6칸) → <폴더>/twin-cmp.png + 칸마다 움직이는 webp(twin-{v}.webp · 평가판용)
//   npm run build → vite preview → NODE_PATH=$(npm root -g) node tools/fxbake/twincmp.cjs <폴더>
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const OUT = process.argv[2] || '.', TMP = fs.mkdtempSync('/tmp/twincmp-');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), p = await (await b.newContext({ viewport: { width: 480, height: 300 } })).newPage();
  await p.goto('http://localhost:4173/?role=fxbake'); await p.waitForSelector('.bake[data-ready="true"]', { timeout: 30000 }); await p.addStyleTag({ content: '.beta-pill,.srv,.newbuild{display:none!important}' });
  const TS = [0.12, 0.2, 0.3, 0.38, 0.5, 0.7], rows = [];
  for (const v of ['a', 'b', 'c']) {
    const row = [];
    for (const t of TS) { await p.evaluate(([t, v]) => window.__bake.sceneNew(3, t, v), [t, v]); const f = path.join(TMP, `${v}-${t}.png`); await p.locator('.bake canvas').screenshot({ path: f }); row.push(f); }
    rows.push(row);
    const dur = await p.evaluate((v) => window.__bake.durOf(v), v), n = Math.ceil((dur + 0.4) * 20), fr = [];
    for (let i = 0; i < n; i++) { await p.evaluate(([t, v]) => window.__bake.sceneNew(3, t, v), [i / 20, v]); const f = path.join(TMP, `an-${v}-${String(i).padStart(2, '0')}.png`); await p.locator('.bake canvas').screenshot({ path: f }); fr.push(f); }
    execFileSync('python3', ['-I', '-c', `import sys\nfrom PIL import Image\nims=[Image.open(f).convert('RGB') for f in sys.argv[2:]]\nims=ims+[ims[0]]*12\nims[0].save(sys.argv[1],save_all=True,append_images=ims[1:],duration=50,loop=0,quality=80)`, path.join(OUT, `twin-${v}.webp`), ...fr]);
  }
  execFileSync('python3', ['-I', '-c', `import sys,json\nfrom PIL import Image, ImageDraw\nrows=json.loads(sys.argv[2])\nw,h=480,300\nW=Image.new('RGB',(w*len(rows[0])+60,h*len(rows)),(20,20,26))\nd=ImageDraw.Draw(W)\nfor r,row in enumerate(rows):\n  d.text((20,r*h+140),'ABC'[r],fill=(245,184,74))\n  for c,f in enumerate(row): W.paste(Image.open(f).convert('RGB'),(60+c*w,r*h))\nW.save(sys.argv[1])`, path.join(OUT, 'twin-cmp.png'), JSON.stringify(rows)]);
  console.log('ok', OUT); await b.close();
})();
