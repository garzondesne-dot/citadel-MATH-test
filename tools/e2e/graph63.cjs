// 📈 #63 그래프 보기 = 그림 (원문 「graph:…」 글자 아님) — 교사 📦 차시 팩에 15차시 팩 올림 → 🧪 테스트(봇 0) → 학생 폰 몬스터 1 보기
//   NODE_PATH=$(npm root -g) node tools/e2e/graph63.cjs <그림 폴더> <팩 json>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', PACK = process.argv[3], MID = process.argv[4] || 'm1', B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext(), t = await ctx.newPage(); await t.setViewportSize({ width: 400, height: 860 }); t.on('pageerror', (e) => errs.push(String(e)));
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tabs');
  await t.click('.tabs button:has-text("차시 팩")'); await t.click('[data-k="packup-go"]'); await t.setInputFiles('[data-k="packfile"]', PACK); await t.waitForSelector('[data-k="packsum"]'); await t.waitForTimeout(800);
  await t.click('.sheet .btn.pmain'); await t.waitForTimeout(1200);
  const no = require(PACK).no;
  await t.click('.tabs button:has-text("수업")'); await t.click('[data-k="cls-test"]'); await t.click(`.pk3 [data-no="${no}"]`); await t.click('[data-mode="remote"]');
  await t.click('[data-k="open-go"]'); await t.click('[data-k="open-yes"]'); await t.waitForSelector('.tact .btn', { timeout: 15000 });
  const code = await t.evaluate(() => window.__dbGet('school/live').code);
  const s = await ctx.newPage(); await s.setViewportSize({ width: 390, height: 844 }); s.on('pageerror', (e) => errs.push('폰 ' + e)); await s.goto(`${B}?role=student&room=${code}&as=test:3`); await s.waitForTimeout(2500);
  const steps = require(PACK).steps, target = steps.findIndex((x) => x.id === MID);
  for (let g = 0; g < 20; g++) { const st = await t.evaluate(() => { const L = window.__dbGet('school/live'); return window.__dbGet(`rooms/${L.code}`).state.step; }); if (st === target) break; await t.click('.tact .btn'); await t.waitForTimeout(300); }
  if (/지금 등장/.test(await t.textContent('.tact .btn'))) await t.click('.tact .btn');
  await s.waitForTimeout(2500);
  const r = await s.evaluate(() => ({ raw: [...document.querySelectorAll('.opt')].filter((e) => /graph:/.test(e.textContent || '')).length, figs: document.querySelectorAll('.opt svg').length, opts: document.querySelectorAll('.opt').length }));
  ok(`${require(PACK).no}차시 ${MID} 보기 = 그래프 그림 (원문 글자 0)`, r.raw === 0 && r.figs > 0, JSON.stringify(r));
  await s.screenshot({ path: `${SHOTS}/graph63-${require(PACK).no}-${MID}.png` });
  await b.close(); console.log(errs.length ? `❌ 실패 ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); process.exit(errs.length ? 1 : 0);
})();
