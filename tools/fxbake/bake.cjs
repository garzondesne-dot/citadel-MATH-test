// 🍳 새 스킬 fx → 폰 띠 굽기 (?role=fxbake · TV 와 같은 slash.ts 원본): 단계마다 20fps 칸을 낮은 해상도 그대로 → public/art/pfx2/new-<스킬>-v1.webp + src/ui/fx/fx-new.json
//   폰 띠엔 궤적 · 번쩍 · 입자만 (충격파 · 흔들림 · Glow = TV 화면 전체 연출) · 사용: npm run build → vite preview → NODE_PATH=$(npm root -g) node tools/fxbake/bake.cjs
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..'), OUT = path.join(ROOT, 'public/art/pfx2'), TMP = fs.mkdtempSync('/tmp/fxbake-');
const KINDS = ['cut', 'moon', 'slash', 'twin'], FPS = 20;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), p = await (await b.newContext({ viewport: { width: 480, height: 300 } })).newPage();
  await p.goto('http://localhost:4173/?role=fxbake'); await p.waitForSelector('.bake[data-ready="true"]', { timeout: 30000 });
  const info = await p.evaluate(() => ({ low: window.__bake.low, durs: window.__bake.NUM.tiers.map((t) => t.dur) })); fs.mkdirSync(OUT, { recursive: true });
  const spec = { fx: {}, bb: {} };
  for (let tier = 0; tier < 4; tier++) {
    const n = Math.ceil((info.durs[tier] + 0.3) * FPS), files = [];
    for (let i = 0; i < n; i++) { const url = await p.evaluate(([tier, t]) => window.__bake.frame(tier, t), [tier, i / FPS]); const f = path.join(TMP, `${tier}-${String(i).padStart(2, '0')}.png`); fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64')); files.push(f); }
    const k = KINDS[tier], src = `pfx2/new-${k}-v1.webp`;
    execFileSync('python3', ['-I', '-c', `import sys\nfrom PIL import Image\nfs=sys.argv[2:]\nims=[Image.open(f).convert('RGBA') for f in fs]\nw,h=ims[0].size\ns=Image.new('RGBA',(w*len(ims),h))\nfor i,im in enumerate(ims): s.paste(im,(i*w,0))\ns.save(sys.argv[1],'WEBP',lossless=True,method=6)`, path.join(ROOT, 'public/art', src), ...files]);
    spec.fx[k] = { src, w: info.low.w, h: info.low.h, n, fps: FPS, px: Math.round(info.low.px), py: Math.round(info.low.py), pk: Math.round(n * 0.35) }; spec.bb[k] = info.low.bb.map(Math.round);
    console.log(`${k}: ${n}칸 · ${fs.statSync(path.join(ROOT, 'public/art', src)).size}B`);
  }
  fs.writeFileSync(path.join(ROOT, 'src/ui/fx/fx-new.json'), JSON.stringify(spec, null, 1) + '\n'); await b.close();
})();
