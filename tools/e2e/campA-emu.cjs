// 🏕 캠프 A (에뮬레이터 · 📜 2026-11-15 선생님 「A안 + 게시판 방이 개설되면 포털 열리고 게시판 빛나고」)
//   (#72 말풍선 → 이름표 · 숫자 배지 · 💎 칩)
//   ① 할 일 없음(새 학생 · 기록 없음) = 말풍선 0 · 흐림 0 ② 기록(틀림 · 안 풂) = 🎯 「복습 n · 💎+k」 말풍선 · 할 일 없는 물건 흐림
//   ③ 모집 중 방 생김 = 📋 「⚔ 모집 중 1/4 · 참여!」 · 포털 recruit ④ 게시판 누름 = 그 방에 바로 참여(멤버 2) ⑤ 방 사라짐 = 말풍선 없음 · 포털 불씨
const { chromium } = require('playwright');
const { rest } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/?emu=127.0.0.1';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  if (process.env.SEED) await require(process.env.SEED);
  await rest('', 'PATCH', { roster: { '1-3': { 3: '시험삼' } }, rosterMask: { '1-3': { 3: '시*삼' } } });
  await rest('school/features', 'PUT', { bundle: 'full', on: { hero: true, scarecrow: true, board: true, citadel: true, forge: true } });
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const s = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); s.on('pageerror', (e) => errs.push(String(e)));
  await s.goto(B); await s.waitForSelector('.title', { timeout: 20000 }); await s.waitForTimeout(800);
  await s.selectOption('select >> nth=0', '1-3'); await s.waitForTimeout(200); await s.selectOption('select >> nth=1', '3'); await s.waitForTimeout(300);
  if (!(await s.$('.pw:has(small)'))) await s.click('.lk:has-text("가입")');
  await s.click('.pw >> nth=0'); for (const k of '12341234') await s.click(`.pad button:text-is("${k}")`);
  await s.click('.title .act .pmain'); await s.waitForTimeout(3500);
  const fh = await s.$('button:has-text("과 시작"), button:has-text("와 시작")'); if (fh) { await fh.click(); await s.waitForTimeout(1200); }
  const state = async () => s.evaluate(() => ({ bubs: [...document.querySelectorAll('.tag.todo')].map((e) => `${e.dataset.k.replace('tag', 'bub')}:${e.textContent}${e.nextElementSibling?.classList.contains('gchip') ? ` · ${e.nextElementSibling.textContent}` : ''}`), dim: document.querySelectorAll('.prop.dim, img.obj.dim').length, todo: document.querySelectorAll('.prop.todo, .zone.todo').length, portal: document.querySelector('.portal')?.dataset.phase }));
  const castleOn = !!process.env.SEED;
  let st = await state();
  const noCastle = (x) => x.bubs.filter((t) => !/bub-castle/.test(t));
  ok('① 할 일 없음 = 말풍선 0 · 흐림 0 (성채 새 방 말풍선 빼고)', castleOn ? true : st.bubs.length === 0 && st.dim === 0, JSON.stringify(st));
  await s.screenshot({ path: `${SHOTS}/campA-none.png` });
  await rest('records/1-3/3/set-02', 'PUT', { at: 1, no: 2, mons: { r0: 'o', m1: 'x', s1: 'o', m2: '-', m3: 'o', m4: 'o', s2: 'o' }, bossM: 'oo' });
  await rest('school/last/1-3', 'PUT', { lesson: 'set-02', no: 2, at: 1, done: true, code: '111111' });
  await s.reload(); await s.waitForTimeout(4500); st = await state();
  const sc = st.bubs.find((t) => /bub-scare/.test(t)) || '';
  ok('② 🎯 말풍선 「복습 n · 💎+k」 · 할 일 없는 물건 흐림', /허수아비\d+ · 💎\+\d+/.test(sc) && st.dim > 0, JSON.stringify(st));
  await s.screenshot({ path: `${SHOTS}/campA-todo.png` });
  await rest('school/board/posts/pT1', 'PUT', { pid: 'pT1', lesson: 'set-02', no: 2, at: Date.now(), host: 'other', phase: 'wait', mem: { other: { uid: 'other', cls: '1-4', num: 7, nick: '친구', hero: 1, role: 'c', why: '', at: Date.now() } } });
  await s.waitForTimeout(2500); st = await state();
  const bd = st.bubs.find((t) => /bub-dummy/.test(t)) || '';
  ok('③ 모집 중 방 = 📋 「⚔ 모집 중 1/4 · 참여!」 · 포털 recruit', /게시판1\/4/.test(bd) && st.portal === 'recruit', `${bd} · ${st.portal}`);
  await s.waitForTimeout(700); await s.screenshot({ path: `${SHOTS}/campA-recruit.png` });
  await s.$eval('[data-prop="dummy"]', (e) => e.click()); await s.waitForTimeout(2500);
  const mem = await rest('school/board/posts/pT1/mem'); const n = Object.keys(mem || {}).length;
  ok('④ 게시판 누름 = 그 방에 바로 참여 (멤버 2)', n === 2, `멤버 ${n}`);
  await s.screenshot({ path: `${SHOTS}/campA-joined.png` });
  await s.$eval('.sheet .x', (e) => e.click()).catch(() => {}); await s.waitForTimeout(500);
  await rest('school/board/posts/pT1', 'DELETE'); await s.waitForTimeout(2000); st = await state();
  ok('⑤ 방 사라짐 = 📋 말풍선 없음 · 포털 불씨', !st.bubs.some((t) => /bub-dummy/.test(t)) && st.portal === 'idle', JSON.stringify(st));
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
