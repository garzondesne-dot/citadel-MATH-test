// 👤 학생 시트 (에뮬레이터 · 머리 ③ (가)~(라)): 가짜 기록 글 = 서버에서 안 보임 · 차시별 개념 기록 · 제출률 · 방과후 달력 = 실제 · 💎 조각 주기 = 1~5 + 이유 한 줄 → 우편함 선물 이름 「👩‍🏫 이유」
const { chromium } = require('playwright');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
const pad = (n) => String(n).padStart(2, '0'), ymd = (t) => { const d = new Date(t + 9 * 3600e3); return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`; };
(async () => {
  const errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  await rest('', 'DELETE');
  await rest('', 'PATCH', { roster: { '1-3': { 5: '시험오' } }, rosterMask: { '1-3': { 5: '시*오' } },
    records: { '1-3': { 5: { 'set-06': { no: 6, at: Date.UTC(2026, 10, 12), conc: { c1: [3, 4], c2: [1, 4] }, names: { c1: '드모르간', c2: '원소의 개수' }, boss: 4, bossN: 6, mons: { m1: 'o', m2: 'x', m3: '-', u4: 'n' }, fixed: 2 } } } },
    act: { '1-3': { [ymd(Date.now() - 864e5)]: { 5: { r: 3, v: 1 } } } } });
  const b = await chromium.launch(), p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(`${B}?role=teacher&emu=127.0.0.1`); await p.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(p, '.tabs');
  await p.click('.tabs button:has-text("학생")'); await p.waitForTimeout(400); await p.click('.chips button:has-text("1-3")'); await p.waitForTimeout(1200);
  await p.click('.pc:has-text("시험오")'); await p.waitForTimeout(800);
  const txt = (await p.textContent('.ps')).replace(/\s+/g, ' ');
  ok('(가) 서버 = 「가짜 기록」 글 없음', !/가짜 기록/.test(txt));
  ok('(나) 차시별 개념 기록', /6차시.*드모르간 3\/4.*원소의 개수 1\/4/.test((await p.textContent('[data-k="pupil-hist"]').catch(() => '')).replace(/\s+/g, ' ')));
  ok('(다) 제출률 = 연 몬스터 3 중 낸 2 = 67% · 달력 = 활동 1일', /제출률 67%/.test(txt) && (await p.$$eval('.cal i:not(.l0)', (x) => x.length)) === 1, (txt.match(/제출률 \d+%/) || [''])[0]);
  await p.screenshot({ path: `${SHOTS}/pupilsheet.png`, fullPage: true });
  await p.click('.acts button:has-text("조각 주기")'); await p.waitForTimeout(300);
  ok('(라) 이유 없으면 못 줌', await p.$eval('[data-k="gem-give"] .b1', (e) => e.disabled));
  await p.click('[data-k="gem-give"] .amt button:has-text("5")'); await p.fill('[data-k="gem-give"] .why', '친구에게 풀이를 설명함'); await p.click('[data-k="gem-give"] .b1'); await p.waitForTimeout(800);
  const g = Object.values((await rest('gifts/s1_3_5')) || {});
  ok('(라) 💎 5 · 「👩‍🏫 친구에게 풀이를 설명함」 선물', g.length === 1 && g[0].g === 5 && g[0].fun === '👩‍🏫 친구에게 풀이를 설명함', JSON.stringify(g.map((x) => [x.g, x.fun])));
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
