// ❤ 하트 · ⚡ 기력 · 🔥 재도전 판 화면 (📜 2026-11-13 밤 · 베타 v4): 공격 갤러리(학생 화면과 같은 Student) · Pixel 7 세로
//   ① 풀 때 = 노란 단추 오른쪽 ❤ 4 ② 🙋 ❤ 0 잠김 ③ 다 맞힘 → ⚡ 기술 카드 3장 + 설명 + 그만하기 ④ ⚡ 쓰면 🔥 재도전 판(⚡ + 🔒) ⑤ 그만하기 → 🔥 이어서
//   NODE_PATH=$(npm root -g) node tools/e2e/hearts.cjs <폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch(), errs = [];
  const s = await (await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 })).newPage();
  s.on('pageerror', (e) => errs.push(String(e)));
  await s.goto('http://localhost:4173/?role=atk'); await s.waitForSelector('.qwrap .bcard'); await s.click('.tabs2 button:has-text("용사 fx")'); await s.waitForTimeout(500);
  const shot = (n) => s.screenshot({ path: `${SHOTS}/hearts-${n}.png` });
  const main = () => s.$eval('.pmain', (x) => x.innerText.replace(/\s+/g, ' ').trim()).catch(() => '');
  const st = {};
  st.solve = await s.$eval('.pmain', (x) => x.getAttribute('aria-label') || x.innerText).catch(() => ''); await shot('1-solve');
  await s.click('.ids .a[data-h="clear"]'); await s.waitForTimeout(1800);
  st.cards = await s.$$eval('.cards .card', (x) => x.map((e) => `${e.dataset.sk}${e.disabled ? '✗' : ''}`).join(' ')); st.main3 = await main(); await s.evaluate(() => document.querySelector('.cards')?.scrollIntoView({ block: 'center' })); await s.waitForTimeout(200); await shot('2-cards');
  await s.click('.pmain:not([disabled])'); await s.waitForTimeout(800);
  st.round = await s.$eval('.qwrap .bad', (x) => x.innerText.replace(/\s+/g, ' ')).catch(() => ''); await shot('3-round');
  const stop = await s.$('button.stop'); if (stop) { await stop.click(); await s.waitForTimeout(400); }
  st.cont = await main(); await shot('4-continue');
  console.log(`풀 때 「${st.solve}」 · 카드 ${st.cards} · 노란 단추 「${st.main3}」 → 재도전 「${st.round}」  → 그만하기 뒤 「${st.cont}」`);
  if (!/bind/.test(st.cards)) errs.push('카드'); if (!/재도전 판/.test(st.round)) errs.push('재도전 판'); if (!/🔒/.test(st.cont)) errs.push('이어서 🔒'); if (!/이어서/.test(st.cont)) errs.push('이어서');
  // 🙋 ❤ 0 (소레이드 쪽 갤러리 방)
  const ch = await s.$('.hrow input[type=checkbox], .chainT'); void ch;
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
