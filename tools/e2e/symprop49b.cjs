// 📖 #49 ② 기호 톡 10 ~ 13차시: 🎯 허수아비 10차시 문제 = 충분조건 · 필요조건 · 필요충분조건 · ⇒ 형광펜 · 누르면 말풍선 문구
//   NODE_PATH=$(npm root -g) node tools/e2e/symprop49b.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const words = new Set(); let shot = false;
  for (const mid of ['m1', 'm2', 'm3', 'm4']) { // 몬스터마다 새 탭(새로 고침 뒤 보던 장면 복귀 · 섞이지 않게)
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }), p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(B + '?role=camp&room=SY49B' + mid); await p.waitForSelector('.stage');
    await p.click('.prop[aria-label="🎯 허수아비"]'); await p.waitForSelector('[data-k="dummy-list"]'); await p.waitForTimeout(300);
    const has = await p.$(`[data-lesson="set-10"] li[data-mid="${mid}"] .go`); if (!has) { await ctx.close(); continue; }
    await p.$eval(`[data-lesson="set-10"] li[data-mid="${mid}"] .go`, (e) => e.click()); await p.waitForSelector('.drun', { timeout: 15000 }); await p.waitForTimeout(2500);
    const w = await p.$$eval('.sy', (es) => es.map((e) => e.textContent.trim())); w.forEach((x) => words.add(x));
    if (!shot && w.some((x) => /충분조건|필요조건/.test(x))) {
      const t = await p.$('.sy:text-matches("충분조건|필요조건|필요충분조건")'); if (t) { await t.scrollIntoViewIfNeeded(); await t.click(); await p.waitForTimeout(500); }
      const body = (await p.textContent('body')) || '';
      ok(`${mid} 말풍선 = 화살 비유 문구`, /화살을 쏘는 쪽|화살을 맞는 쪽|서로 쏘고 서로 맞는다/.test(body));
      await p.screenshot({ path: `${SHOTS}/symprop49-10.png` }); shot = true;
    }
    await ctx.close();
  }
  ok('10차시 첫 화면 = 필요조건(또는 충분조건) · ⇒ 형광펜', (words.has('필요조건') || words.has('충분조건')) && words.has('⇒'), [...words].join(' '));
  ok('필요충분조건 안의 「충분조건」이 따로 안 잡힘', ![...words].some((x) => x === '충분' || x === '필요'));
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
