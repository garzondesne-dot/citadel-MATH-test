// 👑 +10 후광 = 머리 뒤 중앙 전 · 후 캡처 (🔨 2026-11-13): 공격 갤러리 「⚔ 용사 fx」 장면 + 캠프 용사(HeroSprite · 숨쉬기 시트) · Pixel 7 세로
//   node tools/fxbake/halo.cjs <포트> <접두어> <폴더> [용사 번호들 쉼표 = 0,6,4]
const { chromium } = require('playwright');
const [PORT = '4173', PRE = 'after', OUT = '.', IDS = '0,6,4'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(), errs = []; const s = await (await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 })).newPage();
  s.on('pageerror', (e) => errs.push(String(e)));
  await s.goto(`http://localhost:${PORT}/?role=atk`); await s.waitForSelector('.qwrap .bcard'); await s.click('.tabs2 button:has-text("용사 fx")'); await s.waitForTimeout(400);
  for (const id of IDS.split(',')) {
    await s.selectOption('.hrow select >> nth=0', id); await s.waitForTimeout(300); await s.selectOption('.hrow select >> nth=1', '10'); await s.waitForTimeout(700);
    const hb = await s.$eval('.edge .hb', (x) => { const r = x.getBoundingClientRect(); return { x: Math.max(0, r.left - 60), y: Math.max(0, r.top - 90), width: r.width + 120, height: r.height + 110 }; });
    await s.screenshot({ path: `${OUT}/${PRE}-halo-${id}.png`, clip: hb });
  }
  console.log(errs.length ? `❌ ${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
