// ⚙ 시험 3판 (V1-DESIGN 10절 개발 규칙 ④): 🪶 기본(모두 끔) · ⚔ 표준 · 🏰 전체(모두 켬) 마다 학생 캠프 · 교사 「나」 탭 · 교실 TV 를 열어 오류 0 + 꺼진 기능은 화면에서 사라짐
//   NODE_PATH=$(npm root -g) node tools/e2e/feat3.cjs <폴더>   · 시험 고리 __featSet(cfg) = 교사 화면 저장과 같은 길(school/features)
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), errs = [];
  for (const bundle of ['basic', 'standard', 'full']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    const watch = (p) => { p.on('pageerror', (e) => errs.push(`${bundle} ${e}`)); p.on('console', (m) => { if (m.type() === 'error' && !/favicon|play\(\)|NotAllowed|Failed to load resource/.test(m.text())) errs.push(`${bundle} ${m.text().slice(0, 140)}`); }); return p; };
    const c = watch(await ctx.newPage()); await c.goto(B + `?role=camp&room=F${bundle}`); await c.waitForSelector('.stage');
    await c.evaluate((bd) => window.__featSet({ bundle: bd }), bundle); await c.waitForTimeout(500);
    const camp = await c.evaluate(() => ({ anvil: !!document.querySelector('.prop[aria-label="모루"]'), castle: !!document.querySelector('.zone[aria-label="성채"]'), hero: !!document.querySelector('.hero-card'), board: !!document.querySelector('.prop[aria-label="📋 게시판"]') }));
    await c.screenshot({ path: `${SHOTS}/feat-${bundle}-camp.png` });
    const want = { basic: [false, false, false], standard: [false, false, true], full: [true, true, true] }[bundle];
    if (camp.anvil !== want[0] || camp.castle !== want[1] || camp.hero !== want[2] || !camp.board) errs.push(`${bundle} 캠프 ${JSON.stringify(camp)}`);
    const t = watch(await ctx.newPage()); await t.goto(B + '?role=teacher'); await t.waitForSelector('.tabs');
    await t.click('.tabs button:has-text("나")'); await t.waitForTimeout(300); await t.click('.item[data-k="feat"]'); await t.waitForSelector('.fs');
    const sw = await t.$$eval('.fs .sw', (x) => x.map((e) => e.getAttribute('aria-checked') === 'true'));
    const onN = sw.filter(Boolean).length, picked = await t.$eval('.fs .b.on', (x) => x.dataset.b);
    await t.screenshot({ path: `${SHOTS}/feat-${bundle}-teacher.png` });
    if (picked !== bundle) errs.push(`${bundle} 묶음 표시 ${picked}`);
    if (bundle === 'basic' && onN) errs.push(`기본인데 켬 ${onN}`); if (bundle === 'full' && onN !== sw.length) errs.push(`전체인데 끔 ${sw.length - onN}`);
    const h = watch(await ctx.newPage()); await h.goto(B + `?role=hall&mode=test&room=F${bundle}`); await h.waitForSelector('.dock'); await h.waitForTimeout(800);
    console.log(`${bundle}: 캠프 모루 ${camp.anvil ? '○' : '✗'} · 성채 ${camp.castle ? '○' : '✗'} · 용사 카드 ${camp.hero ? '○' : '✗'} · 게시판 ${camp.board ? '○' : '✗'} · 교사 스위치 켬 ${onN}/${sw.length} · TV 열림`);
    await ctx.close();
  }
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
