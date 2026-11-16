// 🚨 대기실 안 들어온 학생 = 학생 창(결석 표시 · 🔑 0000) (📜 2026-11-16 핫픽스 정식 b211) — NODE_PATH=$(npm root -g) node tools/e2e/pwlobby.cjs [주소]
const { chromium } = require('playwright');
const B = process.argv[2] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t} ${d}`); if (!c) errs.push(t); };
  const t = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); t.on('pageerror', (e) => errs.push(String(e)));
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tp');
  if (await t.$('[data-cls="1-3"]')) await t.click('[data-cls="1-3"]'); else { await t.click('text=다른 반'); await t.click('.sheet .pk:has-text("1-3반")'); }
  await t.evaluate(() => window.__dbSet('accounts/1-3/5', { pw: '1234', at: 1 }));
  await t.click('.pk:has-text("6차시")'); await t.click('.tact .btn'); await t.click('[data-k="open-yes"]'); await t.waitForSelector('.nums');
  await t.click('.n[data-n="5"]'); await t.waitForTimeout(400);
  ok('대기실 · 안 들어온 학생 누름 = 학생 창 (결석 표시 · 🔑 0000)', !!(await t.$('[data-k="pw0"]')) && !!(await t.$('.sheet button:has-text("결석 표시")')));
  ok('🔑 0000 단추 켜짐', !(await t.$eval('[data-k="pw0"]', (e) => e.disabled)));
  await t.click('[data-k="pw0"]'); await t.click('[data-k="pwgo"]'); await t.waitForTimeout(300);
  ok('0000 으로 바뀜 (안 들어온 학생)', (await t.evaluate(() => window.__dbGet('accounts/1-3/5/pw'))) === '0000');
  await t.click('.sheet button:has-text("결석 표시")'); await t.waitForTimeout(300);
  const code = await t.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.endsWith('|school/live')) return JSON.parse(localStorage.getItem(k)).code; });
  ok('창의 결석 표시 = 결석', !!(await t.evaluate((c) => window.__dbGet(`rooms/${c}/absent/s1_3_5`), code)));
  console.log(errs.length ? `❌ ${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
