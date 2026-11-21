// ⛺ 교사 「내 캠프」 세 길 (📜 2026-11-17 #18 🐞 「교사 내 캠프 안 들어가짐」 · 에뮬레이터)
//   ① 교사 폰 「나」 → ⛺ 내 캠프 = 학생 캠프 화면 ② 종합실 TV 수업 중 ⚙ → ⛺ 교사 캠프 = 새 창 링크(?role=camp&from=me · #21 C 뒤) ③ 차시 정한 종합실 = 입장 대기 화면
//   NODE_PATH=$(npm root -g) node tools/e2e/tcampgo-emu.cjs <폴더> [주소]
const { chromium } = require('playwright');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/', E = 'emu=127.0.0.1';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  // ① 교사 폰 「나」
  const t = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); t.on('pageerror', (e) => errs.push('폰 ' + String(e)));
  await t.goto(`${B}?role=teacher&${E}`); await t.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(t, '.tabs');
  await t.goto(`${B}?role=teacher&tab=me&${E}`); await t.waitForSelector('.item:has-text("내 캠프")', { timeout: 20000 });
  await t.click('.item:has-text("내 캠프")'); await t.waitForSelector('.camp', { timeout: 20000 }).catch(() => {}); await t.waitForTimeout(1500);
  const c1 = await t.evaluate(() => ({ camp: !!document.querySelector('.camp'), url: location.search, txt: document.body.innerText.slice(0, 120) }));
  ok('① 교사 폰 「나」 → ⛺ 내 캠프 = 캠프 화면', c1.camp, JSON.stringify(c1));
  await t.screenshot({ path: `${SHOTS}/tcampgo-1.png` });
  // ③ 수업 없는 종합실 = 교사 캠프
  const h = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); h.on('pageerror', (e) => errs.push('TV ' + String(e)));
  await h.goto(`${B}?role=hall&mode=test&lesson=set-05&room=TCG`); await h.waitForSelector('.dock', { timeout: 20000 }); await h.waitForTimeout(1200);
  ok('③ 차시 정한 종합실 시작 = 입장 대기 화면 (#21 C)', !!(await h.$('.entry')) && !(await h.$('.campv')));
  // ② 수업 중 ⚙ → ⛺ 교사 캠프 새 창 링크 (TV 교사 캠프 화면 없앰 · 📜 11/17 #21 C)
  await h.click('.dock .go'); await h.waitForTimeout(1200); await h.evaluate(() => window.__tvFake?.(3)); await h.click('.dock .go').catch(() => {}); await h.waitForTimeout(1200);
  const inLesson = !(await h.$('.campv'));
  ok('   수업 시작 → 교사 캠프 아님', inLesson);
  await h.click('.gear[data-k="tvset"]'); await h.waitForTimeout(300);
  const m = await h.$eval('.setbox a[data-k="tvcamp"]', (a) => ({ href: a.getAttribute('href'), tgt: a.target, txt: a.textContent.trim() })).catch(() => null);
  ok('② ⚙ 에 ⛺ 교사 캠프 (새 창 · 학생 캠프와 같게)', !!m && /role=camp/.test(m.href) && /from=me/.test(m.href) && m.tgt === '_blank', JSON.stringify(m));
  await h.screenshot({ path: `${SHOTS}/tcampgo-2.png` });
  await h.keyboard.press('Escape'); await h.click('.gear[data-k="tvset"]').catch(() => {}); await h.waitForTimeout(300);
  ok('   메뉴 닫은 뒤에도 수업 화면', !(await h.$('.campv')));
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
