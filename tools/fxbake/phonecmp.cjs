// 🍳 폰 = 지금 띠 ↔ 새 것(구운 띠) · 공격 갤러리 「⚔ 용사 fx」 · 로안 Ⅰ~Ⅳ · 같은 순간 칸 (장면 띠만 자름)
const { chromium } = require('playwright'); const OUT = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch(), s = await (await b.newContext({ viewport: { width: 360, height: 640 } })).newPage(); const errs = []; s.on('pageerror', (e) => errs.push(String(e)));
  await s.goto('http://localhost:4173/?role=atk'); await s.waitForSelector('.qwrap .bcard'); await s.click('.tabs2 button:has-text("용사 fx")'); await s.waitForTimeout(400);
  for (const mode of ['old', 'new']) {
    await s.click(mode === 'new' ? '.tabs2 button[data-new]' : '.tabs2 button:has-text("지금 것")'); await s.waitForTimeout(200);
    for (const [i, sk] of ['cut', 'moon', 'slash', 'twin'].entries()) {
      await s.click(`.ids .a[data-sk="${sk}"]`); await s.waitForTimeout(700);
      await s.click('.ids .a[data-h="hit"]');
      for (const [j, ms] of [430, 560, 700].entries()) { await s.waitForTimeout(j ? ms - [430, 560, 700][j - 1] : ms); const r = await s.$eval('.edge', (x) => { const b = x.getBoundingClientRect(); return { x: b.left, y: b.top, width: b.width, height: b.height }; }); await s.screenshot({ path: `${OUT}/ph-${mode}-${i + 1}-${j}.png`, clip: r }); }
      await s.waitForTimeout(1500);
    }
  }
  console.log('errs', errs.length ? errs.slice(0, 3) : 0); await b.close();
})();
