// 📖 #49 기호 톡 명제 단원: 🎯 허수아비 9차시 👑 형성평가 재대결 = 문제 글의 명제 · 반례 · 역 · 대우 형광펜 · 누르면 말풍선 문구 · 집합 차시엔 안 붙음
//   NODE_PATH=$(npm root -g) node tools/e2e/symprop49.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + '?role=camp&room=SY49'); await p.waitForSelector('.stage');
  const open = async (lid, mid) => { await p.click('.prop[aria-label="🎯 허수아비"]'); await p.waitForSelector('[data-k="dummy-list"]'); await p.waitForTimeout(300); await p.$eval(`[data-lesson="${lid}"] li[data-mid="${mid}"] .go`, (e) => e.click()); await p.waitForSelector('.drun', { timeout: 15000 }); await p.waitForTimeout(2500); };
  await open('set-09', 'boss');
  const words = [];
  for (let k = 1; k <= 4; k++) { await p.click(`.row .cell:nth-child(${k})`).catch(() => {}); await p.waitForTimeout(400); words.push(...(await p.$$eval('.sy', (es) => es.map((e) => e.textContent.trim())))); }
  await p.click('.row .cell:nth-child(4)').catch(() => {}); await p.waitForTimeout(400);
  ok('9차시 형성평가 = 명제 · 반례 · 역 · 대우 형광펜', ['명제', '반례', '역', '대우'].every((w) => words.includes(w)), words.join(' '));
  const t = await p.$('.sy:text-is("대우")'); if (t) { await t.scrollIntoViewIfNeeded(); await t.click(); await p.waitForTimeout(500); }
  const sheet = (await p.textContent('body')) || '';
  ok('대우 누름 = 「앞뒤를 바꾸고 둘 다 뒤집은 말」', /앞뒤를 바꾸고 둘 다 뒤집은 말/.test(sheet) && /원래 명제와 참 · 거짓이 같음/.test(sheet));
  await p.screenshot({ path: `${SHOTS}/symprop49-09.png` });
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
