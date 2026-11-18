// 🔥 #67 탐사대 · 정찰 암막 (이 기기 · TV Pixi): 6차시 수업 · 학생 4명 · 3명 탐사대(exp) + 1명 더 = TV 횃불 3 · 🔥 이름 4 · 붉은 눈 · 빛 구멍
//   node tools/e2e/explore67.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('리모컨 ' + e));
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tp');
  if (await t.$('[data-cls="1-3"]')) await t.click('[data-cls="1-3"]'); else { await t.click('text=다른 반'); await t.click('.sheet .pk:has-text("1-3반")'); }
  await t.click('.pk:has-text("6차시")'); await t.click('.tact .btn'); await t.click('[data-k="open-yes"]'); await t.waitForSelector('.nums');
  const code = await t.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.endsWith('|school/live')) return JSON.parse(localStorage.getItem(k)).code; });
  const studs = [];
  for (const n of [1, 2, 3, 5, 7]) { const s = await ctx.newPage(); s.on('pageerror', (e) => errs.push(`학생${n} ` + e)); await s.goto(`${B}?role=student&room=${code}&as=1-3:${n}`); studs.push(s); await s.waitForTimeout(700); }
  // 탐사대 = 1 · 2 · 3 · 5 (예습 처치 2+) · 7 = 아님
  for (const n of [1, 2, 3, 5]) await t.evaluate(([c, u]) => window.__dbSet(`rooms/${c}/players/${u}/exp`, { n: 2, m: { m1: 2, m2: 1 } }), [code, `s1_3_${n}`]);
  const key = await t.evaluate((c) => window.__dbGet(`secrets/${c}/hallKey`), code);
  const tv = await ctx.newPage(); await tv.setViewportSize({ width: 1280, height: 720 }); tv.on('pageerror', (e) => errs.push('TV ' + e));
  await tv.goto(`${B}?role=hall&code=${code}&key=${key}`); await tv.waitForTimeout(2500);
  await t.bringToFront();
  for (let i = 0; i < 9 && ((await t.evaluate((c) => window.__dbGet(`rooms/${c}/state/step`), code)) ?? -1) < 1; i++) { await t.waitForSelector('.tact .btn:not([disabled])', { timeout: 8000 }).catch(() => {}); await t.click('.tact .btn'); await t.waitForTimeout(700); }
  await tv.bringToFront(); await tv.waitForTimeout(1600);
  await tv.screenshot({ path: `${SHOTS}/explore-tv-1.png` });
  await tv.waitForTimeout(7000);
  await tv.screenshot({ path: `${SHOTS}/explore-tv-2.png` });
  const st0 = await t.evaluate((c) => window.__dbGet(`rooms/${c}/state`), code);
  log('상태', JSON.stringify(st0).slice(0, 160));
  await studs[0].bringToFront(); await studs[0].waitForTimeout(800); await studs[0].screenshot({ path: `${SHOTS}/explore-phone.png` });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
