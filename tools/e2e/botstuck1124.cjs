// 🙋 (📜 11/24 🔨 #11 · DECISIONS 21ba851): 🧪 테스트 모드 교사 판 가상 학생 = 몬스터마다 1 ~ 2명이 기회를 다 틀려 막힘 → 리모컨 빨간 도움 요청(⚔ 보급 반짝)
//   → 선생님이 보급 = 그 친구가 다시 풀어 다 맞힘 · 막힌 친구가 있는 동안 몬스터 체력이 남음
//   NODE_PATH=$(npm root -g) node tools/e2e/botstuck1124.cjs <폴더> [주소]
const { chromium } = require('playwright');
const { testOpen } = require('./_cls.cjs');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const t = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); t.on('pageerror', (e) => errs.push('리모컨 ' + e));
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tp'); await t.evaluate(() => { window.__botSpeed = 6; });
  await testOpen(t, { no: 6, mode: 'remote', bots: 5 }); await t.waitForSelector('[data-k="bots"]');
  await t.waitForTimeout(1500); await t.click('.tact .btn'); await t.waitForTimeout(800); // ▶ 수업 시작
  for (let i = 0; i < 12; i++) { const m = (await t.textContent('.tact .btn')).trim(); if (/지금 등장/.test(m)) { await t.click('.tact .btn'); break; } await t.click('.tact .btn'); await t.waitForTimeout(600); }
  log('  단계 ·', (await t.textContent('.rfcap b')).trim());
  let hot = null; for (let i = 0; i < 90 && !hot; i++) { await t.waitForTimeout(1000); if (await t.$('[data-k="heal-first"].hot')) hot = await t.getAttribute('[data-k="heal-first"]', 'aria-label'); }
  ok('가상 친구가 막힘 = 리모컨 ⚔ 보급 반짝 (도움 요청)', !!hot, hot || '90초 안에 없음');
  const live = await t.evaluate(() => window.__dbGet('school/live')), R0 = await t.evaluate((c) => window.__dbGet(`rooms/${c}`), live.code);
  ok('막힌 친구가 있는 동안 몬스터는 살아 있음', !!R0 && !(R0.state?.down), '');
  await t.screenshot({ path: `${SHOTS}/botstuck-help.png` });
  if (hot) {
    const name = (hot.match(/·🤖(\S+)/) || [])[1] || ''; await t.click('[data-k="heal-first"]');
    let fixed = false; for (let i = 0; i < 40 && !fixed; i++) { await t.waitForTimeout(1000); fixed = await t.evaluate((nm) => [...document.querySelectorAll('.nums .n')].some((e) => (e.getAttribute('aria-label') || '').includes(nm) && /다 맞힘/.test(e.getAttribute('aria-label') || '')), name); }
    ok(`보급 뒤 그 친구(${name})가 다시 풀어 다 맞힘`, fixed);
  }
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close(); process.exit(errs.length ? 1 : 0);
})();
