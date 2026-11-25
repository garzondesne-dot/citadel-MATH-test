// 📈 (📜 11/25 머리 🔨 · SORAID P5) 문제 글 안 그래프 여러 장 = 폰 375 에서 2×2 격자 — 15차시 팩 v9 문제 6(몬스터 2)
//   NODE_PATH=$(npm root -g) node tools/e2e/graph2x2-1125.cjs <그림 폴더> <팩 json> [몬스터]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', PACK = process.argv[3], MID = process.argv[4] || 'm1', B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext(), t = await ctx.newPage(); await t.setViewportSize({ width: 400, height: 860 }); t.on('pageerror', (e) => errs.push(String(e)));
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tabs');
  await t.click('.tabs button:has-text("차시 팩")'); await t.click('[data-k="packup-go"]'); await t.setInputFiles('[data-k="packfile"]', PACK); await t.waitForSelector('[data-k="packsum"]'); await t.waitForTimeout(800);
  await t.click('.sheet .btn.pmain'); await t.waitForTimeout(1200);
  const no = require(PACK).no;
  await t.click('.tabs button:has-text("수업")'); await t.click('[data-k="cls-test"]'); await t.click(`.pk3 [data-no="${no}"]`); await t.click('[data-mode="remote"]');
  await t.click('[data-k="open-go"]'); await t.click('[data-k="open-yes"]'); await t.waitForSelector('.tact .btn', { timeout: 15000 });
  const code = await t.evaluate(() => window.__dbGet('school/live').code);
  const s = await ctx.newPage(); await s.setViewportSize({ width: 375, height: 667 }); s.on('pageerror', (e) => errs.push('폰 ' + e)); await s.goto(`${B}?role=student&room=${code}&as=test:3`); await s.waitForTimeout(2500);
  const steps = require(PACK).steps, target = steps.findIndex((x) => x.id === MID);
  for (let g = 0; g < 20; g++) { const st = await t.evaluate(() => { const L = window.__dbGet('school/live'); return window.__dbGet(`rooms/${L.code}`).state.step; }); if (st === target) break; await t.click('.tact .btn'); await t.waitForTimeout(300); }
  if (/지금 등장/.test(await t.textContent('.tact .btn'))) await t.click('.tact .btn');
  await s.waitForTimeout(2500);
  const g = await s.evaluate(() => [...document.querySelectorAll('[data-k="fig-grid"] svg')].map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)]; }));
  ok('그래프 4장 = 2열 (같은 줄 2장씩)', g.length === 4 && g[0][1] === g[1][1] && g[2][1] === g[3][1] && g[0][0] < g[1][0], JSON.stringify(g));
  ok('가로 넘침 0', await s.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await s.screenshot({ path: `${SHOTS}/v9-${MID}.png`, fullPage: true });
  await b.close(); console.log(errs.length ? `❌ 실패 ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); process.exit(errs.length ? 1 : 0);
})();
