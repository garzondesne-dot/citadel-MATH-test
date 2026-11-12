// #147 🔁 팀 진행 이어받기 (에뮬레이터 · 폰 3대): 글 올린 폰(A)이 나감 → 10초 안에 남은 팀원이 이어받음 · 「🔁 진행을 ○○가 이어받았어요」
//   맡은 폰이 끊김 → 다른 팀원이 이어받음 · 다시 이어져도 뺏지 않음 · A 가 다시 들어옴 = 그대로 팀원 · 끝까지
// (아래 준비 부분 = team.cjs 와 같음)
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
  const code = (await rest(`school/board/posts/${pid}`)).code, drv = async () => { const all = (await rest(`rooms/${code}/bdrv`)) || {}, now = Date.now(), f = Object.entries(all).filter(([, l]) => now - l.at <= 10000).sort((a, b) => b[1].since - a[1].since)[0]; return f ? { u: f[0], ...f[1] } : {}; };
  await wait(2500); log('처음 진행:', JSON.stringify(await drv()));
  if ((await drv()).u !== 's1_3_1') errs.push('처음 = 글 올린 폰');
  // ① A 나감(창 닫음 · 팀원 그대로)
  const actx = A.context(); await A.close(); const t0 = Date.now(); let d = await drv();
  for (let k = 0; k < 40 && d.u === 's1_3_1'; k++) { await wait(500); d = await drv(); }
  const sec = Math.round((Date.now() - t0) / 1000), msg = [await Bp.$eval('.toast2', (x) => x.textContent).catch(() => ''), await C.$eval('.toast2', (x) => x.textContent).catch(() => '')].filter(Boolean).join(' / ');
  log(`① A 나감 → ${sec}초 뒤 진행 = ${d.u} | 알림: ${msg}`); if (d.u === 's1_3_1' || sec > 15) errs.push('이어받기'); if (!/이어받았어요/.test(msg)) errs.push('이어받기 알림');
  await Bp.screenshot({ path: `${SHOTS}/b33-takeover.png` });
  const st0 = (await rest(`rooms/${code}/state`)).step; for (const p of [Bp, C]) await p.evaluate(() => window.__board.solve()); await wait(3000);
  const st1 = (await rest(`rooms/${code}/state`)).step; log('   남은 둘이 풀면 다음 단계:', st0, '→', st1, '(A 는 접속이 끊겨 기다리지 않음)'); if (!(st1 > st0)) errs.push('이어받은 뒤 진행');
  // ② 맡은 폰 끊김 → 다른 팀원
  const D = d.u === 's1_3_2' ? Bp : C, O = D === Bp ? C : Bp; await D.context().setOffline(true); const t1 = Date.now(); let d2 = await drv();
  for (let k = 0; k < 40 && d2.u === d.u; k++) { await wait(500); d2 = await drv(); }
  log(`② ${d.u} 끊김 → ${Math.round((Date.now() - t1) / 1000)}초 뒤 진행 = ${d2.u}`); if (d2.u === d.u) errs.push('끊김 이어받기');
  await D.context().setOffline(false); await wait(5000); const d3 = await drv(); log(`   ${d.u} 다시 이어짐 → 진행 그대로 ${d3.u}`); if (d3.u !== d2.u) errs.push('되살아난 폰이 뺏음');
  // ③ A 다시 들어옴 = 그대로 팀원
  const A2 = await actx.newPage(); A2.on('pageerror', (e) => errs.push(`A2: ${e}`)); await A2.goto(`${B}?${E}`); await A2.waitForTimeout(3000);
  await A2.click('button[aria-label="📋 게시판"]'); await A2.waitForSelector('.run', { timeout: 15000 }); await wait(2500);
  const tA = await A2.textContent('.run .team'); log('③ A 다시 들어옴 → 팀 줄:', tA.replace(/\s+/g, ' ').trim(), '| 진행', (await drv()).u); if (!/나/.test(tA)) errs.push('다시 들어옴');
  // 끝까지
  for (let k = 0; k < 80; k++) { for (const p of [A2, Bp, C]) await p.evaluate(() => window.__board && window.__board.solve()).catch(() => {}); await wait(700); if (await Bp.$('.bd .grade')) break; }
  await wait(2500);
  for (const [n, p] of [['A', A2], ['B', Bp], ['C', C]]) { const g = await p.$eval('.bd .grade', (x) => x.textContent.replace(/\s+/g, ' ').trim()).catch(() => '없음'); log(`끝 ${n}:`, g); if (g === '없음') errs.push(`${n} 결과`); }
  log('글 상태:', (await rest(`school/board/posts/${pid}/phase`)), '| 순위 줄:', Object.keys((await rest('school/board/rank/set-06')) || {}).length ? 'ok' : '없음');
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0');
  await b.close();
})();
