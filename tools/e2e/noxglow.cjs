// ✨ 녹스 v8 + 대검 빨간 줄 깜빡임 (📜 2026-11-20 선생님) — 캠프(폰 DOM) 빛 칸 · 1.2초 주기 · TV(Pixi)가 빛 띠를 받음
//   NODE_PATH=$(npm root -g) node tools/e2e/noxglow.cjs <폴더> [주소]
const { chromium } = require('playwright');
const { testOpen } = require('./_cls.cjs');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('캠프 ' + e)); const req = []; p.on('request', (r) => req.push(r.url().split('/').pop()));
  await p.goto(B + '?role=camp&room=NX'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(2000);
  await p.evaluate(() => { const m = JSON.parse(localStorage.getItem('citadel-v1-me') || '{}'); Object.assign(m, { hero: 18, enh: 0, title: 'none', socket: { 18: 'shade' }, test: true, seen: { ...(m.seen || {}), hero: true }, wallet: { gem: 9999, scroll: 30, ver: 1, buys: [{ id: 'hero_18', ver: 1, at: 1 }] } }); localStorage.setItem('citadel-v1-me', JSON.stringify(m)); });
  await p.reload(); await p.waitForSelector('.stage'); await p.waitForTimeout(2500);
  ok('캠프 = 녹스 v8 시트 · 숨쉬기 v8 · 빛 띠를 받음', ['hero-dknight-idle8-v8b.webp', 'hero-dknight-idle8-glow-v8.webp'].every((f) => req.includes(f)), req.filter((u) => /dknight/.test(u)).join(' '));
  const n = await p.$$eval('.hero-card [data-k="hero-glow"]', (x) => x.length); ok('캠프 카드 = 빛 칸 하나', n === 1, String(n));
  const ops = []; for (let i = 0; i < 8; i++) { ops.push(await p.$eval('.hero-card [data-k="hero-glow"]', (e) => +getComputedStyle(e).opacity).catch(() => -1)); await p.waitForTimeout(150); }
  ok('빛 = 켜졌다 꺼짐 (1.2초 주기)', Math.max(...ops) > 0.7 && Math.min(...ops) < 0.3, ops.map((x) => x.toFixed(2)).join(' '));
  const card = await p.$('.hero-card .pic'); await p.waitForFunction(() => +getComputedStyle(document.querySelector('.hero-card [data-k="hero-glow"]')).opacity > 0.85, null, { timeout: 3000 }).catch(() => {}); await card.screenshot({ path: `${SHOTS}/nox-on.png` });
  await p.waitForFunction(() => +getComputedStyle(document.querySelector('.hero-card [data-k="hero-glow"]')).opacity < 0.1, null, { timeout: 3000 }).catch(() => {}); await card.screenshot({ path: `${SHOTS}/nox-off.png` });
  // TV
  const t = await ctx.newPage(); await t.goto(B + '?role=teacher'); await t.waitForSelector('.tp'); await testOpen(t, { no: 6, mode: 'remote', bots: 0 });
  const live = await t.evaluate(() => window.__dbGet('school/live'));
  const s = await ctx.newPage(); await s.goto(`${B}?role=student&room=${live.code}&as=test:3`); await s.waitForTimeout(3000);
  await t.bringToFront(); await t.click('.tact .btn').catch(() => {}); await t.waitForTimeout(1200);
  const tv = await ctx.newPage(); await tv.setViewportSize({ width: 1280, height: 720 }); tv.on('pageerror', (e) => errs.push('TV ' + e)); const tr = []; tv.on('request', (r) => tr.push(r.url().split('/').pop()));
  await tv.goto(`${B}?role=hall&room=${live.code}`); await tv.waitForTimeout(2500); await tv.click('button:has-text("앞으로")').catch(() => {}); await tv.waitForTimeout(3500);
  ok('TV = 녹스 v8 · 빛 띠 받음', tr.includes('hero-dknight-v8.webp') && tr.includes('hero-dknight-idle8-glow-v8.webp'), tr.filter((u) => /dknight/.test(u)).join(' '));
  await tv.screenshot({ path: `${SHOTS}/nox-tv.png` });
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
