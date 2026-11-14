// ⛓ 정식 bindFor 비교용 기록 (📜 2026-11-14 「A로 해 줘」): 가상 학생 20명 한 판 → 몬스터 · 보스 단계마다 방 기록 + 시각 → <파일>
//   사용: NODE_PATH=$(npm root -g) node tools/e2e/bindcap.cjs <snaps.json> set-10 → npx vite-node tools/bindcmp.ts <snaps.json> set-10 (베타) ↔ 정식 release 의 tests/load.js 로 DS.Combo.bindFor (같은 기록 · R.active = 8초 안 접속)
const { chromium } = require('playwright'); const fs = require('fs');
const [OUT, id] = process.argv.slice(2), B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), p = await (await b.newContext({ viewport: { width: 400, height: 860 } })).newPage();
  await p.goto(B + '?role=teacher'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.tabs');
  await p.evaluate(() => { window.__botSpeed = 8; window.__botAcc = 0.85; });
  await p.click('.tabs button:has-text("준비")'); await p.click('[data-k="lpick-go"]'); await p.click(`[data-k="lpick"] .grid [data-id="${id}"]`); await p.click('.tact .btn'); await p.waitForSelector('[data-k="bots"]');
  await p.click('[data-k="bot-sw"]'); await p.waitForFunction(() => !document.querySelector('.tact .btn')?.disabled, null, { timeout: 15000 }); await p.waitForTimeout(1500);
  const steps = JSON.parse(fs.readFileSync(`src/subjects/common-math2/lessons/${id}.json`, 'utf8')).steps; const snaps = [];
  for (let g = 0; g < 40; g++) {
    const t = await p.textContent('.tact .btn'); if (/수업 닫기/.test(t)) break;
    await p.click('.tact .btn'); await p.waitForTimeout(400); if (/지금 등장/.test(await p.textContent('.tact .btn'))) { await p.click('.tact .btn'); await p.waitForTimeout(300); }
    const st = await p.evaluate(() => { const L = window.__dbGet('school/live'); return window.__dbGet(`rooms/${L.code}`).state.step; });
    const s = steps[st]; if (!s || !['monster', 'boss'].includes(s.kind)) continue;
    for (let k = 0; k < 6; k++) { await p.waitForTimeout(5000); snaps.push(await p.evaluate((mid) => { const L = window.__dbGet('school/live'); return { mid, now: Date.now(), R: window.__dbGet(`rooms/${L.code}`) }; }, s.kind === 'boss' ? 'boss' : s.id)); }
  }
  fs.writeFileSync(OUT, JSON.stringify(snaps)); console.log('snaps', snaps.length); await b.close();
})();
