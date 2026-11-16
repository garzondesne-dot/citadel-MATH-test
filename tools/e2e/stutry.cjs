// 🎒 학생으로 해 보기 + 준비 탭 2개 + 👥 반 · 시간표 (📜 2026-11-16 머리 🔨 · 시안 Se2dj6YN)
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
  ok('👥 반 · 시간표 → 📅 시간표 탭 (꺼져 있으면 안내)', !!(await t.$('[data-k="sched-off"]')) || !!(await t.$('.pg')));
  await t.click('[data-k="top-stu"]'); await t.waitForTimeout(200); ok('👥 학생 탭 = 명단 · ＋ 명단', !!(await t.$('[data-k="roster-open"]')));
  // 준비 탭 2개
  await t.click('.tabs button:has-text("준비")'); await t.waitForTimeout(500);
  const segs = await t.$$eval('.seg3 button', (x) => x.map((e) => e.textContent.trim()));
  ok('준비 = 📚 차시 준비 · 📦 팩 · 도구 2개', segs.length === 2 && /차시 준비/.test(segs[0]) && /팩 · 도구/.test(segs[1]), segs.join(' | '));
  ok('아래 = 🧪 수업 테스트 + 🎒 학생으로 해 보기', /수업 테스트/.test(await t.textContent('[data-k="test-go"]')) && !!(await t.$('[data-k="try-go"]')));
  await t.screenshot({ path: `${SHOTS}/prep-lesson.png` });
  await t.click('.seg3 button:has-text("팩 · 도구")'); await t.waitForTimeout(400);
  ok('📦 팩 · 도구 = 팩 올리기 + 도구', !!(await t.$('[data-k="addon-up"]')) && !!(await t.$('[data-k="tools"]')));
  await t.screenshot({ path: `${SHOTS}/prep-packs.png` });
  await t.click('.seg3 button:has-text("차시 준비")'); await t.waitForTimeout(300);
  // 🎒
  await t.click('[data-k="try-go"]'); await t.waitForSelector('[data-k="stutry"]');
  let seenMon = false, seenBots = 0, w0 = '';
  for (let i = 0; i < 40 && !seenMon; i++) { await t.waitForTimeout(1000); w0 = (await t.textContent('[data-k="try-where"]')) || ''; if (w0 && !/대기실|도입|개념/.test(w0)) seenMon = true; }
  ok('🎒 단계가 저절로 넘어가 첫 몬스터까지(도입 · 개념 지나)', seenMon, w0);
  await t.screenshot({ path: `${SHOTS}/stutry-mon.png` });
  let w1 = w0; for (let i = 0; i < 3 && w1 === w0; i++) { await t.click('[data-k="try-next"]'); await t.waitForTimeout(800); w1 = await t.textContent('[data-k="try-where"]'); } // 정찰 중 ⏭ = 정찰 끝(리모컨과 같음) · 그다음 = 다음 단계
  ok('⏭ = (정찰 끝 →) 다음 단계', w1 !== w0, `${w0} → ${w1}`);
  const rec = await t.evaluate(() => Object.keys(localStorage).filter((k) => /records\/|rooms\/TRY/.test(k)).length);
  ok('기록 · 방이 이 기기 저장소에도 안 남음 (메모리)', rec === 0, `${rec}`);
  await t.click('[data-k="try-close"]'); await t.waitForTimeout(300); ok('✕ 끝내기', !(await t.$('[data-k="stutry"]')));
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
