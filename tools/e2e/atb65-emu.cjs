// 📡 #65 · #67 게시판 혼자 도전 = 새 전투 · 📕 복습 완료 · 모집 글 암호 없음 (에뮬레이터)
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
  const open = async () => { const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), p = await ctx.newPage(); await p.addInitScript(() => { try { localStorage.setItem('atb-e2e-nointro', '1'); } catch { /* */ } }); /* #69 조우 · 정찰 건너뜀 (e2e) */ p.on('pageerror', (e) => errs.push(String(e))); await p.goto(`${B}?${E}`); return p; };
  const signup = async (p, cls, num) => {
    await p.waitForSelector('select'); await p.selectOption('select >> nth=0', cls); await p.waitForTimeout(200); await p.selectOption('select >> nth=1', String(num)); await p.waitForTimeout(200);
    await p.click('.links button:has-text("가입")'); await p.click('button.pw >> nth=0'); for (const d of '1234') await p.click(`.pad .keys button:has-text("${d}")`);
    await p.waitForTimeout(150); if (await p.$('.pad')) for (const d of '1234') await p.click(`.pad .keys button:has-text("${d}")`);
    await p.click('.title .pmain'); await p.waitForTimeout(2500); if (await p.$('text=첫 용사 고르기')) { await p.click('button:has-text("시작")'); await p.waitForTimeout(800); }
  };
  const board = async (p) => { if (!(await p.$('.bd'))) await p.click('button[aria-label="게시판"]'); await p.waitForSelector('.bd'); await p.waitForTimeout(500); };
  const rune = async (p, x) => { for (const d of x) await p.click(`.sheet .rune-keys button:has-text("${d}")`); };
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest(`school/last/${CLS}`, 'PUT', { lesson: 'set-06', no: 6, at: Date.now(), done: true, code: 'x' });
  const A = await open(); await signup(A, CLS, 1); await board(A);
  // ① 혼자 도전 = 새 전투
  await A.click('[data-map="6"]'); await A.click('button:has-text("6차시 혼자 도전")');
  await A.waitForSelector('[data-k="atb-stage"]', { timeout: 25000 }).catch(() => {});
  ok('혼자 도전 → 새 전투 화면', !!(await A.$('[data-k="atb-stage"]')));
  const onTop = await Promise.all([A].map((p) => p.evaluate(() => { const st = document.querySelector('[data-k="atb-stage"]'); const pts = [[0.5, 0.5], [0.15, 0.6], [0.85, 0.6]]; return !!st && pts.every(([x, y]) => { const e = document.elementFromPoint(innerWidth * x, innerHeight * y); return !!e && st.contains(e); }); })));
  ok('🐞 #68 전투 화면이 맨 위 (화면 가운데 · 양옆 = 전투 · 게시판 시트에 안 덮임)', onTop.every(Boolean), onTop.join(','));
  const posts0 = (await rest('school/board/posts')) || {}, solo = Object.values(posts0)[0];
  const meta = solo ? await rest(`atb/${solo.pid}/meta`) : null;
  ok('혼자 판 = 나 + 봇 3 · solo 글', !!meta && meta.slots.filter((x) => x.bot).length === 3 && solo.solo === true, meta ? meta.slots.map((x) => x.bot ? 'bot' : x.uid).join(',') : '없음');
  for (let i = 0; i < 6; i++) { await A.evaluate(() => globalThis.__atb?.solve?.()); await wait(500); }
  for (let i = 0; i < 20; i++) { await A.evaluate(() => { const S = globalThis.__atb?.S; if (!S || S.end) return; S.bossHp = 0; (S.cells || []).forEach((c) => { c.broken = true; }); S.heroes.forEach((h) => { h.down = false; h.hp = Math.max(1, h.hp || 1); }); }); await wait(300); }
  await A.waitForSelector('[data-k="atb-to-board"]', { timeout: 60000 }).catch(() => {});
  ok('결과 화면', !!(await A.$('[data-k="atb-to-board"]')));
  await A.click('[data-k="atb-to-board"]').catch(() => {}); await wait(2500);
  const bd = Object.values((await rest(`bonus/${CLS}/1/board`)) || {}).filter((r) => r.atb), rv = (await rest(`bonus/${CLS}/1/review/set-06`)) || {};
  if (BETA) { ok('🧪 테스트 반 = 기록 · 복습 기록 없음', bd.length === 0 && !Object.keys(rv).length); }
  else { ok('혼자 판 학생 기록 1줄', bd.length === 1, `${bd.length}`); ok('📕 복습 완료 = 맞힌 몬스터 칸', Object.keys(rv).length >= 1, Object.keys(rv).join(',')); }
  ok('게시판으로 돌아옴', !!(await A.$('[data-k="board-map"]')));
  // ② 모집 글 = 암호 없이 바로 · 다른 폰 합류 = 암호 입력 없음
  const B2 = await open(); await signup(B2, CLS, 2); await board(B2);
  await A.click('[data-map="6"]').catch(() => {});
  ok('「👥 6차시 팀 모집」 = 시트 없이 바로 (암호 칸 없음)', /6차시 팀 모집/.test((await A.textContent('[data-k="board-post"]')) || ''));
  await A.click('[data-k="board-post"]'); await wait(1800); ok('모집 시트 · 암호 칸 안 뜸', !(await A.$('.lgrid')) && !(await A.$('.sheet .rune-keys')));
  const pst = Object.values((await rest('school/board/posts')) || {}).find((p) => p.phase === 'wait');
  const lock = pst ? await rest(`boardLock/${pst.pid}`) : 'x';
  ok('모집 글 = 암호 없음(lk 없음 · boardLock 없음)', !!pst && !pst.lk && !lock, pst ? pst.pid : '없음');
  await B2.waitForSelector('.post .go:not([disabled])', { timeout: 15000 }); await B2.click('.post .go'); await wait(1500);
  ok('합류 때 암호 창 안 뜸', !(await B2.$('.sheet .rune-keys')));
  const mem = pst ? (await rest(`school/board/posts/${pst.pid}/mem`)) || {} : {};
  ok('다른 폰 합류 = 2명', Object.keys(mem).length === 2, Object.keys(mem).join(','));
  await B2.screenshot({ path: `${SHOTS}/atb65-join.png` });
  await b.close(); console.log(errs.length ? `❌ 실패 ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); process.exit(errs.length ? 1 : 0);
})();
