// 👩‍🏫 교사 계정 = 전용 칭호 30개 모두 열림 (📜 2026-11-20 머리 · 선생님 A) — 교사 내 캠프(from=me) 호칭 고르기에 잠긴 칸 0 · 각성 칭호(혈월의 기사) 고를 수 있음
//   NODE_PATH=$(npm root -g) node tools/e2e/teacherawk.cjs [주소]
const { chromium } = require('playwright');
(async () => {
  const B = process.argv[2] || 'http://localhost:4173/', b = await chromium.launch(), p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await p.goto(B + '?role=camp&from=me'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(3000);
  if (!(await p.$('.mh'))) await p.click('button[aria-label="내 용사 보기"]').catch((e) => console.log('nobtn', String(e).slice(0, 80)));
  await p.waitForSelector('.mh', { timeout: 8000 });
  await p.click('.mh [role="tab"]:has-text("기록"), .mh .tabs button:has-text("기록")').catch(() => {}); await p.waitForTimeout(300);
  await p.evaluate(() => [...document.querySelectorAll('.mh button.row')].find((b) => /호칭 고르기/.test(b.textContent))?.click()); await p.waitForTimeout(400);
  const r = await p.evaluate(() => ({ on: [...document.querySelectorAll('button.ttp')].map((x) => x.textContent.trim()), lock: [...document.querySelectorAll('.ttp.lock')].map((x) => x.textContent.trim()) }));
  const ok = (t, c, d = '') => console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); ok('교사 호칭 잠김 0', r.lock.length === 0, `열림 ${r.on.length}`); ok('각성 칭호 혈월의 기사 고를 수 있음', r.on.some((x) => /혈월의 기사/.test(x)));
  await b.close();
})();
