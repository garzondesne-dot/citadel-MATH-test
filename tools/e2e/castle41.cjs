// 🏰 #41 성채 서술형 📷 = 수업과 같게 (체험판 trial/ 캠프의 성채 1층 · 서버 없음 = 「✔ 테스트: 사진 통과로 보기」)
//   방 줄 「🎁 🧑‍🎓」 · 전투 화면 「✍ 서술형 · 📷」(앞 단계 다 풀기 전에도) · 통과 = 처치 · 📜 +1
//   NODE_PATH=$(npm root -g) node tools/e2e/castle41.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = (process.argv[3] || 'http://localhost:4173/') + 'trial/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B); await p.waitForSelector('[data-k="trial"]'); await p.click('[data-k="trial-stu"]');
  await p.waitForSelector('[data-k="first-hero"]'); await p.click('[data-k="first-hero"] .ba-main, [data-k="first-hero"] button:has-text("시작")'); await p.waitForTimeout(400);
  await p.click('[data-k="trial-card"] >> nth=1'); await p.waitForSelector('[data-k="stutry"]'); await p.click('[data-k="try-close"]'); await p.waitForTimeout(800);
  await p.click('.camp [data-prop="castle"], .camp button[aria-label*="성채"]'); await p.waitForSelector('[data-floor]', { timeout: 5000 }); await p.click('[data-floor]');
  await p.waitForSelector('[data-k="castle-sum"]', { timeout: 8000 });
  const line = await p.textContent('[data-room="q07"]');
  ok('방 줄 = 📷 서술형 · 🎁 🧑‍🎓', /📷/.test(line) && /🎁 🧑‍🎓/.test(line), line.replace(/\s+/g, ' ').trim().slice(0, 60));
  const sc0 = await p.evaluate(() => JSON.parse(sessionStorage.getItem('citadel-v1-me') || '{}').wallet?.scroll ?? 0);
  await p.click('[data-room="q07"]'); await p.waitForTimeout(400);
  if (!(await p.$('.drun'))) { const go = await p.$('button:has-text("도전")'); if (go) await go.click(); }
  await p.waitForSelector('.drun', { timeout: 10000 }); await p.waitForTimeout(1500);
  const wr = await p.$('[data-k="castle-wr"]');
  ok('전투 화면 「✍ 서술형 · 📷」 (앞 단계 풀기 전)', !!wr, wr ? (await wr.textContent()).trim() : '');
  await p.screenshot({ path: `${SHOTS}/castle41-run.png` });
  if (wr) { await wr.click(); await p.waitForTimeout(600); const sh = await p.$('button:has-text("찍어서 채점")'); if (sh) { await sh.click(); await p.waitForTimeout(500); } }
  const ps = await p.$('button:has-text("사진 통과로 보기")'); ok('📷 창 (서버 없음 = 테스트 통과 단추)', !!ps);
  if (ps) { await ps.click(); await p.waitForTimeout(1500); }
  await p.screenshot({ path: `${SHOTS}/castle41-pass.png` });
  const body = await p.textContent('body'), sc1 = await p.evaluate(() => JSON.parse(sessionStorage.getItem('citadel-v1-me') || '{}').wallet?.scroll ?? 0);
  ok('통과 = 처치 · 📜 +1', /처치/.test(body) && /📜 \+1/.test(body), `📜 ${sc0} → ${sc1}`);
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
