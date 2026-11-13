// 🧊 TV 얼음 (2026-11-13): 용사단 모두 얼음 덩어리 → 3초 뒤 녹음 · Pixi(1280 × 720) · DOM(?dom)
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), errs = [];
  for (const dom of [false, true]) {
    const W = 1280, H = 720, hall = await (await b.newContext({ viewport: { width: W, height: H } })).newPage(); hall.on('pageerror', (e) => errs.push(String(e)));
    await hall.goto(B + `?role=hall&mode=test&room=TI${dom ? 'D' : 'P'}${dom ? '&dom' : ''}`); await hall.waitForSelector('.dock');
    await hall.evaluate(() => window.__tvFake(1)); await hall.waitForTimeout(700);
    const next = async () => { await hall.mouse.move(W / 2, H / 2); await hall.click('.dock .go'); await hall.waitForTimeout(500); };
    await next(); await next(); for (let g = 0; g < 8 && !(await hall.$('.arena2')); g++) await next();
    await hall.waitForFunction(() => !document.querySelector('.sc'), null, { timeout: 12000 }).catch(() => {});
    await hall.evaluate(() => window.__tvFake(8)); await hall.waitForTimeout(2600);
    const mode = await hall.evaluate(() => window.__arena?.mode);
    await hall.evaluate(() => window.__tvFreeze(3000)); await hall.waitForTimeout(400);
    const on = dom ? await hall.$$eval('.iceb', (x) => x.length) : await hall.evaluate(() => 'pixi');
    await hall.screenshot({ path: `${SHOTS}/b52-tv-ice-${dom ? 'dom' : 'pixi'}-on.png` });
    await hall.waitForTimeout(3200); await hall.screenshot({ path: `${SHOTS}/b52-tv-ice-${dom ? 'dom' : 'pixi'}-melt.png` });
    await hall.waitForTimeout(800); const off = dom ? await hall.$$eval('.iceb', (x) => x.length) : 0;
    console.log(`${dom ? 'DOM' : 'Pixi'}(${mode}): 얼음 ${on} → 녹은 뒤 ${off}`); if (dom && (on !== 8 || off !== 0)) errs.push('DOM 얼음');
    await hall.close();
  }
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
