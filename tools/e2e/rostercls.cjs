// 🏫 반 만들기 · 빼기 = 학생 탭 「＋ 명단」 창 맨 위 (📜 2026-11-16 · DECISIONS fda0696 · 머리 🔨) — 학교 정보 칸엔 안내 한 줄만
//   NODE_PATH=$(npm root -g) node tools/e2e/rostercls.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const t = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); t.on('pageerror', (e) => errs.push(String(e)));
  await t.goto(B + '?role=teacher&tab=pupil'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('[data-k="roster-open"]');
  await t.click('[data-k="roster-open"]'); await t.waitForSelector('[data-k="roster-cls"]');
  const cl = await t.$$eval('[data-k="roster-cls"] button:not(.mk)', (x) => x.map((e) => e.textContent.trim()));
  ok('＋ 명단 창 맨 위 = 반 고르기 + ＋ 반 만들기', cl.length >= 8 && !!(await t.$('[data-k="cls-make"]')), cl.join(' '));
  await t.click('[data-k="cls-make"]'); await t.fill('[data-k="cls-new"]', '1-3');
  ok('있는 반 = 만들기 꺼짐', await t.$eval('[data-k="cls-make-ok"]', (e) => e.disabled));
  await t.fill('[data-k="cls-new"]', '2-1'); await t.click('[data-k="cls-make-ok"]'); await t.waitForTimeout(300);
  ok('새 반 2-1 = 바로 그 반에 명단 넣기', /＋ 명단 · 2-1반/.test(await t.textContent('.sheet')) && await t.$eval('[data-k="roster-cls"] button.on', (e) => e.textContent.trim() === '2-1'));
  await t.screenshot({ path: `${SHOTS}/roster-cls.png` });
  await t.fill('.sheet textarea', '1 가나다\n2 라마바'); await t.click('.sheet .btn:has-text("명단 올리기")'); await t.waitForTimeout(500);
  ok('명단 올림 = 2-1반 2명 · 학생 탭 반 칩에 2-1', /2-1반 명단 2명/.test(await t.textContent('.toast').catch(() => '')) && !!(await t.$('.chips button:has-text("2-1")')));
  ok('school/info/classes 에 2-1', (await t.evaluate(() => window.__dbGet('school/info/classes'))).includes('2-1'));
  await t.click('[data-k="roster-open"]'); await t.click('[data-k="roster-cls"] button:has-text("2-1")'); await t.click('[data-k="cls-del"]'); await t.waitForSelector('[data-k="cls-del-ask"]');
  ok('빼기 = 「정말?」 확인 창', /정말 2-1반을 뺄까요/.test(await t.textContent('[data-k="cls-del-ask"]')));
  await t.click('[data-k="cls-del-yes"]'); await t.waitForTimeout(300);
  ok('뺀 뒤 = 반 목록에서 빠짐 · 명단은 남음', !(await t.evaluate(() => window.__dbGet('school/info/classes'))).includes('2-1') && !!(await t.evaluate(() => window.__dbGet('roster/2-1') || window.__dbGet('school/roster/2-1'))), '');
  // 학교 정보 칸 = 안내 한 줄
  await t.goto(B + '?role=teacher&tab=me'); await t.waitForTimeout(800);
  const f = await t.$('text=우리 학교 기능'); if (f) await f.click(); await t.waitForTimeout(500);
  const more = await t.$('[data-k="feat-more"]'); if (more) await more.click(); await t.waitForTimeout(300);
  ok('학교 정보 = 반 입력 칸 없음 · 안내 한 줄', !(await t.$('[data-k="classes"]')) && /학생」 탭 → 「＋ 명단」/.test((await t.textContent('[data-k="cls-moved"]').catch(() => '')) || ''));
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
