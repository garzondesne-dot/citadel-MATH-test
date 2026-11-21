// 🐞 11/21 버그 사냥 · #48 친구 폰 공격 · 문제 풀이가 방장 엔진에 닿나 (에뮬레이터 · atb48-emu 앞부분 그대로)
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
  const open = async () => { const ctx = await b.newContext({ viewport: { width: Number(process.env.VW || 390), height: Number(process.env.VH || 844) } }), p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e))); await p.goto(`${B}?${E}`); return p; };
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
  const onTop = await Promise.all(ps.map((p) => p.evaluate(() => { const st = document.querySelector('[data-k="atb-stage"]'); const pts = [[0.5, 0.5], [0.15, 0.6], [0.85, 0.6]]; return !!st && pts.every(([x, y]) => { const e = document.elementFromPoint(innerWidth * x, innerHeight * y); return !!e && st.contains(e); }); })));
  ok('🐞 #68 전투 화면이 맨 위 (화면 가운데 · 양옆 = 전투 · 게시판 시트에 안 덮임)', onTop.every(Boolean), onTop.join(','));
  await wait(3000); await A.screenshot({ path: `${SHOTS}/atb48-battle-A.png` });
  const host = await rest(`atb/${pid}/host`); ok('방장 엔진 = 글 올린 사람', host === `s${CK}_1`, String(host));
  const snap = await rest(`atb/${pid}/snap`); ok('상태 요약 snap 서버에 씀 (20KB 안)', snap && typeof snap.j === 'string' && snap.j.length < 20000, snap ? `${snap.j.length}자` : '없음');
  const F = others[0];
  const hostEv = () => A.evaluate(() => { const S = globalThis.__atb?.S; const by = {}; for (const e of S?.ev || []) { const k = `${e.k}${e.who != null ? '#' + e.who : ''}${e.timing ? ':' + e.timing : ''}`; by[k] = (by[k] || 0) + 1; } return { by, boss: Math.round(S?.bossHp ?? -1) }; });
  for (let i = 0; i < 0; i++) { const r = await Promise.all(ps.map((p) => p.evaluate(() => (document.querySelector('[data-k="atb-stage"]') ? 'S' : document.querySelector('[data-k="atb-result"]') ? 'R' : document.querySelector('.bd') ? 'B' : '?') + (globalThis.__atb?.S ? '*' : '')).catch(() => 'x'))); console.log(`   ${i}초 화면:`, r.join(' '), '· 글', JSON.stringify(await rest(`school/board/posts/${pid}/phase`)), '· 자리', JSON.stringify(((await rest(`atb/${pid}/meta`)) || {}).slots?.map((x) => x.uid || 'bot'))); await wait(1000); }
  console.log('   무대 상자:', JSON.stringify(await Promise.all(ps.map((p) => p.evaluate(() => { const e = document.querySelector('[data-k="atb-stage"]'), l = document.querySelector('[data-k="atb-land"]'); const r = e?.getBoundingClientRect(), cs = e && getComputedStyle(e), lr = l?.getBoundingClientRect(); const top = document.elementFromPoint(innerWidth / 2, innerHeight / 2); let anc = e, hid = ''; while (anc) { const c = getComputedStyle(anc); if (c.display === 'none' || c.visibility === 'hidden' || Number(c.opacity) === 0) { hid = anc.className || anc.tagName; break; } anc = anc.parentElement; } return { r: r && [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], land: lr && [Math.round(lr.x), Math.round(lr.y), Math.round(lr.width), Math.round(lr.height)], hid, mid: top && (top.dataset.k || top.className || top.tagName).toString().slice(0, 40) }; })))));
  const st = await F.evaluate(() => { const b = document.querySelector('[data-k="atb-attack"]'); return { btn: b ? b.textContent.replace(/\s+/g, ' ').trim() : null, dis: b?.disabled, me: document.querySelector('[data-k="atb-me-hero"], .me')?.textContent?.slice(0, 30) }; });
  console.log('   친구 폰 공격 단추:', JSON.stringify(st), '· 방장 전:', JSON.stringify(await hostEv()));
  await F.screenshot({ path: `${SHOTS}/atb48p-friend-0.png` });
  await F.click('[data-k="atb-attack"]').catch((e) => console.log('   누르기 실패', String(e).slice(0, 80)));
  await wait(350); const tb = !!(await F.$('[data-k="atb-timing"]')); await F.screenshot({ path: `${SHOTS}/atb48p-friend-1.png` });
  await F.click('[data-k="atb-attack"]').catch(() => {}); await wait(2500);
  const h1 = await hostEv();
  ok('친구 폰 공격 → 타이밍 바 뜸', tb);
  ok('친구 폰 공격 → 방장 엔진에 atk 사건', Object.keys(h1.by).some((k) => k.startsWith('atk#1') || k.startsWith('atk#') && !k.startsWith('atk#0')), JSON.stringify(h1));
  // 문제 풀이 = 충전
  await F.click('[data-k="atb-quiz-open"]').catch(() => {}); await wait(800); await F.screenshot({ path: `${SHOTS}/atb48p-friend-quiz.png` });
  console.log('   친구 폰 카드:', JSON.stringify(await F.evaluate(() => ({ card: !!document.querySelector('[data-k="atb-quiz"]'), title: document.querySelector('[data-k="atb-qtitle"]')?.textContent?.trim() }))));
  await b.close(); console.log(errs.length ? `❌ 실패 ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); process.exit(errs.length ? 1 : 0);
})();
