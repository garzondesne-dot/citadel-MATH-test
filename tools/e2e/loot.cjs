// 🎒 학생 폰 수업 결과 (📜 2026-11-15 머리 🔨 ⑦): 정식 「오늘의 전리품」 · 위 = 배경 + 내 용사 + 띠 · 줄이 차례로 · 탭 = 건너뛰기만
//   선생님이 수업을 닫아도 결과 화면 그대로 · 단추는 1.5초 뒤에만 「🏕 내 캠프로」 · 자세히 = 몬스터별 · 개념별 · 복습 · 📤 카드 2종(그림 만들어짐)
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('TV ' + String(e)));
  await t.goto(`${B}?role=hall&mode=test&lesson=set-05&room=LT1`); await t.waitForSelector('.dock', { timeout: 20000 }); await t.waitForTimeout(800);
  const s = await ctx.newPage(); await s.setViewportSize({ width: 390, height: 844 }); s.on('pageerror', (e) => errs.push('폰 ' + String(e)));
  await s.goto(`${B}?role=student&mode=test&lesson=set-05&room=LT1`); await s.waitForTimeout(2500);
  for (let i = 0; i < 30 && !(await s.$('[data-k="loot"]')); i++) {
    await t.bringToFront(); await t.mouse.move(600, 400); await t.waitForTimeout(120); const g = t.locator('.dock .go').first(); if (await g.isVisible().catch(() => false)) await g.click().catch(() => {}); await t.waitForTimeout(500);
    await s.bringToFront(); await s.waitForTimeout(600);
  }
  ok('결과 = 🎒 오늘의 전리품', !!(await s.$('[data-k="loot"]')));
  if (!(await s.$('[data-k="loot"]'))) { await s.screenshot({ path: `${SHOTS}/loot-stuck.png` }); log(errs.join('\n')); await b.close(); return; }
  const early = await s.evaluate(() => ({ on: document.querySelectorAll('[data-k="loot"] .row.on').length, all: document.querySelectorAll('[data-k="loot"] .row').length, scene: !!document.querySelector('.edge'), mon: !!document.querySelector('.edge .mon'), note: document.querySelector('.edge .tag')?.textContent }));
  ok('위 = 장면(배경 · 용사 · 띠 · 몬스터 없음) · 처음엔 줄이 다 안 보임(차례로)', early.scene && !early.mon && !!early.note && early.on < early.all, JSON.stringify(early));
  await s.screenshot({ path: `${SHOTS}/loot-0.png` });
  await s.click('[data-k="loot"]'); await s.waitForTimeout(400);
  const after = await s.evaluate(() => ({ on: document.querySelectorAll('[data-k="loot"] .row.on').length, all: document.querySelectorAll('[data-k="loot"] .row').length, loot: !!document.querySelector('[data-k="loot"]'), xp: document.querySelector('[data-k="lt-xp"] .num')?.textContent }));
  ok('탭 = 건너뛰기만 (줄 모두 · 화면 그대로)', after.loot && after.on === after.all, JSON.stringify(after));
  await s.screenshot({ path: `${SHOTS}/loot-1.png`, fullPage: true });
  await s.click('[data-k="loot-more"] summary'); await s.waitForTimeout(300);
  const more = await s.evaluate(() => ({ rows: document.querySelectorAll('[data-k="loot-more"] .mt tr').length, card: !!document.querySelector('[data-k="card-battle"]') }));
  ok('자세히 = 몬스터별 표 · 📤 카드 단추', more.rows > 0 && more.card, JSON.stringify(more));
  await s.click('[data-k="card-battle"]'); await s.waitForSelector('.cimg', { timeout: 15000 }).catch(() => {});
  ok('⚔ 전투 기록 카드 그림 만들어짐', !!(await s.$('.cimg')));
  await s.screenshot({ path: `${SHOTS}/loot-card.png` });
  await s.keyboard.press('Escape'); await s.waitForTimeout(300); const x = await s.$('.sheet .x'); if (x) await x.click().catch(() => {}); await s.waitForTimeout(300);
  // 선생님이 수업을 닫음 → 화면 그대로 · 단추 1.5초 잠김
  await s.evaluate(() => window.__dbSet('rooms/LT1/state/closed', true)); await s.waitForTimeout(300);
  const c1 = await s.evaluate(() => ({ loot: !!document.querySelector('[data-k="loot"]'), link: !!document.querySelector('a[href="?"].pmain, .pmain[href="?"]'), url: location.search }));
  ok('닫힘 직후 = 결과 그대로 · 캠프 링크 아직 없음', c1.loot && !c1.link, JSON.stringify(c1));
  await s.mouse.click(195, 800); await s.waitForTimeout(300);
  ok('닫힘 직후 아래 단추 자리 탭 = 넘어가지 않음', /role=student/.test(await s.evaluate(() => location.search)));
  await s.waitForTimeout(1700);
  const c2 = await s.evaluate(() => ({ loot: !!document.querySelector('[data-k="loot"]'), link: !!document.querySelector('a[href="?"]') }));
  ok('1.5초 뒤 = 「🏕 내 캠프로」 · 결과는 그대로', c2.loot && c2.link, JSON.stringify(c2));
  await s.screenshot({ path: `${SHOTS}/loot-closed.png` });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
