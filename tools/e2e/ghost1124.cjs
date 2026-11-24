// 👻 📷 (📜 11/24 🔨 #9 학교판 첫 수업): ① 학생 폰 화면이 숨으면(화면 꺼짐 · 다른 앱 · 카메라) 바로 끊김 → 종합실 「들어온 학생」 줄어듦 · 다시 보이면 돌아옴 ② 수업 중 종합실 막대 「📷 입장 QR」 = QR 크게 · 누르면 닫힘
//   NODE_PATH=$(npm root -g) node tools/e2e/ghost1124.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }), R = 'TG' + Date.now().toString(36).slice(-4);
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('TV ' + e));
  await t.goto(`${B}?role=hall&mode=test&lesson=set-08&room=${R}`); await t.waitForSelector('.dock', { timeout: 20000 });
  const s = await ctx.newPage(); await s.setViewportSize({ width: 390, height: 780 }); s.on('pageerror', (e) => errs.push('폰 ' + e));
  await s.goto(`${B}?role=student&mode=test&lesson=set-08&room=${R}`); await s.waitForTimeout(3500);
  const n = async () => { await t.waitForTimeout(300); return Number((await t.evaluate(() => document.querySelector('.nbox b')?.firstChild?.textContent || '')).trim()); };
  const n0 = await n(); ok('폰 들어옴 = 종합실 들어온 학생 ≥ 1', n0 >= 1, String(n0));
  const hide = (h) => s.evaluate((h) => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') }); document.dispatchEvent(new Event('visibilitychange')); }, h);
  const t0 = Date.now(); await hide(true); let n1 = n0;
  for (let i = 0; i < 20 && n1 >= n0; i++) { n1 = await n(); }
  ok('폰 화면 숨김 = 바로 끊김 (6초 안)', n1 === n0 - 1 && Date.now() - t0 < 6000, `${n0} → ${n1} · ${Date.now() - t0}ms`);
  await t.waitForTimeout(9000); ok('숨긴 채 9초 = 뒤에서 다시 붙지 않음', (await n()) === n0 - 1);
  await hide(false); await t.waitForTimeout(1500); ok('다시 보임 = 바로 돌아옴', (await n()) === n0, String(await n()));
  // 📷
  await t.bringToFront(); await t.mouse.move(600, 400); await t.waitForTimeout(200);
  for (let i = 0; i < 2 && !(await t.$('[data-k="dock-qr"]')); i++) { const g = t.locator('.dock .go').first(); if (await g.isVisible().catch(() => false)) await g.click(); await t.waitForTimeout(1200); await t.mouse.move(600, 420); }
  await t.click('[data-k="dock-qr"]'); await t.waitForTimeout(600);
  ok('종합실 📷 입장 QR = QR 크게', !!(await t.$('[data-k="tv-qr"] .eqr')));
  await t.screenshot({ path: `${SHOTS}/ghost-tvqr.png` });
  await t.click('[data-k="tv-qr"]'); await t.waitForTimeout(500); ok('누르면 닫힘', !(await t.$('[data-k="tv-qr"]')));
  // 📲 리모컨 = 수업 중 아래 줄 「📷 입장 QR」 → 같은 QR 창 · 큰 단추 = 종합실에도 크게
  const { testOpen } = require('./_cls.cjs');
  const r = await ctx.newPage(); await r.setViewportSize({ width: 390, height: 844 }); r.on('pageerror', (e) => errs.push('리모컨 ' + e));
  await r.goto(B + '?role=teacher'); await r.evaluate(() => localStorage.clear()); await r.reload(); await r.waitForSelector('.tp');
  await testOpen(r, { no: 6, mode: 'remote', bots: 2 }); await r.click('.tact .btn'); await r.waitForTimeout(800);
  ok('리모컨 수업 중 아래 줄 = 「📷 입장 QR」', !!(await r.$('.lbar [data-k="qr-open"]')));
  ok('360 · 390 아래 줄 넘침 0', await r.evaluate(() => { const l = document.querySelector('.lbar'); return !!l && l.scrollWidth <= l.clientWidth + 1; }));
  await r.click('[data-k="qr-open"]'); await r.waitForTimeout(500);
  ok('누르면 QR 창 (코드 · QR)', !!(await r.$('.qrbox')));
  await r.screenshot({ path: `${SHOTS}/ghost-remote-qr.png` });
  await r.click('.sheet .act .btn, .sheet button:has-text("종합실에도")'); await r.waitForTimeout(500);
  const live = await r.evaluate(() => window.__dbGet('school/live'));
  ok('큰 단추 = 종합실 QR 켬 (state.qr)', (await r.evaluate((c) => window.__dbGet(`rooms/${c}/state/qr`), live.code)) === true);
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close(); process.exit(errs.length ? 1 : 0);
})();
