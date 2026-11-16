// ⏱ 몬스터 공격 게이지 = 옛 정식 표시 (📜 2026-11-17 #3 「다시 이모지표현 넣어줘봐」) — TV · 학생 폰 같은 함수(src/ui/battle/gauge.ts)
//   ① TV · 폰 게이지에 「⏱ 남은 초」 ② 🔴 집중 = 「⏸ 집중모드」 + 파랑 ③ 풀면 다시 ⏱
//   NODE_PATH=$(npm root -g) node tools/e2e/gauge.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('TV ' + e));
  await t.goto(`${B}?role=hall&mode=test&lesson=set-05&room=GA1`); await t.waitForSelector('.dock', { timeout: 20000 });
  const s = await ctx.newPage(); await s.setViewportSize({ width: 390, height: 844 }); s.on('pageerror', (e) => errs.push('폰 ' + e));
  await s.goto(`${B}?role=student&mode=test&lesson=set-05&room=GA1`); await s.waitForTimeout(2500);
  for (let i = 0; i < 20 && !(await s.$('[data-k="atk-gauge"]')); i++) { await t.bringToFront(); const g = t.locator('.dock .go').first(); if (await g.isVisible().catch(() => false)) await g.click().catch(() => {}); await t.waitForTimeout(500); await s.bringToFront(); await s.waitForTimeout(3000); }
  await s.waitForTimeout(1500);
  const ph = (await s.textContent('[data-k="atk-gauge"]').catch(() => '')) || '';
  ok('① 폰 게이지 「⏱ 남은 초」', /⏱\s*\d+/.test(ph), ph);
  await t.bringToFront(); await t.waitForTimeout(800); const tv = (await t.textContent('[data-k="tv-gauge"]').catch(() => '')) || '';
  ok('① TV 게이지 「⏱ 남은 초」', /⏱\s*\d+/.test(tv), tv);
  await t.screenshot({ path: `${SHOTS}/gauge-tv.png` }); await s.screenshot({ path: `${SHOTS}/gauge-phone.png` });
  await t.click('.dock .fo'); await t.waitForTimeout(900);
  const tv2 = await t.evaluate(() => { const g = document.querySelector('[data-k="tv-gauge"]'); return g ? { t: g.textContent, blue: g.classList.contains('blue') } : null; });
  ok('② 집중 = TV 「⏸ 집중모드」 · 파랑', !!tv2 && /집중모드/.test(tv2.t) && tv2.blue, JSON.stringify(tv2));
  await t.screenshot({ path: `${SHOTS}/gauge-tv-focus.png` });
  await t.click('.dock .fo'); await t.waitForTimeout(900);
  ok('③ 풀면 다시 ⏱', /⏱\s*\d+/.test((await t.textContent('[data-k="tv-gauge"]').catch(() => '')) || ''));
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
