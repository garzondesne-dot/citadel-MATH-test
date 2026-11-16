// ⚠ 집중 = 옛 정식 WARNING (📜 2026-11-17 #6 「설명 중에는 개념 영상 보는 것도 안 돼 · WARNING 띄우고 폰이 먹통되게」)
//   ① 문제 단계 · 스크롤 내린 채 집중 → 빨간 「⚠ WARNING」 · 맨 위(크게 보기 z 60 보다 위) ② 아래 단추를 눌러도 안 눌림 ③ 풀면 사라지고 스크롤 · 고른 답 그대로
//   NODE_PATH=$(npm root -g) node tools/e2e/focuswarn.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  const t = await ctx.newPage(); await t.goto(`${B}?role=hall&mode=test&lesson=set-05&room=FW1`); await t.waitForSelector('.dock', { timeout: 20000 });
  const s = await ctx.newPage(); await s.setViewportSize({ width: 390, height: 700 }); s.on('pageerror', (e) => errs.push(String(e)));
  await s.goto(`${B}?role=student&mode=test&lesson=set-05&room=FW1`); await s.waitForTimeout(2500);
  for (let i = 0; i < 20 && !(await s.$('.chips button, .opt')); i++) { await t.bringToFront(); const g = t.locator('.dock .go').first(); if (await g.isVisible().catch(() => false)) await g.click().catch(() => {}); await t.waitForTimeout(500); await s.bringToFront(); await s.waitForTimeout(3000); }
  await s.bringToFront(); await (await s.$('.chips button, .opt')).click(); await s.evaluate(() => window.scrollTo(0, 99999)); await s.waitForTimeout(300);
  const y0 = await s.evaluate(() => scrollY), pick0 = await s.$$eval('.chips button.on, .opt.on', (x) => x.length);
  await t.bringToFront(); await t.click('.dock .fo'); await t.waitForTimeout(400); await s.bringToFront(); await s.waitForTimeout(900);
  const w = await s.evaluate(() => { const e = document.querySelector('[data-k="focus-warn"]'); if (!e) return null; const r = e.getBoundingClientRect(), at = document.elementFromPoint(195, 600); return { txt: e.querySelector('.ftop')?.textContent, z: getComputedStyle(e).zIndex, cover: r.width >= innerWidth && r.height >= innerHeight, top: !!at && e.contains(at) }; });
  ok('① 빨간 ⚠ WARNING · 화면 전체 · 맨 위(z ≥ 90)', !!w && /WARNING/.test(w.txt) && /주목/.test(w.txt) && w.cover && Number(w.z) >= 90 && w.top, JSON.stringify(w));
  await s.screenshot({ path: `${SHOTS}/focuswarn.png` });
  await s.mouse.click(195, 650); await s.waitForTimeout(300);
  ok('② 아래 단추 눌러도 안 눌림 (고른 답 수 그대로)', (await s.$$eval('.chips button.on, .opt.on', (x) => x.length)) === pick0);
  await t.bringToFront(); await t.click('.dock .fo'); await t.waitForTimeout(400); await s.bringToFront(); await s.waitForTimeout(900);
  ok('③ 풀면 사라짐 · 스크롤 · 고른 답 그대로', !(await s.$('[data-k="focus-warn"]')) && (await s.evaluate(() => scrollY)) === y0 && (await s.$$eval('.chips button.on, .opt.on', (x) => x.length)) === pick0);
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
