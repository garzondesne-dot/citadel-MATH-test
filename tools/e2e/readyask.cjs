// 📝 준비 완료 = 「학습지 빈칸을 모두 채웠나요?」 확인 (📜 2026-11-16 선생님 d4) — 아직 = 안 보냄 · 네 = 보냄
//   NODE_PATH=$(npm root -g) node tools/e2e/readyask.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('리모컨 ' + e));
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tp');
  if (await t.$('[data-cls="1-3"]')) await t.click('[data-cls="1-3"]'); else { await t.click('text=다른 반'); await t.click('.sheet .pk:has-text("1-3반")'); }
  await t.click('.pk:has-text("6차시")'); await t.click('.tact .btn');
  ok('수업 열기 확인 창 = 반 · 차시 · 제목', /1-3반/.test(await t.textContent('[data-k="open-ask"]')) && /6차시/.test(await t.textContent('[data-k="open-ask"]')));
  await t.screenshot({ path: `${SHOTS}/open-ask.png` });
  await t.click('[data-k="open-yes"]'); await t.waitForSelector('.nums');
  const code = await t.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.endsWith('|school/live')) return JSON.parse(localStorage.getItem(k)).code; });
  const s = await ctx.newPage(); s.on('pageerror', (e) => errs.push('폰 ' + e)); await s.goto(`${B}?role=student&room=${code}&as=1-3:2`); await s.waitForTimeout(1500);
  await t.bringToFront();
  for (let i = 0; i < 9 && ((await t.evaluate((c) => window.__dbGet(`rooms/${c}/state/step`), code)) ?? -1) < 1; i++) { await t.waitForSelector('.tact .btn:not([disabled])', { timeout: 8000 }).catch(() => {}); await t.click('.tact .btn'); await t.waitForTimeout(700); }
  await s.bringToFront(); await s.waitForTimeout(1500);
  const rd = () => t.evaluate((c) => JSON.stringify(window.__dbGet(`rooms/${c}/scout`) || window.__dbGet(`rooms/${c}/state/scoutReady`) || ''), code);
  await s.click('button.pmain:has-text("준비 완료")'); await s.waitForTimeout(400);
  ok('준비 완료 → 「학습지 빈칸을 모두 채웠나요?」', /빈칸을 모두 채웠나요/.test((await s.textContent('.sheet').catch(() => '')) || ''));
  await s.screenshot({ path: `${SHOTS}/ready-ask.png` });
  const r0 = await rd(); await s.click('[data-k="ready-no"]'); await s.waitForTimeout(400);
  ok('아직 = 안 보냄', (await rd()) === r0 && !(await s.$('[data-k="ready-yes"]')));
  await s.click('button.pmain:has-text("준비 완료")'); await s.waitForTimeout(300); await s.click('[data-k="ready-yes"]'); await s.waitForTimeout(600);
  ok('네 = 보냄 (✋ 준비 완료!)', /준비 완료!|보냈어요/.test(await s.textContent('body')));
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
