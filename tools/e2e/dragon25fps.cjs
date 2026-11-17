// 🐉 #25 README 9 확인 ① — 종합실(TV) 걷는 용사 30명 + 30명이 0.25초마다 진행을 보냄(가장 거친 연타) · 5초 rAF 평균 fps
//   NODE_PATH=$(npm root -g) node tools/e2e/dragon25fps.cjs [주소]
const { chromium } = require('playwright');
const { testOpen } = require('./_cls.cjs');
const B = process.argv[2] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const t = await ctx.newPage();
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tp');
  await testOpen(t, { no: 6, mode: 'remote', bots: 5 }); await t.waitForSelector('[data-k="bots"]');
  for (let i = 0; i < 25; i++) await t.click('[aria-label="한 명 늘리기"]');
  if ((await t.textContent('[data-k="bot-n"]')).trim() === '5명') await t.click('[data-k="bot-sw"]');
  const live = await t.evaluate(() => window.__dbGet('school/live'));
  for (let i = 0; i < 60; i++) { const k = await t.evaluate((c) => Object.keys(window.__dbGet(`rooms/${c}/players`) || {}).length, live.code); if (k >= 30) break; await t.waitForTimeout(500); }
  console.log('들어온 학생', await t.evaluate((c) => Object.keys(window.__dbGet(`rooms/${c}/players`) || {}).length, live.code), '· 봇', (await t.textContent('[data-k="bot-n"]')).trim());
  await t.click('.tact .btn'); await t.waitForTimeout(3000);
  await t.click('[data-slot="rest"]'); await t.click('.game:has-text("용이 잠든 사이")'); await t.click('.rbig'); await t.waitForTimeout(500);
  await t.click('[data-slot="rest"]'); await t.click('[data-k="drg-next"]');
  const tv = await ctx.newPage(); await tv.setViewportSize({ width: 1920, height: 1080 });
  await tv.goto(`${B}?role=hall&room=${live.code}`); await tv.waitForSelector('[data-k="drg-tv"] .runner', { timeout: 15000 }); await tv.waitForTimeout(1500);
  const n = (await tv.$$('[data-k="drg-tv"] .runner')).length;
  const r = await tv.evaluate(async (code) => {
    const f = window.__dbGet(`rooms/${code}/fun`), ids = Object.keys(f.alive || {}), pos = {};
    const iv = setInterval(() => ids.forEach((u) => { pos[u] = Math.min(59, (pos[u] || 0) + 2); window.__dbSet(`rooms/${code}/dg/${f.g}/${f.round}/${u}`, { p: pos[u], h: 0 }); }), 250);
    const ts = []; await new Promise((ok) => { const s = performance.now(); const go = (x) => { ts.push(x); if (x - s < 5000) requestAnimationFrame(go); else ok(); }; requestAnimationFrame(go); });
    clearInterval(iv); const gaps = ts.slice(1).map((x, i) => x - ts[i]).sort((a, b) => a - b);
    return { fps: Math.round(((ts.length - 1) / (ts[ts.length - 1] - ts[0])) * 1000 * 10) / 10, p95: Math.round(gaps[Math.floor(gaps.length * 0.95)] * 10) / 10, writes: ids.length * 20 };
  }, live.code);
  console.log(`${r.fps >= 50 ? '✅' : '❌'} TV 1080p 걷는 용사 ${n}명 · 5초 동안 진행 ${r.writes}번 받음 · 평균 ${r.fps} fps · 느린 칸(95%) ${r.p95} ms`);
  if (process.argv[3]) await tv.screenshot({ path: process.argv[3] });
  await b.close();
})();
