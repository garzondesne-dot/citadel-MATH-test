// 🐞 ⚔ 11/26 1-3반 「공격하면 그림자 분신술」 — 종합실(TV) 공격 대역이 같은 학생에게 둘 겹치는지 (이 기기 · 🧪 테스트 · 봇 10)
//   봇이 빠르게 연달아 맞히면 같은 학생 공격이 겹쳐 재생 → 대역(.tvh) 둘 · 먼저 끝난 쪽이 숨긴 용사를 다시 켬
//   NODE_PATH=$(npm root -g) node tools/e2e/clone1126.cjs <폴더> [주소]
const { chromium } = require('playwright');
const { testOpen } = require('./_cls.cjs');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('리모컨 ' + e));
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tp'); await t.evaluate(() => { window.__botSpeed = 6; });
  await testOpen(t, { no: 6, mode: 'remote', bots: 10 }); await t.waitForTimeout(1500);
  const live = await t.evaluate(() => window.__dbGet('school/live')); const code = live.code;
  const tv = await ctx.newPage(); await tv.setViewportSize({ width: 1280, height: 720 }); tv.on('pageerror', (e) => errs.push('TV ' + e));
  await tv.goto(`${B}?role=hall&room=${code}`); await tv.waitForTimeout(2500);
  const steps = await t.evaluate((c) => { const r = window.__dbGet(`rooms/${c}`); return r?.meta?.lesson; }, code);
  // 첫 몬스터 단계로 · 정찰 0 (6차시 = 개념 1 · 문제 1 …)
  await t.evaluate((c) => { window.__dbSet(`rooms/${c}/meta/solve`, 0); const st = window.__dbGet(`rooms/${c}/state`) || {}; window.__dbSet(`rooms/${c}/state`, { ...st, step: 1, stepAt: Date.now() }); }, code);
  await t.waitForTimeout(2000);
  await tv.bringToFront();
  const r = await tv.evaluate(() => new Promise((res) => { let dbl = 0, frames = 0, maxN = 0; const t0 = performance.now(); const f = () => { frames++; const urls = [...document.querySelectorAll('.tvh .art')].map((e) => e.style.backgroundImage); maxN = Math.max(maxN, urls.length); const seen = new Set(); for (const u of urls) { if (seen.has(u)) { dbl++; break; } seen.add(u); } if (performance.now() - t0 < 20000) requestAnimationFrame(f); else res({ dbl, frames, maxN }); }; requestAnimationFrame(f); }));
  console.log('📈 TV 20초', JSON.stringify(r), '· 단계', await t.evaluate((c) => window.__dbGet(`rooms/${c}/state/step`), code), steps);
  await tv.screenshot({ path: `${SHOTS}/clone-tv.png` });
  ok('공격 대역이 보였음(봇이 공격함)', r.maxN >= 1, `한 번에 최대 ${r.maxN}`);
  ok('같은 용사 대역 둘 = 0 프레임', r.dbl === 0, `${r.dbl} 프레임`);
  await b.close(); console.log(errs.length ? `❌ ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); process.exit(errs.length ? 1 : 0);
})();
