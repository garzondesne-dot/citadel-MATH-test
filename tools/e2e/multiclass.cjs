// ☑ 수업 길 (정식 판도 같은 시험 · 정식은 허수아비 화면이 옛 꼴) ☑ 모두 고르기 · 보기 가독성 = 수업(테스트 모드) 10차시 「세 조건」 몬스터 (정식 판은 허수아비 화면이 옛 꼴이라 수업 길로)
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('TV ' + String(e)));
  await t.goto(`${B}?role=hall&mode=test&lesson=set-10&room=MC1`); await t.waitForSelector('.dock', { timeout: 20000 }); await t.waitForTimeout(800);
  const s = await ctx.newPage(); await s.setViewportSize({ width: 360, height: 780 }); s.on('pageerror', (e) => errs.push('폰 ' + String(e)));
  await s.goto(`${B}?role=student&mode=test&lesson=set-10&room=MC1`); await s.waitForTimeout(2500);
  const atM3 = () => s.evaluate(() => /세 조건/.test(document.body.innerText) && !!document.querySelector('.row button, [aria-label="답안 줄"] button'));
  for (let i = 0; i < 14 && !(await atM3()); i++) { await t.bringToFront(); await t.mouse.move(600, 400); await t.waitForTimeout(120); const g = t.locator('.dock .go').first(); if (await g.isVisible().catch(() => false)) await g.click().catch(() => {}); await t.waitForTimeout(600); await s.bringToFront(); await s.waitForTimeout(800); }
  await s.waitForTimeout(6500); // 정찰 5초
  ok('수업 10차시 「세 조건」 몬스터', await atM3());
  const cells = s.locator('[aria-label="답안 줄"] button');
  // (1) 아무 보기나 고름 → (2) 칸으로
  await cells.nth(0).click().catch(() => {}); await s.waitForTimeout(300);
  const ch = s.locator('.body button.opt, .body .choices button, .body button[role="radio"]'); if (await ch.count()) await ch.first().click().catch(() => {});
  await cells.nth(1).click().catch(() => {}); await s.waitForTimeout(400);
  const g = await s.evaluate(() => { const cs = [...document.querySelectorAll('.chips .chip')], r = cs.map((c) => c.getBoundingClientRect()); return { n: cs.length, cols: new Set(r.map((x) => Math.round(x.left))).size, fs: cs[0] ? parseFloat(getComputedStyle(cs[0]).fontSize) : 0, wide: cs.every((c) => c.scrollWidth <= c.clientWidth + 1), over: document.documentElement.scrollWidth - innerWidth, all: !!document.querySelector('mark.all') }; });
  ok('④ 360 보기 2 × 2 · 한 줄 · 20px 넘음 · 넘침 0 · ⑤ 「모두」 강조', g.n === 4 && g.cols === 2 && g.fs >= 20 && g.wide && g.over <= 0 && g.all, JSON.stringify(g));
  await s.locator('.chips .chip').first().click(); await s.screenshot({ path: `${SHOTS}/rel-multi-0.png` });
  await s.locator('.pmain').first().click().catch(() => {}); await s.waitForTimeout(2600);
  for (let k = 0; k < 3 && !(await s.$('.chips')); k++) { await s.locator('.pmain').first().click().catch(() => {}); await s.waitForTimeout(500); if (!(await s.$('.chips'))) { await cells.nth(1).click().catch(() => {}); await s.waitForTimeout(500); } }
  await s.waitForTimeout(1200);
  const st = await s.evaluate(() => ({ band: !!document.querySelector('[data-k="allband"]'), marks: document.querySelectorAll('.chip.m-ok, .chip.m-bad').length, strike: [...document.querySelectorAll('.body *')].filter((e) => getComputedStyle(e).textDecorationLine.includes('line-through') || e.tagName === 'S').length }));
  ok('⑤ 처음 틀림 = 띠 · ✔/✘ · 취소선 0', st.band && st.marks === 1 && st.strike === 0, JSON.stringify(st));
  await s.screenshot({ path: `${SHOTS}/rel-multi-1.png` });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
