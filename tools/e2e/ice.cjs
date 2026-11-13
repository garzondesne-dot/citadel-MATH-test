// 🧊 얼음 다시 (2026-11-13 · 폰 360 × 640 · 공격 갤러리): 얼음 덮인 순간 · 금 2단계(톡 2번) · 깨짐(톡 4번) · 3초 = 녹음
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch(), errs = []; const s = await (await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 })).newPage();
  s.on('pageerror', (e) => errs.push(String(e)));
  await s.goto('http://localhost:4173/?role=atk'); await s.waitForSelector('.qwrap .bcard'); await s.waitForTimeout(500);
  const clip = async (name) => { const r = await s.$eval('.edge', (x) => { const b = x.getBoundingClientRect(); return { x: b.left, y: b.top, width: b.width, height: b.height }; }); await s.screenshot({ path: `${SHOTS}/b52-ice-${name}.png`, clip: r }); };
  const st = () => s.evaluate(() => ({ on: !!document.querySelector('.edge .ice2'), mode: ['on', 'shatter', 'melt'].find((k) => document.querySelector('.edge .ice2')?.classList.contains(k)) || '', cracks: document.querySelectorAll('.edge .ice2 .cr path').length, frags: document.querySelectorAll('.edge .ice2 .frag').length, sq: !!document.querySelector('.edge .efx') }));
  await s.click('.ids .a[data-id="ice"]'); await s.waitForTimeout(450); const a = await st(); await clip('1-on'); console.log('덮인 순간:', JSON.stringify(a)); if (!a.on || a.cracks || a.sq) errs.push('덮임');
  for (let k = 0; k < 2; k++) { await s.click('.act .pmain.ice'); await s.waitForTimeout(80); } const c = await st(); await clip('2-crack2'); console.log('톡 2번:', JSON.stringify(c)); if (c.cracks !== 2) errs.push('금 2');
  for (let k = 0; k < 2; k++) { await s.click('.act .pmain.ice'); await s.waitForTimeout(60); } await s.waitForTimeout(120); const d = await st(); await clip('3-shatter'); console.log('톡 4번:', JSON.stringify(d)); if (d.mode !== 'shatter' || !d.frags) errs.push('깨짐');
  await s.waitForTimeout(900); const e = await st(); console.log('깨진 뒤:', JSON.stringify(e)); if (e.on) errs.push('깨진 뒤 남음');
  await s.click('.ids .a[data-id="ice"]'); await s.waitForTimeout(3100); const m = await st(); console.log('3초 뒤:', JSON.stringify(m)); await clip('4-melt'); if (m.mode !== 'melt') errs.push('녹음');
  await s.waitForTimeout(900); if ((await st()).on) errs.push('녹은 뒤 남음');
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
