// 📅 #73 예약 모집 (에뮬레이터): 시트(날짜 · 시각 칩) → 글 「📅 … · n차시」 → 다른 폰 🙋 참여 예약 · 한 명 하나만 → 시각 = 방 열림 → +5분 = 방장 폰이 출발(안 온 자리 봇) · 캠프 🔔 띠
// (옛 머리) · 에뮬레이터 폰 3대 + 봇 1 (손발 #1 몫: 출발 · 화면 잇기 · 판 끝 기록 · ⭐ · 반 공적)
//   A 🔒 모집 → B · C 합류 · 준비 → A 출발 → 세 폰 모두 AtbNet(같은 meta · 4칸 · 봇 1) → 방장 엔진 보스 0 → 결과 → 「게시판으로」
//   → 서버: bonus/1-3/{n}/board 한 줄씩 · boardStar · classWar 반 합 = 세 명 공적 합 · 글 done
//   NODE_PATH=$(npm root -g) node tools/e2e/atb48-emu.cjs <그림 폴더> [폰 수 2~4 · 기본 3] [반 · 기본 1-3 · 1-6 = 🧪 테스트 반도 새 전투 · 기록 · 공적 0 (#65-1)]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', N = Number(process.argv[3] || 3), CLS = process.argv[4] || '1-3', CK = CLS.replace('-', '_'), BETA = CLS === '1-6', B = 'http://localhost:4173/', E = 'emu=127.0.0.1', NS = 'demo-citadel-test-default-rtdb';
const rest = (path, method = 'GET', body) => fetch(`http://127.0.0.1:9000/${path}.json?ns=${NS}`, { method, headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }).then((r) => r.json());
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const KST = 9 * 3600e3, wk = (t) => { const k = new Date(t + KST), d = (k.getUTCDay() + 6) % 7; return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()) - d * 864e5).toISOString().slice(0, 10); };
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const open = async () => { const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), p = await ctx.newPage(); await p.addInitScript(() => { try { localStorage.setItem('atb-e2e-nointro', '1'); localStorage.setItem('citadel-v1-board-story', '1'); } catch { /* */ } }); /* #69 조우 · 정찰 건너뜀 (e2e) */ p.on('pageerror', (e) => errs.push(String(e))); await p.goto(`${B}?${E}`); return p; };
  const signup = async (p, cls, num) => {
    await p.waitForSelector('select'); await p.selectOption('select >> nth=0', cls); await p.waitForTimeout(200); await p.selectOption('select >> nth=1', String(num)); await p.waitForTimeout(200);
    await p.click('.links button:has-text("가입")'); await p.click('button.pw >> nth=0'); for (const d of '1234') await p.click(`.pad .keys button:has-text("${d}")`);
    await p.waitForTimeout(150); if (await p.$('.pad')) for (const d of '1234') await p.click(`.pad .keys button:has-text("${d}")`);
    await p.click('.title .pmain'); await p.waitForTimeout(2500); if (await p.$('text=첫 용사 고르기')) { await p.click('button:has-text("시작")'); await p.waitForTimeout(800); }
  };
  const board = async (p) => { if (!(await p.$('.bd'))) await p.$eval('[data-prop="dummy"]', (e) => e.click()); await p.waitForSelector('.bd'); await p.waitForTimeout(500); };
  const rune = async (p, x) => { for (const d of x) await p.click(`.sheet .rune-keys button:has-text("${d}")`); };
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest(`school/last/${CLS}`, 'PUT', { lesson: 'set-06', no: 6, at: Date.now(), done: true, code: 'x' });
  const A = await open(); await signup(A, CLS, 1); await board(A);
  await A.click('[data-map="6"]'); await A.click('[data-k="board-resv"]'); await A.waitForSelector('.rtimes button');
  const days = await A.$$eval('.rdays button', (x) => x.map((e) => e.textContent.trim())); ok('시트 = 날짜 칩 (7일 안)', days.length >= 6 && days.length <= 7, days.join(' '));
  await A.click('.rtimes button >> nth=0'); const main = (await A.textContent('.sheet .act .btn')).trim(); ok('주요 단추 = 「📅 … · 6차시 예약 올리기」', /📅 .* · 6차시 예약 올리기/.test(main), main);
  await A.screenshot({ path: `${SHOTS}/r73-sheet.png` });
  await A.click('.sheet .act .btn'); await wait(1500);
  const pid = Object.keys((await rest('school/board/posts')) || {})[0], post = await rest(`school/board/posts/${pid}`);
  ok('예약 글 = when 있음 · 방장 = 만든 사람', !!post?.when && post.when > Date.now(), String(post?.when));
  ok('만든 폰 = 대기실로 안 감(목록 그대로)', !(await A.$('.slots')) && !!(await A.$('[data-resv="1"]')));
  const B2 = await open(); await signup(B2, CLS, 2); await B2.screenshot({ path: `${SHOTS}/r73-b2camp.png` }); await board(B2); await B2.click('[data-map="6"]').catch(() => {});
  const row = (await B2.textContent('[data-resv="1"]').catch(() => '')) || ''; ok('목록 글 = 「📅 날짜 시각 · 6차시 · 1/4」', /📅\s*\d+\/\d+\(.\) 오[전후] \d+:\d\d · 6차시 · 1 \/ 4/.test(row), row.replace(/\s+/g, ' ').trim());
  await B2.click('[data-k="resv-join"]'); await wait(1200);
  ok('🙋 참여 예약 → 2/4 · 「✔ 예약함 · 취소」', Object.keys((await rest(`school/board/posts/${pid}/mem`)) || {}).length === 2 && !!(await B2.$('[data-k="resv-cancel"]')));
  await B2.click('[data-k="board-resv"]'); await wait(500); ok('한 명 예약 하나만 (두 번째 = 시트 안 열림)', !(await B2.$('.rtimes')));
  await B2.screenshot({ path: `${SHOTS}/r73-list.png` });
  // ⏰ 시각을 앞당김 → 10분 안 = 캠프 🔔 띠
  await rest(`school/board/posts/${pid}/when`, 'PUT', Date.now() + 5 * 60e3); await wait(1500);
  await B2.click('.bd .bar .back').catch(() => {}); await wait(1500);
  await B2.screenshot({ path: `${SHOTS}/r73-bell.png` }); const bell = (await B2.textContent('[data-k="resv-bell"]').catch(() => '')) || ''; ok('🔔 캠프 띠 「6차시 예약 판 n분 전」', /6차시 예약 판 \d+분 전/.test(bell), bell.trim());
  // ⏰ 시각 + 6분 → 방장 폰(A)이 출발 → 새 전투
  await rest(`school/board/posts/${pid}/when`, 'PUT', Date.now() - 6 * 60e3); await wait(3000);
  await A.waitForSelector('[data-k="atb-stage"]', { timeout: 20000 }).catch(() => {});
  const meta = await rest(`atb/${pid}/meta`); ok('+5분 = 방장 폰이 출발 → 새 전투 · 안 온 자리 봇', !!meta && meta.slots.filter((x) => x.bot).length >= 2 && !!(await A.$('[data-k="atb-stage"]')), meta ? meta.slots.map((x) => x.bot ? 'bot' : x.uid).join(',') : '없음');
  await b.close(); console.log(errs.length ? `❌ 실패 ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); process.exit(errs.length ? 1 : 0);
})();
