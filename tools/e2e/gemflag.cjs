// 🚩 💎 급증 (에뮬레이터): 교사 학생 탭 = 사진 → 정상 벌이(day 늘어남) = 🚩 없음 → 기록 없이 +500 = 🚩(카드 · 시트 한 줄) → 「확인함」 = 끔 · 💎 는 그대로
const { chromium } = require('playwright');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
const log = (...a) => console.log(...a);
(async () => {
  const errs = [];
  await rest('', 'DELETE');
  await rest('', 'PATCH', { roster: { '1-3': { 5: '시험오', 6: '시험육' } }, rosterMask: { '1-3': { 5: '시*오', 6: '시*육' } }, gem: { '1-3': { 5: { total: 100, day: { '2026-11-14': 40 } }, 6: { total: 50 } } } });
  const b = await chromium.launch(), p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(`${B}?role=teacher&emu=127.0.0.1`); await p.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(p, '.tabs');
  await p.click('.tabs button:has-text("학생")'); await p.waitForTimeout(400); await p.click('.chips button:has-text("1-3")'); await p.waitForTimeout(1500);
  const seen = await rest('school/gemSeen/1-3'); log('① 사진:', JSON.stringify(Object.keys(seen || {})));
  if (!seen?.[5] || seen[5].t !== 100) errs.push('사진');
  await rest('gem/1-3/5', 'PATCH', { total: 180, day: { '2026-11-14': 40, '2026-11-15': 80 } }); await p.waitForTimeout(1500);
  const f1 = await rest('school/gemFlag/1-3/5'); log('② 정상 벌이 +80 → 🚩', !!f1); if (f1) errs.push('정상 벌이에 🚩');
  await rest('gem/1-3/6/total', 'PUT', 550); await p.waitForTimeout(1500);
  const f2 = await rest('school/gemFlag/1-3/6'), card = await p.$eval('.pc:has-text("시험육")', (x) => x.textContent).catch(() => '');
  log('③ 기록 없이 +500 → 🚩', !!f2, '| 설명 안 됨', f2?.extra, '| 카드', card.includes('🚩')); if (!f2 || !card.includes('🚩')) errs.push('🚩 안 뜸');
  await p.click('.pc:has-text("시험육")'); await p.waitForTimeout(400);
  const line = await p.$eval('[data-k="gem-flag"]', (x) => x.textContent).catch(() => ''); log('   시트 한 줄:', line.replace(/\s+/g, ' ').trim());
  await p.screenshot({ path: `${SHOTS}/gemflag-sheet.png` });
  await p.click('[data-k="gem-flag"] button'); await p.waitForTimeout(800);
  const f3 = await rest('school/gemFlag/1-3/6'), g6 = await rest('gem/1-3/6/total'); log('④ 확인함 → 🚩', !!f3, '| 💎 그대로', g6);
  if (f3 || g6 !== 550 || !line) errs.push('확인함');
  await b.close();
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0');
})();
