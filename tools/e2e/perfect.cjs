// ✨ TV 「PERFECT!」 (📜 2026-11-16 선생님 c3 「퍼펙트 표기랑 마지막 일격 표기가 사라짐(옛)」 · 옛 정식 hall.js) — 학생이 한 번에 다 맞히면 TV 몬스터 위 PERFECT!
//   NODE_PATH=$(npm root -g) node tools/e2e/perfect.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('리모컨 ' + e));
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tp');
  if (await t.$('[data-cls="1-3"]')) await t.click('[data-cls="1-3"]'); else { await t.click('text=다른 반'); await t.click('.sheet .pk:has-text("1-3반")'); }
  await t.click('.pk:has-text("6차시")'); await t.click('.tact .btn'); await t.waitForSelector('.nums');
  const code = await t.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.endsWith('|school/live')) return JSON.parse(localStorage.getItem(k)).code; });
  const s = await ctx.newPage(); await s.goto(`${B}?role=student&room=${code}&as=1-3:2`); await s.waitForTimeout(1500);
  const key = await t.evaluate((c) => window.__dbGet(`secrets/${c}/hallKey`), code);
  const tv = await ctx.newPage(); await tv.setViewportSize({ width: 1280, height: 720 }); tv.on('pageerror', (e) => errs.push('TV ' + e));
  await tv.goto(`${B}?role=hall&code=${code}&key=${key}`); await tv.waitForTimeout(2000);
  await t.bringToFront();
  for (let i = 0; i < 9 && ((await t.evaluate((c) => window.__dbGet(`rooms/${c}/state/step`), code)) ?? -1) < 1; i++) { await t.waitForSelector('.tact .btn:not([disabled])', { timeout: 8000 }).catch(() => {}); await t.click('.tact .btn'); await t.waitForTimeout(700); }
  await t.waitForSelector('.tact .btn:not([disabled])', { timeout: 8000 }).catch(() => {}); await t.click('.tact .btn'); await t.waitForTimeout(800); // 정찰 끝
  await t.evaluate((c) => window.__dbSet(`rooms/${c}/state/headcount`, 20), code);
  await tv.bringToFront(); await tv.waitForTimeout(1200);
  await t.evaluate((c) => window.__perfect(c, 'm1', 's1_3_2'), code);
  let pf = '';
  for (let i = 0; i < 20 && !pf; i++) { await tv.waitForTimeout(150); pf = (await tv.textContent('.pop.perfect').catch(() => '')) || ''; }
  ok('TV = PERFECT! (한 번에 다 맞힘)', /PERFECT!/.test(pf), pf || '없음');
  await tv.screenshot({ path: `${SHOTS}/perfect-tv.png` });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
