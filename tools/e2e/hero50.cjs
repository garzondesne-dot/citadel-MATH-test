// 🧙 #50 용사 세밀화 v4 시트 31명 캡처 · 캠프 · 용사 바꾸기 · 폰 공격(갤러리) · TV 레이드(가상 학생)
//   용사 몇 명을 이 기기 용사로 바꿔 가며 찍음 · 그림이 로드됐는지(v5 주소 요청 · 404 없음)
// 사용: npm run build → npx vite preview --port 4173 → node tools/e2e/hero50.cjs <그림 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/', HEROES = [1, 13, 23, 32];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), errs = [], got = new Set();
  for (const id of HEROES) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 }), p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(`${id}: ${e}`)); p.on('response', (r) => { if (/-v5\.webp/.test(r.url())) { got.add(r.url().split('/').pop()); if (r.status() >= 400) errs.push(`${id}: ${r.status()} ${r.url()}`); } });
    await ctx.addInitScript((h) => { try { const k = 'citadel-v1-me', m = JSON.parse(localStorage.getItem(k) || '{}'); if (m.hero !== h) localStorage.setItem(k, JSON.stringify({ ...m, hero: h })); } catch { /* */ } }, id);
    await p.goto(B + `?role=camp&room=H50${id}`); await p.waitForSelector('.stage'); await p.waitForTimeout(1500);
    await p.screenshot({ path: `${SHOTS}/hero50-${id}-camp.png` });
    await p.goto(B + '?role=atk'); await p.waitForSelector('.qwrap .bcard'); await p.waitForTimeout(600);
    await p.click('.tabs2 button:nth-child(2)'); await p.waitForTimeout(300); await p.click('.a[data-h="hit"]'); await p.waitForTimeout(700);
    const r = await p.$eval('.edge', (x) => { const q = x.getBoundingClientRect(); return { x: q.left, y: q.top, width: q.width, height: Math.min(q.height, 320) }; });
    await p.screenshot({ path: `${SHOTS}/hero50-${id}-attack.png`, clip: r });
    await ctx.close();
  }
  { const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(B + '?role=camp&room=H50S'); await p.waitForSelector('.hero-card'); await p.click('.hero-card'); await p.waitForSelector('button.top[aria-label="용사 바꾸기"]');
    await p.click('button.top[aria-label="용사 바꾸기"]'); await p.waitForSelector('.hsw .hi'); await p.waitForTimeout(800); await p.screenshot({ path: `${SHOTS}/hero50-select.png` }); await ctx.close(); }
  { const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }), hall = await ctx.newPage(); hall.on('pageerror', (e) => errs.push(String(e)));
    hall.on('response', (r) => { if (/-v5\.webp/.test(r.url())) { got.add(r.url().split('/').pop()); if (r.status() >= 400) errs.push(`TV ${r.status()}`); } });
    await hall.goto(B + '?role=hall&mode=test&room=H50TV'); await hall.waitForSelector('.dock');
    await hall.evaluate(() => window.__tvFake(26)); await hall.waitForTimeout(700);
    for (let k = 0; k < 6; k++) { await hall.mouse.move(640, 360); await hall.click('.dock .go'); await hall.waitForTimeout(500); if (await hall.$('canvas')) break; }
    await hall.waitForTimeout(3500); await hall.screenshot({ path: `${SHOTS}/hero50-tv.png` }); await ctx.close(); }
  console.log('v5 그림 받음', got.size, [...got].join(' '));
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
