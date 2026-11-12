// #143 📋 게시판 던전 팀 (에뮬레이터 · 폰 3대 · 다른 반 1 · 360 × 640)
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
    await p.click('button.go'); await p.waitForTimeout(2500);
  };
  const A = await open(`?${E}`); await signup(A, '1-3', 1);
  await rest('records/1-3/1/set-06', 'PUT', { right: 27, total: 30, no: 6, at: Date.now() });
  const Bp = await open(`?${E}`); await signup(Bp, '1-3', 2);
  const C = await open(`?${E}`); await signup(C, '1-5', 1);
  await A.reload(); await A.waitForTimeout(2500);
  const board = async (p) => { await p.click('button[aria-label="📋 게시판"]'); await p.waitForSelector('.bd'); await p.waitForTimeout(500); };
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
  const go = await A.$eval('.bd .act .btn', (x) => ({ t: x.textContent.trim(), d: x.disabled })); log('   출발 단추:', JSON.stringify(go)); if (go.d) errs.push('출발 막힘');
  await A.click('.bd .act .btn'); await wait(4000);
  for (const p of [A, Bp, C]) await p.waitForSelector('.run', { timeout: 15000 });
  log('⑨ 팀 줄:', (await A.textContent('.run .team')).replace(/\s+/g, ' ').trim(), '| A 도구:', await A.$$eval('.run .tools button', (xs) => xs.map((x) => x.textContent.trim()).join(' / ')), '| B 도구:', await Bp.$$eval('.run .tools button', (xs) => xs.map((x) => x.textContent.trim()).join(' / ')));
  // 🙋
  await Bp.click('.run .tools button:has-text("도와줘")'); await wait(1200); const tA = (await A.textContent('.run .team')); log('🙋 B 도와줘 → A 팀 줄:', tA.replace(/\s+/g, ' ').trim()); if (!/🙋/.test(tA)) errs.push('🙋 보임');
  // ⏸ 설명
  await A.click('.run .tools button:has-text("설명")'); await wait(1200);
  const cov = await C.$eval('.run > .cover', (x) => x.textContent.replace(/\s+/g, ' ').trim()).catch(() => ''); log('⏸ 설명 → C 덮개:', cov); if (!/수호자가 설명 중/.test(cov)) errs.push('설명 덮개');
  await C.screenshot({ path: `${SHOTS}/b32-team-pause.png` });
  await A.click('.run .cover .btn'); await wait(1200); if (await C.$('.run > .cover')) errs.push('다시 시작');
  // B 틀림 · A 먼저 다 맞힘 → 💡
  await Bp.evaluate(() => window.__board.miss()); await A.evaluate(() => window.__board.solve()); await wait(1500);
  await A.click('.run .tools button:has-text("힌트")'); await A.waitForSelector('.who'); await A.screenshot({ path: `${SHOTS}/b32-team-hint-sheet.png` });
  await A.click('.who button:not([disabled]) >> nth=0'); await wait(1500);
  const hc = await Bp.$eval('.run .hcard', (x) => x.textContent.replace(/\s+/g, ' ').trim()).catch(() => ''); log('💡 B 힌트 카드:', hc); if (!/수호자의 힌트/.test(hc)) errs.push('힌트 카드');
  await Bp.screenshot({ path: `${SHOTS}/b32-team-hint.png` });
  // 끝까지
  for (let k = 0; k < 80; k++) { for (const p of [A, Bp, C]) await p.evaluate(() => window.__board && window.__board.solve()).catch(() => {}); await wait(700); if (await A.$('.bd .grade')) break; }
  await wait(2000);
  for (const [n, p] of [['A', A], ['B', Bp], ['C', C]]) { const g = await p.$eval('.bd .grade', (x) => x.textContent.replace(/\s+/g, ' ').trim()).catch(() => '없음'); const rw = await p.$eval('.bd .rw', (x) => x.textContent.replace(/\s+/g, ' ').trim()).catch(() => ''); const rk = await p.$eval('.bd .rk', (x) => x.textContent.replace(/\s+/g, ' ').trim()).catch(() => '없음'); log(`⑪ ${n}:`, g, '|', rw, '|', rk); if (g === '없음') errs.push(`${n} 결과`); }
  await A.screenshot({ path: `${SHOTS}/b32-team-result-guard.png` }); await C.screenshot({ path: `${SHOTS}/b32-team-result.png` });
  log('💎 서버:', JSON.stringify({ A: (await rest('gem/1-3/1')).day, C: (await rest('gem/1-5/1')).day }), '| 📕 복습 완료 칸 A:', Object.keys((await rest('bonus/1-3/1/review/set-06')) || {}).length, '| 순위:', JSON.stringify(await rest('school/board/rank')).slice(0, 120));
  // ⑬ 끊김
  await C.click('.bd .btn2'); await C.context().setOffline(true); await wait(3000);
  const off = await C.evaluate(() => ({ warn: document.querySelector('.bd .off')?.textContent, post: document.querySelector('.bd .act .btn2')?.disabled, solo: document.querySelector('.bd .act .btn')?.disabled })); log('⑬ C 끊김:', JSON.stringify(off)); if (!off.warn || !off.post || off.solo) errs.push('끊김');
  await C.screenshot({ path: `${SHOTS}/b32-board-offline.png` });
  const ov = await Promise.all([A, Bp].map((p) => p.evaluate(() => document.documentElement.scrollWidth - innerWidth))); log('가로 넘침:', ov.join(' ')); if (ov.some((x) => x > 0)) errs.push('가로 넘침');
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0');
  await b.close();
})();
