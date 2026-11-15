// 📜 문제 칸 양피지 = 기본값 켬 (📜 2026-11-15 머리 🔨): 저장값 없는 학생 폰 = 문제 카드 양피지 · TV 📄 문제 창 = 같은 양피지 · TV 🎨 테마 창 스위치로 끄면 그대로 기억
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  const R = 'QP1', Q = `mode=test&lesson=set-08&room=${R}`;
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('TV ' + e));
  await t.goto(`${B}?role=hall&${Q}`); await t.waitForSelector('.dock', { timeout: 20000 }); await t.waitForTimeout(800);
  ok('TV 저장값 없음 → 양피지 켬', await t.evaluate(() => document.documentElement.dataset.qpaper === '1'));
  const s = await ctx.newPage(); await s.setViewportSize({ width: 390, height: 844 }); s.on('pageerror', (e) => errs.push('폰 ' + e));
  await s.goto(`${B}?role=student&${Q}`); await s.waitForTimeout(2000);
  for (let i = 0; i < 8 && !(await s.$('.bcard [data-k="hint"], .bcard .qi, .bcard .q')); i++) { await t.bringToFront(); await t.mouse.move(600, 400); await t.waitForTimeout(120); const g = t.locator('.dock .go').first(); if (await g.isVisible().catch(() => false)) await g.click().catch(() => {}); await t.waitForTimeout(800); await s.bringToFront(); await s.waitForTimeout(5800); }
  const bg = await s.evaluate(() => { const c = [...document.querySelectorAll('.bcard')].pop(); return c ? getComputedStyle(c).backgroundImage : ''; });
  ok('학생 문제 카드 = 양피지 그림', /ui-paper/.test(bg), bg.slice(0, 60));
  await s.screenshot({ path: `${SHOTS}/qp-student.png` });
  const mid = await t.evaluate(() => { const st = JSON.parse(localStorage.getItem('citadel-v1-test-db|rooms/QP1/state') || 'null'); return st; });
  await t.bringToFront();
  await t.evaluate(() => { const ids = [...document.querySelectorAll('[data-step]')].map((x) => x.dataset.step); void ids; window.__dbSet('rooms/QP1/state/sheet', 'm1'); }); await t.waitForTimeout(1200);
  const tv = await t.evaluate(() => { const c = document.querySelector('.simg.qpaper'); return c ? getComputedStyle(c).backgroundImage : null; });
  ok('TV 📄 문제 창 = 양피지', !!tv && /ui-paper/.test(tv), String(tv).slice(0, 60));
  await t.screenshot({ path: `${SHOTS}/qp-tv-sheet.png` });
  await t.evaluate(() => window.__dbSet('rooms/QP1/state/sheet', null)); await t.waitForTimeout(500);
  // 끄기 = TV 🎨 테마 창 스위치
  await t.mouse.move(600, 400); await t.click('[data-k="tvset"]').catch(() => {}); await t.waitForTimeout(300); await t.click('[data-k="tvtheme"]'); await t.waitForTimeout(400);
  ok('TV 🎨 테마 창에 양피지 스위치(켜짐)', (await t.getAttribute('[data-k="qpaper"]', 'aria-checked')) === 'true');
  await t.click('[data-k="qpaper"]'); await t.waitForTimeout(200);
  ok('끄면 바로 꺼짐 · 저장 0', await t.evaluate(() => !document.documentElement.dataset.qpaper && localStorage.getItem('citadel-v1-qpaper') === '0'));
  await t.reload(); await t.waitForSelector('.dock', { timeout: 20000 }); await t.waitForTimeout(600);
  ok('새로 고쳐도 끔 그대로', await t.evaluate(() => !document.documentElement.dataset.qpaper));
  void mid;
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
