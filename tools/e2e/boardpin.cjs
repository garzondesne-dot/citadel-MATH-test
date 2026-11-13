// 🔒 게시판 던전 입장 암호 (2026-11-13 · 에뮬레이터 · 폰 3대 · 360 × 640)
//   A ＋ 모집 글 · 🔒 암호 걸기 4821 → 대기실 위 「입장 암호 4821」 / B 목록 = 🔒 암호 · 합류 → 틀림 3번(남은 수 → 1분) → 1분 동안 맞아도 막힘 / C 맞는 암호 → 대기실(암호 숫자 안 보임 · 🔒 표시만)
//   서버엔 숫자 없음(해시만 · 따로) · 암호 없는 글은 그대로 바로 합류
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
const B = 'http://localhost:4173/', E = 'emu=127.0.0.1', NS = 'demo-citadel-test-default-rtdb';
const rest = (path, method = 'GET', body) => fetch(`http://127.0.0.1:9000/${path}.json?ns=${NS}`, { method, headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }).then((r) => r.json());
const log = (...a) => console.log(...a), wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  for (const c of ['1-3', '1-5']) await rest(`school/last/${c}`, 'PUT', { lesson: 'set-06', no: 6, at: Date.now(), done: true, code: 'x' });
  const b = await chromium.launch(), errs = [];
  const open = async () => { const p = await (await b.newContext({ viewport: { width: 360, height: 640 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e))); await p.goto(`${B}?${E}`); return p; };
  const signup = async (p, cls, num) => {
    await p.waitForSelector('select'); await p.selectOption('select >> nth=0', cls); await p.waitForTimeout(200); await p.selectOption('select >> nth=1', String(num)); await p.waitForTimeout(200);
    await p.click('.links button:has-text("가입")'); await p.click('button.pw >> nth=0'); for (const d of '1234') await p.click(`.pad .keys button:has-text("${d}")`);
    await p.waitForTimeout(150); if (await p.$('.pad')) for (const d of '1234') await p.click(`.pad .keys button:has-text("${d}")`);
    await p.click('.title .pmain'); await p.waitForTimeout(2500);
  };
  const A = await open(); await signup(A, '1-3', 1); const Bp = await open(); await signup(Bp, '1-3', 2); const C = await open(); await signup(C, '1-5', 1);
  const board = async (p) => { await p.click('button[aria-label="📋 게시판"]'); await p.waitForSelector('.bd'); await p.waitForTimeout(500); };
  for (const p of [A, Bp, C]) await board(p);
  const rune = async (p, s) => { for (const d of s) await p.click(`.sheet .rune-keys button:has-text("${d}")`); };
  // A ＋ 모집 글 · 🔒 암호
  await A.click('.bd .chips button:has-text("6")'); await A.click('.bd .act .btn2'); await A.waitForSelector('.lgrid'); await A.click('.sheet .lkt'); await rune(A, '4821');
  await A.screenshot({ path: `${SHOTS}/b53-pin-post.png` }); await A.click('.sheet .act .btn'); await wait(1800);
  const posts = await rest('school/board/posts'), pid = Object.keys(posts || {})[0], lock = await rest(`boardLock/${pid}`);
  log('＋ 암호 글:', pid, '· lk', posts[pid].lk, '· 서버 해시', String(lock?.h).slice(0, 12) + '…', '· 숫자 그대로 있음?', JSON.stringify(posts).includes('4821') || JSON.stringify(lock).includes('4821'));
  if (!posts[pid].lk || !lock?.h || JSON.stringify(posts).includes('4821') || JSON.stringify(lock).includes('4821')) errs.push('서버 해시');
  const hostCard = (await A.textContent('.card.pin')).replace(/\s+/g, ' ').trim(); log('A 대기실 위:', hostCard); if (!/입장 암호 4821/.test(hostCard)) errs.push('모집자 암호 보임');
  await A.screenshot({ path: `${SHOTS}/b53-pin-host.png` });
  // B 틀림 3번
  await Bp.waitForSelector('.bd .post', { timeout: 10000 }); const row = (await Bp.textContent('.bd .post')).replace(/\s+/g, ' ').trim(); log('B 목록:', row); if (!/🔒 암호/.test(row)) errs.push('목록 🔒');
  await Bp.click('.bd .post .go'); await Bp.waitForSelector('.sheet .rune-keys');
  const msgs = []; for (const w of ['1111', '2222', '3333']) { await rune(Bp, w); await Bp.click('.sheet .act .btn'); await Bp.waitForSelector('.pinerr', { timeout: 10000 }); await wait(300); msgs.push((await Bp.textContent('.pinerr')).trim()); }
  log('B 틀림 3번:', msgs.join(' → ')); if (!/2번 남/.test(msgs[0]) || !/1번 남/.test(msgs[1]) || !/1분 뒤/.test(msgs[2])) errs.push('틀림 3번');
  await Bp.screenshot({ path: `${SHOTS}/b53-pin-wrong.png` });
  await rune(Bp, '4821'); await Bp.click('.sheet .act .btn'); await wait(800); const blk = (await Bp.textContent('.pinerr').catch(() => '')).trim(); log('B 1분 안에 맞는 암호:', blk); if (!/초 뒤에 다시/.test(blk)) errs.push('1분 막힘');
  const memB = await rest(`school/board/posts/${pid}/mem`); if (Object.keys(memB).length !== 1) errs.push('틀린 B 가 들어감');
  // C 맞음
  await C.waitForSelector('.bd .post'); await C.click('.bd .post .go'); await C.waitForSelector('.sheet .rune-keys'); await rune(C, '4821'); await C.click('.sheet .act .btn'); await wait(2500);
  const cCard = (await C.textContent('.card.pin').catch(() => '')).replace(/\s+/g, ' ').trim(), cSlots = await C.$$eval('.slot:not(.empty)', (x) => x.length);
  log('C 맞는 암호 → 대기실:', cSlots, '명 ·', cCard); if (cSlots !== 2 || /4821/.test(cCard) || !/🔒/.test(cCard)) errs.push('C 합류 · 숫자 숨김');
  await C.screenshot({ path: `${SHOTS}/b53-pin-join.png` });
  // 1분 뒤 B (시계를 앞당기는 대신 기다리지 않고 기록만 지움 = 같은 함수 · 시간 판정은 단위 시험)
  // 암호 없는 글
  await A.click('.bd .act .btn2:has-text("내리기")'); await wait(1200); await C.click('.bd .act .btn2:has-text("나가기")').catch(() => {}); await wait(800);
  await A.click('.bd .act .btn2'); await A.waitForSelector('.lgrid'); await A.click('.sheet .act .btn'); await wait(1500);
  await Bp.reload(); await Bp.waitForTimeout(2500); await board(Bp); await Bp.waitForSelector('.bd .post'); const row2 = (await Bp.textContent('.bd .post')).replace(/\s+/g, ' ');
  await Bp.click('.bd .post .go'); await wait(1500); const bIn = await Bp.$$eval('.slot:not(.empty)', (x) => x.length); log('암호 없는 글: 목록 🔒', /🔒 암호/.test(row2) ? '있음 ✗' : '없음 ○', '· B 바로 합류', bIn === 2 ? '○' : `✗ ${bIn}`);
  if (/🔒 암호/.test(row2) || bIn !== 2) errs.push('암호 없는 글');
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close(); process.exit(0);
})();
