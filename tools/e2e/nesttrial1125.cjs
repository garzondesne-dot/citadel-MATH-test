// 🐾 👩‍🏫 체험판 둥지 (📜 2026-11-25 #둥지-1 B) — 첫 알 무료 · 먹이 ×5 (원래 수업은 💎 150 · +5)
//   ① 12차시 끝 → 캠프 💎 620 ② 🪺 둥지 = 「🥚 첫 알 무료로 받기」 → 💎 그대로 ③ 두 번째 알 = 💎 150 ④ 3차시 끝 → 먹이 25
//   NODE_PATH=$(npm root -g) node tools/e2e/nesttrial1125.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = (process.argv[3] || 'http://localhost:4173/') + 'trial/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  const me = () => p.evaluate(() => { try { return JSON.parse(sessionStorage.getItem('citadel-v1-me') || '{}'); } catch { return {}; } });
  const play = async (nth) => {
    await p.click(`[data-k="trial-card"] >> nth=${nth}`); await p.waitForSelector('[data-k="stutry"]');
    for (let i = 0; i < 14; i++) { await p.click('[data-k="try-next"]'); await p.waitForTimeout(450); if (/마무리/.test((await p.textContent('[data-k="try-where"]')) || '')) break; }
    await p.waitForTimeout(800); await p.click('[data-k="try-close"]'); await p.waitForTimeout(900);
  };
  await p.goto(B); await p.waitForSelector('[data-k="trial"]');
  await p.evaluate(() => sessionStorage.setItem('citadel-exam-cut|me|2026-12-10', '1'));
  await p.fill('[data-k="trial-name"]', '체험이'); await p.click('[data-k="trial-stu"]');
  await p.waitForSelector('[data-k="first-hero"]', { timeout: 5000 }).catch(() => {});
  await p.click('[data-k="first-hero"] .ba-main, [data-k="first-hero"] button:has-text("시작")'); await p.waitForTimeout(400);
  await play(0);
  const g0 = (await me()).wallet?.gem;
  ok('① 첫 차시 끝 = 캠프 · 💎 620', !!(await p.$('.camp')) && g0 === 620, String(g0));
  await p.click('[data-prop="nest"]'); await p.waitForTimeout(500);
  const main = () => p.locator('.sheet button').last();
  const t1 = (await main().textContent()) || '';
  ok('② 둥지 단추 = 「🥚 첫 알 무료로 받기」', /첫 알 무료/.test(t1), t1.trim());
  await p.screenshot({ path: `${SHOTS}/nesttrial-egg.png` });
  await main().click(); await p.waitForTimeout(500);
  const m1 = await me();
  ok('받음 = 💎 그대로 · 펫 1마리 · 내 펫 탭', m1.wallet?.gem === 620 && Object.keys(m1.pet?.list || {}).length === 1 && (await p.getAttribute('[data-k="nest-tab-mine"]', 'aria-selected')) === 'true', `${m1.wallet?.gem}`);
  ok('먹이 안내 = 수업 +25 · 허수아비 +5', /\+25/.test((await p.textContent('.sheet')) || '') && /\+5 /.test((await p.textContent('.sheet')) || ''));
  await p.click('[data-k="nest-tab-egg"]'); await p.waitForTimeout(200);
  const t2 = (await main().textContent()) || '';
  ok('③ 두 번째 알 = 💎 150', /💎 150/.test(t2), t2.trim());
  await p.click('.sheet .x'); await p.waitForTimeout(400);
  // ④ 3차시 → 먹이 ×5
  await p.locator('button:has-text("다른 차시로")').first().click(); await p.waitForTimeout(600);
  await p.waitForSelector('[data-k="trial-card"]', { timeout: 5000 }).catch(() => {});
  await play(1);
  const m2 = await me(), food = Object.values(m2.pet?.list || {})[0]?.food;
  ok('④ 3차시 끝 = 먹이 25 (원래 수업은 5)', food === 25, String(food));
  await p.screenshot({ path: `${SHOTS}/nesttrial-camp.png` });
  await b.close(); console.log(errs.length ? `❌ ${errs.length}` : '✅ 오류 0'); process.exit(errs.length ? 1 : 0);
})();
