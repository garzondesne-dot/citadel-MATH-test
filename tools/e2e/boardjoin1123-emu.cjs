// 👥 📜 11/23 팀 참가 (에뮬레이터): 빈 목록 안내 → A ＋ 팀 모집(🔒 암호 걸기 · 4자리) → B 👥 팀 참가 = 목록 한 줄 🔒 → 누름 = 암호 창 → 맞는 암호 = 합류
//   NODE_PATH=$(npm root -g) node tools/e2e/boardjoin1123-emu.cjs <그림 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', CLS = '1-3', B = 'http://localhost:4173/', E = 'emu=127.0.0.1', NS = 'demo-citadel-test-default-rtdb';
const rest = (path, method = 'GET', body) => fetch(`http://127.0.0.1:9000/${path}.json?ns=${NS}`, { method, headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }).then((r) => r.json());
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const open = async () => { const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), p = await ctx.newPage(); await p.addInitScript(() => { try { localStorage.setItem('atb-e2e-nointro', '1'); localStorage.setItem('citadel-v1-board-story', '1'); } catch { /* */ } }); p.on('pageerror', (e) => errs.push(String(e))); await p.goto(`${B}?${E}`); return p; };
  const signup = async (p, cls, num) => {
    await p.waitForSelector('select'); await p.selectOption('select >> nth=0', cls); await p.waitForTimeout(200); await p.selectOption('select >> nth=1', String(num)); await p.waitForTimeout(200);
    await p.click('.links button:has-text("가입")'); await p.click('button.pw >> nth=0'); for (const d of '1234') await p.click(`.pad .keys button:has-text("${d}")`);
    await p.waitForTimeout(150); if (await p.$('.pad')) for (const d of '1234') await p.click(`.pad .keys button:has-text("${d}")`);
    await p.click('.title .pmain'); await p.waitForTimeout(2500); if (await p.$('text=첫 용사 고르기')) { await p.click('button:has-text("시작")'); await p.waitForTimeout(800); }
  };
  const board = async (p) => { if (!(await p.$('.bd'))) await p.$eval('[data-prop="dummy"]', (e) => e.click()); await p.waitForSelector('.bd'); await p.waitForTimeout(500); };
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest(`school/last/${CLS}`, 'PUT', { lesson: 'set-06', no: 6, at: Date.now(), done: true, code: 'x' });
  const A = await open(); await signup(A, CLS, 1); await board(A);
  ok('📅 예약 모집 단추 없음', !(await A.$('[data-k="board-resv"]')));
  ok('📜 11/24 출정 = 👥 팀 참가 탭이 기본(왼쪽) · ➕ 팀 모집(오른쪽)', (await A.getAttribute('[data-k="board-tab-join"]', 'aria-selected')) === 'true' && !!(await A.$('[data-k="board-tab-make"]')));
  await A.waitForSelector('[data-k="board-join-none"]', { timeout: 3000 }).catch(() => {});
  ok('빈 목록 = 「지금 열린 팀이 없어요」 + ➕ 내가 모집하기 · ⚔ 혼자 도전', /지금 열린 팀이 없어요/.test((await A.textContent('[data-k="board-join-none"]').catch(() => '')) || '') && !!(await A.$('button:has-text("내가 모집하기")')) && !!(await A.$('[data-k="board-solo"]')));
  await A.screenshot({ path: `${SHOTS}/bj-empty.png` });
  await A.click('button:has-text("내가 모집하기")'); await A.waitForSelector('[data-k="board-lock-opt"]');
  ok('＋ 팀 모집 = 시트 · 🔒 암호 걸기 기본 끔', !(await A.$eval('[data-k="board-lock-opt"] input', (e) => e.checked)));
  await A.click('[data-k="board-lock-opt"] input'); await wait(200);
  ok('켜면 4자리 전엔 올리기 못 누름', await A.$eval('.sheet .act .btn', (e) => e.disabled));
  for (const d of '2580') await A.click(`.sheet .rune-keys button:has-text("${d}")`);
  await A.screenshot({ path: `${SHOTS}/bj-lock.png` });
  await A.click('.sheet .act .btn'); await wait(1800);
  const pid = Object.keys((await rest('school/board/posts')) || {})[0], post = pid ? await rest(`school/board/posts/${pid}`) : null;
  ok('글 = 🔒 lk · 예약 시각 없음', !!post?.lk && !post?.when, pid || '없음');
  const B2 = await open(); await signup(B2, CLS, 2); await board(B2); if (await B2.$('.sheet .rune-keys')) { ok('(옛 길) 캠프 초대 = 그 팀 암호 창 · 닫음', true); await B2.keyboard.press('Escape'); await wait(300); if (await B2.$('.sheet')) await B2.click('.sheet [aria-label="닫기"], .sheet .x').catch(() => {}); await wait(400); }
  await B2.waitForSelector('[data-k="board-join-row"]', { timeout: 5000 }).catch(() => {});
  const row = ((await B2.textContent('[data-k="board-join-row"]').catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  ok('📜 출정 열자마자 목록 한 줄 = 「6차시 · 🔒 암호 · 보스 · 방장 · 1/4 · 참가」', /6차시/.test(row) && /🔒 암호/.test(row) && /1\/4/.test(row) && /참가/.test(row), row);
  ok('한 줄 = 방장 용사 얼굴 · 인원 점 4개', !!(await B2.$('[data-k="board-join-row"] .face')) && (await B2.$$('[data-k="board-join-row"] .dots i')).length === 4);
  ok('목록 아래 = ⚔ 혼자 도전 (보조)', !!(await B2.$('[data-k="board-solo"]')));
  await B2.screenshot({ path: `${SHOTS}/bj-list.png` });
  await B2.click('[data-k="board-join-go"]'); await wait(600);
  ok('🔒 팀 누름 = 암호 창', !!(await B2.$('.sheet .rune-keys')));
  for (const d of '2580') await B2.click(`.sheet .rune-keys button:has-text("${d}")`); await B2.click('.sheet .act .btn'); await wait(1800);
  ok('맞는 암호 = 합류 2/4', Object.keys((await rest(`school/board/posts/${pid}/mem`)) || {}).length === 2);
  await B2.screenshot({ path: `${SHOTS}/bj-joined.png` });
  // 📜 11/24 팀이 많을 때 (6 ~) = 필터 칩 4 · 차시별 묶음(배운 차시 번호순 · 안 배운 차시 맨 아래 흐림) · 꽉 찬 팀 = 숨김 (🔨 #8)
  const mem = (n, role = 'c') => Object.fromEntries(Array.from({ length: n }, (_, i) => [`z${n}${i}`, { uid: `z${n}${i}`, cls: '1-4', num: 10 + i, nick: `친구${i + 1}`, hero: (i * 3) % 30, role, why: '', at: Date.now() + i }]));
  const seed = [[2, 1, 'c'], [3, 2, 'g'], [3, 4, 'c'], [5, 1, 'c'], [12, 1, 'c'], [4, 2, 'g'], [2, 3, 'c']];
  for (const [i, [no, n, role]] of seed.entries()) { const pid = `pseed${i}`, m = mem(n, role), host = Object.keys(m)[0]; await rest(`school/board/posts/${pid}`, 'PUT', { pid, lesson: `set-${String(no).padStart(2, '0')}`, no, at: Date.now() - i * 1000, host, phase: 'wait', mem: m }); }
  const C = await open(); await signup(C, CLS, 3); await board(C); if (await C.$('button:has-text("나가기")')) { await C.click('button:has-text("나가기")'); await wait(400); if (await C.$('.modal button:has-text("나가기"), .sheet button:has-text("나가기")')) await C.click('.modal button:has-text("나가기"), .sheet button:has-text("나가기")').catch(() => {}); await wait(800); } /* (옛 길) 캠프 초대로 들어간 팀에서 나옴 */ await C.waitForSelector('[data-k="board-join-chips"]', { timeout: 6000 }).catch(() => {});
  ok('팀 8개 = 필터 칩 4개', (await C.$$('[data-k="board-join-chips"] .jc')).length === 4);
  const grp = await C.$$eval('.jgrp', (xs) => xs.map((x) => x.textContent.trim()));
  ok('차시별 묶음 = 배운 차시 번호순 · 안 배운 12차시 맨 아래', grp.length >= 4 && /^2차시/.test(grp[0]) && /^12차시/.test(grp[grp.length - 1]), grp.join(' | '));
  ok('꽉 찬 팀(4/4) = 목록에 없음 (📜 11/24 🔨 #8 ①) · 안 배운 팀 = 「아직 안 배움」 · 안 배운 묶음 흐림', (await C.$$eval('[data-k="board-join-row"]', (xs) => xs.filter((x) => x.querySelectorAll('.dots i.f').length === 4).length)) === 0 && !!(await C.$('[data-k="board-join-notyet"]')) && !!(await C.$('.jgrp.dim')));
  await C.screenshot({ path: `${SHOTS}/bj-many.png`, fullPage: true });
  await C.click('.jc:has-text("🛡 수호자")'); await wait(300);
  ok('🛡 수호자 칩 = 수호자 있는 팀만', (await C.$$('[data-k="board-join-row"]')).length === 2, String((await C.$$('[data-k="board-join-row"]')).length));
  await C.click('.jc:has-text("빈자리")'); await wait(300);
  ok('빈자리 있음 칩 = 꽉 찬 팀 없음', (await C.$$eval('[data-k="board-join-row"]', (xs) => xs.filter((x) => x.querySelectorAll('.dots i.f').length === 4).length)) === 0);
  ok('⚔ 혼자 도전 = 출정 맨 아래 보조 단추', !!(await C.$('.jbot [data-k="board-solo"].btn2')));
  await b.close(); console.log(errs.length ? `❌ 실패 ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); process.exit(errs.length ? 1 : 0);
})();
