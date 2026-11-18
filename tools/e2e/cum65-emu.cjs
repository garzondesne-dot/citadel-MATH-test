// 💰 #65 교사 학생 창 · 한눈에 표 「누적 받은 💎 · 📜」 (에뮬레이터): 옛 정식 earned + 옮긴 뒤 log 받은 것 + 받은 선물 + log 없는 한도 안(day − 한도 안 log − 석화) · 학생 화면엔 없음
const { chromium } = require('playwright');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
const T = Date.parse('2026-11-16T10:00:00+09:00');
(async () => {
  const errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  await rest('', 'DELETE');
  // 손 계산: earned 500 + log(raid 12 + streak 5 = 17 · 강화 −40 · 되돌림 120 빼기) + 받은 선물 3 + 석화 4 + (day 11/16 30 − 한도 안 log 12 − 석화 4 = 14) = 538
  //          📜 = scrollEarned 7 + log s 1 + 선물 s 1 + 성채 ✍ 실력 쓰기 1 = 10
  await rest('', 'PATCH', { roster: { '1-3': { 5: '시험오', 6: '시험육' } }, rosterMask: { '1-3': { 5: '시*오', 6: '시*육' } },
    gem: { '1-3': { 5: { total: 120, scroll: 3, earned: 500, scrollEarned: 7, day: { '2026-11-14': 80, '2026-11-16': 30 }, log: {
      raid_old: { g: 9, at: 1794600000000 }, raid_A: { g: 12, at: T }, streak3_x: { g: 5, at: T }, enh_1: { g: -40, at: T }, refund_1: { g: 120, at: T }, s_ph_P_r1: { s: 1, at: T } } },
      6: { total: 40, scroll: 0, earned: 90 } } },
    gifts: { s1_3_5: { t1: { g: 3, at: T, got: true }, t2: { g: 9, at: T }, ult_x: { g: 0, s: 1, at: T, got: true }, petri_1: { g: 4, at: T, got: true } } },
    bonus: { '1-3': { 5: { 'eval-1': { r1: { clear: true, ph2: 'ok', at: T } } } } } });
  const b = await chromium.launch(), p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(`${B}?role=teacher&emu=127.0.0.1`); await p.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(p, '.tabs');
  await p.click('.tabs button:has-text("반")'); await p.waitForTimeout(400); await p.click('.chips button:has-text("1-3")'); await p.waitForTimeout(1500);
  await p.click('.pc:has-text("시험오")'); await p.waitForTimeout(900);
  const g = (await p.textContent('[data-k="gem-cum"]').catch(() => '')).trim(), s = (await p.textContent('[data-k="scroll-cum"]').catch(() => '')).trim();
  ok('학생 창 💎 = 잔액 120 · 누적 받은 💎 538', /💰 누적 538/.test(g), g);
  ok('학생 창 📜 = 누적 받은 📜 10', /💰 누적 10/.test(s), s);
  await p.locator('.ps').screenshot({ path: `${SHOTS}/cum65-sheet.png` });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close(); process.exit(errs.length ? 1 : 0);
})();
