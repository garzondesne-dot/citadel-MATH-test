// 🐞 11/20 「12차시 수업 종료 → 곧바로 허수아비에 12차시가 안 생김」 (에뮬레이터)
//   허수아비를 먼저 열어 둔 뒤 그 차시 수업 기록 · 지난 수업(school/last)이 늦게 도착 → 목록에 그 차시 카드가 생겨야 함 (예전 = 열 때 한 번만 읽어 그대로)
//   NODE_PATH=$(npm root -g) node tools/e2e/dummylate-emu.cjs <그림 폴더>
const { chromium } = require('playwright');
const { rest } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/?emu=127.0.0.1';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest('', 'PATCH', { roster: { '1-3': { 3: '시험삼' } }, rosterMask: { '1-3': { 3: '시*삼' } }, school: { features: { bundle: 'full', on: { hero: true, scarecrow: true } } } });
  await rest('records/1-3/3/set-02', 'PUT', { boss: 3, bossN: 5, mons: { m1: 'x', m2: 'o', m3: 'o', m4: 'o' }, no: 2, at: 1 });
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const s = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); s.on('pageerror', (e) => errs.push(String(e))); s.setDefaultTimeout(15000);
  await s.addInitScript(() => { try { localStorage.setItem('citadel-wake-tip', '1'); } catch {} });
  await s.goto(B); await s.waitForSelector('.title', { timeout: 20000 }); await s.waitForTimeout(800);
  await s.selectOption('select >> nth=0', '1-3'); await s.waitForTimeout(200); await s.selectOption('select >> nth=1', '3'); await s.waitForTimeout(300);
  if (!(await s.$('.pw:has(small)'))) await s.click('.lk:has-text("가입")');
  await s.click('.pw >> nth=0'); for (const k of '12341234') await s.click(`.pad button:text-is("${k}")`);
  await s.click('.title .act .pmain'); await s.waitForTimeout(3500);
  const fh = await s.$('button:has-text("과 시작"), button:has-text("와 시작")'); if (fh) { await fh.click(); await s.waitForTimeout(1200); }
  await s.waitForSelector('[data-prop="scare"]', { timeout: 15000 }); await s.$eval('[data-prop="scare"]', (e) => e.click()); await s.waitForSelector('[data-k="dummy-list"]'); await s.waitForTimeout(600);
  const before = await s.$$eval('[data-lesson]', (x) => x.map((e) => e.getAttribute('data-lesson')));
  ok('열었을 때 = 2차시만 (10차시 수업 전)', before.includes('set-02') && !before.includes('set-10'), before.join(','));
  // 수업 종료 = 그 학생 기록 + 지난 수업이 이제 도착
  await rest('records/1-3/3/set-10', 'PUT', { boss: 2, bossN: 4, mons: { m1: 'x', m2: 'o' }, no: 10, at: 2 }); await rest('school/last/1-3', 'PUT', { code: 'X', lesson: 'set-10', no: 10, done: true, at: 2 });
  await s.waitForTimeout(1500);
  const after = await s.$$eval('[data-lesson]', (x) => x.map((e) => e.getAttribute('data-lesson')));
  ok('기록이 도착하면 = 10차시 카드가 열린 채로 생김 (다시 안 열어도)', after.includes('set-10'), after.join(','));
  await s.screenshot({ path: `${SHOTS}/dummylate.png` });
  ok('콘솔 오류 0', !errs.some((e) => /Error/.test(e)), errs.slice(0, 2).join(' | '));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
