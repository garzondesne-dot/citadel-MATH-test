// 💡 친구 힌트 주기 (📜 2026-11-17 #23) — 시험 모드 · set-06@7 소레이드 u4(근거 줄 있음)
//   가상 친구 3명 중 둘이 힌트를 줌 → 종합실 = 먼저 준 1명 머리 위 「💡 ○○의 힌트」 + 근거 문장 + 👍 +1 · 학생 폰(아직 푸는 중) = 「💡 친구 힌트 2개」(누를 때만 펼침)
//   NODE_PATH=$(npm root -g) node tools/e2e/hintgive.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
const LID = 'set-06@7', MID = 'u4', ROOM = 'HG1';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('TV ' + e));
  await t.goto(`${B}?role=hall&mode=test&lesson=${encodeURIComponent(LID)}&room=${ROOM}`); await t.waitForSelector('.dock', { timeout: 20000 });
  const s = await ctx.newPage(); await s.setViewportSize({ width: 390, height: 844 }); s.on('pageerror', (e) => errs.push('폰 ' + e));
  await s.goto(`${B}?role=student&mode=test&lesson=${encodeURIComponent(LID)}&room=${ROOM}`); await s.waitForTimeout(2000);
  await t.bringToFront(); await t.evaluate(() => window.__tvFake?.(3));
  for (let i = 0; i < 14 && !(await t.$('[data-k="tv-gauge"]')); i++) { await t.mouse.move(600, 400); await t.click('.dock .go').catch(() => {}); await t.waitForTimeout(800); } // 문제 4 = u4 소레이드(첫 몬스터)
  await t.evaluate(([R, M]) => { window.__dbSet(`rooms/${R}/players/fake1/hint/${M}`, Date.now() - 5000); window.__dbSet(`rooms/${R}/players/fake2/hint/${M}`, Date.now()); }, [ROOM, MID]);
  await t.waitForTimeout(1500);
  const bub = ((await t.textContent('[data-k="tv-hint"]').catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  ok('종합실 = 먼저 준 1명 「💡 ○○의 힌트」 + 근거 문장 + 👍 +1', /가상2의 힌트/.test(bub) && /👍 \+1/.test(bub), bub);
  await t.screenshot({ path: `${SHOTS}/hint-tv.png` });
  await s.bringToFront(); await s.waitForTimeout(1500);
  const fh = ((await s.textContent('[data-k="friend-hints"] summary').catch(() => '')) || '').trim();
  ok('학생 폰 = 「💡 친구 힌트 2개」(접힘)', /친구 힌트 2개/.test(fh) && !(await s.$eval('[data-k="friend-hints"]', (e) => e.open).catch(() => true)), fh);
  await s.click('[data-k="friend-hints"] summary').catch(() => {}); await s.waitForTimeout(300); await s.screenshot({ path: `${SHOTS}/hint-phone.png` });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
