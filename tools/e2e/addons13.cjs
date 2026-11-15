// 🧩 13차시 덧칸 화면 (📜 2026-11-15 머리 🔨): 운영 ex-13 + addons-13 합친 팩(docs/handoff/pack13/ex-13-with-addons.json)을 이 기기 저장소에 넣고
//   ✔ 개념 체크(c1 · 학생 카드 · 틀리면 도움 1단 · TV 준비 완료) · 💡 도움 3단(m1 · ①②③ · first = 첫 판 · sol 줄 · ✋) · 🔎 익명 풀이(m1 · TV 양피지 · focus 3번째 줄 · 학생 「TV 를 봐요」)
const { chromium } = require('playwright');
const fs = require('fs');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
const PACK = JSON.parse(fs.readFileSync(__dirname + '/../../docs/handoff/pack13/ex-13-with-addons.json', 'utf8'));
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript((p) => { try { localStorage.setItem('citadel-v1-test-db|prep/packs/ex-13', JSON.stringify(p)); } catch { /* 무시 */ } }, PACK);
  const R = 'AD13', Q = `mode=test&lesson=ex-13&room=${R}`;
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('TV ' + e));
  await t.goto(`${B}?role=hall&${Q}`); await t.waitForSelector('.dock', { timeout: 20000 }); await t.waitForTimeout(800);
  const s = await ctx.newPage(); await s.setViewportSize({ width: 390, height: 844 }); s.on('pageerror', (e) => errs.push('폰 ' + e));
  await s.goto(`${B}?role=student&${Q}`); await s.waitForTimeout(2500);
  const go = async () => { await t.bringToFront(); await t.mouse.move(600, 400); await t.waitForTimeout(120); const g = t.locator('.dock .go').first(); if (await g.isVisible().catch(() => false)) await g.click().catch(() => {}); await t.waitForTimeout(700); await s.bringToFront(); await s.waitForTimeout(900); };
  const stepId = () => s.evaluate(() => { const st = JSON.parse(localStorage.getItem('citadel-v1-test-db|rooms/AD13/state') || 'null') || {}; return st.step; });
  // ✔ 개념 체크: c1 단계까지
  for (let i = 0; i < 6 && !(await s.$('[data-k="talk"]')) ; i++) await go();
  for (let i = 0; i < 4 && !/STEP 1/.test((await s.textContent('[data-k="talk"]').catch(() => '')) || ''); i++) await go();
  ok('c1 개념 단계', /STEP 1/.test((await s.textContent('[data-k="talk"]').catch(() => '')) || ''));
  await t.evaluate(() => { const n = Date.now(); window.__dbSet('rooms/AD13/state/cc', { id: 'c1', at: n, end: n + 30000 }); }); await s.waitForTimeout(1200);
  ok('✔ 학생 폰 = 개념 체크 카드', !!(await s.$('[data-k="cc"]')));
  await s.screenshot({ path: `${SHOTS}/ad13-cc-0.png` });
  await s.locator('[data-k="cc"] button').first().click(); await s.waitForTimeout(600); // O = 틀림 (정답 X)
  ok('✔ 틀림 → 💡 도움 1단(why)', !!(await s.$('[data-k="cc-help"]')));
  await s.screenshot({ path: `${SHOTS}/ad13-cc-1.png` });
  await t.bringToFront(); await t.waitForTimeout(500); ok('✔ TV = 준비 완료 1 / 인원', /준비 완료\s*1/.test((await t.textContent('[data-k="tv-cc"]').catch(() => '')) || ''));
  await t.screenshot({ path: `${SHOTS}/ad13-cc-tv.png` });
  await t.evaluate(() => window.__dbSet('rooms/AD13/state/cc/end', Date.now()));
  // 💡 도움 3단 · 🔎 익명 풀이: m1 몬스터
  for (let i = 0; i < 6 && !(await s.$('[data-k="hint"]')); i++) { await go(); await s.waitForTimeout(5500); }
  ok('m1 몬스터 · 💡 도움 단추', /도움/.test((await s.textContent('[data-k="hint"]').catch(() => '')) || ''));
  await s.click('[data-k="hint"]'); await s.waitForSelector('[data-k="help"]', { timeout: 5000 }).catch(() => {});
  const st1 = await s.evaluate(() => ({ stage: document.querySelector('[data-k="help"]')?.dataset.stage, dots: document.querySelectorAll('[data-k="help"] .dots li').length }));
  ok('💡 1단 · 단계 3개', st1.stage === '1' && st1.dots === 3, JSON.stringify(st1));
  await s.screenshot({ path: `${SHOTS}/ad13-help-1.png` });
  await s.click('[data-k="help-next"]'); await s.waitForTimeout(300);
  const f2 = await s.textContent('[data-k="help"] .line').catch(() => '');
  ok('💡 2단 = 첫 판 그 소문항 first(빈칸 □)', /□/.test(f2 || ''), (f2 || '').slice(0, 60));
  await s.screenshot({ path: `${SHOTS}/ad13-help-2.png` });
  await s.click('[data-k="help-next"]'); await s.waitForTimeout(300);
  ok('💡 3단 = 예제 + 풀이 줄', (await s.$$('[data-k="help"] ol.sol li')).length >= 2 && !!(await s.$('[data-k="help-hand"]')));
  await s.click('[data-k="help-hand"]'); await s.waitForTimeout(300); ok('✋ 손들기', /손을 들었어요/.test(await s.textContent('[data-k="help"]')));
  await s.screenshot({ path: `${SHOTS}/ad13-help-3.png` });
  await s.keyboard.press('Escape'); const x = await s.$('.sheet .x'); if (x) await x.click().catch(() => {}); await s.waitForTimeout(300);
  await t.evaluate(() => window.__dbSet('rooms/AD13/state/review', { mid: 'm1', i: -1, k: 0 })); await t.bringToFront(); await t.waitForTimeout(800);
  const rv = await t.evaluate(() => { const c = document.querySelector('[data-k="tv-review"]'); return c ? { lines: c.querySelectorAll('.rl li').length, fo: [...c.querySelectorAll('.rl li')].findIndex((l) => l.classList.contains('fo')), tag: !!c.querySelector('.rtag') } : null; });
  ok('🔎 TV 양피지 · 3번째 줄 강조 · 검토할 풀이 꼬리표', !!rv && rv.fo === 2 && rv.tag, JSON.stringify(rv));
  await t.screenshot({ path: `${SHOTS}/ad13-review-tv.png` });
  await s.bringToFront(); await s.waitForTimeout(600); ok('🔎 학생 폰 = TV 를 봐요', !!(await s.$('[data-k="review-band"]')));
  void stepId;
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
