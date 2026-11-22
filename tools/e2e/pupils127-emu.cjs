// 🐞 #127 교사 「반 · 시간표」 탭 · 대시보드 = 서버(에뮬레이터)에서 「⚠ 서버 값이 덜 와서」 울타리 없이 그려짐 (가짜 명단 · 기록 · 계정)
//   (firebase emulators:start --only database,auth --project demo-citadel-test) · NODE_PATH=$(npm root -g) node tools/e2e/pupils127-emu.cjs <폴더> [주소]
const { chromium } = require('playwright');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  await rest('', 'DELETE');
  await rest('', 'PATCH', { roster: { '1-3': { 1: '시험일', 2: '시험이' } }, rosterMask: { '1-3': { 1: '시*일', 2: '시*이' } },
    accounts: { '1-3': { 1: { hero: 3, pend: 2 }, 2: { hero: 5 } } }, records: { '1-3': { 1: { 'set-06': { no: 6, boss: 3, bossN: 6 } } } }, xp: { '1-3': { 1: { total: 300 } } }, gem: { '1-3': { 1: { total: 50 } } } });
  const b = await chromium.launch();
  for (const [nm, w, h] of [['phone', 390, 844], ['tablet', 1024, 768]]) {
    const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage(), ce = [];
    p.on('console', (m) => { if (/화면 오류|effect_update_depth/.test(m.text())) ce.push(m.text().split('\n')[0]); });
    await p.goto(`${B}?role=teacher&emu=127.0.0.1`); await p.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(p, '.tabs'); await p.waitForTimeout(800);
    await p.click('.tabs button:has-text("반")'); await p.waitForTimeout(1500);
    ok(`${nm} 반 탭 = 울타리 없음`, !(await p.$('[data-k="crash"]')));
    const d = await p.$('button:has-text("대시보드")'); if (d) { await d.click(); await p.waitForTimeout(1500); }
    for (const c of ['전체', '1-3']) { await p.click(`.chips button:has-text("${c}")`).catch(() => {}); await p.waitForTimeout(1000); ok(`${nm} 대시보드 ${c} = 울타리 없음`, !(await p.$('[data-k="crash"]'))); }
    ok(`${nm} 화면 오류 0`, ce.length === 0, ce.join(' / '));
    await p.screenshot({ path: `${SHOTS}/pupils127-${nm}.png` }); await p.context().close();
  }
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
