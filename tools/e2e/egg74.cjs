// 🥚 #74 이스터에그 8개 + 비밀 도감 (이 기기 캠프 · 7 = 에뮬레이터 학생)
//   1 코드 1414 · 2 코드 100 · 3 달(KST 15:14 · 시험 고리 __eggNow) · 4 모닥불 8번 · 5 그루터기 시계 방향 · 6 빛 버섯 모두 · 8 첫 화면 「만든 이」 5번 → 캠프 기록
//   7 = 복습 100판 → 캠프에서 털썩 + 🩹 · 비밀 도감 = ⛺ 기록 텐트 「🥚 비밀」 (찾은 것 이름 · 못 찾은 것 ??? + 힌트) · 다시 하면 연출 다시
//   NODE_PATH=$(npm root -g) node tools/e2e/egg74.cjs <그림 폴더> [emu]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); await ctx.addInitScript(() => { try { localStorage.setItem('citadel-wake-tip', '1'); } catch {} });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  // 8 = 첫 화면 「만든 이」 5번
  await p.goto(B); await p.waitForSelector('.title', { timeout: 20000 }); await p.waitForTimeout(800);
  for (let i = 0; i < 5; i++) { await p.click('[data-k="credit"]'); await p.waitForTimeout(250); }
  await p.waitForTimeout(1200); ok('8 「만든 이」 5번 = 크레딧', !!(await p.$('[data-k="credit-roll"]')));
  await p.screenshot({ path: `${SHOTS}/egg-8.png` }); await p.click('[data-k="credit-roll"]');
  await p.goto(`${B}?role=camp&room=EG1`); await p.waitForSelector('.stage'); await p.waitForTimeout(800);
  const fx = async (want) => { for (let i = 0; i < 30; i++) { const k = await p.$eval('[data-k="egg-fx"]', (e) => e.dataset.egg).catch(() => ''); if (k === want) return true; await p.waitForTimeout(150); } return false; };
  const end = async () => { await p.$eval('[data-k="egg-fx"]', (e) => e.click()).catch(() => {}); await p.waitForTimeout(300); };
  ok('8 캠프에 오면 = 기록 + 「비밀 발견」', await fx('e8'), ''); await p.waitForTimeout(1200); await end();
  const hot = (s) => p.$eval(s, (e) => { const r = e.getBoundingClientRect(); e.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })); });
  // 1 · 2 코드 칸
  for (const [code, k] of [['1414', 'e1'], ['100', 'e2']]) {
    await p.click('[data-k="code-btn"]'); await p.waitForSelector('.cin'); await p.fill('.cin', code); await p.click('.cgo');
    ok(`${k.slice(1)} 코드 ${code} = 연출`, await fx(k)); await p.waitForTimeout(1800); await p.screenshot({ path: `${SHOTS}/egg-${k.slice(1)}.png` }); await end();
  }
  // 3 달 (KST 15:14)
  await p.evaluate(() => { window.__eggNow = Date.UTC(2026, 10, 19, 6, 14, 30); }); await hot('[data-hot="moon"]');
  ok('3 오후 3:14 달 = 연출', await fx('e3')); await p.waitForTimeout(2200); await p.screenshot({ path: `${SHOTS}/egg-3.png` }); await end();
  await p.evaluate(() => { window.__eggNow = Date.UTC(2026, 10, 19, 6, 20, 0); }); await hot('[data-hot="moon"]'); await p.waitForTimeout(400);
  ok('3 다른 시각 = 아무 일 없음', !(await p.$('[data-k="egg-fx"]')));
  // 4 모닥불 8번
  for (let i = 0; i < 8; i++) { await hot('[data-hot="fire"]'); await p.waitForTimeout(220); }
  ok('4 모닥불 8번 = 피보나치 불꽃', await fx('e4')); await p.waitForTimeout(2600); await p.screenshot({ path: `${SHOTS}/egg-4.png` }); await end();
  // 5 그루터기 시계 방향 (1 → 2 → 3 → 0)
  for (const i of [1, 2, 3, 0]) { await hot(`[data-hot="stump${i}"]`); await p.waitForTimeout(250); }
  ok('5 그루터기 시계 방향 = 깃발 + 파란 불', await fx('e5')); await p.waitForTimeout(1500); await p.screenshot({ path: `${SHOTS}/egg-5.png` }); await end();
  // 6 빛 버섯 모두
  const sn = await p.$$eval('[data-hot^="shroom"]', (x) => x.length);
  for (let i = 0; i < sn; i++) { await hot(`[data-hot="shroom${i}"]`); await p.waitForTimeout(200); }
  ok(`6 빛 버섯 ${sn}개 모두 = ∞ 별자리`, await fx('e6')); await p.waitForTimeout(2200); await p.screenshot({ path: `${SHOTS}/egg-6.png` }); await end();
  // 다시 하면 연출 다시 (처음 띠 없음)
  await p.click('[data-k="code-btn"]'); await p.waitForSelector('.cin'); await p.fill('.cin', '100'); await p.click('.cgo'); await fx('e2'); await p.waitForTimeout(1300);
  ok('다시 하면 = 연출 다시 · 「비밀 발견」 띠 없음(칭호 한 번)', !(await p.$('[data-k="egg-found"]'))); await end();
  // 비밀 도감
  await hot('[data-hot="tentdeco"]'); await p.waitForSelector('[data-k="rec-room"]', { timeout: 8000 }); await p.click('[data-k="rec-tab-egg"]'); await p.waitForTimeout(400);
  const cnt = (await p.textContent('[data-k="egg-cnt"]')).replace(/\s+/g, ' ');
  ok('비밀 도감 = 찾은 7 / 8 (7 = 복습 100판 빼고)', /7 \/ 8/.test(cnt), cnt);
  const e7 = (await p.textContent('[data-egg="e7"]')).trim(); ok('못 찾은 칸 = ??? + 「우연히」', /\?\?\?/.test(e7) && /우연히/.test(e7), e7);
  await p.screenshot({ path: `${SHOTS}/egg-book.png` });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
