// 🐞 11/25 정식 b243 수업 「땅따먹기 학생 안 움직임 · 알까기 화면 안 뜸」 — 진짜 서버(에뮬레이터 = 빈 {} · [] 를 저장 안 함)에서
//   종합실(TV · 판 시계)이 🏁 땅따먹기 턴을 넘기고 말이 움직이는지 · 🥏 알까기 판이 뜨고 돌아가는지 · 오류 0
//   cd firebase && firebase emulators:start --only database,auth --project demo-citadel-test
//   NODE_PATH=$(npm root -g) node tools/e2e/funfb1125-emu.cjs <폴더> [주소]
const { chromium } = require('playwright');
const { rest, asAdmin, asHost } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/', E = 'emu=127.0.0.1';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  await rest('', 'DELETE');
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const open = async (url, vp) => { const p = await (await b.newContext({ viewport: vp })).newPage(); p.on('pageerror', (e) => errs.push(`${url}: ${e}`)); p.on('console', (m) => { if (m.type() === 'error' && !/시험 서버|favicon|Failed to load/.test(m.text())) console.log('  [콘솔]', url.slice(0, 14), m.text().slice(0, 300)); }); await p.goto(B + url); return p; };
  const t = await open(`?role=teacher&${E}`, { width: 390, height: 844 }); await t.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(t, '.tabs');
  await t.click('[data-cls="1-3"]'); await t.click('.pk3 .pk:has-text("7차시")'); await require('./_cls.cjs').testOpen(t); await wait(1500);
  const code = (await rest('school/live')).code;
  const U = ['fk1', 'fk2', 'fk3', 'fk4', 'fk5', 'fk6'];
  const seen = async () => { const P = {}; U.forEach((u, i) => { P[u] = { num: i + 1, nick: `학생${i + 1}`, seen: Date.now(), hero: i, cls: '1-6' }; }); await rest(`rooms/${code}/players`, 'PATCH', P); };
  await seen(); const keep = setInterval(seen, 2000);
  const ph = await open(`?role=student&room=${code}&as=1-6:1&${E}`, { width: 375, height: 667 }); await wait(4000);
  const me = Object.keys((await rest(`rooms/${code}/players`)) || {}).find((u) => !u.startsWith('fk')); ok('📱 학생 폰 입장', !!me, me || '');
  await rest(`rooms/${code}/state/rest`, 'PUT', true);
  const tv = await open(`?role=hall&${E}`, { width: 1280, height: 720 }); await asHost(tv, code); await wait(2500);
  const fun = () => rest(`rooms/${code}/fun`);
  // 🏁 땅따먹기 (리모컨 시작과 같은 값 · 서버는 빈 칸을 버림)
  let g = Date.now();
  await rest(`rooms/${code}/fv`, 'DELETE');
  await rest(`rooms/${code}/fun`, 'PUT', { kind: 'lg', g, phase: 'join', to: g + 3600e3, turn: 0, size: 9, nTeam: 4, own: '', team: {}, pos: {}, last: {}, stars: [], starHit: [0, 0, 0, 0], mine: {}, alive: {}, total: 0 });
  await wait(2500); ok('🏁 모이는 중 = 폰 「🙋 참가」 단추 뜸', !!(await ph.$('[data-k="lg-join"]'))); await ph.click('[data-k="lg-join"]').catch(() => {});
  for (const u of U) await rest(`rooms/${code}/fv/lg${g}_j/${u}`, 'PUT', 1);
  await rest(`rooms/${code}/fun/go`, 'PUT', Date.now());
  await wait(14000);
  let f = await fun(); ok('🏁 출발 → 준비 → 턴 시작', f && ['pick', 'move'].includes(f.phase) && f.turn >= 1, `${f && f.phase} turn ${f && f.turn}`);
  const p0 = JSON.stringify(f && f.pos), t0 = f ? f.turn : 0;
  for (let k = 0; k < 4; k++) { const ff = await fun(); for (const u of U) await rest(`rooms/${code}/fv/lg${g}_${ff.turn}/${u}`, 'PUT', 3); await wait(2600); }
  f = await fun(); ok('🏁 턴이 넘어가고 말이 움직임', f && f.turn > t0 && JSON.stringify(f.pos) !== p0, `turn ${t0} → ${f && f.turn}`);
  await tv.screenshot({ path: `${SHOTS}/funfb-lg-tv.png` });
  // 🥏 알까기
  g = Date.now();
  await rest(`rooms/${code}/fv`, 'DELETE');
  await rest(`rooms/${code}/fun`, 'PUT', { kind: 'ak', g, phase: 'join', to: g + 3600e3, R: 5.5, beat: 0, t0: g, bm: 1000, gt: 0, st: {}, sc: {}, kn: {}, fall: {}, total: 0 });
  await wait(2500);
  ok('🥏 모이는 중 = 폰 「🙋 참가」 단추 뜸', !!(await ph.$('[data-k="ak-join"]')));
  await ph.screenshot({ path: `${SHOTS}/funfb-ak-phone-join.png` });
  await ph.click('[data-k="ak-join"]').catch(() => {});
  for (const u of U) await rest(`rooms/${code}/fv/ak${g}_j/${u}`, 'PUT', 1);
  await rest(`rooms/${code}/fun/go`, 'PUT', Date.now());
  await wait(9000);
  f = await fun(); ok('🥏 출발 → 판이 돌아감', f && f.phase === 'play' && Object.keys(f.st || {}).length === 7, `${f && f.phase} ${Object.keys((f && f.st) || {}).length}`);
  await tv.screenshot({ path: `${SHOTS}/funfb-ak-tv.png` }); await ph.screenshot({ path: `${SHOTS}/funfb-ak-phone.png` });
  ok('🥏 폰 = 판(캔버스)이 보임', !!(await ph.$('canvas')));
  clearInterval(keep);
  ok('화면 오류 0', !errs.some((e) => /: /.test(e)), errs.filter((e) => /: /.test(e)).slice(0, 3).join(' | '));
  await b.close(); console.log(errs.length ? `❌ ${errs.length}` : '✅ 오류 0'); process.exit(errs.length ? 1 : 0);
})();
