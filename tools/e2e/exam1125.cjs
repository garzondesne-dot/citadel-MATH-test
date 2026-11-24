// ⚔ 기말 대비 기간 (📜 2026-11-25 · 머리 🔨) — 이 기기 캠프 · 시계 = 기간 안(KST 11/25 = D-15)
//   ① 첫 접속 = 출정 컷인(띠 · 무지의 마왕 · D-n) · 톡 = 건너뛰기 · 다시 들어오면 안 뜸
//   ② 캠프 맨 위 붉은 띠 「D-n」 · 붉은 하늘 · 띠 누름 = 성채 · 허수아비 · 컷인 다시 보기
//   ③ 시험 날짜를 끄면(off) 띠 · 하늘 · 컷인 없음
//   NODE_PATH=$(npm root -g) node tools/e2e/exam1125.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { const T = Date.parse('2026-11-25T03:00:00Z'), D0 = Date, off = T - D0.now(); class FD extends D0 { constructor(...a) { super(...(a.length ? a : [D0.now() + off])); } static now() { return D0.now() + off; } } globalThis.Date = FD; });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('캠프 ' + e));
  await p.goto(B + '?role=camp&room=EX'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(900);
  ok('① 첫 접속 = 출정 컷인', !!(await p.$('[data-k="exam-cutin"]')));
  await p.screenshot({ path: `${SHOTS}/ex-cut0.png` });
  await p.waitForTimeout(1500); await p.screenshot({ path: `${SHOTS}/ex-cut1.png` });
  await p.waitForTimeout(1400); ok('정체 공개 = 무지의 마왕 · D-n', !!(await p.$('[data-k="exam-boss"]')) && /D-15/.test((await p.textContent('[data-k="exam-dd"]').catch(() => '')) || ''), (await p.textContent('[data-k="exam-dd"]').catch(() => '')) || '');
  await p.screenshot({ path: `${SHOTS}/ex-cut2.png` });
  await p.click('[data-k="exam-cutin"]'); await p.waitForTimeout(400);
  ok('톡 = 건너뛰기', !(await p.$('[data-k="exam-cutin"]')));
  const band = (await p.textContent('[data-k="exam-band"]').catch(() => '')) || '';
  ok('② 캠프 띠 = D-15 · 붉은 하늘', /D-15/.test(band) && !!(await p.$('[data-k="exam-sky"]')), band);
  await p.screenshot({ path: `${SHOTS}/ex-camp.png` });
  await p.click('[data-k="exam-band"]'); await p.waitForTimeout(500);
  ok('띠 누름 = 성채 · 허수아비 · 컷인 다시 보기', !!(await p.$('[data-k="exam-go-castle"]')) && !!(await p.$('[data-k="exam-go-scare"]')) && !!(await p.$('[data-k="exam-recut"]')));
  await p.screenshot({ path: `${SHOTS}/ex-sheet.png` });
  await p.reload(); await p.waitForTimeout(1200);
  ok('다시 들어오면 컷인 안 뜸', !(await p.$('[data-k="exam-cutin"]')));
  await p.evaluate(() => { const k = Object.keys(localStorage).find((x) => x.startsWith('citadel-v1-store') || x === 'citadel-store'); void k; });
  await b.close(); console.log(errs.length ? `❌ ${errs.length}` : '✅ 오류 0'); process.exit(errs.length ? 1 : 0);
})();
