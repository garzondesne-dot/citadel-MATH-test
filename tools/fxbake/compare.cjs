// 🍳 ⚔ 베기 Ⅰ~Ⅳ 지금 띠 ↔ 새 것 · 같은 장면 · 같은 순간 칸들 (?role=fxbake · 결정적 · GPU 없어도 같은 그림)
const { chromium } = require('playwright');
const OUT = process.argv[2] || '.';
const T = [[0.05, 0.1, 0.16, 0.22, 0.3, 0.4], [0.05, 0.12, 0.2, 0.28, 0.38, 0.5], [0.06, 0.15, 0.25, 0.35, 0.47, 0.62], [0.08, 0.2, 0.32, 0.46, 0.62, 0.85]];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), p = await (await b.newContext({ viewport: { width: 480, height: 300 } })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('http://localhost:4173/?role=fxbake'); await p.waitForSelector('.bake[data-ready="true"]', { timeout: 30000 });
  for (let tier = 0; tier < 4; tier++) for (let i = 0; i < 6; i++) for (const k of ['old', 'new']) {
    await p.evaluate(([k, tier, t]) => (k === 'new' ? window.__bake.sceneNew(tier, t) : window.__bake.sceneOld(tier, t)), [k, tier, T[tier][i]]);
    await p.waitForTimeout(60); await p.screenshot({ path: `${OUT}/cmp-${k}-${tier + 1}-${i}.png`, clip: { x: 0, y: 0, width: 480, height: 300 } });
  }
  console.log('errs', errs.length ? errs.slice(0, 3) : 0); await b.close();
})();
