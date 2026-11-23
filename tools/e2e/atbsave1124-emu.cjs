// 🐞 11/24 게시판 결과 저장 (에뮬레이터): A 결과 화면이 뜨는 순간 저장 · 앱 닫고 다시 열어도 한 번 · 단추 눌러도 한 번 / B 기록 빠진 판 = 게시판 열 때 되살림 한 번
//   NODE_PATH=$(npm root -g) node tools/e2e/atbsave1124-emu.cjs <그림 폴더>
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

  const wk = (t) => { const k = new Date(t + 9 * 3600e3), d = (k.getUTCDay() + 6) % 7; return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()) - d * 864e5).toISOString().slice(0, 10); };
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest(`school/last/${CLS}`, 'PUT', { lesson: 'set-06', no: 6, at: Date.now(), done: true, code: 'x' });
  const A = await open(); await signup(A, CLS, 1); await board(A);
  const recs = async () => Object.entries((await rest(`bonus/${CLS}/1/board`)) || {}).filter(([, r]) => r.atb);
  const mine = async () => Number(await rest(`classWar/${wk(Date.now())}/by/${CLS}/1`)) || 0;
  const play = async () => {
    await A.click('[data-map="6"]'); await A.click('button:has-text("6차시 출정")'); await A.waitForSelector('[data-k="hero-sheet"]'); await A.click('[data-k="hero-sheet-go"]');
    await A.waitForSelector('[data-k="atb-stage"]', { timeout: 25000 });
    for (let i = 0; i < 6; i++) { await A.evaluate(() => globalThis.__atb?.solve?.()); await wait(500); }
    await A.evaluate(() => globalThis.__atb?.win?.());
    await A.waitForSelector('[data-k="atb-to-board"]', { timeout: 60000 }); await wait(2000);
  };
  const reopen = async (press = true) => { await A.reload(); await A.waitForTimeout(3500); if (await A.$('text=첫 용사 고르기')) { await A.click('button:has-text("시작")'); await A.waitForTimeout(800); } await board(A); for (let i = 0; i < 12; i++) { if (press && await A.$('[data-k="atb-to-board"]')) { console.log('  (다시 열면 결과 화면 복귀 = 옛 기능 · 「게시판으로」 누름)'); await wait(1500); await A.click('[data-k="atb-to-board"]'); await wait(2500); break; } await wait(700); } await wait(1500); };
  // A. 결과 화면이 뜨는 순간 저장 → 단추 안 누르고 앱 닫음(새로 고침) → 다시 열어도 한 번만
  await play();
  const r1 = await recs(), m1 = await mine(), pid1 = (r1[0]?.[0] || '').split('_')[0], end1 = pid1 ? await rest(`atb/${pid1}/end`) : null, e1 = end1 ? Object.values(end1)[0] : null;
  ok('A 결과 화면이 뜨면 바로 기록 1줄 (단추 누르기 전)', r1.length === 1, `${r1.length}`);
  ok('A 반 공적 = 판 끝 공적 (한 번)', !!e1 && m1 === e1.meritSum && m1 > 0, `저장 ${m1} · 판 ${e1?.meritSum}`);
  await reopen();
  ok('A 앱 닫고 다시 열어도 기록 1줄 · 공적 그대로', (await recs()).length === 1 && (await mine()) === m1, `${(await recs()).length} · ${await mine()}`);
  // A' 결과 화면에서 단추를 눌러도 두 번 저장 안 함
  await play(); const m2a = await mine(); await A.click('[data-k="atb-to-board"]'); await wait(2500);
  ok("A' 「게시판으로」 눌러도 기록 2줄 · 공적 안 늘어남", (await recs()).length === 2 && (await mine()) === m2a, `${(await recs()).length} · ${m2a} → ${await mine()}`);
  // B. 옛 앱처럼 기록이 빠진 판(end 만 있음) → 게시판을 열면 한 번 되살림
  await play();
  const r3 = await recs(), add3 = (await mine()) - m2a, newK = r3.map(([k]) => k).find((k) => !r1.concat().some(([k0]) => k0 === k) && true);
  const k3 = r3.sort((x, y) => y[1].at - x[1].at)[0][0];
  await rest(`bonus/${CLS}/1/board/${k3}`, 'DELETE'); await rest(`classWar/${wk(Date.now())}/by/${CLS}/1`, 'PUT', m2a); await rest(`classWar/${wk(Date.now())}/sum/${CLS}`, 'PUT', m2a);
  ok('B 준비: 기록 지움(옛 버그 흉내) · 공적 되돌림', (await recs()).length === 2 && (await mine()) === m2a);
  await reopen(false); await wait(6000);
  ok('B 단추 안 눌러도 게시판이 열리면 되살림(판 끝 값 → 기록)', (await recs()).length === 3 && (await mine()) === m2a + add3, `${(await recs()).length} · ${await mine()} (기대 ${m2a + add3})`);
  await reopen();
  ok('B 게시판 열면 되살림 = 기록 3줄 · 공적 +판 몫 한 번', (await recs()).length === 3 && (await mine()) === m2a + add3, `${(await recs()).length} · ${await mine()} (기대 ${m2a + add3})`);
  await reopen();
  ok('B 한 번 더 열어도 그대로', (await recs()).length === 3 && (await mine()) === m2a + add3);
  await A.screenshot({ path: `${SHOTS}/heal-board.png` });
  await b.close(); console.log(errs.length ? `❌ 실패 ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); process.exit(errs.length ? 1 : 0);
})();
