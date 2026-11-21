// 📡 #65-1 교사 계정이 게시판 팀에 합류 → 학생 · 교사 폰 모두 새 전투(ATB) · 교사 기록 없음 (에뮬레이터)
//   NODE_PATH=$(npm root -g) node tools/e2e/atbteacher-emu.cjs <그림 폴더> [폰 수] [반 · 기본 1-3]




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
  const board = async (p) => { if (!(await p.$('.bd'))) await p.click('button[aria-label="게시판"]'); await p.waitForSelector('.bd'); await p.waitForTimeout(500); };
  const rune = async (p, x) => { for (const d of x) await p.click(`.sheet .rune-keys button:has-text("${d}")`); };
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest(`school/last/${CLS}`, 'PUT', { lesson: 'set-06', no: 6, at: Date.now(), done: true, code: 'x' });
  const { asAdmin } = require('./_emu.cjs');
  const A = await open(); await signup(A, CLS, 1); await board(A);
  const T = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); T.addInitScript(() => { try { localStorage.setItem('atb-e2e-nointro', '1'); localStorage.setItem('citadel-v1-board-story', '1'); } catch { /* */ } }); T.on('pageerror', (e) => errs.push('T ' + String(e))); T.on('console', (m) => { if (/error|warn|denied|PERMISSION/i.test(m.type() + m.text())) console.log('T>', m.type(), m.text().slice(0, 200)); });
  await T.goto(`${B}?role=teacher&${E}`); await T.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(T, '.tabs');
  await T.goto(`${B}?role=camp&from=me&${E}`); await T.waitForTimeout(3000); await board(T);
  await A.click('[data-map=\"6\"]'); await A.click('[data-k=\"board-post\"]'); await wait(1800);
  const pid = Object.keys((await rest('school/board/posts')) || {})[0]; ok('모집 글', !!pid);
  await T.click('[data-map="6"]').catch(() => {}); /* 📜 #66 목록 = 고른 차시 글만 */ await T.waitForSelector('.post .go', { timeout: 15000 }).catch(() => {}); const dis = await T.$eval('.post .go', (x) => x.disabled).catch(() => 'none'); console.log('교사 합류 단추 disabled:', dis);
  await T.screenshot({ path: SHOTS + '/tch-board.png' });
  if (dis === false) { await T.click('.post .go'); await wait(1500); await T.screenshot({ path: SHOTS + '/tch-j3.png' }); }
  const mem = (await rest(`school/board/posts/${pid}/mem`)) || {}; console.log('mem:', JSON.stringify(Object.fromEntries(Object.entries(mem).map(([k, v]) => [k, { cls: v.cls, num: v.num, g: !!v.g }]))));
  console.log('T after join:', (await T.evaluate(() => document.body.innerText)).replace(/\s+/g,' ').slice(0,300)); const r = await T.$('button:has-text("준비 완료")'); if (r) await r.click().catch(() => {}); await wait(800);
  const st = await A.$('button:has-text("출발")'); if (st) await st.click().catch(() => {});
  await Promise.all([A, T].map((p) => p.waitForSelector('[data-k="atb-stage"]', { timeout: 25000 }).catch(() => {})));
  const on = await Promise.all([A, T].map((p) => p.$('[data-k="atb-stage"]').then(Boolean))); ok('학생 · 교사 모두 새 전투 화면', on.every(Boolean), on.join(','));
  const meta = await rest(`atb/${pid}/meta`); console.log('slots:', meta ? meta.slots.map((s) => s.bot ? 'bot' : s.uid).join(',') : '없음');
  console.log('T after start:', (await T.evaluate(() => document.body.innerText)).replace(/\s+/g,' ').slice(0,300)); console.log('T posts:', JSON.stringify(Object.values((await rest('school/board/posts')) || {}).map((p) => ({ ph: p.phase, code: p.code, mem: Object.keys(p.mem || {}) })))); await T.waitForTimeout(2500); await T.screenshot({ path: SHOTS + '/tch-atb.png' });
  await b.close(); console.log(errs.length ? '❌ ' + errs.join(' | ') : '✅ 오류 0'); process.exit(0);
})();
