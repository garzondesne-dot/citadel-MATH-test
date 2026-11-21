// ⚒ #58 모루 단원 탭 (📦 집합과 명제 · 📈 함수) · 함수 연산 · 카드 23 · 찜 배너 두 단원 · 먼저 만들 카드 · 기억
//   NODE_PATH=$(npm root -g) node tools/e2e/anvil58.cjs <그림 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + '?role=camp&room=AV58'); await p.waitForSelector('.stage');
  await p.evaluate(() => { const k = Object.keys(localStorage).find((x) => /^citadel-v1-me/.test(x)) || 'citadel-v1-me'; const m = JSON.parse(localStorage.getItem(k) || '{}'); m.wishes = { in: true, bij: true }; localStorage.setItem(k, JSON.stringify(m)); });
  await p.reload(); await p.waitForSelector('.stage');
  await p.$eval('[data-prop="anvil"]', (e) => e.click()); await p.waitForSelector('.fg .stage'); await p.waitForTimeout(500);
  const tabs = await p.$$eval('.utabs button', (x) => x.map((e) => e.textContent.trim())); ok('단원 탭 2 = 📦 집합과 명제 · 📈 함수 (찜 ★ 표시)', tabs.length === 2 && /집합과 명제/.test(tabs[0]) && /함수/.test(tabs[1]), tabs.join(' | '));
  const wish = await p.$$eval('.wishes button', (x) => x.map((e) => e.textContent.trim())); ok('찜 배너 = 두 단원 카드 (속한다 · 일대일대응)', wish.length === 2, wish.join(' | '));
  await p.screenshot({ path: `${SHOTS}/a58-set.png` });
  await p.click('.utabs [data-unit="func"]'); await p.waitForTimeout(300);
  const ops = await p.$$eval('.shelf.ops button', (x) => x.map((e) => e.textContent.trim())); ok('함수 탭 연산 = ( )에 넣기 · ∘ · ⁻¹ · x ↔ y 포함 · ∈ 없음', ops.includes('∘') && ops.includes('⁻¹') && ops.includes('( )에 넣기') && !ops.includes('∈'), ops.join(' '));
  const mats = await p.$$eval('.shelf.mats button', (x) => x.map((e) => e.textContent.trim())); ok('함수 탭 재료 = f · g · h · x · y · X · Y · c', ['f', 'g', 'h', 'x', 'y', 'X', 'Y', 'c'].every((m) => mats.includes(m)), mats.join(' '));
  await p.screenshot({ path: `${SHOTS}/a58-func.png` });
  await p.click('button:has-text("도감")'); await p.waitForTimeout(400);
  const bk = (await p.textContent('.bk-h')).replace(/\s+/g, ' '); ok('도감 = 함수 23장', /\/ 23/.test(bk), bk);
  await p.screenshot({ path: `${SHOTS}/a58-book.png` });
  await p.click('.bar .back'); await p.waitForTimeout(300); await p.click('.wishes button:has-text("일대일대응")'); await p.waitForTimeout(400);
  const need = await p.$$eval('[data-k="need-first"]', (x) => x.map((e) => e.textContent.trim())); ok('먼저 만들 카드 안내 (일대일대응 → 재료 카드)', need.length > 0, need.slice(0, 2).join(' | '));
  await p.screenshot({ path: `${SHOTS}/a58-need.png` });
  await p.reload(); await p.waitForSelector('.stage'); await p.$eval('[data-prop="anvil"]', (e) => e.click()); await p.waitForSelector('.fg .stage'); await p.waitForTimeout(400);
  ok('다시 열면 지난번 탭(함수)', !!(await p.$('.utabs [data-unit="func"].on')));
  ok('가로 넘침 없음', !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
  await b.close(); console.log(errs.length ? `❌ 실패 ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); process.exit(errs.length ? 1 : 0);
})();
