// 🌙 쌍월 참 시제품 TV 실제 모습 (종합실 테스트 모드 ?newfx&twin=&demo=twin) → <폴더>/twin-tv-{a,b,c}.webp (몬스터 둘레만 잘라 움직이는 그림 · 평가판용)
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const OUT = process.argv[2] || '.', TMP = fs.mkdtempSync('/tmp/twintv-');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const v of ['a', 'b', 'c']) {
    const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(`http://localhost:4173/?role=hall&mode=test&room=GTW${v}&newfx&twin=${v}&demo=twin`); await p.addStyleTag({ content: '.beta-pill,.srv,.newbuild,.dock{display:none!important}' });
    await p.waitForFunction(() => !!window.__arena?.box?.mon, null, { timeout: 30000 }); await p.waitForTimeout(1500);
    const m = await p.evaluate(() => window.__arena.box.mon); const clip = { x: Math.max(0, m.cx - m.size * 1.1), y: Math.max(0, m.top - m.size * 0.45), width: m.size * 2.2, height: m.size * 1.6 };
    await p.evaluate(() => window.__tvAtk(0, 'hit', 3, 'twin', true, true)); const fr = [];
    for (let i = 0; i < 40; i++) { const f = path.join(TMP, `${v}-${String(i).padStart(2, '0')}.png`); await p.screenshot({ path: f, clip }); fr.push(f); await p.waitForTimeout(40); }
    execFileSync('python3', ['-I', '-c', `import sys\nfrom PIL import Image\nims=[Image.open(f).convert('RGB') for f in sys.argv[2:]]\nw=360;ims=[i.resize((w,round(i.height*w/i.width))) for i in ims]\nims[0].save(sys.argv[1],save_all=True,append_images=ims[1:]+[ims[-1]]*10,duration=60,loop=0,quality=75)`, path.join(OUT, `twin-tv-${v}.webp`), ...fr]);
    console.log(v, '오류', errs.length, errs[0] || '');
    await p.context().close();
  }
  await b.close();
})();
