// 🎯 #40 허수아비 서술형 = 수업과 같은 「✍ 서술형 · 📷」 (이 기기 = 「✔ 테스트: 사진 통과로 보기」) · 졸개 다 풀기 전에도 · 통과 = 남은 단계 처치 · 📜 1 · 두 번째 = 🌟 통과만
//   NODE_PATH=$(npm root -g) node tools/e2e/dummywr40.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + '?role=camp&room=DW1'); await p.waitForSelector('.stage');
  const open = async () => {
    await p.click('.prop[aria-label^="허수아비"]'); await p.waitForSelector('[data-k="dummy-list"]'); await p.waitForTimeout(300);
    await p.$eval('[data-lesson="set-09"] li[data-mid="m5"] .go', (e) => e.click()); await p.waitForSelector('.drun', { timeout: 15000 }); await p.waitForTimeout(2000);
  };
  await open();
  const wr = await p.$('[data-k="wr-btn"]');
  ok('🎯 9차시 문제 5(서술형) = 「✍ 서술형」 단추 (졸개 풀기 전)', !!wr, wr ? (await wr.textContent()).trim() : '');
  await p.screenshot({ path: `${SHOTS}/dummywr-1.png` });
  if (wr) { await wr.click(); await p.waitForTimeout(500); const shot = await p.$('button:has-text("찍어서 채점")'); if (shot) { await shot.click(); await p.waitForTimeout(600); } }
  const pass = await p.$('button:has-text("사진 통과로 보기")');
  ok('📷 창 = 「✔ 테스트: 사진 통과로 보기」(이 기기)', !!pass);
  if (pass) { await pass.click(); await p.waitForTimeout(1500); }
  await p.screenshot({ path: `${SHOTS}/dummywr-2.png` });
  const g = await p.evaluate(() => Object.entries(window.__dbGet('gifts') || {}).flatMap(([u, G]) => Object.keys(G || {}).filter((k) => k.startsWith('ult_')).map((k) => `${u}/${k}`)));
  ok('통과 = 📜 선물 ult_set-09_m5 하나', g.length === 1 && /ult_set-09_m5/.test(g[0]), g.join(','));
  // 두 번째 = 🌟 통과만 (📜 그대로 하나)
  ok('통과 = 남은 단계 처치 (「🎉 처치!」)', /처치/.test(await p.textContent('body')));
  await p.click('button:has-text("허수아비로")'); await p.waitForSelector('[data-k="dummy-list"]'); await p.waitForTimeout(300);
  await p.$eval('[data-lesson="set-09"] li[data-mid="m5"] .go', (e) => e.click()); await p.waitForSelector('.drun', { timeout: 15000 }); await p.waitForTimeout(2000); const wr2 = await p.$('[data-k="wr-btn"]'); if (wr2) { await wr2.click(); await p.waitForTimeout(400); const sh = await p.$('button:has-text("찍어서 채점")'); if (sh) { await sh.click(); await p.waitForTimeout(500); } const ps = await p.$('button:has-text("사진 통과로 보기")'); if (ps) { await ps.click(); await p.waitForTimeout(1200); } }
  const g2 = await p.evaluate(() => Object.entries(window.__dbGet('gifts') || {}).flatMap(([u, G]) => Object.keys(G || {}).filter((k) => k.startsWith('ult_')).map((k) => `${u}/${k}`)));
  ok('두 번째 통과 = 📜 더 안 줌 (선물 그대로 하나)', g2.length === 1, g2.join(','));
  await p.screenshot({ path: `${SHOTS}/dummywr-3.png` });
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
