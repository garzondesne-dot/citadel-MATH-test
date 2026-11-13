// 🚨 수업 열기 (2026-11-13 밤 「수업 방이 개설 안 되네?」): 시험 서버(에뮬레이터)에서 ① 교사 로그인 없이 「▶ 수업 열기」 = 서버에 안 보내고 「🔐 교사 로그인이 필요해요」 → 「나」 탭 로그인 창
//   ② 교사 로그인(admins) → 수동 「① 반 → ② 차시 → ▶ 수업 열기」 = rooms/<코드> 생김 · school/live · 리모컨 대기실 ③ 학생 폰이 그 방에 들어옴(리모컨 1 / 15)
//   사용: (1) cd firebase && firebase emulators:start --only database,auth --project demo-citadel-test (2) 빌드 · vite preview (3) NODE_PATH=$(npm root -g) node tools/e2e/openclass.cjs <폴더>
const { chromium } = require('playwright');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/', E = '&emu=127.0.0.1';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a);
  const t = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); t.on('pageerror', (e) => errs.push(String(e)));
  await t.goto(B + `?role=teacher${E}`); await t.waitForSelector('.tabs', { timeout: 20000 }); await t.waitForTimeout(1200);
  // ① 로그인 없음
  await t.click('[data-cls="1-3"]'); await t.click('.pk3 .pk:has-text("6차시")'); await t.click('.tact .btn'); await t.waitForTimeout(800);
  const ask = !!(await t.$('[data-k="need-login"]')), live0 = await rest('school/live'), rooms0 = await rest('rooms');
  log('① 로그인 없음: 안내', ask, '· 서버 live', JSON.stringify(live0), '· rooms', rooms0 ? Object.keys(rooms0).length : 0); if (!ask || live0 || rooms0) errs.push('로그인 없이 열기 = 안내 없음 · 서버에 씀');
  await t.screenshot({ path: `${SHOTS}/openclass-needlogin.png` });
  await t.click('.sheet .pmain'); await t.waitForTimeout(500); const lg = !!(await t.$('.sheet input.tid')); log('   「🔐 교사 로그인하러」 → 로그인 창:', lg); if (!lg) errs.push('로그인 창 안 열림');
  // ② 교사 로그인 → 수동 열기
  await asAdmin(t, '.tabs'); await t.click('[data-cls="1-3"]'); await t.click('.pk3 .pk:has-text("6차시")'); await t.click('.tact .btn'); await t.waitForTimeout(1500);
  const live = await rest('school/live'), room = live ? await rest(`rooms/${live.code}/meta`) : null;
  log('② 교사 로그인 → 열기: live', JSON.stringify(live), '· 방', room ? `${room.lesson} · ${room.cls} · v${room.version}` : '없음'); if (!live || !room || live.test) errs.push('수업 방 안 생김');
  const lobby = (await t.textContent('.tp')).replace(/\s+/g, ' '); if (!/대기실/.test(lobby) || /찾지 못했어요/.test(lobby)) errs.push('리모컨 대기실 아님');
  // ③ 학생 입장
  const s = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); s.on('pageerror', (e) => errs.push(String(e)));
  await s.goto(B + `?role=student&room=${live.code}&as=1-3:2${E}`); await s.waitForTimeout(3000);
  const n = (/(\d+)\s*\/\s*15/.exec((await t.textContent('.tp')).replace(/\s+/g, ' ')) || [])[1]; log('③ 학생 입장 → 리모컨', n, '/ 15'); if (n !== '1') errs.push('학생 입장 안 보임');
  await t.screenshot({ path: `${SHOTS}/openclass-lobby.png` });
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
