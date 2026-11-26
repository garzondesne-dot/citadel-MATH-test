// ⚡ 진필살기 충전 중 게이지 (📜 v0.9 #26 C 되살림 · 11/26) — 이 기기 · 🧪 테스트 · 봇 5 · 종합실
//   학생 4명이 📸 을 찍는 중(players/{uid}/snap = 지금 몬스터) → 금빛 게이지 3줄 + 「+1명」 · 채점 끝(snap 지움) = 사라짐
//   NODE_PATH=$(npm root -g) node tools/e2e/charge1126.cjs <폴더> [주소]
const { chromium } = require('playwright');
const { testOpen } = require('./_cls.cjs');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('리모컨 ' + e));
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tp');
  await testOpen(t, { no: 6, mode: 'remote', bots: 5 }); await t.waitForTimeout(2500);
  const code = (await t.evaluate(() => window.__dbGet('school/live'))).code;
  const tv = await ctx.newPage(); await tv.setViewportSize({ width: 1280, height: 720 }); tv.on('pageerror', (e) => errs.push('TV ' + e));
  await tv.goto(`${B}?role=hall&room=${code}`); await tv.waitForTimeout(2000);
  await t.evaluate((c) => { window.__dbSet(`rooms/${c}/meta/solve`, 0); const st = window.__dbGet(`rooms/${c}/state`) || {}; window.__dbSet(`rooms/${c}/state`, { ...st, step: 1, stepAt: Date.now() }); }, code);
  await t.waitForTimeout(2500);
  const r = await t.evaluate((c) => { const R = window.__dbGet(`rooms/${c}`); const L = R.meta.lesson; const ids = Object.keys(R.players || {}).slice(0, 4); return { ids, n: ids.length }; }, code);
  const mid = await tv.evaluate(() => 'm1');
  await t.evaluate(({ c, ids }) => { ids.forEach((u, i) => window.__dbSet(`rooms/${c}/players/${u}/snap`, { mid: 'm1', at: Date.now() - i * 1500 })); }, { c: code, ids: r.ids });
  await tv.bringToFront(); await tv.waitForTimeout(1800);
  const g = await tv.$$eval('[data-k="tv-charge"] .cg', (xs) => xs.map((x) => x.textContent.trim()));
  const more = await tv.textContent('[data-k="tv-charge"] small').catch(() => '');
  ok('⚡ 충전 중 게이지 = 3줄 + 「+n명」', g.length === 3 && /충전 중/.test(g[0]) && /\+1명/.test(more), `${g.join(' / ')} ${more}`);
  await tv.screenshot({ path: `${SHOTS}/charge-tv.png` });
  await t.evaluate(({ c, ids }) => { ids.forEach((u) => window.__dbSet(`rooms/${c}/players/${u}/snap`, null)); }, { c: code, ids: r.ids });
  await tv.waitForTimeout(1200);
  ok('채점 끝(snap 지움) = 게이지 사라짐', !(await tv.$('[data-k="tv-charge"]')));
  await b.close(); console.log(errs.length ? `❌ ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); process.exit(errs.length ? 1 : 0);
})();
