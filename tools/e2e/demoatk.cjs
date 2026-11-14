// 🧑‍🏫 교사 예외 (📜 2026-11-14 「교사는 시연 중일 때 공격이 들어올 필요는 없어」): 시연 창을 연 채 몬스터 공격 시각을 넘김 → 시연 창 효과 0 · 같은 방 학생 폰은 공격 받음
//   사용: NODE_PATH=$(npm root -g) node tools/e2e/demoatk.cjs <폴더>
const { chromium } = require('playwright');
const path = require('path');
const [SHOTS = '.'] = process.argv.slice(2), B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const ctx = await b.newContext(), t = await ctx.newPage(); await t.setViewportSize({ width: 400, height: 860 });
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tabs');
  await t.click('.tabs button:has-text("준비")'); await t.click('[data-k="lpick-go"]'); await t.click('[data-k="lpick"] .grid [data-id="set-02"]'); await t.click('.tact .btn'); await t.waitForSelector('.att');
  const code = await t.evaluate(() => window.__dbGet('school/live').code);
  const s = await ctx.newPage(); await s.setViewportSize({ width: 390, height: 844 }); await s.goto(`${B}?role=student&room=${code}&as=1-1:3`); await s.waitForTimeout(2500);
  await t.waitForFunction(() => !document.querySelector('.tact .btn')?.disabled, null, { timeout: 15000 });
  for (let g = 0; g < 12; g++) { const st = await t.evaluate(() => { const L = window.__dbGet('school/live'); return window.__dbGet(`rooms/${L.code}`).state.step; }); if (st === 2) break; await t.click('.tact .btn'); await t.waitForTimeout(300); } // 2차시 m1
  if (/지금 등장/.test(await t.textContent('.tact .btn'))) await t.click('.tact .btn');
  const tv = await ctx.newPage(); await tv.setViewportSize({ width: 1920, height: 1080 }); await tv.goto(`${B}?role=hall&room=${code}`); await tv.waitForSelector('nav.dock', { timeout: 20000 }); await tv.waitForTimeout(1200);
  await tv.mouse.move(960, 540); await tv.click('nav.dock .t:has-text("시연")'); await tv.waitForSelector('.dpane .pmain', { timeout: 15000 });
  let demoFx = 0, stuFx = 0;
  for (let k = 0; k < 20; k++) { await tv.waitForTimeout(1500); demoFx += (await tv.locator('.dpane .afx').count()); stuFx += (await s.locator('.afx').count()); }
  ok('학생 폰도 공격 없음 (📜 2026-11-14 「멈춤」 = 시연 중 전투 멈춤 · 옛 「학생은 받음」 바뀜 · demopause.cjs)', stuFx === 0, `효과 칸 ${stuFx}번`);
  ok('시연 창 = 공격 효과 · 멈춤 덮개 0 (단추가 흐린 건 답을 안 골라서)', demoFx === 0, `시연 효과 ${demoFx}`);
  await tv.screenshot({ path: path.join(SHOTS, 'demoatk-tv.png') });
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}` : '✅ 오류 0'); await b.close();
})();
