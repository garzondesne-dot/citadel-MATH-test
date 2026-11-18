// 👩‍🏫 #80 교사 캠프 리뉴얼 (에뮬레이터 · 교사 = admins)
//   ① 교사 「나」 → ⛺ 내 캠프 = 학생과 같은 캠프 + 반 칩 + 🧑‍🎓 학생 화면 단추 ② 출제 안건 1 = 금빛 숫자 → 출제 공방 → 👩‍🏫 선생님 칸 = 안건 · 반별
//   ③ 게시판 선생님 칸 = 모집 글 실명 · 판정 이유 · 방 닫기 ④ 🧑‍🎓 학생 화면 = 반 칩 · 선생님 칸 · 교사 숫자 숨김 ⑤ TV(?tv=1) = 학생 화면과 같게 ⑥ 종합실 ⚙ 에 ⛺ 교사 캠프
//   NODE_PATH=$(npm root -g) node tools/e2e/tcamp80-emu.cjs <폴더> [주소]
const { chromium } = require('playwright');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/', E = 'emu=127.0.0.1';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  await rest('roster/1-3', 'PUT', { 1: '가나다', 2: '라마바' });
  const now = Date.now();
  await rest('quest/1-3/2/q1', 'PUT', { at: now, grade: 'blue', status: 'wait', base: { pack: 'eval-1', room: 'q04', text: 'n(A)=16 …', answer: '9' }, type: 'subj', problem: '바꾼 문제', answer: '9', solve1: '9', solve2: '9', agree: true });
  await rest('school/board/posts/p80', 'PUT', { pid: 'p80', lesson: 'set-06', no: 6, at: now, act: now, host: 'u1', phase: 'wait', mem: { u1: { uid: 'u1', cls: '1-3', num: 1, nick: 'a', hero: 0, role: 'g', why: '🛡 정답률 92%라서 수호자예요', at: now, seen: now, ready: true } } });
  const t = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); t.on('pageerror', (e) => errs.push(String(e)));
  await t.goto(`${B}?role=teacher&${E}`); await t.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(t, '.tabs');
  await t.goto(`${B}?role=teacher&tab=me&${E}`); await t.waitForSelector('.item:has-text("내 캠프")', { timeout: 20000 });
  await t.click('.item:has-text("내 캠프")'); await t.waitForSelector('.camp', { timeout: 20000 }); await t.waitForTimeout(2500);
  ok('① 교사 캠프 = 반 칩 + 🧑‍🎓 학생 화면 단추', !!(await t.$('[data-k="t-cls"]')) && !!(await t.$('[data-k="as-stu"]')));
  const tc = await t.$eval('[data-k="tcnt-tent"]', (e) => e.textContent).catch(() => ''); ok('② 출제 공방 금빛 숫자 = 안건 1', tc === '1', tc);
  await t.screenshot({ path: `${SHOTS}/t80-camp.png` });
  await t.$eval('[data-prop="tent"]', (e) => e.click()); await t.waitForSelector('[data-k="quest-desk"]'); await t.click('[data-k="t-panel"]'); await t.waitForSelector('[data-k="t-panel-box"]'); await t.waitForTimeout(1500);
  const pt = (await t.textContent('[data-k="t-panel-box"]')).replace(/\s+/g, ' ');
  ok('② 선생님 칸 = 출제 안건 · 실명 · 반별 표', /출제 안건 1/.test(pt) && /라마바/.test(pt) && /반별 출제/.test(pt), pt.slice(0, 120));
  await t.screenshot({ path: `${SHOTS}/t80-quest.png` });
  await t.click('[data-k="t-panel-box"] .x'); await t.keyboard.press('Escape'); await t.click('.sheet .x').catch(() => {}); await t.waitForTimeout(400);
  await t.$eval('[data-prop="dummy"]', (e) => e.click()); await t.waitForSelector('.bd'); await t.waitForTimeout(800); await t.click('[data-k="t-panel"]'); await t.waitForSelector('[data-k="t-post"]', { timeout: 8000 }).catch(() => {});
  const bp = (await t.textContent('[data-k="t-panel-box"]').catch(() => '')).replace(/\s+/g, ' ');
  ok('③ 게시판 선생님 칸 = 실명 · 판정 이유', /1-3반 1번 가나다/.test(bp) && /92%/.test(bp), bp.slice(0, 140));
  await t.screenshot({ path: `${SHOTS}/t80-board.png` });
  t.once('dialog', (d) => d.accept()); await t.click('[data-k="t-close"]'); await t.waitForTimeout(1200);
  ok('③ 방 닫기 = 글 지움', (await rest('school/board/posts/p80')) == null);
  await t.click('[data-k="t-panel-box"] .x'); await t.evaluate(() => sessionStorage.clear()); await t.goto(`${B}?role=camp&from=me&${E}`); await t.waitForSelector('[data-k="as-stu"]', { timeout: 20000 }); await t.waitForTimeout(1500);
  await t.click('[data-k="as-stu"]'); await t.waitForTimeout(400);
  ok('④ 🧑‍🎓 학생 화면 = 반 칩 · 교사 숫자 숨김', !(await t.$('[data-k="t-cls"]')) && !(await t.$('[data-k="tcnt-tent"]')));
  await t.$eval('[data-prop="tent"]', (e) => e.click()); await t.waitForSelector('[data-k="quest-desk"]'); await t.waitForTimeout(300);
  ok('④ 학생 화면 = 선생님 칸 단추 없음', !(await t.$('[data-k="t-panel"]')));
  await t.screenshot({ path: `${SHOTS}/t80-asstu.png` });
  await t.goto(`${B}?role=camp&from=me&tv=1&${E}`); await t.waitForSelector('.camp'); await t.waitForTimeout(2000);
  ok('⑤ TV = 반 칩 · 학생 화면 단추 · 교사 숫자 없음', !(await t.$('[data-k="t-cls"]')) && !(await t.$('[data-k="as-stu"]')) && !(await t.$('[data-k="tcnt-tent"]')));
  const h = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); h.on('pageerror', (e) => errs.push('TV ' + String(e)));
  await h.goto(`${B}?role=hall&mode=test&lesson=set-05&room=T80&${E}`); await h.waitForTimeout(3000);
  const gear = await h.$('.gear[data-k="tvset"]'); if (gear) { await gear.click(); await h.waitForTimeout(300); }
  ok('⑥ 종합실 ⚙ 에 ⛺ 교사 캠프', !!(await h.$('[data-k="tvcamp"]')), gear ? '' : '⚙ 없음(입장 대기 화면)');
  await h.screenshot({ path: `${SHOTS}/t80-tv.png` });
  ok('콘솔 오류 0', !errs.some((e) => /Error/.test(e)), errs.slice(0, 2).join(' | '));
  await b.close(); log(errs.length ? `실패 ${errs.length}` : '모두 통과'); process.exit(errs.length ? 1 : 0);
})();
