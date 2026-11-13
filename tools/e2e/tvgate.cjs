// 🔐 TV 입구 (📜 2026-11-13 밤 「TV는 열린 방 여는 건 비밀번호 혹은 코드 입력과 비밀번호 둘 중 하나」): 에뮬레이터
//   ① 수업 없음 = 입장 화면만(교사 캠프 숨김) · 「열린 수업이 없어요」 ② 교사가 수업 열기 → 틀린 비밀번호 = 「달라요」 · 맞으면 TV 들어감
//   ③ 새로 고침 = 기억한 비밀번호로 저절로 ④ 다른 TV = 「코드로 들어가기」 방 코드 + 비밀번호
//   사용: 에뮬레이터 + vite preview 뒤 NODE_PATH=$(npm root -g) node tools/e2e/tvgate.cjs <폴더>
const { chromium } = require('playwright');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/', E = '&emu=127.0.0.1';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), errs = [], log = (...a) => console.log(...a);
  const page = async (u, w = 1280, h = 720) => { const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage(); p.on('pageerror', (e) => errs.push(String(e))); await p.goto(B + u); return p; };
  const tv = await page(`?role=hall${E}`); await tv.waitForSelector('.kov, .campv', { timeout: 20000 }); await tv.waitForTimeout(800);
  const g1 = { gate: !!(await tv.$('.kov')), camp: !!(await tv.$('.campv')), msg: (await tv.textContent('.kov p').catch(() => '')).trim() };
  log('① 수업 없음:', JSON.stringify(g1)); if (!g1.gate || g1.camp || !/열린 수업이 없어요/.test(g1.msg)) errs.push('① 입구');
  await tv.screenshot({ path: `${SHOTS}/tvgate-none.png` });
  const t = await page(`?role=teacher${E}`, 390, 844); await t.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(t, '.tabs');
  await t.click('[data-cls="1-3"]'); await t.click('.pk3 .pk:has-text("6차시")'); await t.click('.tact .btn'); await t.waitForTimeout(1500);
  const live = await rest('school/live'), key = String(await rest(`secrets/${live.code}/hallKey`)); log('   교사 수업 열기:', live.code, '· 비밀번호', key);
  await tv.waitForTimeout(1200); await tv.fill('[data-k="tv-key"]', key === '1111' ? '2222' : '1111'); await tv.click('.kgo'); await tv.waitForTimeout(1500);
  const bad = (await tv.textContent('.kerr').catch(() => '')).trim(); log('② 틀린 비밀번호:', bad); if (!/달라요/.test(bad)) errs.push('② 틀림');
  await tv.fill('[data-k="tv-key"]', key); await tv.click('.kgo'); await tv.waitForSelector('.kov', { state: 'detached', timeout: 10000 }).catch(() => {});
  const in2 = !(await tv.$('.kov')); log('   맞는 비밀번호 → 들어감:', in2); if (!in2) errs.push('② 맞음'); await tv.screenshot({ path: `${SHOTS}/tvgate-in.png` });
  await tv.reload(); await tv.waitForTimeout(4000); const in3 = !(await tv.$('.kov')); log('③ 새로 고침 = 저절로:', in3); if (!in3) errs.push('③ 기억');
  const tv2 = await page(`?role=hall${E}`); await tv2.waitForSelector('.kov', { timeout: 20000 }); await tv2.waitForTimeout(800);
  await tv2.click('[data-k="tv-bycode"]'); await tv2.fill('[data-k="tv-code"]', live.code); await tv2.fill('[data-k="tv-key"]', key); await tv2.screenshot({ path: `${SHOTS}/tvgate-code.png` });
  await tv2.click('.kgo'); await tv2.waitForSelector('.kov', { state: 'detached', timeout: 10000 }).catch(() => {});
  const in4 = !(await tv2.$('.kov')); log('④ 코드 + 비밀번호 → 들어감:', in4); if (!in4) errs.push('④ 코드');
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
