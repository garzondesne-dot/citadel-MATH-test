// ⚡ 필살기 눈빛 · 종합실 연출 (📜 2026-11-13 밤): ① 학생 폰 첫 필살기에도 얼굴 + 눈빛(빛 두 줄) ② TV = ⚡ 필살기 컷인 · 🌟 진필살기(금빛 「眞」 + 광역) · 🛡 홀리 방패(HOLY GUARD + 눈빛) · ✨ 오라 → 캡처 폰 · TV
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), errs = [], log = (...a) => console.log(...a);
  const look = (pg) => pg.evaluate(() => { const u = document.querySelector('.ult'); return u ? { cls: u.className, facepic: !!u.querySelector('.u-facepic'), glints: u.querySelectorAll('.u-glint').length, name: u.querySelector('.u-name')?.textContent, zhen: !!u.querySelector('.u-true') } : null; });
  // ① 학생 폰 (공격 갤러리 = 학생 폰과 같은 부품)
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + '?role=atk'); await p.waitForSelector('.tabs2'); await p.click('.tabs2 button:has-text("용사 fx")'); await p.click('.ids button[data-sk] >> nth=3'); await p.waitForTimeout(300);
  for (const [k, sel, ms] of [['ult', 'button[data-h="ult"]', 420], ['true', 'button[data-h="true"]', 520], ['holy', 'button[data-h="holy"]', 300]]) {
    await p.click(sel); await p.waitForSelector('.ult .u-facepic', { timeout: 5000 }).catch(() => {}); await p.waitForTimeout(ms * 0.8); const u = await look(p); log(`① 폰 ${k}:`, JSON.stringify(u)); if (!u || !u.facepic || u.glints !== 2) errs.push(`폰 ${k} 얼굴 · 눈빛`);
    await p.screenshot({ path: `${SHOTS}/ult-phone-${k}.png` }); await p.waitForTimeout(3200);
  }
  // ② TV
  const t = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage(); t.on('pageerror', (e) => errs.push(String(e)));
  await t.goto(B + '?role=hall&mode=test&room=ULT1'); await t.waitForSelector('.dock'); await t.evaluate(() => window.__tvFake(3)); await t.waitForTimeout(600);
  for (let g = 0; g < 10 && !(await t.$('.arena2')); g++) { await t.mouse.move(800, 450); await t.click('.dock .go'); await t.waitForTimeout(500); }
  await t.waitForFunction(() => !document.querySelector('.sc'), null, { timeout: 12000 }).catch(() => {}); await t.waitForTimeout(1500); await t.addStyleTag({ content: '.dock{opacity:0!important}' });
  await t.evaluate(() => window.__tvAtk(0, 'hit', 3, undefined, true, true)); await t.waitForTimeout(450); let u = await look(t); log('② TV 필살기:', JSON.stringify(u)); if (!u || !u.facepic) errs.push('TV 필살기 컷인'); await t.screenshot({ path: `${SHOTS}/ult-tv-ult.png` });
  await t.waitForTimeout(3500); const blastP = t.waitForSelector('.ult-ring, .ult-aoe', { timeout: 6000, state: 'attached' }).then(() => true).catch(() => false); await t.evaluate(() => window.__tvTrue(1)); await t.waitForTimeout(550); u = await look(t); log('② TV 진필살기:', JSON.stringify(u)); if (!u || !u.zhen) errs.push('TV 진필살기 금빛 眞'); await t.screenshot({ path: `${SHOTS}/ult-tv-true.png` });
  const blast = await blastP; log('   광역(충격파 · 섬광 · 어둠막):', blast); await t.screenshot({ path: `${SHOTS}/ult-tv-true-blast.png` }); if (!blast) errs.push('TV 진필살기 광역');
  await t.waitForTimeout(2500); await t.evaluate(() => window.__tvGuard(2)); await t.waitForTimeout(350); u = await look(t); log('② TV 홀리 방패:', JSON.stringify(u)); if (!u || !/guard/.test(u.cls) || u.glints !== 2) errs.push('TV 홀리 방패 눈빛'); await t.screenshot({ path: `${SHOTS}/ult-tv-holy.png` });
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
