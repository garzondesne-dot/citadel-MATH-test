// 👋 게시판 던전 = 파티원이 나가도 계속 (📜 2026-11-14 · 에뮬레이터 · 폰 3대)
//   C 가 판 중간에 앱을 닫음 → A · B 「👋 … 나갔어요 · 남은 2명이 이어서」 · 끝 = 팀 배수 2인 · C 가 30초 뒤 다시 열면 못 들어감 · C 💎 없음
//   A(1-3 · 수업 정답률 90% = 🛡) ＋ 모집 글 → B(1-3) · C(1-5 · 다른 반) 합류 · 준비 → ⑧ 역할 · 이유 말풍선 → A ⚔ 출발
//   B 🙋 → A 팀 줄 🙋 · A ⏸ 설명 → 모두 덮개 · 다시 시작 · B 틀림 → A 가 먼저 다 맞힘 → 💡 → B 힌트 카드 · 끝까지 → 결과(팀 등급 · × 1.2 · 🛡 +20% · 순위 · 💎) · 📕 복습 완료 칸
//   ⑬ C 끊김 → ⚠ · 팀 단추 흐림 · 혼자는 됨
// 사용: 에뮬레이터 + npm run build → npx vite preview --port 4173 → NODE_PATH=$(npm root -g) node tools/e2e/team.cjs <그림 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
const B = 'http://localhost:4173/', E = 'emu=127.0.0.1', NS = 'demo-citadel-test-default-rtdb';
const rest = (path, method = 'GET', body) => fetch(`http://127.0.0.1:9000/${path}.json?ns=${NS}`, { method, headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }).then((r) => r.json());
const log = (...a) => console.log(...a);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  for (const c of ['1-3', '1-5']) await rest(`school/last/${c}`, 'PUT', { lesson: 'set-06', no: 6, at: Date.now(), done: true, code: 'x' });
  const b = await chromium.launch({ env: { ...process.env, LANG: 'ko_KR.UTF-8', LC_ALL: 'C.UTF-8' } }), errs = [];
  const open = async (url) => { const ctx = await b.newContext({ viewport: { width: 360, height: 640 } }); const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(`${url}: ${e}`)); await p.goto(B + url); return p; };
  const signup = async (p, cls, num) => {
    await p.waitForSelector('select'); await p.selectOption('select >> nth=0', cls); await p.waitForTimeout(200); await p.selectOption('select >> nth=1', String(num)); await p.waitForTimeout(200);
    await p.click('.links button:has-text("가입")'); await p.click('button.pw >> nth=0'); for (const d of '1234') await p.click(`.pad .keys button:has-text("${d}")`);
    await p.waitForTimeout(150); if (await p.$('.pad')) for (const d of '1234') await p.click(`.pad .keys button:has-text("${d}")`);
    await p.click('.title .pmain'); await p.waitForTimeout(2500);
    if (await p.$('text=첫 용사 고르기')) { await p.click('button:has-text("시작")'); await p.waitForTimeout(800); } // 🧙 첫 용사 고르기 (b1xx 뒤로 새로 가입하면 뜸)
  };
  const A = await open(`?${E}`); await signup(A, '1-3', 1);
  await rest('records/1-3/1/set-06', 'PUT', { right: 27, total: 30, no: 6, at: Date.now() });
  const Bp = await open(`?${E}`); await signup(Bp, '1-3', 2);
  const C = await open(`?${E}`); await signup(C, '1-5', 1);
  await A.reload(); await A.waitForTimeout(2500);
  const board = async (p) => { await p.click('button[aria-label="게시판"]'); await p.waitForSelector('.bd'); await p.waitForTimeout(500); };
  for (const p of [A, Bp, C]) await board(p);
  // A ＋ 모집 글
  await A.click('.bd .chips button:has-text("6")'); await A.click('.bd .act .btn2'); await A.waitForSelector('.lgrid'); await A.click('.sheet .act .btn'); await A.waitForTimeout(1500);
  const posts = await rest('school/board/posts'); const pid = Object.keys(posts || {})[0]; log('＋ 모집 글:', pid, JSON.stringify(Object.values(posts[pid].mem).map((m) => `${m.cls}:${m.role}`)));
  await Bp.waitForSelector('.bd .post', { timeout: 10000 }); log('⑥ B 게시판:', (await Bp.textContent('.bd .post')).replace(/\s+/g, ' ').trim()); await Bp.screenshot({ path: `${SHOTS}/b32-board-post.png` });
  await Bp.click('.bd .post .go'); await C.waitForSelector('.bd .post'); await C.click('.bd .post .go'); await wait(1200);
  await Bp.click('.bd .act .btn'); await C.click('.bd .act .btn'); await wait(1500);
  await A.screenshot({ path: `${SHOTS}/b32-team-wait-host.png` }); await C.screenshot({ path: `${SHOTS}/b32-team-wait-join.png` });
  const slots = await A.$$eval('.slot:not(.empty)', (xs) => xs.map((x) => x.textContent.replace(/\s+/g, ' ').trim())); log('⑧ 대기실:', slots.join(' | '), '| A 말풍선:', (await A.textContent('.bub')).trim(), '| C 말풍선:', (await C.textContent('.bub')).trim());
  if (slots.length !== 3 || !/🛡/.test(slots[0])) errs.push('대기실 · 역할');
  await A.click('.bd .act .btn'); await wait(4000);
  for (const p of [A, Bp, C]) await p.waitForSelector('.run', { timeout: 15000 });
  const ccode = (await rest('school/board/posts'))[pid].code;
  const gemC0 = (await rest('gem/1-5/1'))?.total ?? 0;
  await C.context().close(); log('C 앱 닫음');
  let leftMsg = '';
  for (let k = 0; k < 30 && !leftMsg; k++) { await wait(500); leftMsg = await A.$eval('.run .toast2', (x) => x.textContent).catch(() => ''); if (!/나갔어요/.test(leftMsg)) leftMsg = ''; }
  log('👋 A 한 줄:', leftMsg); if (!/1-5반 .+ 나갔어요 · 남은 2명이 이어서/.test(leftMsg)) errs.push('👋 나갔어요 한 줄');
  for (let k = 0; k < 80; k++) { for (const p of [A, Bp]) await p.evaluate(() => window.__board && window.__board.solve()).catch(() => {}); await wait(700); if (await A.$('.bd .grade')) break; }
  await wait(2500);
  const mult = await A.$eval('.bd .rw', (x) => x.textContent.replace(/\s+/g, ' ')).catch(() => ''); log('⑪ A 결과:', mult.slice(0, 160));
  if (!/2인 팀/.test(mult)) errs.push('팀 배수 = 끝날 때 2인');
  log('   끝 bend.who:', JSON.stringify((await rest(`rooms/${ccode}/state/bend`))?.who));
  // C 30초 뒤 다시 열기
  await wait(31000);
  const C2 = await open(`?${E}`); await C2.waitForTimeout(3000);
  await C2.click('button[aria-label="게시판"]').catch(() => {}); await C2.waitForTimeout(4000);
  const inRun = !!(await C2.$('.run')), msg = await C2.$eval('.bd .toast, .bd [role="status"]', (x) => x.textContent).catch(() => ''), gemC1 = (await rest('gem/1-5/1'))?.total ?? 0;
  log('⏱ C 30초 뒤 다시 열기: 판 화면', inRun, '| 안내', msg.trim().slice(0, 60), '| 💎', gemC0, '→', gemC1);
  if (inRun || gemC1 > gemC0) errs.push('30초 뒤 못 들어감 · 💎 없음');
  await C2.screenshot({ path: `${SHOTS}/teamleave-rejoin.png` });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0');
  await b.close();
})();
