// ⏱ #76 게시판 방 저절로 닫기 (에뮬레이터 · 폰 2대)
//   A 🔒 암호 모집 → B 합류 → A 폰 닫힘 + A 숨 2분 전으로 → B 게시판이 30초 안에 방장 = B 로 넘김
//   → 움직임을 11분 전으로 → B 게시판이 해산 + 🔒 암호(boardLock) 지움 · 진행 중 글 숨 11분 전 → done + idle
//   NODE_PATH=$(npm root -g) node tools/e2e/board76-emu.cjs <그림 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
const B = 'http://localhost:4173/', E = 'emu=127.0.0.1', NS = 'demo-citadel-test-default-rtdb';
const rest = (path, method = 'GET', body) => fetch(`http://127.0.0.1:9000/${path}.json?ns=${NS}`, { method, headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }).then((r) => r.json());
const log = (...a) => console.log(...a), wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest('school/last/1-3', 'PUT', { lesson: 'set-06', no: 6, at: Date.now(), done: true, code: 'x' });
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const open = async () => { const ctx = await b.newContext({ viewport: { width: 360, height: 640 } }), p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e))); await p.goto(`${B}?${E}`); return p; };
  const signup = async (p, cls, num) => {
    await p.waitForSelector('select'); await p.selectOption('select >> nth=0', cls); await p.waitForTimeout(200); await p.selectOption('select >> nth=1', String(num)); await p.waitForTimeout(200);
    await p.click('.links button:has-text("가입")'); await p.click('button.pw >> nth=0'); for (const d of '1234') await p.click(`.pad .keys button:has-text("${d}")`);
    await p.waitForTimeout(150); if (await p.$('.pad')) for (const d of '1234') await p.click(`.pad .keys button:has-text("${d}")`);
    await p.click('.title .pmain'); await p.waitForTimeout(2500); if (await p.$('text=첫 용사 고르기')) { await p.click('button:has-text("시작")'); await p.waitForTimeout(800); }
  };
  const board = async (p) => { if (!(await p.$('.bd'))) await p.click('button[aria-label="게시판"]'); await p.waitForSelector('.bd'); await p.waitForTimeout(500); };
  const rune = async (p, s) => { for (const d of s) await p.click(`.sheet .rune-keys button:has-text("${d}")`); };
  const A = await open(); await signup(A, '1-3', 1); const Bp = await open(); await signup(Bp, '1-3', 2);
  await board(A); await board(Bp);
  await A.click('[data-map=\"6\"]'); await A.click('[data-k=\"board-post\"]'); await wait(1800);
  let posts = await rest('school/board/posts'); const pid = Object.keys(posts || {})[0], hostA = posts[pid].host;
  ok('모집 글 = act · 방장 숨(seen)', !!posts[pid].act && !!posts[pid].mem[hostA].seen);
  await Bp.waitForTimeout(800); await Bp.click('.post .go'); await wait(1500);
  posts = await rest('school/board/posts'); const uB = Object.keys(posts[pid].mem).find((u) => u !== hostA);
  ok('B 합류', !!uB);
  // A 폰 닫힘 + 숨 2분 전
  await A.context().close(); await rest(`school/board/posts/${pid}/mem/${hostA}/seen`, 'PUT', Date.now() - 120e3);
  let to = ''; for (let i = 0; i < 40 && to !== uB; i++) { await wait(1000); to = await rest(`school/board/posts/${pid}/host`); }
  ok('방장 1분 끊김 → B 가 방장', to === uB);
  await Bp.waitForTimeout(800); await Bp.screenshot({ path: `${SHOTS}/b76-host.png` });
  ok('B 화면 = 모집 글 내리기(방장 단추)', ((await Bp.textContent('.bd').catch(() => '')) || '').includes('출발'));
  // 대기 11분 움직임 없음 (숨은 B 가 계속 보내도)
  const old = Date.now() - 11 * 60e3;
  await rest(`school/board/posts/${pid}/act`, 'PUT', old); await rest(`school/board/posts/${pid}/at`, 'PUT', old);
  for (const u of Object.keys(posts[pid].mem)) await rest(`school/board/posts/${pid}/mem/${u}/at`, 'PUT', old);
  let gone = false; for (let i = 0; i < 40 && !gone; i++) { await wait(1000); gone = (await rest(`school/board/posts/${pid}`)) == null; }
  ok('대기 10분 → 해산', gone);
  await wait(1500); ok('🔒 암호(boardLock) 도 지움', (await rest(`boardLock/${pid}`)) == null);
  // 진행 중 손 놓은 글
  await rest('school/board/posts/pz', 'PUT', { pid: 'pz', lesson: 'set-06', no: 6, at: old, host: 'x', phase: 'play', code: 'Tpz', mem: { x: { uid: 'x', cls: '1-3', num: 9, nick: 'x', hero: 0, role: 'c', why: '', at: old, seen: old } } });
  let ph = ''; for (let i = 0; i < 40 && ph !== 'done'; i++) { await wait(1000); ph = await rest('school/board/posts/pz/phase'); }
  ok('진행 10분 숨 없음 → done + idle', ph === 'done' && (await rest('school/board/posts/pz/idle')) === true);
  await Bp.screenshot({ path: `${SHOTS}/b76-after.png` });
  ok('콘솔 오류 0', !errs.some((e) => /Error/.test(e) && !/❌/.test(e)), errs.filter((e) => !/❌/.test(e)).slice(0, 2).join(' | '));
  await b.close(); log(errs.length ? `실패 ${errs.length}` : '모두 통과'); process.exit(errs.length ? 1 : 0);
})();
