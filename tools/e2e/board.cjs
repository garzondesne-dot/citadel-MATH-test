// #143 📋 게시판 던전 1인 (이 기기 · 360 × 640): 캠프 📋 게시판 → 전체 게시판(빈 상태 · 칩) → 혼자 시작 › → 차시 시트 → 전투(개념 없음 · 하트 2 · 시간 선)
//   → ‹ 그만 → 다시 시작(시험 시간 짧게) → 시간 끝 = 클리어 ✕ 결과 → 🔥 한 번 더 / 📋 게시판으로 · 가로 넘침 0
// 사용: npm run build → npx vite preview --port 4173 → NODE_PATH=$(npm root -g) node tools/e2e/board.cjs <그림 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
const B = 'http://localhost:4173/';
const log = (...a) => console.log(...a);
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 } }), p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(String(e)));
  const over = async (w) => { const o = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 0) errs.push(`가로 넘침 ${o} · ${w}`); };
  await p.goto(B + '?role=camp&room=BD1'); await p.waitForSelector('.stage');
  const lab = await p.$eval('button[aria-label="📋 게시판"]', (x) => x.textContent.trim()).catch(() => ''); log('캠프 물건:', lab); if (!/게시판/.test(lab)) errs.push('캠프 게시판 이름');
  await p.click('button[aria-label="📋 게시판"]'); await p.waitForSelector('.bd'); await p.waitForTimeout(300);
  log('⑥ 게시판:', (await p.textContent('.bd .empty')).replace(/\s+/g, ' ').trim(), '| 칩', await p.$$eval('.bd .chips button', (xs) => xs.map((x) => x.textContent.trim()).join(' ')), '| 모집', await p.$eval('.bd .btn2', (x) => x.disabled), await p.$eval('.bd .act .why', (x) => x.textContent.trim()).catch(() => ''));
  await p.screenshot({ path: `${SHOTS}/b30-board.png` }); await over('게시판');
  await p.click('.bd .chips button:has-text("6")'); await p.click('.bd .act .btn'); await p.waitForSelector('.lgrid'); await p.waitForTimeout(250);
  log('⑥-1 시트:', await p.$$eval('.lgrid .lg', (xs) => xs.length), '칸 · 고른', (await p.textContent('.lg.on')).trim(), '·', (await p.textContent('.sheet .act .btn')).trim());
  await p.screenshot({ path: `${SHOTS}/b30-board-sheet.png` });
  await p.click('.sheet .act .btn'); await p.waitForTimeout(1800);
  const bt = await p.evaluate(() => ({ concept: !!document.querySelector('.run .say'), card: !!document.querySelector('.run .bcard'), tl: !!document.querySelector('.run .tline'), left: document.querySelector('.run .tleft')?.textContent, hearts: document.querySelectorAll('.run .act .btn [class*="heart"], .run .hearts i').length }));
  log('⑨ 전투:', JSON.stringify(bt)); if (bt.concept || !bt.card || !bt.tl) errs.push('전투 화면');
  await p.screenshot({ path: `${SHOTS}/b30-board-run.png` }); await over('전투');
  await p.click('.run .quit'); await p.waitForTimeout(300); if (await p.$('.run')) errs.push('그만');
  // 시간 끝 = 클리어 ✕
  await p.evaluate(() => { window.__BOARD_SEC = 0.1; }); await p.click('.bd .act .btn'); await p.waitForSelector('.lgrid'); await p.click('.sheet .act .btn'); await p.waitForSelector('.bd .grade', { timeout: 15000 });
  log('⑫ 결과:', (await p.textContent('.bd .grade')).replace(/\s+/g, ' ').trim(), '|', (await p.textContent('.bd .stat')).replace(/\s+/g, ' ').trim(), '|', (await p.textContent('.bd .rw')).replace(/\s+/g, ' ').trim());
  if (!/클리어 ✕/.test(await p.textContent('.bd .grade'))) errs.push('클리어 ✕');
  await p.screenshot({ path: `${SHOTS}/b30-board-x.png` }); await over('결과');
  const btn = await p.$$eval('.bd .act button', (xs) => xs.map((x) => x.textContent.trim()).join(' / ')); log('   단추:', btn);
  await p.click('.bd .btn2'); await p.waitForSelector('.bd .empty');
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0');
  await b.close();
})();
