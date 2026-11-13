// 🧊 얼음 공격 그림 (🎨 ice-btn · ice-tv): ① 폰 노란 단추 = 얼음 그림 ① → 톡마다 ②③④ → 4번째 톡 ⑤ 깨짐 ② TV 용사 = 서리 → 반 → 다 얼음 → 3초 뒤 녹음 → 캡처
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), errs = [], log = (...a) => console.log(...a);
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + '?role=atk'); await p.waitForSelector('.ids'); await p.waitForTimeout(500);
  await p.locator('.ids button[data-id="ice"]').evaluate((e) => e.click()); await p.waitForSelector('.btn.ice .iceart', { timeout: 5000 });
  const pos = async () => p.$eval('.btn.ice .iceart', (e) => getComputedStyle(e).backgroundPositionX).catch(() => '없음');
  const fr = [await pos()]; await p.screenshot({ path: `${SHOTS}/ice-btn-0.png` });
  for (let k = 1; k <= 3; k++) { await p.click('.btn.ice'); await p.waitForTimeout(60); fr.push(await pos()); } // 3초 안에 (녹기 전)
  await p.screenshot({ path: `${SHOTS}/ice-btn-3.png` }); await p.click('.btn.ice'); await p.waitForTimeout(60); const brk = !!(await p.$('.icebreak')); await p.screenshot({ path: `${SHOTS}/ice-btn-4.png` });
  log('① 폰 단추 칸:', fr.join(' → '), '· 4번째 톡 깨짐', brk); if (fr.join() !== '0%,25%,50%,75%' || !brk) errs.push('폰 얼음 칸 · 깨짐');
  const t = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); t.on('pageerror', (e) => errs.push(String(e)));
  await t.goto(B + '?role=hall&mode=test&room=ICE1'); await t.waitForSelector('.dock'); await t.evaluate(() => window.__tvFake(3)); await t.waitForTimeout(500);
  for (let g = 0; g < 10 && !(await t.$('.arena2')); g++) { await t.mouse.move(640, 360); await t.click('.dock .go'); await t.waitForTimeout(500); }
  await t.waitForTimeout(2500); await t.addStyleTag({ content: '.dock{opacity:0!important}' });
  await t.evaluate(() => window.__tvFreeze(3000)); await t.waitForTimeout(450); await t.screenshot({ path: `${SHOTS}/ice-tv-frozen.png` });
  await t.waitForTimeout(2900); await t.screenshot({ path: `${SHOTS}/ice-tv-melt.png` }); log('② TV 얼음 → 녹음 캡처');
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
