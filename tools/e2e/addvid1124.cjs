// 🎬 덧영상 (📜 11/24 ❓ #6 A): 체험판 12차시 c1 = 학생 폰 「🎬 개념 영상 1 · 2」 · 종합실 🎬 = 끔 → 1 → 2 → 끔 · 둘째 영상 = video/v12-71.mp4
//   NODE_PATH=$(npm root -g) node tools/e2e/addvid1124.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = (process.argv[3] || 'http://localhost:4173/') + 'trial/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B); await p.waitForSelector('[data-k="trial"]');
  await p.fill('[data-k="trial-name"]', '체험이'); await p.click('[data-k="trial-stu"]');
  await p.waitForSelector('[data-k="first-hero"]', { timeout: 5000 }).catch(() => {});
  await p.click('[data-k="first-hero"] .ba-main, [data-k="first-hero"] button:has-text("시작")'); await p.waitForTimeout(400);
  await p.click('[data-k="trial-card"] >> nth=0'); await p.waitForSelector('[data-k="stutry"]');
  const where = async () => (await p.textContent('[data-k="try-where"]')).trim();
  for (let i = 0; i < 6 && !/개념 ?1|c1/.test(await where()); i++) { await p.click('[data-k="try-next"]'); await p.waitForTimeout(600); }
  log('  지금 ·', await where()); await p.waitForTimeout(800);
  const labs = await p.$$eval('[data-k="talk-vid"]', (xs) => xs.map((x) => x.textContent.trim()));
  ok('학생 폰 c1 = 영상 단추 2개 (1 · 2)', labs.length === 2 && /1/.test(labs[0]) && /2/.test(labs[1]), labs.join(' | '));
  ok('넘침 0', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await p.click('[data-k="talk-vid"] >> nth=1'); await p.waitForTimeout(1500);
  const src = await p.evaluate(() => document.querySelector('[data-k="talk"] video')?.getAttribute('src') || '');
  ok('🎬 2 = v12-71', /v12-71\.mp4/.test(src), src);
  await p.screenshot({ path: `${SHOTS}/addvid-phone.png` });
  // 📺 종합실 🎬 자리
  await p.click('[data-k="try-tv-btn"]'); await p.waitForTimeout(800);
  const tvb = p.locator('[data-k="try-tv"] button.t:has-text("🎬")').first();
  const lab = async () => (await tvb.textContent()).replace(/\s+/g, ' ').trim();
  const seq = [await lab()];
  for (let i = 0; i < 3; i++) { await tvb.click(); await p.waitForTimeout(900); seq.push(await lab()); if (i === 1) { const s2 = await p.evaluate(() => document.querySelector('[data-k="tvvid"]')?.getAttribute('src') || ''); ok('종합실 2 / 2 = v12-71', /v12-71/.test(s2), s2); await p.screenshot({ path: `${SHOTS}/addvid-tv.png` }); } }
  ok('종합실 🎬 = 영상 2편 → 1 / 2 → 2 / 2 → 영상 2편', /2편/.test(seq[0]) && /1 \/ 2/.test(seq[1]) && /2 \/ 2/.test(seq[2]) && /2편/.test(seq[3]), seq.join(' → '));
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close(); process.exit(errs.length ? 1 : 0);
})();
