// 🥚 #74 이스터에그 7 「허수아비의 친구」 (에뮬레이터 학생): 복습 100판 → 캠프에서 털썩 「좀 쉬자…」 + 그 뒤 🩹 · 찾음 = bonus/…/egg/e7 · 칭호 = 도전과제 24 와 같은 하나
const { chromium } = require('playwright');
const { rest } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/?emu=127.0.0.1';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest('', 'PATCH', { roster: { '1-3': { 3: '시험삼' } }, rosterMask: { '1-3': { 3: '시*삼' } } });
  await rest('school/features', 'PUT', { bundle: 'full', on: { hero: true, scarecrow: true, board: true, citadel: true, forge: true } });
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); await ctx.addInitScript(() => { try { localStorage.setItem('citadel-wake-tip', '1'); } catch {} });
  const s = await ctx.newPage(); s.on('pageerror', (e) => errs.push(String(e)));
  await s.goto(B); await s.waitForSelector('.title', { timeout: 20000 }); await s.waitForTimeout(800);
  await s.selectOption('select >> nth=0', '1-3'); await s.waitForTimeout(200); await s.selectOption('select >> nth=1', '3'); await s.waitForTimeout(300);
  if (!(await s.$('.pw:has(small)'))) await s.click('.lk:has-text("가입")');
  await s.click('.pw >> nth=0'); for (const k of '12341234') await s.click(`.pad button:text-is("${k}")`);
  await s.click('.title .act .pmain'); await s.waitForTimeout(3500);
  const fh = await s.$('button:has-text("과 시작"), button:has-text("와 시작")'); if (fh) { await fh.click(); await s.waitForTimeout(1200); }
  await rest('bonus/1-3/3/set-02', 'PUT', { m1: { clear: true, tries: 100, at: 1 } });
  await rest('bonus/1-3/3/ach', 'PUT', { review1: 1, review30: 1, review100: 1 }); // 달성 띠는 이미 본 것으로
  await s.reload(); await s.waitForTimeout(1000);
  let k = ''; for (let i = 0; i < 60 && k !== 'e7'; i++) { k = await s.$eval('[data-k="egg-fx"]', (e) => e.dataset.egg).catch(() => ''); await s.waitForTimeout(150); }
  ok('7 복습 100판 = 캠프에서 털썩 연출', k === 'e7');
  await s.waitForTimeout(1300); await s.screenshot({ path: `${SHOTS}/egg-7.png` });
  ok('   찾음 기록 = bonus/…/egg/e7', !!(await rest('bonus/1-3/3/egg/e7')));
  await s.$eval('[data-k="egg-fx"]', (e) => e.click()).catch(() => {}); await s.waitForTimeout(500);
  ok('   그 뒤 허수아비 🩹', !!(await s.$('[data-k="bandaid"]')));
  await s.reload(); await s.waitForTimeout(4000); ok('   다시 들어오면 = 털썩 다시 안 함', !(await s.$('[data-k="egg-fx"]')));
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
