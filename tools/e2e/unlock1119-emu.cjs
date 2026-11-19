// 🔓 11/19 ④ 조건 해금 용사 · 🏅 기록 칸 (에뮬레이터 학생 1명)
//   성채 방 9개 → 콤파 잠김 「9 / 10」 · 10개 → 열림 · 업적 2 → 🏅 기록 「2 / 10」 · 명단 받은 반 = 진짜 번호만
//   NODE_PATH=$(npm root -g) node tools/e2e/unlock1119-emu.cjs <그림 폴더>
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
  await s.selectOption('select >> nth=0', '1-3'); await s.waitForTimeout(300);
  const nums = await s.$$eval('select >> nth=1 >> option', (o) => o.map((x) => x.value).filter((v) => v !== '0'));
  ok('② 명단 받은 반 = 진짜 번호만 (가짜 이름 목록 아님)', nums.join(',') === '3', nums.join(','));
  await s.selectOption('select >> nth=1', '3'); await s.waitForTimeout(300);
  ok('② 이름 = 가린 이름', /시\*삼/.test(await s.textContent('.name')));
  if (!(await s.$('.pw:has(small)'))) await s.click('.lk:has-text("가입")');
  await s.click('.pw >> nth=0'); for (const k of '12341234') await s.click(`.pad button:text-is("${k}")`);
  await s.click('.title .act .pmain'); await s.waitForTimeout(3500);
  const fh = await s.$('button:has-text("과 시작"), button:has-text("와 시작")'); if (fh) { await fh.click(); await s.waitForTimeout(1200); }
  const rooms = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`q${String(i + 1).padStart(2, '0')}`, { clear: true, at: 1 }]));
  const hero = async () => {
    await s.reload(); await s.waitForTimeout(3000);
    if (!(await s.$('.mh'))) await s.$eval('button[aria-label="내 용사 보기"]', (e) => e.click()); await s.waitForSelector('.mh'); await s.waitForTimeout(500);
    if (!(await s.$('.hsw')))
    await s.$eval('.mh .top', (e) => e.click()); await s.waitForSelector('.hsw'); await s.waitForTimeout(300);
    const lab = await s.$eval('.swc[aria-label^="콤파"]', (e) => e.getAttribute('aria-label')).catch(() => '');
    await s.$eval('.swc[aria-label^="콤파"]', (e) => e.click()).catch(() => {}); await s.waitForTimeout(300);
    const cond = await s.$eval('.hi .cond', (e) => e.textContent).catch(() => '');
    return { lab, cond };
  };
  await rest('bonus/1-3/3/eval-1', 'PUT', rooms(9));
  const a = await hero(); ok('④ 성채 방 9 = 콤파 잠김 · 「9 / 10」', /잠김/.test(a.lab) && /9 \/ 10/.test(a.cond), `${a.lab} | ${a.cond}`);
  await s.screenshot({ path: `${SHOTS}/u-9.png` });
  await rest('bonus/1-3/3/eval-1', 'PUT', rooms(10)); await rest('bonus/1-3/3/set-02', 'PUT', { boss: { clear: true } }); await rest('bonus/1-3/3/set-03', 'PUT', { boss: { clear: true } });
  const c = await hero(); ok('④ 성채 방 10 = 콤파 열림', !!c.lab && !/잠김/.test(c.lab), c.lab);
  await s.screenshot({ path: `${SHOTS}/u-10.png` });
  await s.reload(); await s.waitForTimeout(3000); if (!(await s.$('.mh'))) await s.$eval('button[aria-label="내 용사 보기"]', (e) => e.click()); await s.waitForSelector('.mh');
  await s.$eval('.htabs button:nth-child(3)', (e) => e.click()); await s.waitForTimeout(400);
  const seals = await s.textContent('[data-k="rec-seals"]').catch(() => '');
  ok('④ 🏅 기록 업적 = 2 / 10', /2 \/ 10/.test(seals), seals.replace(/\s+/g, ' '));
  await s.screenshot({ path: `${SHOTS}/u-rec.png` });
  ok('콘솔 오류 0', !errs.some((e) => /Error/.test(e)), errs.slice(0, 2).join(' | '));
  await b.close(); log(errs.length ? `실패 ${errs.length}` : '모두 통과'); process.exit(errs.length ? 1 : 0);
})();
