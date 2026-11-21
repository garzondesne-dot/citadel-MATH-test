// 🐞 11/21 버그 사냥 · #48 여러 폰 거친 경우 (atb48-emu 앞부분 그대로 · 에뮬레이터)
//   ⓐ 실제로 몇 초 싸움 = 폰마다 보스 · 용사 체력이 같나(어긋남) ⓑ 친구 폰 새로 고침 = 같은 판으로 ⓒ 방장 폰 닫힘 = 넘겨받고 계속 ⓓ 「게시판으로」 두 번 · 결과에서 새로 고침 = 공적 두 번 안 들어감
//   A 🔒 모집 → B · C 합류 · 준비 → A 출발 → 세 폰 모두 AtbNet(같은 meta · 4칸 · 봇 1) → 방장 엔진 보스 0 → 결과 → 「게시판으로」
//   → 서버: bonus/1-3/{n}/board 한 줄씩 · boardStar · classWar 반 합 = 세 명 공적 합 · 글 done
//   NODE_PATH=$(npm root -g) node tools/e2e/atb48-emu.cjs <그림 폴더> [폰 수 2~4 · 기본 3]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', N = Number(process.argv[3] || 3), B = 'http://localhost:4173/', E = 'emu=127.0.0.1', NS = 'demo-citadel-test-default-rtdb';
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
  await rest('school/last/1-3', 'PUT', { lesson: 'set-06', no: 6, at: Date.now(), done: true, code: 'x' });
  const ps = []; for (let i = 1; i <= N; i++) { const p = await open(); await signup(p, '1-3', i); await board(p); ps.push(p); }
  const [A, ...others] = ps;
  await A.click('.bd .chips button:has-text("6")'); await A.click('.bd .act .btn2'); await A.waitForSelector('.lgrid'); await A.click('.sheet .lkt'); await rune(A, '4821'); await A.click('.sheet .act .btn'); await wait(1800);
  const pid = Object.keys((await rest('school/board/posts')) || {})[0]; ok('모집 글', !!pid);
  for (const p of others) { await p.waitForSelector('.post .go:not([disabled])', { timeout: 15000 }); await p.click('.post .go'); await p.waitForSelector('.sheet'); await rune(p, '4821'); await p.click('.sheet .act .btn'); await wait(1200); }
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
  const host = await rest(`atb/${pid}/host`); ok('방장 엔진 = 글 올린 사람', host === 's1_3_1', String(host));
  const snap = await rest(`atb/${pid}/snap`); ok('상태 요약 snap 서버에 씀 (20KB 안)', snap && typeof snap.j === 'string' && snap.j.length < 20000, snap ? `${snap.j.length}자` : '없음');
  const hpAll = async () => Promise.all(ps.map((p) => p.evaluate(() => { const t = [...document.querySelectorAll('[data-k="atb-hpb"], [data-k="atb-boss"] .hp, .bhp')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()).join('|'); return t; }).catch(() => 'x')));
  // ⓐ 친구 폰 = 공격 단추 · 문제 열기 몇 번 → 체력 표시 비교
  for (let k = 0; k < 6; k++) { for (const p of others) { await p.click('[data-k="atb-attack"]', { timeout: 1500 }).catch(() => {}); await p.waitForTimeout(400); await p.click('[data-k="atb-attack"]', { timeout: 1500 }).catch(() => {}); } await wait(1500); }
  await wait(2500);
  const bossOf = async (p) => p.evaluate(() => { const S = globalThis.__atb?.S; return S ? { boss: Math.round(S.bossHp), t: Math.round(S.t), hp: S.heroes.map((h) => Math.round(h.hp)) } : null; }).catch(() => null);
  const b1 = await Promise.all(ps.map(bossOf));
  console.log('   방장 사건:', JSON.stringify(await A.evaluate(() => { const S = globalThis.__atb?.S; if (!S) return null; const by = {}; for (const e of S.ev) { const k = `${e.k}${e.who != null ? '#' + e.who : ''}${e.timing ? ':' + e.timing : ''}`; by[k] = (by[k] || 0) + 1; } return { by, atb: S.heroes.map((h) => +h.atb.toFixed(2)), down: S.heroes.map((h) => h.down) }; })));
  const same = b1.every((x) => x && Math.abs(x.boss - b1[0].boss) <= Math.max(30, b1[0].boss * 0.02));
  ok('ⓐ 폰마다 보스 체력 같음 (2% 안)', same, JSON.stringify(b1));
  // ⓑ 친구 폰 새로 고침
  const F = others[0];
  await F.reload(); await F.waitForSelector('[data-k="atb-stage"]', { timeout: 30000 }).catch(() => {});
  ok('ⓑ 친구 폰 새로 고침 = 같은 판 전투 화면', !!(await F.$('[data-k="atb-stage"]')));
  await wait(2000);
  // ⓒ 방장 폰 닫힘
  if (N >= 2) {
    const tClose = Date.now(); await A.context().close(); await wait(14000); // 방장 잃음 = NET.lostMs 10초 뒤 넘김
    const h2 = await rest(`atb/${pid}/host`), b2 = await Promise.all(others.map(bossOf));
    ok('ⓒ 방장 닫힘 → 다른 폰이 방장 · 판 계속 (시간 흐름)', h2 && h2 !== 's1_3_1' && b2.every((x) => x && x.t > (b1[1]?.t ?? 0)), `${h2} · ${JSON.stringify(b2)}`);
    console.log('   새 방장 사건:', JSON.stringify(await others[0].evaluate(() => { const S = globalThis.__atb?.S; if (!S) return null; return S.ev.slice(-12).map((e) => `${e.k}@${Math.round(e.t)}${e.who != null ? '#' + e.who : ''}${e.v ? '+' + e.v : ''}${e.dmg ? ' ' + JSON.stringify(e.dmg) : ''}`); })));
    await wait(4000); const b3 = await Promise.all(others.map(bossOf));
    ok('ⓒ 넘겨받은 뒤 4초 = 폰마다 보스 체력 같음 (2% 안)', b3.every((x) => x && Math.abs(x.boss - b3[0].boss) <= Math.max(30, b3[0].boss * 0.02)), JSON.stringify(b3) + ` · 닫고 ${Math.round((Date.now() - tClose) / 1000)}초`);
    // 새 방장 엔진에서 끝냄
    const NH = others.find(async () => true);
    for (let i = 0; i < 20; i++) { for (const p of others) await p.evaluate(() => { const S = globalThis.__atb?.S; if (!S || S.end) return; S.bossHp = 0; (S.cells || []).forEach((c) => { c.broken = true; }); }).catch(() => {}); await wait(500); if (await others[0].$('[data-k="atb-to-board"]')) break; }
    void NH;
    await Promise.all(others.map((p) => p.waitForSelector('[data-k="atb-to-board"]', { timeout: 60000 }).catch(() => {})));
    ok('ⓒ 남은 폰 모두 결과 화면', (await Promise.all(others.map((p) => p.$('[data-k="atb-to-board"]').then(Boolean)))).every(Boolean));
    // ⓓ 결과에서 새로 고침 · 두 번 누름
    await F.reload(); await wait(4000); const fRes = !!(await F.$('[data-k="atb-to-board"]')), fWhere = await F.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 80));
    ok('ⓓ 결과에서 새로 고침 = 결과(또는 게시판) · 멈춤 없음', fRes || !!(await F.$('.bd')) || !!(await F.$('[data-k="war-bar"]')), fWhere);
    for (const p of others) { const bt = await p.$('[data-k="atb-to-board"]'); if (bt) { await bt.click().catch(() => {}); await bt.click().catch(() => {}); } await wait(800); }
    await wait(3000);
    const ends = (await rest(`atb/${pid}/end`)) || {}; let msum = 0; for (const e of Object.values(ends)) msum += e.meritSum || 0;
    const war = await rest(`classWar/${wk(Date.now())}/sum/1-3`);
    let recs = 0; for (let n = 1; n <= N; n++) { const bd = (await rest(`bonus/1-3/${n}/board`)) || {}; recs += Object.values(bd).filter((r) => r.atb).length; }
    ok('ⓓ 반 공적 = end 합 (두 번 안 더함)', war === msum, `${war} / ${msum} · end ${Object.keys(ends).join(',')}`);
    ok('ⓓ 학생 기록 = 한 사람에 한 줄 (두 번 누름 · 새로 고침에도)', recs <= N, `${recs}줄 · 폰 ${N}`);
    console.log('   나간 방장 s1_3_1 end:', JSON.stringify(ends['s1_3_1'] ?? null), '· 기록:', JSON.stringify(Object.values((await rest('bonus/1-3/1/board')) || {}).filter((r) => r.atb).length));
    await others[0].screenshot({ path: `${SHOTS}/atb48x-after.png` });
  }
  await b.close(); console.log(errs.length ? `❌ 실패 ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); process.exit(errs.length ? 1 : 0);
})();
