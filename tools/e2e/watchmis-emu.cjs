// 👀 주의 학생 · 🔎 오개념 (에뮬레이터 · 📜 2026-11-15 머리 🔨 (c)): 정식 5 기준 · 오개념 = 수업 + 성채(eval-) · 허수아비 빼기
const { chromium } = require('playwright');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
(async () => {
  const errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  await rest('', 'DELETE');
  await rest('', 'PATCH', {
    roster: { '1-3': { 5: '시험오', 6: '시험육', 7: '시험칠' } }, rosterMask: { '1-3': { 5: '시*오', 6: '시*육', 7: '시*칠' } },
    records: { '1-3': {
      5: { 'set-06': { no: 6, conc: { c1: [1, 4] }, boss: 1, bossN: 4, mis: { M01: [3, 1] } } },
      6: { 'set-05': { no: 5, conc: { c1: [1, 4] }, boss: 6, bossN: 6, fixed: 4 }, 'set-06': { no: 6, conc: { c1: [1, 4] }, boss: 6, bossN: 6, fixed: 3 } },
      7: { 'set-05': { no: 5, conc: { c1: [4, 4] }, boss: 4, bossN: 4 }, 'set-06': { no: 6, conc: { c1: [4, 4] }, boss: 4, bossN: 4 } } } },
    bonus: { '1-3': { 5: { 'eval-1': { r1: { tries: 1, mis: { M01: [1, 1] } } } }, 6: { 'eval-1': { r1: { tries: 2 } } }, 7: { 'set-06': { u1: { tries: 1, mis: { M03: [5, 0] } } } } } },
  });
  const b = await chromium.launch(), p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(`${B}?role=teacher&emu=127.0.0.1`); await p.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(p, '.tabs');
  await p.click('.tabs button:has-text("학생")'); await p.waitForTimeout(400); await p.click('.chips button:has-text("1-3")'); await p.waitForTimeout(1200);
  await p.click('.seg button:has-text("대시보드")'); await p.waitForTimeout(800);
  await p.click('.grp button:has-text("누가 도움이")'); await p.waitForTimeout(300); await p.click('.vws button:has-text("주의 학생")'); await p.waitForTimeout(800);
  const w = await p.$$eval('.list .dl', (x) => x.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  ok('👀 주의 학생 = 오 (불참 · 형성평가 · 첫 시도) · 육 (🔍 고침 패턴) · 칠 없음', w.length === 2 && /시험오.*최근 불참: 5차시.*형성평가 평균 25%/.test(w.join('|')) && /시험육.*🔍 고침 패턴.*고친 7개/.test(w.join('|')) && !/시험칠/.test(w.join('|')), w.join(' | '));
  await p.screenshot({ path: `${SHOTS}/watch.png`, fullPage: true });
  await p.click('.grp button:has-text("우리 반 어때")'); await p.waitForTimeout(300); await p.click('.vws button:has-text("오개념")'); await p.waitForTimeout(800);
  const t = await p.$$eval('tbody tr', (x) => x.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  ok('🔎 오개념 = M01 4번 · 1명 · 바로잡음 50% · 허수아비 M03 빠짐', t.length === 1 && /M01.*4.*1명.*50%/.test(t[0]), t.join(' | '));
  await p.screenshot({ path: `${SHOTS}/mis.png`, fullPage: true });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
