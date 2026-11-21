// 👩‍🏫 체험판 v1.0 (📜 2026-11-17 #33) — trial/ 첫 화면 · 학생 흐름(용사 고르기 → 12차시 → 쉼터 → 캠프 💎 620) · 선생님 흐름(넓은 화면 / 폰)
//   NODE_PATH=$(npm root -g) node tools/e2e/trial33.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = (process.argv[3] || 'http://localhost:4173/') + 'trial/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const net = []; ctx.on('request', (r) => { const u = r.url(); if (/firebase|googleapis|firebaseio/.test(u)) net.push(u); });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B); await p.waitForSelector('[data-k="trial"]');
  ok('첫 화면 = 제목 · 이름 칸 · 두 단추', !!(await p.$('[data-k="trial-name"]')) && !!(await p.$('[data-k="trial-stu"]')) && !!(await p.$('[data-k="trial-tch"]')));
  ok('가로 넘침 0 (390)', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await p.screenshot({ path: `${SHOTS}/trial-first.png` });
  await p.fill('[data-k="trial-name"]', '체험이'); await p.click('[data-k="trial-stu"]');
  await p.waitForSelector('[data-k="first-hero"]', { timeout: 5000 }).catch(() => {});
  ok('🧙 첫 용사 고르기', !!(await p.$('[data-k="first-hero"]')));
  await p.screenshot({ path: `${SHOTS}/trial-hero.png` });
  await p.click('[data-k="first-hero"] .ba-main, [data-k="first-hero"] button:has-text("시작")'); await p.waitForTimeout(400);
  const cards = await p.$$eval('[data-k="trial-card"]', (xs) => xs.map((x) => x.getAttribute('data-id')));
  ok('차시 카드 2장 (12 위 · 3 아래)', cards.length === 2 && /12/.test(cards[0]) && /03/.test(cards[1]), cards.join(','));
  await p.screenshot({ path: `${SHOTS}/trial-cards.png` });
  // ⚔ 12차시
  await p.click('[data-k="trial-card"] >> nth=0'); await p.waitForSelector('[data-k="stutry"]');
  ok('체험판 막대 = 「👩‍🏫 체험판 · 12차시」', /체험판 · 12차시/.test(await p.textContent('[data-k="stutry"] .note')));
  ok('📺 TV 단추', !!(await p.$('[data-k="try-tv-btn"]')));
  await p.click('[data-k="try-tv-btn"]'); await p.waitForTimeout(800); ok('📺 TV 화면 덮개', !!(await p.$('[data-k="try-tv"]')));
  await p.screenshot({ path: `${SHOTS}/trial-tv.png` }); await p.click('[data-k="try-tv-btn"]');
  const where = async () => (await p.textContent('[data-k="try-where"]')).trim();
  const seq = [await where()];
  for (let i = 0; i < 12; i++) { await p.click('[data-k="try-next"]'); await p.waitForTimeout(500); const w = await where(); if (w !== seq[seq.length - 1]) seq.push(w); if (/마무리/.test(w)) break; }
  log('  흐름 ·', seq.join(' → '));
  const iRest = seq.findIndex((w) => /쉼터/.test(w));
  ok('문제 1 다음 🏕 쉼터', iRest > 0 && /문제 ?1|m1/.test(seq[iRest - 1]), seq[iRest - 1]);
  ok('마무리까지', /마무리/.test(seq[seq.length - 1]));
  await p.click('[data-k="try-close"]'); await p.waitForTimeout(800);
  // 🏕 캠프
  ok('끝내면 🏕 캠프', !!(await p.$('.camp')));
  const wal = await p.evaluate(() => { try { return JSON.parse(sessionStorage.getItem('citadel-v1-me') || '{}').wallet; } catch { return null; } });
  ok('첫 차시 끝 = 💎 620 · 📜 9', wal && wal.gem === 620 && wal.scroll === 9, JSON.stringify(wal));
  ok('캠프 = 📋 게시판 있음(#55 봇 3 체험) · 모집 친구 · ✉ 우편함 없음', !(await p.$('[data-k="board-buddy"]')) && !!(await p.$('.camp [data-prop="dummy"]')) && !(await p.$('.camp [data-prop="mail"]')));
  { await p.click('.camp [data-prop="dummy"]').catch(() => {}); await p.waitForSelector('[data-k="atb-trial"]', { timeout: 10000 }).catch(() => {}); ok('캠프 📋 → 체험판 게시판 (봇 3)', !!(await p.$('[data-k="atb-trial"]'))); await p.click('[data-k="atb-trial"] .back').catch(() => {}); await p.waitForTimeout(500); }
  const main = (await p.textContent('.camp .ba-main, .camp [data-k="ba-main"]').catch(() => '')) || (await p.textContent('.camp'));
  ok('아래 단추 = 「⚔ 다른 차시로」', /다른 차시로/.test(main));
  await p.screenshot({ path: `${SHOTS}/trial-camp.png` });
  await p.click('.camp [data-prop="castle"], .camp button[aria-label*="성채"]'); await p.waitForTimeout(500);
  const nf = await p.waitForSelector('[data-floor]', { timeout: 3000 }).then(() => p.$$eval('[data-floor]', (xs) => xs.length)).catch(() => 0);
  ok('🏰 성채 시트 = 1층만', nf === 1, `${nf}`); await p.click('[data-floor]');
  await p.waitForSelector('[data-k="castle-sum"]', { timeout: 5000 }).catch(() => {});
  const cs = await p.$$eval('[data-k="castle-sum"]', (xs) => xs.map((x) => x.textContent));
  ok("🏰 성채 = 1층만 · 방 모두 열림", cs.length === 1 && /1층/.test(cs[0]) && /열린 방 1[0-9]/.test(cs[0]), cs.join(' | ').slice(0, 80));
  await p.screenshot({ path: `${SHOTS}/trial-castle.png` });
  await p.click('button[aria-label="뒤로"]'); await p.waitForTimeout(600);
  if (await p.$('.camp [data-prop="scare"]')) { await p.click('.camp [data-prop="scare"]'); await p.waitForTimeout(1500); await p.screenshot({ path: `${SHOTS}/trial-scare.png` });
    const body = await p.textContent('body'); ok('🎯 허수아비 = 체험판 차시 두 장 (3 · 12)', /3차시/.test(body) && /12차시/.test(body)); }
  ok('내 기록 = 이 탭 저장(sessionStorage) · localStorage = 이 탭 저장으로 바뀜', await p.evaluate(() => localStorage === sessionStorage && !!sessionStorage.getItem('citadel-v1-me')));
  ok('서버 요청 0', net.length === 0, net.slice(0, 2).join(' '));
  // 👩‍🏫 선생님 넓은 화면
  const t = await (await b.newContext({ viewport: { width: 1400, height: 860 } })).newPage(); t.on('pageerror', (e) => errs.push(String(e)));
  await t.goto(B); await t.waitForSelector('[data-k="trial"]'); await t.click('[data-k="trial-tch"]'); await t.click('[data-k="trial-card"] >> nth=0');
  await t.waitForTimeout(1500); ok('선생님 넓은 화면 = TV + 리모컨', !!(await t.$('[data-k="tsim"], .tsim')));
  await t.screenshot({ path: `${SHOTS}/trial-tch-wide.png` });
  const n = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); n.on('pageerror', (e) => errs.push(String(e)));
  await n.goto(B); await n.waitForSelector('[data-k="trial"]'); await n.click('[data-k="trial-tch"]'); await n.click('[data-k="trial-card"] >> nth=1');
  await n.waitForTimeout(1500); ok('선생님 폰 = 📺 TV 화면 단추', !!(await n.$('[data-k="sim-tv"]')));
  await n.screenshot({ path: `${SHOTS}/trial-tch-phone.png` });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
