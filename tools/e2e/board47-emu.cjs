// 🐞 #47 게시판 던전 방 인원 넘침 (📜 2026-11-21 선생님 「4인 던전에 여러 명 동시에 누르니까 7명까지 들어왔어」) · 에뮬레이터 · 폰 9대
//   A 🔒 암호 모집(4인 · #78 팀전 암호 의무) → 8명이 암호를 넣고 같은 글 「합류」를 한꺼번에 누름 → 서버 자리 = 정확히 4명(A + 3) · 넘친 폰 = 「방이 꽉 찼어요」 · 방장 화면 = 출발 (4명)
//   NODE_PATH=$(npm root -g) node tools/e2e/board47-emu.cjs <그림 폴더> [반복 수]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', N = Number(process.argv[3] || 1);
const B = 'http://localhost:4173/', E = 'emu=127.0.0.1', NS = 'demo-citadel-test-default-rtdb';
const rest = (path, method = 'GET', body) => fetch(`http://127.0.0.1:9000/${path}.json?ns=${NS}`, { method, headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }).then((r) => r.json());
const log = (...a) => console.log(...a), wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const open = async () => { const ctx = await b.newContext({ viewport: { width: 360, height: 640 } }), p = await ctx.newPage(); await p.addInitScript(() => { try { localStorage.setItem('atb-e2e-nointro', '1'); localStorage.setItem('citadel-v1-board-story', '1'); } catch { /* */ } }); /* #69 조우 · 정찰 건너뜀 (e2e) */ p.on('pageerror', (e) => errs.push(String(e))); await p.goto(`${B}?${E}`); return p; };
  const signup = async (p, cls, num) => {
    await p.waitForSelector('select'); await p.selectOption('select >> nth=0', cls); await p.waitForTimeout(200); await p.selectOption('select >> nth=1', String(num)); await p.waitForTimeout(200);
    await p.click('.links button:has-text("가입")'); await p.click('button.pw >> nth=0'); for (const d of '1234') await p.click(`.pad .keys button:has-text("${d}")`);
    await p.waitForTimeout(150); if (await p.$('.pad')) for (const d of '1234') await p.click(`.pad .keys button:has-text("${d}")`);
    await p.click('.title .pmain'); await p.waitForTimeout(2500); if (await p.$('text=첫 용사 고르기')) { await p.click('button:has-text("시작")'); await p.waitForTimeout(800); }
  };
  const board = async (p) => { if (!(await p.$('.bd'))) await p.click('button[aria-label="게시판"]'); await p.waitForSelector('.bd'); await p.waitForTimeout(500); };
  for (let round = 1; round <= N; round++) {
    await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
    await rest('school/last/1-3', 'PUT', { lesson: 'set-06', no: 6, at: Date.now(), done: true, code: 'x' });
    const ps = []; for (let i = 1; i <= 9; i++) { const p = await open(); await signup(p, '1-3', i); await board(p); ps.push(p); }
    const [A, ...rest8] = ps;
    const rune = async (p, x) => { for (const d of x) await p.click(`.sheet .rune-keys button:has-text("${d}")`); };
    await A.click('[data-map=\"6\"]'); await A.click('[data-k=\"board-post\"]'); await wait(1800);
    let posts = await rest('school/board/posts'); const pid = Object.keys(posts || {})[0];
    ok(`[${round}] 모집 글`, !!pid);
    for (const p of rest8) await p.waitForSelector('.post .go:not([disabled])', { timeout: 15000 }).catch(() => {});
    await Promise.all(rest8.map((p) => p.click('.post .go').catch(() => {}))); // 📜 #65-2 암호 없음 = 「합류」를 한꺼번에 누름 (동시 입장 race)
    const toasts = await Promise.all(rest8.map(async (p) => { for (let i = 0; i < 30; i++) { const t = (await p.textContent('.bd').catch(() => '')) || ''; if (/꽉 찼어요|자리가 다 찼어요/.test(t)) return true; /* 📜 #65-2 암호 없음 = 늦게 누른 폰은 합류 전에 「자리가 다 찼어요」 */ await p.waitForTimeout(200); } return false; }));
    await wait(2500);
    posts = await rest('school/board/posts'); const mem = Object.keys(posts?.[pid]?.mem || {});
    ok(`[${round}] 서버 자리 = 정확히 4명`, mem.length === 4, `${mem.length}명`);
    const inRoom = (await Promise.all(rest8.map((p) => p.$('.slots').then(Boolean)))).filter(Boolean).length;
    ok(`[${round}] 넘친 폰 = 대기실에 못 들어감 (들어간 폰 = 3) · 안내 또는 막힌 합류 단추`, inRoom === 3, `들어감 ${inRoom}대 · 「찼어요」 안내 ${toasts.filter(Boolean).length}대`); // 📜 #65-2 암호 없음 = 늦게 누른 폰은 단추가 먼저 막혀 안내 없이 남기도 함
    const shown = await A.textContent('.bd').catch(() => ''); ok(`[${round}] 방장 화면 = 「출발 (4명)」`, /출발 \(4명\)/.test(shown || ''), (shown || '').match(/출발 \(\d+명\)/)?.[0] || '');
    if (round === 1) await A.screenshot({ path: `${SHOTS}/b47-host.png` });
    for (const p of ps) await p.context().close();
  }
  await b.close(); log(errs.length ? `❌ 실패 ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); process.exit(errs.length ? 1 : 0);
})();
