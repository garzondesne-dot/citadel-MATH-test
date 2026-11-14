// 🎮 TV 시연 창 풀이 칸 = 테두리까지 (📜 2026-11-15 「풀이 칸과 테두리와 공백 · 테두리까지 맞춰서 늘려」): 폰 칸 좌우 = 시연 칸 폭과 같음(±2px) · 스크롤 없음 · 1080p · 720p
//   사용: NODE_PATH=$(npm root -g) node tools/e2e/demofill.cjs <폴더> [이름표]
const { chromium } = require('playwright');
const [SHOTS = '.', TAG = 'after'] = process.argv.slice(2), B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const ctx = await b.newContext(), t = await ctx.newPage(); await t.setViewportSize({ width: 400, height: 860 });
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tabs');
  await t.click('.tabs button:has-text("준비")'); await t.click('[data-k="lpick-go"]'); await t.click('[data-k="lpick"] .grid [data-id="set-03"]'); await t.click('.tact .btn'); await t.waitForTimeout(800);
  const code = await t.evaluate(() => window.__dbGet('school/live').code);
  const st = await ctx.newPage(); await st.goto(`${B}?role=student&room=${code}&as=1-1:3`); await st.waitForTimeout(2000);
  await t.waitForFunction(() => !document.querySelector('.tact .btn')?.disabled, null, { timeout: 15000 });
  for (let g = 0; g < 8; g++) { const s = await t.evaluate(() => { const L = window.__dbGet('school/live'); return window.__dbGet(`rooms/${L.code}`).state.step; }); if (s === 2) break; await t.click('.tact .btn'); await t.waitForTimeout(300); }
  if (/지금 등장/.test(await t.textContent('.tact .btn'))) await t.click('.tact .btn');
  for (const [w, h] of [[1920, 1080], [1280, 720]]) {
    const tv = await ctx.newPage(); await tv.setViewportSize({ width: w, height: h }); tv.on('pageerror', (e) => errs.push(String(e)));
    await tv.goto(`${B}?role=hall&room=${code}`); await tv.waitForSelector('nav.dock', { timeout: 15000 }); await tv.waitForTimeout(800);
    await tv.mouse.move(w / 2, h / 2); await tv.click('nav.dock .t:has-text("시연")'); await tv.waitForSelector('.dpane .phone', { timeout: 15000 }); await tv.waitForTimeout(3500);
    const m = await tv.evaluate(() => { const bx = document.querySelector('.dpane .box').getBoundingClientRect(), ph = document.querySelector('.dpane .phone').getBoundingClientRect(), sc = document.querySelector('.dpane .scr'); return { gapL: Math.round(ph.left - bx.left), gapR: Math.round(bx.right - ph.right), gapB: Math.round(bx.bottom - ph.bottom), over: sc.scrollHeight - sc.clientHeight }; });
    await tv.screenshot({ path: `${SHOTS}/demofill-${TAG}-${h}.png` });
    ok(`${h}p 풀이 칸 좌우 = 테두리까지(빈 공간 ≤ 2px)`, Math.abs(m.gapL) <= 2 && Math.abs(m.gapR) <= 2, JSON.stringify(m));
    ok(`${h}p 스크롤 거의 없음(≤ 8px · 글자 최소 크기 지킴)`, m.over <= 8, JSON.stringify(m));
    await tv.close();
  }
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
