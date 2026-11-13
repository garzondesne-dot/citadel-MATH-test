// 🎨 용사 fx 다듬기 전 · 후 캡처 (🔨 2026-11-13 · 3 · 6 · 7 · 8 · 9 · 화면 고침 1~3): 공격 갤러리 「⚔ 용사 fx」 · Pixel 7 세로(412 × 915)
//   node tools/fxbake/polish.cjs <포트> <접두어> <저장 폴더> [장면들 쉼표]   예) 4173 after shots   /  4174 before shots (옛 판을 따로 띄움)
const { chromium } = require('playwright');
const [PORT = '4173', PRE = 'after', OUT = '.', ONLY = ''] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }), errs = [];
  const s = await (await b.newContext({ viewport: { width: 412, height: 915 } })).newPage();
  s.on('pageerror', (e) => errs.push(String(e)));
  await s.goto(`http://localhost:${PORT}/?role=atk`); await s.waitForSelector('.qwrap .bcard'); await s.click('.tabs2 button:has-text("용사 fx")'); await s.waitForTimeout(400);
  const pick = async (hero, sk, enh = 0) => { await s.selectOption('.hrow select >> nth=0', String(hero)); await s.waitForTimeout(250); await s.selectOption('.hrow select >> nth=1', String(enh)); await s.waitForTimeout(300); if (sk) { await s.click(`.ids .a[data-sk="${sk}"]`); await s.waitForTimeout(250); } };
  const edge = async (name) => { const r = await s.$eval('.edge', (x) => { const b = x.getBoundingClientRect(); return { x: b.left, y: b.top, width: b.width, height: b.height }; }); await s.screenshot({ path: `${OUT}/${PRE}-${name}.png`, clip: r }); };
  const page = async (name) => s.screenshot({ path: `${OUT}/${PRE}-${name}.png` });
  const want = (k) => !ONLY || ONLY.split(',').includes(k);
  const press = (h) => s.click(`.ids .a[data-h="${h}"]`);
  if (want('miss')) { await pick(0, 'cut'); await press('miss'); for (const t of [330, 120, 120]) { await s.waitForTimeout(t); await edge(`3-miss-melee-${t}`); } await s.waitForTimeout(1500);
    await pick(1, ''); await press('miss'); await s.waitForTimeout(700); await edge('3-miss-ranged'); await s.waitForTimeout(1500); }
  if (want('aura')) for (const lv of [5, 8, 10]) { await pick(0, 'cut', lv); await s.waitForTimeout(500); await edge(`6-aura${lv}`); }
  if (want('holy')) { await pick(0, 'cut', 0); await press('holy'); await s.waitForTimeout(1950); await edge('7-holy-hit'); await s.waitForTimeout(400); await edge('7-holy-after'); await s.waitForTimeout(2500); }
  if (want('dmg')) { await pick(0, 'slash', 0); await press('hit'); for (const t of [700, 250]) { await s.waitForTimeout(t); await edge(`8-dmg-${t}`); } await s.waitForTimeout(2000); }
  if (want('cut')) { await pick(0, 'twin', 0); await press('ult'); await s.waitForTimeout(520); await page('9-cutin'); await s.waitForTimeout(3000); }
  console.log(errs.length ? `❌ ${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
