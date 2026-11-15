// 🏅 호칭 고르기 시트 (b205 · 🐞 교사 화면 공용 .tp 와 이름이 겹쳐 첫 칸이 화면 높이로 길어지던 것): 교사 「나」 → 내 용사 → 호칭 고르기 = 칸이 고른 높이 · 여러 칸
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch(), errs = [];
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('http://localhost:4173/?role=teacher&tab=me'); await p.waitForTimeout(2500);
  await p.click('button:has-text("내 용사")'); await p.waitForTimeout(800);
  for (const t of await p.$$('[role="tab"], .tabs button, .seg button')) { const tx = ((await t.textContent()) || '').trim(); if (/기록|호칭/.test(tx)) { await t.click(); break; } }
  await p.waitForTimeout(400); await p.click('button:has-text("호칭 고르기")'); await p.waitForTimeout(600);
  const h = await p.$$eval('.ttls > *', (x) => x.map((e) => Math.round(e.getBoundingClientRect().height)));
  console.log('칸 수', h.length, '· 높이', h.slice(0, 6).join(','));
  if (!h.length || Math.max(...h) > 120) errs.push('칸 높이');
  await p.screenshot({ path: `${SHOTS}/title-sheet.png` });
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
