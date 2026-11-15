// 🖼 대시보드 겉모습 = 옛 정식 (에뮬레이터 · 📜 2026-11-15 머리 🔨): 폰 390 · 태블릿 820 × 한눈에 표 · 활용 추이 · 랭킹 · 오개념 캡처 (가짜 학생 12명)
const { chromium } = require('playwright');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
const pad = (n) => String(n).padStart(2, '0'), ymd = (t) => { const d = new Date(t + 9 * 3600e3); return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`; };
(async () => {
  const errs = [], log = (...a) => console.log(...a);
  await rest('', 'DELETE');
  const N = 12, roster = {}, mask = {}, records = {}, act = {}, xp = {}, now = Date.now();
  for (let n = 1; n <= N; n++) {
    roster[n] = `시험${n}`; mask[n] = `시*${n}`; const k = (n * 37) % 11;
    records[n] = { 'set-05': { no: 5, conc: { c1: [k % 5, 4] }, boss: Math.min(6, 2 + (k % 5)), bossN: 6, mons: { m1: k % 3 ? 'o' : 'x' }, ox: [k % 4, 4], fixed: k }, 'set-06': { no: 6, conc: { c1: [(k + 2) % 5, 4] }, boss: (k + 3) % 7, bossN: 6, mis: k % 3 ? { M01: [k % 4, 1] } : {} } };
    if (n % 5 === 0) delete records[n]['set-05'];
    xp[n] = { total: 200 + k * 90 };
    for (let d = 0; d < 40; d += 1 + (k % 4)) { const day = ymd(now - d * 864e5); (act[day] ||= {})[n] = { r: (k + d) % 3, c: d % 2, v: 1 }; }
  }
  await rest('', 'PATCH', { roster: { '1-3': roster }, rosterMask: { '1-3': mask }, records: { '1-3': records }, act: { '1-3': act }, xp: { '1-3': xp } });
  const b = await chromium.launch();
  for (const [w, h, tag] of [[390, 844, 'phone'], [820, 1180, 'tablet']]) {
    const p = await (await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(`${B}?role=teacher&emu=127.0.0.1`); await p.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(p, '.tabs');
    await p.click('.tabs button:has-text("학생")'); await p.waitForTimeout(400); await p.click('.chips button:has-text("1-3")'); await p.waitForTimeout(1200);
    await p.click('.seg button:has-text("대시보드")'); await p.waitForTimeout(800);
    for (const [g, v] of [['누가 도움이', '한눈에 표'], ['우리 반 어때', '활용 추이'], ['누가 도움이', '랭킹'], ['우리 반 어때', '오개념']]) {
      const vb = p.locator(`.vws button:has-text("${v}")`).first();
      if (!(await vb.isVisible().catch(() => false))) { const gb = p.locator(`.grp button:has-text("${g}")`).first(); if (await gb.isVisible().catch(() => false)) await gb.click(); await p.waitForTimeout(300); }
      await vb.click(); await p.waitForTimeout(900);
      await p.screenshot({ path: `${SHOTS}/look-${tag}-${v.replace(/\s/g, '')}.png`, fullPage: false });
    }
    await p.context().close();
  }
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
