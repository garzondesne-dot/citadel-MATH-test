// 🔔 교사 알림 ① (📜 2026-11-16 · 에뮬레이터): 교사 폰 「나」 → 🔔 알림 켜기 · 종류별 스위치 → 학생이 비밀번호 3번 틀림(loginFail 칸 · 규칙 = 쓰기만)
//   → 교사 폰 알림 「🔑 로그인 실패 여러 번 · 1명」 (이름 없음) · 같은 학생은 오늘 한 번만 · 학생은 loginFail 을 못 읽음
//   NODE_PATH=$(npm root -g) node tools/e2e/notify-emu.cjs <폴더> [주소]
const { chromium } = require('playwright');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/', E = 'emu=127.0.0.1';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest('', 'PATCH', { roster: { '1-3': { 3: '시험삼' } }, rosterMask: { '1-3': { 3: '시*삼' } } });
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  // 교사 폰: 알림 허락 + showNotification 기록
  const tc = await b.newContext({ viewport: { width: 390, height: 844 } }); await tc.grantPermissions(['notifications'], { origin: B.replace(/\/$/, '') });
  // 헤드리스 크로미움 = 허락해도 Notification.permission 이 늘 denied → 시험에서는 허락된 폰처럼
  await tc.addInitScript(() => { Object.defineProperty(Notification, 'permission', { get: () => 'granted' }); Notification.requestPermission = async () => 'granted'; window.__notes = [];
    // 헤드리스 = 푸시 서버 없음 → 받는 주소(구독)를 가짜로
    PushManager.prototype.getSubscription = async function () { return window.__sub || null; }; PushManager.prototype.subscribe = async function () { window.__sub = { endpoint: 'https://push.example.invalid/abc', toJSON: () => ({ endpoint: 'https://push.example.invalid/abc', keys: { p256dh: 'x', auth: 'y' } }), unsubscribe: async () => { window.__sub = null; return true; } }; return window.__sub; }; const P = ServiceWorkerRegistration.prototype; P.showNotification = function (t, o) { window.__notes.push({ t, b: o && o.body }); return Promise.resolve(); }; });
  const t = await tc.newPage(); t.on('pageerror', (e) => errs.push('교사 ' + e));
  await t.goto(`${B}?role=teacher&${E}`); await t.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(t, '.tabs');
  await t.goto(`${B}?role=teacher&tab=me&${E}`); await t.waitForSelector('[data-k="note-go"]', { timeout: 20000 });
  await t.click('[data-k="note-go"]'); await t.click('[data-k="note-enable"]'); await t.waitForTimeout(500);
  ok('🔔 알림 켜기 → 켜짐 · 종류 스위치 4개', !!(await t.$('[data-k="note-on"]')) && (await t.$$('[data-k^="note-"][role="switch"]')).length === 5);
  await t.screenshot({ path: `${SHOTS}/note-set.png` });
  await t.waitForTimeout(800); const tp = await rest('teacherPush');
  const one = tp && Object.values(Object.values(tp)[0] || {})[0];
  ok('🔔 받는 주소(구독) = teacherPush/{교사}/… · 켠 종류 같이', !!one && one.sub && one.sub.endpoint && one.kinds && one.kinds.login === true, JSON.stringify(one).slice(0, 160));
  const anonP = await fetch('http://127.0.0.1:9000/teacherPush.json?ns=demo-citadel-test-default-rtdb').then((r) => r.status);
  ok('teacherPush = 교사만 읽음 (규칙)', anonP === 401, `HTTP ${anonP}`);
  await t.click('[data-k="note-test"]'); await t.waitForTimeout(600);
  const n0 = await t.evaluate(() => window.__notes);
  ok('시험 알림 한 장', n0.length === 1, JSON.stringify(n0));
  await t.evaluate(() => window.__noteTick()); // 기준
  // 학생: 가입 뒤 다른 폰에서 비밀번호 3번 틀림
  const ph = async () => (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const enter = async (p, pw, join = false) => {
    await p.selectOption('select >> nth=0', '1-3'); await p.waitForTimeout(200); await p.selectOption('select >> nth=1', '3'); await p.waitForTimeout(300);
    if (join && !(await p.$('.pw:has(small)'))) await p.click('.lk:has-text("가입")');
    await p.click('.pw >> nth=0'); for (const k of join ? pw + pw : pw) await p.click(`.pad button:text-is("${k}")`);
    await p.click('.title .act .pmain'); await p.waitForTimeout(2500);
  };
  const s0 = await ph(); await s0.goto(`${B}?${E}`); await s0.waitForSelector('.title', { timeout: 20000 }); await s0.waitForTimeout(1200); await enter(s0, '1234', true);
  const s1 = await ph(); await s1.goto(`${B}?${E}`); await s1.waitForSelector('.title', { timeout: 20000 }); await s1.waitForTimeout(1200);
  for (let i = 0; i < 3; i++) { await enter(s1, '9999'); await s1.reload(); await s1.waitForSelector('.title', { timeout: 20000 }); await s1.waitForTimeout(800); }
  const lf = await rest('loginFail/1-3/3');
  ok('학생 틀림 3번 = loginFail 칸 3줄', !!lf && Object.keys(lf).length === 3, JSON.stringify(lf));
  const anon = await fetch('http://127.0.0.1:9000/loginFail.json?ns=demo-citadel-test-default-rtdb').then((r) => r.status);
  ok('로그인 안 한 쪽은 loginFail 을 못 읽음 (규칙)', anon === 401, `HTTP ${anon}`);
  // 💬 종류 끄고 → 로그인 알림
  await t.click('[data-k="note-hand"]'); await t.waitForTimeout(1500);
  await t.evaluate(() => window.__noteTick()); await t.waitForTimeout(500);
  const ns = await t.evaluate(() => window.__notes);
  const lg = ns.find((n) => /로그인 실패/.test(n.t));
  ok('교사 알림 「🔑 로그인 실패 여러 번 · 1명」 · 이름 · 번호 없음', !!lg && /1-3반 1명/.test(lg.b) && !/시험삼|시\*삼|3번 학생/.test(JSON.stringify(ns)), JSON.stringify(ns));
  await t.evaluate(() => window.__noteTick()); await t.waitForTimeout(300);
  ok('같은 학생 = 오늘 한 번만', (await t.evaluate(() => window.__notes.filter((n) => /로그인 실패/.test(n.t)).length)) === 1);
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
