// 👤 #77 게시판 방 안에서만 실명 (에뮬레이터 · 폰 2대 · 다른 반)
//   명단(roster)에서 반 · 번호로 · 글에는 이름 없음 · 목록 · 피드는 익명 그대로
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
const B = 'http://localhost:4173/', E = 'emu=127.0.0.1', NS = 'demo-citadel-test-default-rtdb';
const rest = (path, method = 'GET', body) => fetch(`http://127.0.0.1:9000/${path}.json?ns=${NS}`, { method, headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }).then((r) => r.json());
const log = (...a) => console.log(...a), wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest('school/last/1-3', 'PUT', { lesson: 'set-06', no: 6, at: Date.now(), done: true, code: 'x' });
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const open = async () => { const ctx = await b.newContext({ viewport: { width: 360, height: 640 } }), p = await ctx.newPage(); await p.addInitScript(() => { try { localStorage.setItem('atb-e2e-nointro', '1'); } catch { /* */ } }); /* #69 조우 · 정찰 건너뜀 (e2e) */ p.on('pageerror', (e) => errs.push(String(e))); await p.goto(`${B}?${E}`); return p; };
  const signup = async (p, cls, num) => {
    await p.waitForSelector('select'); await p.selectOption('select >> nth=0', cls); await p.waitForTimeout(200); await p.selectOption('select >> nth=1', String(num)); await p.waitForTimeout(200);
    await p.click('.links button:has-text("가입")'); await p.click('button.pw >> nth=0'); for (const d of '1234') await p.click(`.pad .keys button:has-text("${d}")`);
    await p.waitForTimeout(150); if (await p.$('.pad')) for (const d of '1234') await p.click(`.pad .keys button:has-text("${d}")`);
    await p.click('.title .pmain'); await p.waitForTimeout(2500); if (await p.$('text=첫 용사 고르기')) { await p.click('button:has-text("시작")'); await p.waitForTimeout(800); }
  };
  const board = async (p) => { if (!(await p.$('.bd'))) await p.click('button[aria-label="게시판"]'); await p.waitForSelector('.bd'); await p.waitForTimeout(500); };
  const rune = async (p, s) => { for (const d of s) await p.click(`.sheet .rune-keys button:has-text("${d}")`); };

  await rest('school/last/1-5', 'PUT', { lesson: 'set-06', no: 6, at: Date.now(), done: true, code: 'x' });
  await rest('roster/1-3', 'PUT', { 1: '가나다', 2: '라마바' }); await rest('roster/1-5', 'PUT', { 1: '사아자' });
  const A = await open(); await signup(A, '1-3', 1); const Bp = await open(); await signup(Bp, '1-5', 1);
  await board(A); await board(Bp);
  await A.click('[data-map=\"6\"]'); await A.click('[data-k=\"board-post\"]'); await wait(1800);
  const listTxt = await Bp.textContent('.bd'); ok('목록 = 실명 없음', !listTxt.includes('가나다'));
  await Bp.click('.post .go'); await wait(2000);
  const a = await A.$$eval('[data-k="slot-name"]', (x) => x.map((e) => e.textContent)), bb = await Bp.$$eval('[data-k="slot-name"]', (x) => x.map((e) => e.textContent));
  ok('A 대기실 = 다른 반 친구 실명', a.some((t) => t.includes('1-5반 · 사아자')), a.join(' / '));
  ok('B 대기실 = 1-3반 실명', bb.some((t) => t.includes('1-3반 · 가나다')), bb.join(' / '));
  const posts = await rest('school/board/posts'); ok('서버 글에 이름 없음', !JSON.stringify(posts).match(/가나다|사아자/));
  await A.screenshot({ path: `${SHOTS}/b77-room.png` });
  ok('콘솔 오류 0', !errs.some((e) => /Error/.test(e) && !/❌/.test(e)), errs.filter((e) => !/❌/.test(e)).slice(0, 2).join(' | '));
  await b.close(); log(errs.length ? `실패 ${errs.length}` : '모두 통과'); process.exit(errs.length ? 1 : 0);
})();
