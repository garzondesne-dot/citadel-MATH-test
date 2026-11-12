// #160 ⚔ 소레이드 졸개 자리 + 기호 톡 형광펜 (이 기기 · 게시판 1인 7차시 = 첫 단계 u4 소레이드)
//   360 · 390 · 430 폭: 용사 칸과 졸개 줄 겹침 0 · 졸개 = 대장 앞 오른쪽 · 지금 졸개만 금빛 테두리 · 형광펜이 기호 글자를 덮지 않음(글자색 = 문제 글 색)
// 사용: npm run build → npx vite preview --port 4173 → NODE_PATH=$(npm root -g) node tools/e2e/soraid.cjs <그림 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
const B = 'http://localhost:4173/';
const log = (...a) => console.log(...a);
(async () => {
  const b = await chromium.launch(), errs = [];
  for (const W of [360, 390, 430]) {
    const ctx = await b.newContext({ viewport: { width: W, height: 780 } }), p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(B + `?role=camp&room=SR${W}`); await p.waitForSelector('.stage');
    await p.click('button[aria-label="📋 게시판"]'); await p.waitForSelector('.bd');
    await p.click('.bd .chips button:has-text("7")'); await p.click('.bd .pmain'); await p.waitForSelector('.lgrid');
    await p.click('.lg:has-text("7")'); await p.click('.sheet .pmain'); await p.waitForSelector('.minions', { timeout: 15000 }); await p.waitForTimeout(500);
    const m = await p.evaluate(() => {
      const r = (x) => x.getBoundingClientRect(), hero = r(document.querySelector('.edge .hero')), mins = [...document.querySelectorAll('.edge .mini')].map(r), boss = r(document.querySelector('.edge .mon'));
      const over = (a, c) => Math.max(0, Math.min(a.right, c.right) - Math.max(a.left, c.left)) * Math.max(0, Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top));
      const now = document.querySelectorAll('.edge .mini.now').length;
      const sy = [...document.querySelectorAll('.bcard .sy')].map((x) => ({ t: x.textContent, c: getComputedStyle(x).color, pc: getComputedStyle(x.parentElement).color, fs: getComputedStyle(x).fontSize, pfs: getComputedStyle(x.parentElement).fontSize, fw: getComputedStyle(x).fontWeight, pfw: getComputedStyle(x.parentElement).fontWeight }));
      return { heroR: Math.round(hero.right), minL: Math.round(Math.min(...mins.map((x) => x.left))), minR: Math.round(Math.max(...mins.map((x) => x.right))), bossL: Math.round(boss.left), heroOver: mins.reduce((a, x) => a + over(hero, x), 0), between: mins.slice(1).every((x, i) => x.left - mins[i].right >= 6), n: mins.length, now, sy };
    });
    log(`${W}: 용사 오른쪽 ${m.heroR} · 졸개 ${m.n} ${m.minL}~${m.minR} · 대장 왼쪽 ${m.bossL} · 겹침 ${m.heroOver} · 간격 ${m.between} · 지금 ${m.now} · 기호 ${m.sy.map((s) => s.t).join(' ')}`);
    if (m.heroOver > 0 || m.minL < m.heroR) errs.push(`${W} 용사 ↔ 졸개 겹침`);
    if (!m.between || m.now !== 1 || m.minR > W) errs.push(`${W} 졸개 줄`);
    for (const s of m.sy) if (s.c !== s.pc || s.fs !== s.pfs || s.fw !== s.pfw) errs.push(`${W} 기호 ${s.t} 글자 다름 ${JSON.stringify(s)}`);
    await p.screenshot({ path: `${SHOTS}/b39-soraid-${W}.png` });
    await ctx.close();
  }
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0');
  await b.close();
})();
