// 🐾 TV 소레이드 졸개 줄 · ⏳ 몬스터 공격 게이지 (📜 2026-11-16 선생님 b13 · 옛 정식 hall.js) — 9차시 m5(소레이드)
//   NODE_PATH=$(npm root -g) node tools/e2e/tvminion.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('리모컨 ' + e));
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tp');
  if (await t.$('[data-cls="1-3"]')) await t.click('[data-cls="1-3"]'); else { await t.click('text=다른 반'); await t.click('.sheet .pk:has-text("1-3반")'); }
  await t.click('.pk:has-text("9차시")'); await t.click('.tact .btn'); await t.click('[data-k="open-yes"]'); await t.waitForSelector('.nums');
  const code = await t.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.endsWith('|school/live')) return JSON.parse(localStorage.getItem(k)).code; });
  const s = await ctx.newPage(); await s.goto(`${B}?role=student&room=${code}&as=1-3:2`); await s.waitForTimeout(1500);
  const key = await t.evaluate((c) => window.__dbGet(`secrets/${c}/hallKey`), code);
  const tv = await ctx.newPage(); await tv.setViewportSize({ width: 1280, height: 720 }); tv.on('pageerror', (e) => errs.push('TV ' + e));
  await tv.goto(`${B}?role=hall&code=${code}&key=${key}`); await tv.waitForTimeout(2000);
  await t.bringToFront(); await t.click('.tact .btn'); await t.waitForTimeout(800); // 수업 시작
  await t.evaluate((c) => window.__dbSet(`rooms/${c}/state/step`, 9), code); await t.waitForTimeout(500); // m5 = 소레이드
  await t.waitForSelector('.tact .btn:not([disabled])', { timeout: 8000 }).catch(() => {}); await t.click('.tact .btn'); await t.waitForTimeout(1500); // 정찰 끝
  await tv.bringToFront(); await tv.waitForTimeout(2500);
  const n = await tv.$$eval('[data-k="tv-minions"] .mn', (x) => x.length).catch(() => 0);
  ok('TV 소레이드 = 대장 앞 졸개 줄 + 이름표', n >= 1 && /졸개1/.test((await tv.textContent('[data-k="tv-minions"]').catch(() => '')) || ''), `졸개 ${n}`);
  ok('TV 몬스터 공격 게이지', !!(await tv.$('[data-k="tv-gauge"]')));
  await tv.screenshot({ path: `${SHOTS}/tv-minions.png` });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
