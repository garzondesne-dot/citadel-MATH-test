// 💬 마지막 한마디 모아 보기 (에뮬레이터 · 정식 dash.js #sv-words 그대로): 수업 방 words · 반 거르기 · 거른 말(bad) 빼기 · 차시 표시
const { chromium } = require('playwright');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
(async () => {
  const errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  await rest('', 'DELETE');
  await rest('', 'PATCH', { roster: { '1-3': { 3: '시험삼' }, '1-4': { 3: '시험사' } }, rosterMask: { '1-3': { 3: '시*삼' }, '1-4': { 3: '시*사' } },
    rooms: { R1: { meta: { cls: '1-3', lesson: 'set-06' }, words: { a: { t: '재밌었어요' }, b: { t: '나쁜 말', bad: true } } }, R2: { meta: { cls: '1-4', lesson: 'set-05' }, words: { c: { t: '다른 반 말' } } } } });
  const b = await chromium.launch(), p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(`${B}?role=teacher&emu=127.0.0.1`); await p.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(p, '.tabs');
  await p.click('.tabs button:has-text("학생")'); await p.waitForTimeout(400); await p.click('.chips button:has-text("1-3")'); await p.waitForTimeout(1000);
  await p.click('.seg button:has-text("대시보드")'); await p.waitForTimeout(600); await p.click('.grp button:has-text("기록 남기기")'); await p.waitForTimeout(300); await p.click('.vws button:has-text("설문")'); await p.waitForTimeout(800);
  await p.click('[data-k="sv-words"] button'); await p.waitForTimeout(1200);
  const li = await p.$$eval('[data-k="sv-words"] li', (x) => x.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  ok('1-3 = 「재밌었어요」 하나 (거른 말 · 다른 반 빠짐) · 6차시', li.length === 1 && /1-3 · 6차시 재밌었어요/.test(li[0]), li.join(' | '));
  await p.screenshot({ path: `${SHOTS}/words.png`, fullPage: true });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
