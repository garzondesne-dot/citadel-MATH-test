// 📝 #35 형성평가 불참 대책 A · B · C (📜 2026-11-17) — 이 기기 저장 · 🧪 테스트 9차시 + 🤖 3 · 폰 390
//   A = 도입 「지금」 칸 「📋 지난 n차시 형성평가 미제출 n명 · 🎯 허수아비로 안내」 · B = 형성평가 열린 뒤 안 낸 칸 👑 · 톡 = 도장 안 됨 · 낸 뒤 = 도장
//   C = ⏰ 남은 n분 · 「👑 형성평가 지금 열기」 → 형성평가 단계 · 남은 몬스터 🎯 · 학생 폰 = 「✅ 형성평가 제출 완료」
//   NODE_PATH=$(npm root -g) node tools/e2e/form35.cjs <폴더> [주소]
const { chromium } = require('playwright');
const { testOpen } = require('./_cls.cjs');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('리모컨 ' + e));
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tp');
  const set = (p, v) => t.evaluate(([p, v]) => window.__dbSet(p, v), [p, v]), get = (p) => t.evaluate((p) => window.__dbGet(p), p);
  // A: 지난 수업 = 8차시 형성평가를 연 수업 (테스트 반)
  for (const c of ['1-6~test', 'test~test']) await set(`school/lastLesson/${c}`, { lesson: 'set-08', no: 8, code: 'OLD1', boss: true, at: Date.now() - 864e5 });
  await testOpen(t, { no: 9, mode: 'remote', bots: 3 }); await t.waitForSelector('[data-k="bots"]'); await t.waitForTimeout(1500);
  const live = await get('school/live'), P = `rooms/${live.code}`;
  await t.click('.tact .btn'); await t.waitForTimeout(800); // ▶ 수업 시작 → 도입
  const pv = await t.$('[data-k="prev-pend"]');
  ok('A 도입 「지금」 칸 = 📋 지난 8차시 형성평가 미제출 n명 · 🎯 허수아비로 안내', !!pv && /지난 8차시 형성평가 미제출 \d+명/.test(await pv.textContent()), pv ? (await pv.textContent()).trim() : `반 ${live.cls}`);
  await t.screenshot({ path: `${SHOTS}/form35-A.png` });
  if (pv) { await t.click('[data-k="prev-open"]'); await t.waitForTimeout(300); ok('A 누르면 번호 목록', /번/.test(await t.textContent('[data-k="prev-nums"]').catch(() => ''))); await t.screenshot({ path: `${SHOTS}/form35-A-sheet.png` }); await t.click('[data-k="prev-ok2"]'); await t.waitForTimeout(300); ok('A 「안내했어요」 = 띠 닫힘', !(await t.$('[data-k="prev-pend"]'))); }
  // C: 수업 시작 40분 전 · 문제 1 단계 → 남은 5분 ≤ 4 + 3
  await set(`${P}/meta/t0`, Date.now() - 40 * 60e3); await set(`${P}/state/step`, 2); await set(`${P}/state/stepAt`, Date.now()); await t.waitForTimeout(1500);
  const bc = await t.$('[data-k="boss-clock"]');
  ok('C ⏰ 남은 n분 · 👑 형성평가 지금 열기 (문제 푸는 중에도)', !!bc && /⏰ 남은 \d+분/.test(await bc.textContent()), bc ? (await bc.textContent()).trim() : '');
  await t.screenshot({ path: `${SHOTS}/form35-C.png` });
  if (bc) await t.click('[data-k="boss-go"]'); await t.waitForTimeout(800);
  const st = await get(`${P}/state`);
  ok('C 누름 = 형성평가 단계 · 남은 몬스터 🎯', st.step === 10 && Object.keys(st.sent || {}).length >= 4, `step ${st.step} · 보냄 ${Object.keys(st.sent || {}).join(',')}`);
  ok('C 띠 사라짐', !(await t.$('[data-k="boss-clock"]')));
  // B: 도장 모드 → 아직 안 낸 칸 👑 · 톡 = 도장 안 됨
  const bots = Object.keys((await get(`${P}/players`)) || {}); for (const u of bots) await set(`${P}/bossSub/${u}`, null);
  await t.click('[data-k="stamp-mode"]'); await t.waitForTimeout(400);
  const u = bots[0], num = await get(`${P}/players/${u}/num`), cell = `.nums .n[data-n="${num}"]`;
  ok('B 안 낸 칸 = 👑', !!(await t.$(`${cell} [data-k="stamp-boss"]`)));
  await t.click(cell); await t.waitForTimeout(300);
  ok('B 안 낸 학생 톡 = 도장 안 됨', !(await get(`${P}/stamp/${u}`)));
  await t.screenshot({ path: `${SHOTS}/form35-B-cell.png` });
  await set(`${P}/bossSub/${u}/0`, { 0: 0 }); await t.waitForTimeout(500);
  await t.click(cell); await t.waitForTimeout(300);
  ok('B 낸 뒤 톡 = 도장', !!(await get(`${P}/stamp/${u}`)));
  // 학생 폰: 제출 뒤 「✅ 형성평가 제출 완료」
  const s = await ctx.newPage(); s.on('pageerror', (e) => errs.push('학생 ' + e));
  await s.goto(`${B}?role=student&room=${live.code}&tab=1`); await s.waitForTimeout(2500);
  const me = await s.evaluate(() => JSON.parse(sessionStorage.getItem('citadel-v1-tab') || '{}').uid);
  await set(`${P}/state/stepAt`, Date.now() - 180e3); await set(`${P}/meta/solve`, 0); await set(`${P}/bossSub/${me}/0`, { 0: 0 }); await s.waitForTimeout(1500);
  const sb = await s.$('[data-k="boss-subok"]');
  ok('B 학생 폰 = 「✅ 형성평가 제출 완료」 크게', !!sb);
  await s.screenshot({ path: `${SHOTS}/form35-B-phone.png` });
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
