// ✏ 판서 = 단계가 바뀌면 저절로 꺼짐 (📜 2026-11-17 ⓗ) — 이 기기 TV 시험 방
//   NODE_PATH=$(npm root -g) node tools/e2e/inkoff.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const t = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage(); t.on('pageerror', (e) => errs.push(String(e)));
  await t.goto(B + '?role=hall&mode=test&room=INK1'); await t.waitForSelector('.dock'); await t.evaluate(() => window.__tvFake(3)); await t.waitForTimeout(800);
  await t.mouse.move(800, 450); await t.click('.dock .go'); await t.waitForTimeout(1200); // 대기실 → 첫 단계
  const pen = 'button.t:has-text("필기")';
  await t.mouse.move(800, 850); await t.click(pen); await t.waitForTimeout(400);
  const on = await t.$eval(pen, (e) => e.classList.contains('on')).catch(() => false);
  ok('✏ 필기 켬', on);
  const st0 = await t.evaluate(() => window.__dbGet('rooms/INK1/state/step'));
  await t.mouse.move(800, 450); await t.click('.dock .go'); await t.waitForTimeout(900); // 다음 ▶
  const st1 = await t.evaluate(() => window.__dbGet('rooms/INK1/state/step'));
  const off = await t.$eval(pen, (e) => !e.classList.contains('on')).catch(() => false);
  ok('다음 ▶ = 필기 저절로 꺼짐', st1 !== st0 && off, `단계 ${st0} → ${st1}`);
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
