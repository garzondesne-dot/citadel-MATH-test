// 🧪 🎒 학생 폰 테스트 + 준비 탭 2개 + 👥 반 · 시간표 (📜 2026-11-16 머리 🔨 · 2026-11-17 #21: 🎒 = 수업 탭 ① 🧪 → ③ 🎒 · 저절로 넘기기 없음 · 진행 리모컨)
//   NODE_PATH=$(npm root -g) node tools/e2e/stutry.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const t = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); t.on('pageerror', (e) => errs.push(String(e)));
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tp');
  // 👥 반 · 시간표
  await t.click('.tabs button:has-text("반 · 시간표")'); await t.waitForSelector('[data-k="top-sched"]');
  await t.click('[data-k="top-sched"]'); await t.waitForTimeout(300);
  ok('👥 반 · 시간표 → 📅 시간표 탭 (처음 = 「📅 시간표 쓰기 시작」)', !!(await t.$('[data-k="sched-start"]')) || !!(await t.$('.pg')));
  await t.click('[data-k="top-stu"]'); await t.waitForTimeout(200); ok('👥 학생 탭 = 명단 · ＋ 명단', !!(await t.$('[data-k="roster-open"]')));
  // 준비 탭 2개
  await t.click('.tabs button:has-text("준비")'); await t.waitForTimeout(500);
  const segs = await t.$$eval('.seg3 button', (x) => x.map((e) => e.textContent.trim()));
  ok('준비 = 📚 차시 준비 · 📦 팩 · 도구 2개', segs.length === 2 && /차시 준비/.test(segs[0]) && /팩 · 도구/.test(segs[1]), segs.join(' | '));
  ok('준비 탭 = 🧪 수업 테스트 · 🎒 없음(수업 탭으로)', !(await t.$('[data-k="test-go"]')) && !(await t.$('[data-k="try-go"]')));
  await t.screenshot({ path: `${SHOTS}/prep-lesson.png` });
  await t.click('.seg3 button:has-text("팩 · 도구")'); await t.waitForTimeout(400);
  ok('📦 팩 · 도구 = 팩 올리기 + 도구', !!(await t.$('[data-k="addon-up"]')) && !!(await t.$('[data-k="tools"]')));
  await t.screenshot({ path: `${SHOTS}/prep-packs.png` });
  await t.click('.seg3 button:has-text("차시 준비")'); await t.waitForTimeout(300);
  // 🎒 = 수업 탭 ① 🧪 → ② 차시 → ③ 🎒 (봇 5)
  await t.click('.tabs button:has-text("수업")'); await t.waitForTimeout(300);
  await t.click('[data-cls="test"]'); await t.click('.pk3 [data-no="6"]'); await t.click('[data-mode="stu"]'); await t.click('[data-k="open-go"]'); await t.click('[data-k="open-yes"]');
  await t.waitForSelector('[data-k="stutry"]');
  ok('🎒 맨 아래 진행 리모컨 ◀ · 다음 ▶ · 🏕 · ⏸ · ⏹', (await t.$$('[data-k="try-remote"] button')).length === 5);
  await t.waitForTimeout(3000); const w0 = await t.textContent('[data-k="try-where"]');
  ok('🎒 저절로 안 넘어감 (대기실 그대로)', /대기실/.test(w0), w0);
  let w1 = w0, seenMon = false; for (let i = 0; i < 8 && !seenMon; i++) { await t.click('[data-k="try-next"]'); await t.waitForTimeout(700); w1 = await t.textContent('[data-k="try-where"]'); if (!/대기실|도입|개념/.test(w1)) seenMon = true; }
  ok('다음 ▶ 로 첫 몬스터까지', seenMon, `${w0} → ${w1}`);
  await t.screenshot({ path: `${SHOTS}/stutry-mon.png` });
  const rec = await t.evaluate(() => Object.keys(localStorage).filter((k) => /records\/|rooms\/TRY/.test(k)).length);
  ok('기록 · 방이 이 기기 저장소에도 안 남음 (메모리)', rec === 0, `${rec}`);
  await t.click('[data-k="try-close"]'); await t.waitForTimeout(300); ok('✕ 끝내기', !(await t.$('[data-k="stutry"]')));
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
