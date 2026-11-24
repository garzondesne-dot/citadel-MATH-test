// 📵 🔨 #14 (📜 11/24 선생님 「중간에 접속 끊기면 아웃 처리해 줘」 · DECISIONS a61d7d3): 🥏 알까기 판에서 학생 폰이 끊기면 30초 뒤 그 판만 아웃 · 다시 들어오면 「연결이 끊겨 이번 판은 끝」
//   NODE_PATH=$(npm root -g) node tools/e2e/funout1124.cjs <폴더> [주소]
const { chromium } = require('playwright');
const { testOpen } = require('./_cls.cjs');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await ctx.addInitScript(() => { window.__AK_SPEED = 1; });
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('리모컨 ' + e));
  const fun = async (code) => t.evaluate((c) => window.__dbGet(`rooms/${c}/fun`), code);
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tp'); await t.evaluate(() => { window.__botSpeed = 4; });
  await testOpen(t, { no: 6, mode: 'remote', bots: 3 }); await t.waitForSelector('[data-k="bots"]');
  const live = await t.evaluate(() => window.__dbGet('school/live'));
  let s = await ctx.newPage(); const url = `${B}?role=student&room=${live.code}&as=${live.cls === 'test' ? 'test' : live.cls}:3`; await s.goto(url); await s.waitForTimeout(2500);
  await t.bringToFront(); await t.click('.tact .btn'); await t.waitForTimeout(800);
  await t.click('[data-slot="rest"]'); await t.waitForSelector('.game'); await t.click('.game:has-text("알까기")'); await t.click('.rbig'); await t.waitForTimeout(800);
  await s.bringToFront(); await s.waitForSelector('[data-k="ak-join"]', { timeout: 10000 }); await s.click('[data-k="ak-join"]'); await s.waitForTimeout(3500);
  await t.bringToFront(); if (!(await t.$('[data-k="ak-go"]'))) await t.click('[data-slot="rest"]').catch(() => {}); await t.click('[data-k="ak-go"]', { timeout: 5000 });
  let f; for (let i = 0; i < 30; i++) { f = await fun(live.code); if (f?.phase === 'play') break; await t.waitForTimeout(300); }
  const me = Object.keys(f.st || {}).find((u) => !u.startsWith('bot'));
  ok('판 시작 · 내 알 있음', f?.phase === 'play' && !!me && f.st[me].on === 1, me);
  await s.close(); const t0 = Date.now(); // 📵 폰 닫음 = 끊김
  let out = false; while (Date.now() - t0 < 50000 && !out) { await t.waitForTimeout(1000); f = await fun(live.code); out = !!f?.out?.[me]; }
  const dt = Math.round((Date.now() - t0) / 1000);
  ok('끊긴 지 30초쯤 = 그 판만 아웃 (30 ~ 45초)', out && dt >= 29 && dt <= 45, `${dt}초`);
  ok('내 알 = 판에서 내려감 · 되살아나지 않음 · 봇 알은 그대로', f.st[me].on === 0 && f.st[me].back > 1e6 && Object.keys(f.st).filter((u) => u.startsWith('bot')).some((u) => f.st[u].on === 1));
  s = await ctx.newPage(); await s.goto(url); await s.waitForTimeout(4000);
  ok('다시 들어온 폰 = 「연결이 끊겨 이번 판은 끝」', /연결이 끊겨/.test((await s.textContent('[data-k="fun-out"]').catch(() => '')) || ''));
  await s.screenshot({ path: `${SHOTS}/funout-phone.png` });
  await t.waitForTimeout(3000); f = await fun(live.code); ok('돌아와도 그 판엔 다시 안 들어감 (알 그대로 내려감)', f.out?.[me] && f.st[me].on === 0);
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close(); process.exit(errs.length ? 1 : 0);
})();
