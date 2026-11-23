// 🐞 11/23 ① 종합실 🔴 집중 중 📄 문제 = 문제 창이 집중 막 위 (닫으면 집중 그대로) ② 리모컨 쉼터 중 「🏁 쉼터 끝내기」 = 쉼터 닫고 단계 그대로
//   node tools/e2e/focus-rest1123.cjs <캡처 폴더> [주소]   (이 기기 테스트 모드 · 서버 안 닿음)
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  const R = 'FR23', Q = `mode=test&lesson=set-09&room=${R}`;
  const t = await ctx.newPage(); t.setDefaultTimeout(6000); t.on('pageerror', (e) => errs.push('TV ' + e));
  await t.goto(`${B}?role=hall&${Q}`); await t.waitForSelector('.dock', { timeout: 20000 }); await t.waitForTimeout(800);
  const mid = await t.evaluate(() => { const x = document.querySelector('[data-k]'); return null; });
  await t.evaluate((c) => { const st = window.__dbGet(`rooms/${c}/state`) || {}; window.__dbSet(`rooms/${c}/state/focus`, true); }, R); await t.waitForTimeout(400);
  ok('집중 막 켜짐', !!(await t.$('.ov.fo')));
  const sid = await t.evaluate((c) => { const L = window.__dbGet(`rooms/${c}/meta`); return 'm1'; }, R);
  await t.evaluate((a) => window.__dbSet(`rooms/${a.c}/state/sheet`, a.id), { c: R, id: sid }); await t.waitForTimeout(800);
  const top = await t.evaluate(() => { const s = document.querySelector('.ov.sheet'); if (!s) return 'no sheet'; const r = s.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 3); return el && el.closest('.ov.sheet') ? 'sheet' : el && el.closest('.ov.fo') ? 'focus' : String(el?.className || '?'); });
  ok('📄 문제 창이 집중 막 위', top === 'sheet', top);
  await t.screenshot({ path: `${SHOTS}/focus-sheet.png` });
  await t.evaluate((c) => window.__dbSet(`rooms/${c}/state/sheet`, null), R); await t.waitForTimeout(400);
  ok('문제 창 닫으면 집중 막 그대로', !(await t.$('.ov.sheet')) && !!(await t.$('.ov.fo')));
  await t.evaluate((c) => window.__dbSet(`rooms/${c}/state/focus`, false), R); await t.waitForTimeout(300);
  // ② 리모컨 (교사 「수업」 탭 → 🧪 테스트 · 📱 리모컨만)
  const { testOpen } = require('./_cls.cjs');
  const r = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); r.setDefaultTimeout(8000); r.on('pageerror', (e) => errs.push('리모컨 ' + e));
  await r.goto(B + '?role=teacher'); await r.waitForSelector('.tp'); await testOpen(r, { mode: 'remote', bots: 2 }); await r.waitForTimeout(1500);
  const code = (await r.evaluate(() => window.__dbGet('school/live')))?.code;
  await r.click('.sheet .x').catch(() => {}); for (let i = 0; i < 20 && await r.$eval('button:has-text("수업 시작")', (x) => x.disabled).catch(() => false); i++) await r.waitForTimeout(500); await r.click('button:has-text("수업 시작")'); await r.waitForTimeout(1500); // 대기실 → 첫 단계
  const step0 = await r.evaluate((c) => window.__dbGet(`rooms/${c}/state/step`), code);
  ok('리모컨 열림 (쉼터 단추)', !!(await r.$('[data-slot="rest"]')));
  ok('쉼터 전 = 끝내기 단추 없음', !(await r.$('[data-k="rest-end"]')));
  await r.click('[data-slot="rest"]'); await r.waitForTimeout(500); await r.click('.sheet .x').catch(() => {}); await r.keyboard.press('Escape').catch(() => {}); await r.waitForTimeout(500);
  ok('쉼터 중 = 「🏁 쉼터 끝내기」', !!(await r.$('[data-k="rest-end"]')) && !!(await r.evaluate((c) => window.__dbGet(`rooms/${c}/state/rest`), code)));
  await r.screenshot({ path: `${SHOTS}/rest-band.png` });
  await r.click('[data-k="rest-end"]'); await r.waitForTimeout(600);
  const st = await r.evaluate((c) => window.__dbGet(`rooms/${c}/state`), code);
  ok('끝내기 → 쉼터 닫힘 · 단계 그대로 · 단추 사라짐', st && !st.rest && st.step === step0 && !(await r.$('[data-k="rest-end"]')), JSON.stringify({ rest: st?.rest, step: st?.step, step0 }));
  console.log(errs.length ? `❌ ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); await b.close(); process.exit(errs.length ? 1 : 0);
})();
