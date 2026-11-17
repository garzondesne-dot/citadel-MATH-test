// 🐞 11/17 ⓒ 「필살기가 씹힘」 — TV 공격 줄: 여럿이 한꺼번에 들어와도 필살기는 줄 맨 앞 · 많이 몰리면 간격이 짧아짐
//   NODE_PATH=$(npm root -g) node tools/e2e/ultq.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const t = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage(); t.on('pageerror', (e) => errs.push(String(e)));
  await t.goto(B + '?role=hall&mode=test&room=ULQ1'); await t.waitForSelector('.dock'); await t.evaluate(() => window.__tvFake(12)); await t.waitForTimeout(800);
  for (let g = 0; g < 10 && !(await t.$('.arena2')); g++) { await t.mouse.move(800, 450); await t.click('.dock .go'); await t.waitForTimeout(500); }
  await t.waitForFunction(() => !document.querySelector('.sc') && typeof window.__tvAtk === 'function', null, { timeout: 15000 }).catch(() => {}); await t.waitForTimeout(1500);
  const t0 = Date.now();
  await t.evaluate(() => { for (let k = 0; k < 10; k++) window.__tvAtk(k, 'hit', 1); window.__tvAtk(11, 'hit', 3, undefined, true); });
  const q = await t.evaluate(() => window.__tvQueue());
  ok('필살기 = 줄 맨 앞 (먼저 온 보통 공격 10개보다 먼저)', q.length >= 1 && q[0].ult === true, JSON.stringify(q.slice(0, 3)));
  let left = 99; for (let i = 0; i < 40 && left > 0; i++) { await t.waitForTimeout(150); left = (await t.evaluate(() => window.__tvQueue())).length; }
  const ms = Date.now() - t0;
  ok('11개가 몰려도 다 보여 줌 · 3.5초 안에 줄이 빔 (예전 350ms 고정 = 3.9초+)', left === 0 && ms < 3500, `${ms}ms`);
  await t.screenshot({ path: `${SHOTS}/ultq.png` });
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
