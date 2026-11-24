// 😆 쉼터 놀이 「아재 퀴즈」 (📜 2026-11-24) — 이 기기 저장 · 🧪 테스트 리모컨 + 🤖 4 + 학생 폰 1 + 종합실
//   리모컨 🏕 → 😆 고르기 → ▶ 시작 → 안내 → 문제(폰 = 빈칸 □ · 칩 8 · 틀린 글자 = ❌ 다시 · 정답 = ✅) → 공개(정답 · why) → … 6문제 → 시상(💎)
//   NODE_PATH=$(npm root -g) node tools/e2e/ajae1124.cjs <폴더> [주소]
const { chromium } = require('playwright');
const { testOpen } = require('./_cls.cjs');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
const bank = require('../../src/rest/ajae.json').list;
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { window.__AJ_SPEED = 0.3; }); // 문제 9초 · 공개 1.5초 (화면 시험만)
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('리모컨 ' + e));
  const txt = async (p, s) => ((await p.textContent(s).catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tp'); await t.evaluate(() => { window.__botSpeed = 4; });
  await testOpen(t, { no: 6, mode: 'remote', bots: +(process.env.BOTS || 4) }); await t.waitForSelector('[data-k="bots"]');
  const live = await t.evaluate(() => window.__dbGet('school/live'));
  const s = await ctx.newPage(); s.on('pageerror', (e) => errs.push('폰 ' + e)); await s.goto(`${B}?role=student&room=${live.code}&as=${live.cls === 'test' ? 'test' : live.cls}:3`); await s.waitForTimeout(2500);
  const tv = await ctx.newPage(); await tv.setViewportSize({ width: 1280, height: 720 }); tv.on('pageerror', (e) => errs.push('TV ' + e));
  await t.bringToFront(); await t.click('.tact .btn'); await t.waitForTimeout(800);
  await t.click('[data-slot="rest"]'); await t.waitForSelector('.game');
  ok('🏕 놀이 목록에 😆 아재 퀴즈', /아재 퀴즈/.test(await txt(t, '.games')), await txt(t, '.games'));
  await t.click('.game:has-text("아재 퀴즈")'); await t.waitForTimeout(200);
  ok('📜 회차제: 리모컨 「1회차 / 8」 · 회차 단추 8개', (await txt(t, '[data-k="aj-round"]')).includes('1회차 / 8') && (await t.$$('[data-k="aj-round"] button')).length === 8, await txt(t, '[data-k="aj-round"]'));
  await t.click('.rbig'); await t.waitForTimeout(800);
  const f0 = await t.evaluate((c) => window.__dbGet(`rooms/${c}/fun`), live.code);
  ok('▶ 시작 = 안내 · 1회 = 1 ~ 6번 · 칩 8', f0?.kind === 'aj' && f0.phase === 'intro' && f0.round === 1 && f0.qs.join() === '1,2,3,4,5,6' && f0.chips.length >= 8, `${f0?.kind} ${f0?.phase} ${f0?.qs?.length}`);
  await tv.goto(`${B}?role=hall&room=${live.code}`);
  await s.bringToFront(); await s.waitForTimeout(4000);
  await s.waitForSelector('[data-k="aj-chips"]', { timeout: 15000 });
  const fq = await t.evaluate((c) => window.__dbGet(`rooms/${c}/fun`), live.code), q = bank.find((x) => x.no === fq.qs[fq.n - 1]), ans = Array.from(q.a);
  ok('폰 = 문제 · 빈칸 □ 수 = 정답 글자 수', (await txt(s, '[data-k="aj-q"]')) === q.q && (await s.$$('[data-k="aj-slots"] span')).length === ans.length, `${q.q} ${ans.length}`);
  // ❌ 틀린 글자: 정답 아닌 칩을 정답 길이만큼
  const chips = await s.$$eval('[data-k="aj-chips"] button', (bs) => bs.map((x) => x.dataset.c));
  const wrong = chips.map((c, i) => [c, i]).filter(([c]) => !ans.includes(c)).slice(0, ans.length);
  if (wrong.length === ans.length) {
    for (const [, i] of wrong) await s.click(`[data-k="aj-chips"] button >> nth=${i}`);
    await s.waitForTimeout(150); ok('틀린 글자 = ❌ 다시', !!(await s.$('[data-k="aj-bad"]'))); await s.screenshot({ path: `${SHOTS}/aj-bad.png` }); await s.waitForTimeout(900);
    ok('❌ 뒤 = 칩 다시 쓸 수 있음', (await s.$$('[data-k="aj-chips"] button:not([disabled])')).length === chips.length);
  }
  // ✅ 정답 글자 차례로
  const used = [];
  for (const ch of ans) { const idx = chips.findIndex((c, k) => c === ch && !used.includes(k)); used.push(idx); await s.click(`[data-k="aj-chips"] button >> nth=${idx}`); await s.waitForTimeout(80); }
  await s.waitForTimeout(500);
  ok('정답 = ✅ 맞혔어요 · n번째', /맞혔어요/.test(await txt(s, '[data-k="aj-done"]')), await txt(s, '[data-k="aj-done"]'));
  await s.screenshot({ path: `${SHOTS}/aj-phone.png` });
  await tv.bringToFront(); await tv.waitForTimeout(1200);
  ok('종합실 = 아재 퀴즈 화면', !!(await tv.$('[data-k="aj-tv"]')), (await txt(tv, '[data-k="aj-tv"]')).slice(0, 120));
  ok('📜 11/24 진행자 현자(폰 · TV) · TV 참가 용사 줄', !!(await tv.$('[data-k="aj-host"]')) && (await tv.$$('[data-k="aj-party"] i')).length >= 2 && !!(await s.$('[data-k="aj-host"]')));
  await tv.screenshot({ path: `${SHOTS}/aj-tv.png` });
  await s.bringToFront(); await s.waitForSelector('[data-k="aj-ans"]', { timeout: 15000 }).catch(() => {});
  ok('공개 = 정답 · why · 내 점수', (await txt(s, '[data-k="aj-ans"]')) === q.a && /번째로 맞힘|맞혔어요/.test(await txt(s, '.aj')), await txt(s, '.aj'));
  await t.bringToFront();
  for (let i = 0; i < 120; i++) { const f = await t.evaluate((c) => window.__dbGet(`rooms/${c}/fun`), live.code); if (!f || f.phase === 'end') break; await t.waitForTimeout(1000); }
  const f1 = await t.evaluate((c) => window.__dbGet(`rooms/${c}/fun`), live.code);
  ok('6문제 뒤 끝 · 점수 · 우승', f1?.phase === 'end' && Object.keys(f1.score || {}).length >= 1 && (f1.win || []).length >= 1, `${f1?.phase} ${JSON.stringify(f1?.score)}`);
  await s.bringToFront(); await s.waitForTimeout(1500);
  ok('폰 = 내 등수 · 점수 (3등 밖이면 「점수가 없어요」)', /등 · \d+점|점수가 없어요/.test(await txt(s, '[data-k="aj-me"]')), await txt(s, '[data-k="aj-me"]'));
  await s.screenshot({ path: `${SHOTS}/aj-end.png` }); await tv.bringToFront(); await tv.waitForTimeout(800); await tv.screenshot({ path: `${SHOTS}/aj-tv-end.png` });
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
