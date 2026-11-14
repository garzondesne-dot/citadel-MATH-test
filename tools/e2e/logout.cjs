// 🚪 처음 화면으로 (📜 2026-11-13 밤): 학생 캠프 ⚙ 맨 아래 · 교사 「나」 맨 아래 · TV 조작 막대 → 확인 한 번 → 첫 화면 · 뒤로 가기로는 첫 화면까지 안 감 · 이 기기 저장은 그대로
//   NODE_PATH=$(npm root -g) node tools/e2e/logout.cjs <폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a);
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  // ① 학생 캠프 ⚙ → 🚪
  await p.goto(B + '?role=camp&room=LO1'); await p.waitForSelector('.stage');
  await p.evaluate(() => localStorage.setItem('keep-me', '1'));
  await p.click('button.gear'); await p.waitForSelector('button.out'); await p.screenshot({ path: `${SHOTS}/logout-camp-set.png` });
  await p.click('button.out'); await p.waitForTimeout(300); await p.screenshot({ path: `${SHOTS}/logout-camp-confirm.png` });
  await Promise.all([p.waitForNavigation(), p.locator('.pmain:has-text("처음 화면으로")').click()]); await p.waitForTimeout(500);
  const t1 = { url: p.url(), title: !!(await p.$('text=교사 · 종합실')), keep: await p.evaluate(() => localStorage.getItem('keep-me')) };
  log('① 캠프 → 🚪:', JSON.stringify(t1)); if (!t1.title || t1.keep !== '1') errs.push('캠프 → 첫 화면 · 저장 그대로 아님');
  // ② 교사 「나」 → 🚪 · 뒤로 가기 문지기
  await p.goto(B + '?role=teacher'); await p.waitForSelector('.tabs');
  await p.goBack().catch(() => {}); await p.waitForTimeout(500); const stay = /role=teacher/.test(p.url());
  log('② 뒤로 가기 한 번 뒤 그대로 교사 화면:', stay); if (!stay) errs.push('뒤로 가기로 교사 화면을 벗어남');
  await p.click('.tabs button:has-text("나")'); await p.waitForTimeout(300); await p.click('.item[data-k="out"]'); await p.waitForTimeout(300); await p.screenshot({ path: `${SHOTS}/logout-teacher-confirm.png` });
  await Promise.all([p.waitForNavigation(), p.click('button[data-k="out-go"]')]); await p.waitForTimeout(500);
  const t2 = !!(await p.$('text=교사 · 종합실')); log('② 교사 「나」 → 🚪 → 첫 화면:', t2); if (!t2) errs.push('교사 → 첫 화면 아님');
  // ③ TV 🚪 단추 있음
  await p.goto(B + '?role=hall&mode=test&room=LO2'); await p.waitForSelector('.dock'); await p.click('.gear[data-k="tvset"]'); await p.waitForTimeout(200); const tv = !!(await p.$('.setbox button[data-k="out"]')); log('③ TV 🚪 (⚙ 설정 안):', tv); if (!tv) errs.push('TV 🚪 없음');
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
