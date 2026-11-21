// 📡 #48 · #51 게시판 → ATB 여럿이 한 판 · 에뮬레이터 폰 3대 + 봇 1 (손발 #1 몫: 출발 · 화면 잇기 · 판 끝 기록 · ⭐ · 반 공적)
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
  const open = async () => { const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e))); await p.goto(`${B}?${E}`); return p; };
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
  const ps = []; for (let i = 1; i <= N; i++) { const p = await open(); await signup(p, CLS, i); await board(p); ps.push(p); }
  const [A, ...others] = ps;
  await A.click('[data-map=\"6\"]'); await A.click('[data-k=\"board-post\"]'); await wait(1800);
  const pid = Object.keys((await rest('school/board/posts')) || {})[0]; ok('모집 글', !!pid);
  for (const p of others) { await p.waitForSelector('.post .go:not([disabled])', { timeout: 15000 }); await p.click('.post .go'); await wait(1200); }
  for (const p of others) { const r = await p.$('button:has-text("준비")'); if (r) await r.click().catch(() => {}); await wait(600); }
  const mem = (await rest(`school/board/posts/${pid}/mem`)) || {};
  ok(`합류 ${N}명 · 용사 정보(g) 같이 씀`, Object.keys(mem).length === N && Object.values(mem).every((m) => m.g && m.g.lv >= 1), Object.values(mem).map((m) => JSON.stringify(m.g)).join(' '));
  await A.waitForSelector(`button:has-text("출발 (${N}명)"):not([disabled])`, { timeout: 15000 }); await A.click(`button:has-text("출발 (${N}명)")`);
  await Promise.all(ps.map((p) => p.waitForSelector('[data-k="atb-stage"]', { timeout: 25000 }).catch(() => {})));
  const meta = await rest(`atb/${pid}/meta`), post = await rest(`school/board/posts/${pid}`);
  ok('출발 = atb meta 4칸(사람 N · 봇 4-N) · 글 play · code A', meta && meta.slots.length === 4 && meta.slots.filter((s) => s.bot).length === 4 - N && post.phase === 'play' && post.code === `A${pid}`, meta ? meta.slots.map((s) => s.bot ? 'bot' : s.uid).join(',') : 'meta 없음');
  const stages = await Promise.all(ps.map((p) => p.$('[data-k="atb-stage"]').then(Boolean)));
  ok('모든 폰 ATB 전투 화면', stages.every(Boolean), stages.join(','));
  await wait(3000); await A.screenshot({ path: `${SHOTS}/atb48-battle-A.png` });
  const host = await rest(`atb/${pid}/host`); ok('방장 엔진 = 글 올린 사람', host === `s${CK}_1`, String(host));
  const snap = await rest(`atb/${pid}/snap`); ok('상태 요약 snap 서버에 씀 (20KB 안)', snap && typeof snap.j === 'string' && snap.j.length < 20000, snap ? `${snap.j.length}자` : '없음');
  // 방장 엔진 보스 체력 0 → 판 끝
  for (let i = 0; i < 20; i++) { await A.evaluate(() => { const S = globalThis.__atb?.S; if (!S || S.end) return; S.bossHp = 0; (S.cells || []).forEach((c) => { c.broken = true; }); S.heroes.forEach((h) => { h.down = false; h.hp = Math.max(1, h.hp || 1); }); }); await wait(300); }
  console.log('엔진 끝:', JSON.stringify(await A.evaluate(() => globalThis.__atb?.S?.end ?? null)));
  await Promise.all(ps.map((p) => p.waitForSelector('[data-k="atb-to-board"]', { timeout: 60000 }).catch(() => {})));
  const btn = await Promise.all(ps.map((p) => p.$('[data-k="atb-to-board"]').then(Boolean)));
  ok('모든 폰 결과 화면 · 「게시판으로」', btn.every(Boolean), btn.join(','));
  await A.screenshot({ path: `${SHOTS}/atb48-result-A.png` });
  for (const p of ps) { await p.click('[data-k="atb-to-board"]', { timeout: 5000 }).catch(() => {}); await wait(800); }
  await wait(2500);
  const ends = (await rest(`atb/${pid}/end`)) || {};
  ok(`end/{uid} = 각자 폰이 씀 · ${N}명`, Object.keys(ends).length === N, Object.keys(ends).join(','));
  let msum = 0, recs = 0, starOk = true;
  for (let n = 1; n <= N; n++) { const bd = (await rest(`bonus/${CLS}/${n}/board`)) || {}, rs = Object.values(bd).filter((r) => r.atb); recs += rs.length; const e = ends[`s${CK}_${n}`]; if (e) msum += e.meritSum; const st = await rest(`bonus/${CLS}/${n}/boardStar/set-06`); if ((e?.stars ?? 0) > 0 && st !== e.stars) starOk = false; }
  if (BETA) { ok('🧪 테스트 반 = 학생 기록 0줄 · ⭐ 0', recs === 0, `${recs}줄`); } else { ok('학생 기록 한 줄씩 (atb)', recs === N, `${recs}줄`); ok('⭐ 최고 별 = 판 별', starOk); }
  const war = await rest(`classWar/${wk(Date.now())}/sum/${CLS}`);
  if (BETA) ok('🧪 테스트 반 = 반 공적 없음', !war, String(war)); else ok('반 공적 = 모두의 공적 합', war === msum && msum > 0, `${war} / ${msum}`);
  const ph = await rest(`school/board/posts/${pid}/phase`); ok('글 done', ph === 'done', ph);
  const back = await Promise.all(ps.map((p) => p.$('[data-k="board-map"]').then(Boolean)));
  ok('모든 폰 게시판으로 돌아옴 (출정 지도)', back.every(Boolean), back.join(','));
  await A.screenshot({ path: `${SHOTS}/atb48-back-A.png` });
  await b.close(); console.log(errs.length ? `❌ 실패 ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); process.exit(errs.length ? 1 : 0);
})();
