// 📜 #36 반별 진도: 교사 수업 탭 차시 카드 「✔ 날짜」(held + 그 반 수업 기록 날짜) · 앞 차시를 안 했으면 열기 확인 창 「⚠ n반은 n차시를 아직 안 했어요」(막지 않음)
//   NODE_PATH=$(npm root -g) node tools/e2e/held36.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const t = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); t.on('pageerror', (e) => errs.push(String(e)));
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tp');
  const set = (p, v) => t.evaluate(([p, v]) => window.__dbSet(p, v), [p, v]);
  await set('held/1-3/set-08', true); await set('held/1-3/set-09', true);
  await set('records/1-3/1/set-09', { at: Date.UTC(2026, 10, 16, 2, 50), code: 'X', no: 9, mons: {} });
  await t.click('.tabs button:has-text("수업")').catch(() => {}); await t.waitForTimeout(300);
  await t.click('[data-cls="1-3"]'); await t.waitForTimeout(700);
  const tag9 = await t.$eval('.pk3 [data-no="9"] [data-k="held"]', (e) => e.textContent).catch(() => ''), tag8 = await t.$eval('.pk3 [data-no="8"] [data-k="held"]', (e) => e.textContent).catch(() => ''), tag10 = await t.$('.pk3 [data-no="10"] [data-k="held"]');
  ok('9차시 카드 = 「✔ 11/16」 · 8차시 = 「✔」 · 10차시 = 없음', tag9.trim() === '✔ 11/16' && tag8.trim() === '✔' && !tag10, `${tag9} | ${tag8}`);
  await t.screenshot({ path: `${SHOTS}/held36-cards.png` });
  await t.click('.pk3 [data-no="8"]'); await t.waitForTimeout(200); await t.click('[data-k="open-go"]'); await t.waitForTimeout(400);
  const pm = await t.$eval('[data-k="prev-miss"]', (e) => e.textContent).catch(() => '');
  ok('8차시 열기 = 「⚠ 1-3반은 7차시를 아직 안 했어요 · 그대로 열까요?」 (열기 단추 그대로)', /1-3반은 7차시를 아직 안 했어요/.test(pm) && !!(await t.$('[data-k="open-yes"]')), pm.trim());
  await t.screenshot({ path: `${SHOTS}/held36-ask.png` });
  await t.click('.sheet .btn2').catch(() => {}); await t.waitForTimeout(300);
  await t.click('.pk3 [data-no="10"]'); await t.waitForTimeout(200); await t.click('[data-k="open-go"]'); await t.waitForTimeout(400);
  ok('10차시 열기 = 앞 차시(9) 했음 → 안내 없음', !(await t.$('[data-k="prev-miss"]')));
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
