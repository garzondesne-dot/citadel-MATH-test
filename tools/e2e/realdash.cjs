// 🚀 출시 막는 것 4 · 대시보드 = 진짜 기록 (에뮬레이터): 1-3 5번 기록 · 💎 · EXP 를 넣고 → 교사 학생 탭 · 학생 시트 · 대시보드에 그 값 · 기록 없는 학생 = 0 (가짜 값 없음)
const { chromium } = require('playwright');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
const log = (...a) => console.log(...a);
(async () => {
  const errs = [];
  await rest('', 'DELETE');
  await rest('', 'PATCH', {
    roster: { '1-3': { 5: '시험오', 6: '시험육' } }, rosterMask: { '1-3': { 5: '시*오', 6: '시*육' } },
    records: { '1-3': { 5: { 'set-06': { no: 6, conc: { c1: [3, 4], c2: [2, 2] }, names: { c1: '개념가', c2: '개념나' }, boss: 5, bossN: 6, mis: { m1: [2, 1] } } } } },
    gem: { '1-3': { 5: { total: 321, scroll: 7 } } }, xp: { '1-3': { 5: { total: 880 } } },
  });
  const b = await chromium.launch(), p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(`${B}?role=teacher&emu=127.0.0.1`); await p.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(p, '.tabs');
  await p.click('.tabs button:has-text("학생")'); await p.waitForTimeout(400);
  await p.click('.chips button:has-text("1-3")'); await p.waitForTimeout(1500);
  const cards = await p.$$eval('.pc', (xs) => xs.map((x) => x.getAttribute('aria-label')));
  log('명단:', cards.join(' | '));
  await p.click('.pc:has-text("시험오")'); await p.waitForTimeout(500);
  const sheet5 = (await p.textContent('.four')).replace(/\s+/g, ' ');
  log('5번 시트:', sheet5.slice(0, 200));
  const gem5 = await p.$eval('.four', (x) => x.textContent).catch(() => '');
  if (!/321/.test((await p.textContent('body')))) errs.push('5번 💎 321 안 보임');
  if (!cards.some((c) => /시험오/.test(c) && /Lv\.(\d+)/.test(c) && !/Lv\.1\b/.test(c))) errs.push('5번 EXP 880 → 레벨이 1 보다 커야 함');
  await p.screenshot({ path: `${SHOTS}/realdash-5.png` });
  await p.click('.hd .x'); await p.waitForTimeout(300);
  await p.click('.pc:has-text("시험육")'); await p.waitForTimeout(500);
  const sheet6 = (await p.textContent('.four')).replace(/\s+/g, ' ');
  log('6번 시트(기록 없음):', sheet6.slice(0, 200));
  if (!/0\s*\/\s*1차시|수업 참여 0/.test(sheet6)) errs.push('6번 = 기록 없음이어야 함(가짜 값?)');
  await p.click('.hd .x'); await p.waitForTimeout(300);
  await p.click('.seg button:has-text("대시보드")'); await p.waitForTimeout(800);
  await p.screenshot({ path: `${SHOTS}/realdash-board.png` });
  log('대시보드:', (await p.textContent('main')).replace(/\s+/g, ' ').slice(0, 220));
  await b.close();
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0');
})();
