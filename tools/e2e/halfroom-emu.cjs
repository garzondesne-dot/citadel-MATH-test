// 🚨 11/19 ⓪ 반쪽 방(state · meta 없는 rooms/{코드}) 이 있어도 교사 화면 · 교사 캠프가 멈추지 않음 (에뮬레이터)
//   NODE_PATH=$(npm root -g) node tools/e2e/halfroom-emu.cjs <그림 폴더>
const { chromium } = require('playwright');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/', E = 'emu=127.0.0.1';
(async () => {
  await rest('rooms/TEST', 'PUT', { players: { s1_1_3: { n: 1, at: 1 }, s1_1_4: { n: 2, at: 1 } } });
  await rest('rooms/646434', 'PUT', { players: { s1_1_3: { n: 1, at: 1 } } });
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const t = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  t.on('pageerror', (e) => errs.push(String(e)));
  await t.goto(`${B}?role=teacher&${E}`); await t.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(t, '.tabs');
  await t.waitForTimeout(3000);
  const body = await t.textContent('body');
  ok('교사 화면 = 「그리지 못했어요」 없음', !/그리지 못했어요/.test(body));
  await t.screenshot({ path: `${SHOTS}/half-teacher.png` });
  await t.goto(`${B}?role=camp&from=me&${E}`); await t.waitForTimeout(6000);
  ok('교사 캠프 열림', !!(await t.$('.camp')) && !/그리지 못했어요/.test(await t.textContent('body')));
  await t.screenshot({ path: `${SHOTS}/half-camp.png` });
  await t.goto(`${B}?role=tv&${E}`); await t.waitForTimeout(5000);
  ok('종합실 = 「그리지 못했어요」 없음', !/그리지 못했어요/.test(await t.textContent('body')));
  ok('콘솔 오류 0', !errs.some((e) => /step|Error/.test(e)), errs.slice(0, 2).join(' | '));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
