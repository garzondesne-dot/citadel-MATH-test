// 🧹 11/16 수업에서 매끄럽지 못했던 것 (📜 2026-11-16 머리 🔨 · DECISIONS 「🧹 11/16」) — ① 끊긴 학생 남김 ② 전체 이름 ③ 컷인 「누구의 기술」 ⑤ 확대 막기 ⑥ 보기 많으면 작게
//   NODE_PATH=$(npm root -g) node tools/e2e/class1116.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('리모컨 ' + e));
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tp');
  if (await t.$('[data-cls="1-3"]')) await t.click('[data-cls="1-3"]'); else { await t.click('text=다른 반'); await t.click('.sheet .pk:has-text("1-3반")'); }
  await t.evaluate(() => window.__dbSet('roster/1-3', { 1: '가나다', 2: '라마바사', 3: '아자차' }));
  await t.click('.pk:has-text("6차시")'); await t.click('.tact .btn'); await t.click('[data-k="open-yes"]'); await t.waitForSelector('.nums');
  const code = await t.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.endsWith('|school/live')) return JSON.parse(localStorage.getItem(k)).code; });
  const names = await t.evaluate((c) => window.__dbGet(`rooms/${c}/meta/names`), code);
  ok('② 수업 열 때 방에 전체 이름', names && names.s1_3_2 === '라마바사', JSON.stringify(names));
  ok('② 리모컨 칸 = 전체 이름', /2번 라마바사/.test((await t.getAttribute('.n[data-n="2"]', 'aria-label')) || ''));
  const s2 = await ctx.newPage(); await s2.goto(`${B}?role=student&room=${code}&as=1-3:2`);
  const s3 = await ctx.newPage(); await s3.goto(`${B}?role=student&room=${code}&as=1-3:3`); await s3.waitForTimeout(1500);
  for (let i = 0; i < 20 && Object.keys((await t.evaluate((c) => window.__dbGet(`rooms/${c}/players`), code)) || {}).length < 2; i++) await t.waitForTimeout(500);
  const key = await t.evaluate((c) => window.__dbGet(`secrets/${c}/hallKey`), code);
  const tv = await ctx.newPage(); await tv.setViewportSize({ width: 1280, height: 720 }); tv.on('pageerror', (e) => errs.push('TV ' + e));
  await tv.goto(`${B}?role=hall&code=${code}&key=${key}`); await tv.waitForTimeout(2500);
  { const rows = (await tv.textContent('.rows').catch(() => '')) || ''; ok('② TV 대기실 = 전체 이름 (가림 · 성 빼기 없음)', !rows || (/라마바사/.test(rows) && !/\*/.test(rows)), rows ? rows.slice(0, 60) : '(대기실 줄 없음 · 캠프 화면)'); }
  await t.bringToFront(); for (let i = 0; i < 4; i++) { await t.waitForSelector('.tact .btn:not([disabled])', { timeout: 8000 }).catch(() => {}); await t.click('.tact .btn'); await t.waitForTimeout(800); if (((await t.evaluate((c) => window.__dbGet(`rooms/${c}/state/step`), code)) ?? -1) >= 1) break; }
  await tv.bringToFront(); await tv.waitForTimeout(1500);
  const heroes = async () => tv.evaluate(() => (window.__tvHeroes ? window.__tvHeroes() : null));
  ok('① 둘 다 들어옴', Object.keys((await t.evaluate((c) => window.__dbGet(`rooms/${c}/players`), code)) || {}).length >= 2);
  await tv.screenshot({ path: `${SHOTS}/c1116-tv-both.png` });
  await s3.close(); log('  … 3번 폰 닫고 끊김 기다림'); await tv.waitForTimeout(16000);
  const hs = await heroes(); ok('① 끊긴 3번 = 레이드 줄에 남음 (📵 · 흐림)', !!hs && hs.some((h) => h.name === '3 아자차' && h.off) && hs.some((h) => h.name === '2 라마바사' && !h.off), JSON.stringify(hs));
  await tv.screenshot({ path: `${SHOTS}/c1116-tv-lost.png` });
  // ③ 컷인 글자 (TV 시험 고리)
  await tv.evaluate(() => window.__tvAtk?.(0, 'hit', 3, 'twin', true, true)); await tv.waitForTimeout(500);
  const un = (await tv.textContent('.ult .u-name').catch(() => '')) || '';
  ok('③ 필살기 컷인 = 「(이름)의 (기술)!」', /라마바사의 .+!/.test(un), un);
  await tv.screenshot({ path: `${SHOTS}/c1116-tv-cutin.png` });
  // ⑤ 확대 막기
  const vp = await tv.evaluate(() => document.querySelector('meta[name=viewport]').content), ta = await tv.evaluate(() => getComputedStyle(document.documentElement).touchAction);
  ok('⑤ 확대 막기 = viewport user-scalable=no · touch-action pan', /user-scalable=no/.test(vp) && /pan-x pan-y/.test(ta), `${vp} · ${ta}`);
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
