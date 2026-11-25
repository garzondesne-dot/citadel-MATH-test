// 🌟 나의 빛나는 순위 (📜 2026-11-25 · 머리 🔨) — 이 기기 캠프
//   (이 기기 캠프 = 늘 🧪 테스트 · 12/5 전 숨김은 tests/shine1125 shineOn) ② 🧪 테스트 = 날짜 무시 · 금빛 띠 「🙋 첫 몬스터를 기다리는 중」 ③ 누르면 설명 한 줄 · 다시 누르면 닫힘
//   NODE_PATH=$(npm root -g) node tools/e2e/shine1125.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('캠프 ' + e));
  await p.goto(B + '?role=camp&room=SH'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('citadel-exam-cut|me|2026-12-11', '1'); }); await p.reload(); await p.waitForTimeout(2000);
  const t = (await p.textContent('[data-k="shine-band"]').catch(() => '')) || '';
  ok('② 🧪 = 금빛 띠', /첫 몬스터를 기다리는 중|이번 달|지난주의 나보다|우리 반/.test(t), t);
  ok('등수 숫자 없음', !/\d+\s*(등|위)/.test(t));
  const box = await p.$eval('[data-k="shine-band"]', (e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, h: r.height }; });
  ok('폰 안 · 누르는 칸 32px 이상', box.l >= 0 && box.r <= 390 && box.h >= 32, JSON.stringify(box));
  await p.click('[data-k="shine-band"]'); await p.waitForTimeout(250);
  ok('③ 누르면 설명 한 줄', !!(await p.$('[data-k="shine-say"]')));
  await p.screenshot({ path: `${SHOTS}/shine-camp.png` });
  await p.click('[data-k="shine-band"]'); await p.waitForTimeout(250);
  ok('다시 누르면 닫힘', !(await p.$('[data-k="shine-say"]')));
  await b.close(); console.log(errs.length ? `❌ ${errs.length}` : '✅ 오류 0'); process.exit(errs.length ? 1 : 0);
})();
