// 🚪 던전 문 1차 · 📄 기말 대비 답안지 (📜 11/25 · 머리 🔨) — 미리 보기 서버 4173 · 이 기기 저장 · 폰 375
//   ① 교사 ⚙ → 🚪 정답표 A · B · C 저장(시험용 가짜 값) · 수업 탭 1-1 카드 「▶ 답안지 열기」
//   ② 학생 캠프(테스트 꼴) → 🏰 성채 → 📄 답안지 → A 틀림(3번) → 틀린 번호만 · B → B 틀림 → C → C 5 · 6 · 7 틀림 → 다시 3칸 → 7번만 틀림 → 1칸 → 통과
//   ③ 종합실 TV 입장 대기 화면 = 🚪 던전 문 판(통과 n / 전체 · 반별)
//   NODE_PATH=$(npm root -g) node tools/e2e/abc1125.cjs <그림 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
const K = { A: '1111111', B: '2222222', C: '3412341' };
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 375, height: 760 } });
  // ① 교사
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('교사 ' + e));
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tabs');
  await t.click('[data-k="tgear"]'); await t.click('[data-k="set-abc"]'); await t.waitForSelector('[data-k="abc-panel"]');
  for (const s of ['A', 'B', 'C']) { await t.fill(`[data-k="abc-key"][data-set="${s}"] input`, s === 'A' ? '① ① ① ① ① ① ①' : K[s]); await t.click(`[data-k="abc-key"][data-set="${s}"] .sv`); await t.waitForTimeout(200); }
  const now = await t.$$eval('[data-k="abc-key-now"]', (xs) => xs.map((x) => x.textContent));
  ok('① 정답표 3세트 저장(동그라미 숫자도 받음)', now.every((x) => /①|②|③|④/.test(x)), now.join(' | '));
  await t.fill('[data-k="abc-key"][data-set="A"] input', '12345'); await t.click('[data-k="abc-key"][data-set="A"] .sv');
  ok('① 틀린 꼴 정답표 = 저장 안 함 · 안내', /일곱 개/.test(await t.textContent('[data-k="abc-msg"]')));
  await t.screenshot({ path: `${SHOTS}/abc-teacher-panel.png` });
  await t.keyboard.press('Escape'); await t.goto(B + '?role=teacher'); await t.waitForSelector('.tabs');
  await t.click('[data-k="cls-row"] [data-cls="1-1"]'); await t.waitForSelector('[data-k="abc-card"]', { timeout: 6000 });
  ok('① 수업 탭 · 1-1 카드 닫힘으로 시작', /답안지 열기/.test(await t.textContent('[data-k="abc-flip"]')));
  await t.click('[data-k="abc-flip"]'); await t.waitForTimeout(400);
  ok('① 「▶ 답안지 열기」 → 열림', /닫기/.test(await t.textContent('[data-k="abc-flip"]')) && (await t.evaluate(() => JSON.stringify(window.__dbGet?.('school/abc/open') ?? null))).includes('1-1'));
  await t.screenshot({ path: `${SHOTS}/abc-teacher-card.png` });
  // ② 학생 캠프 (테스트 꼴 = 정답표가 있으면 보임 · 기록 = 이 화면만)
  const s = await ctx.newPage(); s.on('pageerror', (e) => errs.push('학생 ' + e));
  await s.goto(B + '?role=camp&from=me'); await s.evaluate(() => { localStorage.setItem('atb-e2e-nointro', '1'); for (const w of ['me', 'teacher']) localStorage.setItem(`citadel-exam-cut|${w}|2026-12-11`, '1'); }); await s.reload(); await s.waitForTimeout(2500);
  await s.click('[data-k="as-stu"]').catch(() => {}); await s.waitForTimeout(800);
  await s.click('[data-zone="castle"]'); await s.waitForSelector('[data-k="castle-abc"]', { timeout: 6000 });
  ok('② 🏰 성채 시트 맨 위 = 📄 답안지', true);
  await s.screenshot({ path: `${SHOTS}/abc-castle-sheet.png` });
  await s.click('[data-k="castle-abc"]'); await s.waitForSelector('[data-k="abc-paper"]');
  const pickAll = async (ans) => { const rows = await s.$$('[data-k="abc-row"]'); for (let i = 0; i < rows.length; i++) await rows[i].$(`[data-k="abc-opt"][data-v="${ans[i]}"]`).then((x) => x.click()); };
  const send = async () => { await s.click('.ab button.pmain, .ab [data-k="main"], .ab .bact button'); await s.waitForTimeout(200); await s.click('.ab button.pmain, .ab [data-k="main"], .ab .bact button'); await s.waitForTimeout(500); };
  ok('② A세트 · 7줄 × ① ~ ④', (await s.textContent('[data-k="abc-set"]')).includes('A') && (await s.$$('[data-k="abc-row"]')).length === 7);
  await pickAll([1, 1, 2, 1, 1, 1, 1]); await s.screenshot({ path: `${SHOTS}/abc-paper-A.png` });
  await s.click('.ab .bact button, .ab button.pmain'); await s.waitForTimeout(200);
  ok('② 처음 누름 = 「정말 낼까요?」', /정말 낼까요/.test(await s.textContent('.ab')));
  await s.click('.ab .bact button, .ab button.pmain'); await s.waitForTimeout(500);
  ok('② A 6/7 = 틀린 번호 3번만 · 정답 안 보임', (await s.textContent('[data-k="abc-score"]')).includes('6 / 7') && (await s.textContent('[data-k="abc-wrong"]')).trim() === '3번');
  await s.screenshot({ path: `${SHOTS}/abc-fail-A.png` });
  const next = async () => { await s.click('.ab .bact button, .ab button.pmain'); await s.waitForSelector('[data-k="abc-paper"]'); };
  await next(); ok('② 다음 = B세트 · 지난 세트 틀린 번호 한 줄', (await s.textContent('[data-k="abc-set"]')).includes('B') && /3/.test(await s.textContent('[data-k="abc-prev"]')));
  await pickAll([2, 2, 2, 2, 2, 2, 1]); await send();
  await next(); ok('② B 틀림 → C세트', (await s.textContent('[data-k="abc-set"]')).includes('C'));
  await pickAll([3, 4, 1, 2, 1, 1, 2]); await send();
  ok('② C 4/7 · 5 · 6 · 7번', (await s.textContent('[data-k="abc-wrong"]')).replace(/\s/g, '') === '5번6번7번');
  await next(); ok('② C 뒤 = 틀린 번호만 다시(3줄 · 5 · 6 · 7)', (await s.$$eval('[data-k="abc-row"]', (xs) => xs.map((x) => x.dataset.n))).join() === '5,6,7');
  await s.screenshot({ path: `${SHOTS}/abc-redo.png` });
  await pickAll([3, 4, 2]); await send();
  await next(); ok('② 또 틀린 7번만 남음', (await s.$$eval('[data-k="abc-row"]', (xs) => xs.map((x) => x.dataset.n))).join() === '7');
  await pickAll([1]); await send();
  ok('② 모두 맞힘 = 통과 · 돌', !!(await s.$('[data-k="abc-pass"]')));
  await s.screenshot({ path: `${SHOTS}/abc-pass.png` });
  ok('② 통과 뒤 단추 = 🏰 성채 던전으로', /성채/.test(await s.textContent('.ab .bact button, .ab button.pmain')));
  ok('② 가로 넘침 0', await s.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  // ③ TV
  const v = await ctx.newPage(); await v.setViewportSize({ width: 1280, height: 720 }); v.on('pageerror', (e) => errs.push('TV ' + e));
  await v.goto(B + '?role=hall'); await v.waitForTimeout(3500);
  ok('③ TV 입장 대기 = 🚪 던전 문 판', !!(await v.$('[data-k="tv-abc-door"]')), await v.textContent('[data-k="tv-abc-door"]').catch(() => '없음'));
  await v.screenshot({ path: `${SHOTS}/abc-tv.png` });
  // 닫으면 TV 판도 사라짐
  await t.click('[data-k="abc-flip"]'); await t.waitForTimeout(400); await v.reload(); await v.waitForTimeout(3000);
  ok('③ 교사가 닫으면 TV 판 없음(대항전 줄로)', !(await v.$('[data-k="tv-abc-door"]')));
  await b.close(); console.log(errs.length ? `❌ ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); process.exit(errs.length ? 1 : 0);
})();
