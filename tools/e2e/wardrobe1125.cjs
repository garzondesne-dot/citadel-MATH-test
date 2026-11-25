// 🎨 옷장 1차 (📜 2026-11-25 · 머리 🔨) — 이 기기 캠프
//   ① 캠프 🎨 옷장 단추 → 시트 · 탭 5 · 물건 29
//   ② 입어 보기 = 미리 보기만(💎 그대로) → 「💎 n 으로 사기」 → 「정말 살까요?」 → 💎 빠짐 · 산 것 입음
//   ③ 캠프 = 내 용사 발밑 빛 · 이름표 색 · 카드 배경 · 새로 고쳐도 남음 · 벗기
//   NODE_PATH=$(npm root -g) node tools/e2e/wardrobe1125.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('캠프 ' + e));
  await p.goto(B + '?role=camp&room=WD'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('citadel-exam-cut|me|2026-12-11', '1'); }); await p.reload(); await p.waitForTimeout(2500); // ⚔ 기말 컷인 = 본 것으로
  const gem = async () => Number(((await p.textContent('[data-k="wallet-gem"]')) || '').replace(/[^0-9]/g, ''));
  const g0 = await gem();
  await p.screenshot({ path: `${SHOTS}/wd-camp0.png` });
  ok('캠프에 🎨 옷장 단추', !!(await p.$('[data-prop="wardrobe"]')), `💎 ${g0}`);
  await p.click('[data-prop="wardrobe"]'); await p.waitForSelector('[data-k="ward-preview"]', { timeout: 5000 }).catch(() => {});
  ok('옷장 시트 · 탭 6', (await p.$$('[data-k^="ward-tab-"]')).length === 6);
  let n = 0; for (const t of ['nameColor', 'nameFrame', 'fx', 'aura', 'cardBg', 'furn']) { await p.click(`[data-k="ward-tab-${t}"]`); await p.waitForTimeout(150); n += (await p.$$('[data-k="ward-item"]')).length; }
  ok('물건 39', n === 39, String(n));
  await p.click('[data-k="ward-tab-aura"]'); await p.click('[data-k="ward-item"][data-id="au_blue"]');
  ok('입어 보기 = 미리 보기 발밑 빛 · 💎 그대로', !!(await p.$('[data-k="ward-preview"] [data-k="cos-aura"]')) && (await gem()) === g0);
  const main = () => p.locator('.sheet button').last();
  const label = async () => ((await main().textContent()) || '').trim();
  ok('단추 = 💎 100 으로 사기', /💎 100 으로 사기/.test(await label()), await label());
  await p.screenshot({ path: `${SHOTS}/wd-try.png` });
  await main().click(); ok('한 번 더 = 정말 살까요?', /정말 살까요/.test(await label()), await label());
  await main().click(); await p.waitForTimeout(400);
  ok('샀음 = 💎 −100', (await gem()) === g0 - 100, `${g0} → ${await gem()}`);
  await p.click('[data-k="ward-tab-nameColor"]'); await p.click('[data-k="ward-item"][data-id="nc_rose"]'); await main().click(); await main().click(); await p.waitForTimeout(300);
  await p.click('[data-k="ward-tab-cardBg"]'); await p.click('[data-k="ward-item"][data-id="cb_star"]'); await main().click(); await main().click(); await p.waitForTimeout(300);
  ok('💎 = −100 −40 −60', (await gem()) === g0 - 200, String(await gem()));
  await p.screenshot({ path: `${SHOTS}/wd-sheet.png` });
  await p.click('.sheet .x'); await p.waitForTimeout(500);
  const campOk = async () => ({ aura: !!(await p.$('.hmove [data-k="cos-aura"]')), name: await p.$eval('.hero-card [data-k="cos-name"]', (e) => getComputedStyle(e).color).catch(() => ''), bg: await p.$eval('[data-k="hero-card"]', (e) => getComputedStyle(e).backgroundImage).catch(() => '') });
  let c = await campOk();
  ok('캠프 = 발밑 빛 · 이름 장미색 · 카드 별밤', c.aura && /255, 143, 177/.test(c.name) && /gradient/.test(c.bg), JSON.stringify(c).slice(0, 160));
  await p.screenshot({ path: `${SHOTS}/wd-camp1.png` });
  await p.reload(); await p.waitForTimeout(2500); c = await campOk();
  ok('새로 고쳐도 남음', c.aura && /255, 143, 177/.test(c.name), JSON.stringify(c).slice(0, 120));
  await p.click('[data-prop="wardrobe"]'); await p.waitForTimeout(600); await p.click('[data-k="ward-tab-aura"]'); await p.click('[data-k="ward-item"][data-id="au_blue"]');
  ok('산 것 = 벗기 단추', /벗기/.test(await label()), await label()); await main().click(); await p.waitForTimeout(300);
  await p.click('.sheet .x'); await p.waitForTimeout(400);
  ok('벗음 = 발밑 빛 없음 · 💎 그대로', !(await p.$('.hmove [data-k="cos-aura"]')) && (await gem()) === g0 - 200);
  await b.close(); console.log(errs.length ? `❌ ${errs.length}` : '✅ 오류 0'); process.exit(errs.length ? 1 : 0);
})();
