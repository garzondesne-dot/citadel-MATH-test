// 📊 반 통계 = 수업에서 연 칸만 (에뮬레이터 · b199): 1-2 6차시 기록(형성평가 안 함) → 대시보드 한눈에 표 「— 수업 안 함」
//   → 📊 통계에 넣는 칸 → 6차시 형성평가 「통계에 넣기」 → 점수로 보임 → 다시 누르면 자동(빠짐) · 🎯 허수아비 = 학생 시트 한 줄
const { chromium } = require('playwright');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/', E = 'emu=127.0.0.1';
const rec = (bossM, boss) => ({ at: 1, code: 'a', no: 6, mons: { m1: 'o', m2: 'o', m3: 'x', u4: 'o', u5: 'n', u6: 'n', u7: 'n' }, bossM, boss, bossN: 6, conc: { c1: [1, 1], c2: [1, 1], c3: [0, 1], c4: [3, 4] } });
(async () => {
  await rest('', 'DELETE');
  await rest('', 'PATCH', { roster: { '1-2': { 1: '시험일', 2: '시험이' } }, rosterMask: { '1-2': { 1: '시*일', 2: '시*이' } }, records: { '1-2': { 1: { 'set-06': rec('nnnnnn', 0) }, 2: { 'set-06': rec('nnnnnn', 0) } } }, bonus: { '1-2': { 2: { 'set-06': { boss: { tries: 1 } } } } } });
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a);
  const t = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); t.on('pageerror', (e) => errs.push(String(e)));
  await t.goto(`${B}?role=teacher&${E}`); await t.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(t, '.tabs');
  await t.click('.tabs button:has-text("학생")'); await t.waitForTimeout(400); await t.click('.chips button:text-is("1-2")').catch(() => {}); await t.waitForTimeout(300);
  await t.click('.seg button:has-text("대시보드")'); await t.waitForTimeout(600);
  const cell = async () => t.$$eval('.dash tbody tr', (rs) => rs.map((r) => [...r.querySelectorAll('td')].map((d) => d.textContent.trim()).join(' | ')));
  const c0 = await cell(); log('① 한눈에 표 (1-2 · 형성평가 자동 빠짐):', JSON.stringify(c0)); if (!c0.every((r) => r.includes('— 수업 안 함'))) errs.push('수업 안 함 표시');
  await t.screenshot({ path: `${SHOTS}/stats-grid.png` });
  await t.click('[data-k="stats-pick-go"]'); await t.waitForSelector('[data-k="stats-pick"]'); await t.click('[data-k="stats-pick"] [data-cls="1-2"]'); await t.click('[data-k="stats-pick"] [data-lesson="set-06"]'); await t.waitForTimeout(300);
  const cells = await t.$$eval('[data-k="stats-pick"] [data-cell]', (x) => x.map((e) => `${e.dataset.cell}:${e.getAttribute('aria-checked')}`)); log('② 칸 스위치:', cells.join(' '));
  await t.screenshot({ path: `${SHOTS}/stats-pick.png` });
  await t.click('[data-k="stats-pick"] [data-cell="boss"]'); await t.waitForTimeout(800);
  log('   서버 statsPick', JSON.stringify(await rest('school/statsPick/1-2/set-06')));
  await t.click('.sheet .x'); await t.waitForTimeout(500);
  const c1 = await cell(); log('③ 형성평가 「통계에 넣기」 뒤:', JSON.stringify(c1)); if (!c1.some((r) => r.includes('0/6'))) errs.push('넣기 뒤 점수');
  await t.click('[data-k="stats-pick-go"]'); await t.click('[data-k="stats-pick"] [data-lesson="set-06"]'); await t.click('[data-k="stats-pick"] [data-cell="boss"]'); await t.waitForTimeout(600); await t.click('.sheet .x'); await t.waitForTimeout(400);
  log('④ 다시 누름 → 자동으로(서버 칸 지움)', JSON.stringify(await rest('school/statsPick/1-2/set-06')), '| 표', JSON.stringify(await cell()));
  await t.click('.seg button:has-text("명단")'); await t.waitForTimeout(300); await t.click('.pc[aria-label^="2번"]').catch(() => {}); await t.waitForTimeout(500);
  const dl = await t.$eval('[data-k="dummy-line"]', (x) => x.textContent.trim()).catch(() => ''); log('⑤ 학생 시트 🎯 줄:', dl); if (!/허수아비/.test(dl)) errs.push('허수아비 줄');
  await t.screenshot({ path: `${SHOTS}/stats-pupil.png` });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
