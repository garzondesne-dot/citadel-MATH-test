// 🚨 11/19 ⓪ 교사 「나」 → 내 캠프 = 로딩 · 새로 고침 반복 재현 (에뮬레이터 · 40초 동안 페이지 읽기 횟수)
const { chromium } = require('playwright');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/', E = 'emu=127.0.0.1';
(async () => {
  if (process.env.BIG) require(process.env.BIG);
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a);
  const t = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  let loads = 0; t.on('load', () => { loads++; log('load', loads, t.url().replace(B, '')); });
  t.on('pageerror', (e) => { errs.push(String(e)); log('ERR', String(e).slice(0, 200)); });
  t.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') log('console', m.type(), m.text().slice(0, 160)); });
  await t.goto(`${B}?role=teacher&${E}`); await t.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(t, '.tabs');
  await t.goto(`${B}?role=teacher&tab=me&${E}`); await t.waitForSelector('.item:has-text("내 캠프")', { timeout: 20000 });
  loads = 0; await t.click('.item:has-text("내 캠프")'); await t.waitForTimeout(3000);
  log('그대로 연 주소:', t.url().replace(B, '')); loads = 0; await t.goto(`${B}?role=camp&from=me&${E}`);
  await t.waitForTimeout(40000);
  const camp = !!(await t.$('.camp')), boot = await t.$eval('#boot', (e) => getComputedStyle(e).display + ' ' + e.className).catch(() => 'none');
  log(`결과: 읽기 ${loads}번 · 캠프 ${camp} · 로딩 ${boot}`); await t.screenshot({ path: `${SHOTS}/tloop.png` });
  await b.close(); process.exit(loads > 2 || !camp ? 1 : 0);
})();
