// 📜 학생 전투 화면 스크롤 지키기 (📜 2026-11-17 #2 「문제 보기 누르면 여전히 맨 위로」 · src/ui/keepScroll.ts)
//   ① 보기를 눌러도 스크롤 그대로 ② 누른 직후 화면이 저절로 맨 위로 튀면(다시 그림 흉내) 0.8초 안에 제자리 ③ 누르지 않고 올린 것은 그대로
//   NODE_PATH=$(npm root -g) node tools/e2e/keepscroll.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true });
  const t = await ctx.newPage(); await t.goto(`${B}?role=hall&mode=test&lesson=set-05&room=KS1`); await t.waitForSelector('.dock', { timeout: 20000 });
  const s = await ctx.newPage(); await s.setViewportSize({ width: 390, height: 700 }); s.on('pageerror', (e) => errs.push(String(e)));
  await s.goto(`${B}?role=student&mode=test&lesson=set-05&room=KS1`); await s.waitForTimeout(2500);
  for (let i = 0; i < 20 && !(await s.$('.opt')); i++) { await t.bringToFront(); const g = t.locator('.dock .go').first(); if (await g.isVisible().catch(() => false)) await g.click().catch(() => {}); await t.waitForTimeout(500); await s.bringToFront(); await s.waitForTimeout(6000); }
  ok('문제 카드 · 보기', !!(await s.$('.opt')));
  const down = async () => { await s.evaluate(() => window.scrollTo(0, 99999)); await s.waitForTimeout(250); return s.evaluate(() => scrollY); };
  const y0 = await down(); ok('스크롤할 만큼 김', y0 > 40, String(y0));
  await (await s.$$('.opt'))[1].tap(); await s.waitForTimeout(600); ok('① 보기 누름 = 그대로', (await s.evaluate(() => scrollY)) === y0);
  await down(); const bb = await (await s.$$('.opt'))[0].boundingBox();
  await s.touchscreen.tap(bb.x + 20, bb.y + 10); await s.evaluate(() => window.scrollTo(0, 0)); await s.waitForTimeout(500);
  const y2 = await s.evaluate(() => scrollY); ok('② 누른 직후 맨 위로 튐 → 제자리', y2 > 40, `${y0} → 0 → ${y2}`);
  await s.screenshot({ path: `${SHOTS}/keepscroll.png` });
  await down(); await s.waitForTimeout(900); await s.evaluate(() => window.scrollTo(0, 0)); await s.waitForTimeout(400);
  ok('③ 누르지 않고 올린 것(0.8초 뒤) = 그대로', (await s.evaluate(() => scrollY)) === 0);
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
