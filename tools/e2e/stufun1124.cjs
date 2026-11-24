// 🐞 #16 (📜 2026-11-24 「학생폰 기준으로 쉼터 게임 못 골라」): 🎒 학생 폰 테스트 = 🏕 → 「놀이 고르기(선생님 대신)」 → 🥏 알까기 → 폰 🙋 참가 · 🤖 참가 → 「▶ 🥏 출발 n명」 → 판 시작
//   NODE_PATH=$(npm root -g) node tools/e2e/stufun1124.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const t = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); t.on('pageerror', (e) => errs.push(String(e)));
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tp');
  await t.click('.tabs button:has-text("수업")'); await t.waitForTimeout(300);
  await t.click('[data-cls="test"]'); await t.click('.pk3 [data-no="6"]'); await t.click('[data-mode="stu"]'); await t.click('[data-k="open-go"]'); await t.click('[data-k="open-yes"]');
  await t.waitForSelector('[data-k="stutry"]');
  await t.click('[data-k="try-next"]'); await t.waitForTimeout(700);
  await t.click('[data-k="try-rest"]'); await t.waitForTimeout(500);
  ok('🏕 → 「놀이 고르기(선생님 대신)」 창', !!(await t.$('[data-k="try-games"]')));
  ok('창에 🥏 알까기', !!(await t.$('[data-k="try-game-ak"]')));
  await t.click('[data-k="try-game-ak"]'); await t.waitForTimeout(800);
  ok('고르면 창 닫힘', !(await t.$('[data-k="try-games"]')));
  await t.waitForSelector('[data-k="ak-join"]', { timeout: 10000 }).catch(() => {});
  const j = await t.$('[data-k="ak-join"]'); ok('폰 = 🙋 참가 단추 (실제처럼 모이기)', !!j); if (j) await j.click();
  await t.waitForTimeout(4000);
  const go = await t.$('[data-k="try-go"]'); const gt = go ? await go.textContent() : '없음';
  ok('진행 막대 「다음 ▶」 자리 = 「▶ 🥏 출발 n명」', /🥏 출발 \d+명/.test(gt), gt);
  await t.screenshot({ path: `${SHOTS}/stufun-join.png` });
  if (go) await go.click();
  await t.waitForSelector('[data-k="ak-board"]', { timeout: 10000 }).catch(() => {});
  ok('▶ 출발 → 알까기 판', !!(await t.$('[data-k="ak-board"]')));
  await t.waitForTimeout(1500); ok('판 시작 뒤 = 다시 「다음 ▶」', !!(await t.$('[data-k="try-next"]')));
  await t.screenshot({ path: `${SHOTS}/stufun-play.png` });
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close(); process.exit(errs.length ? 1 : 0);
})();
