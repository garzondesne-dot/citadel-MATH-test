// 🌟 #29 각성한 로안 (📜 2026-11-17) — 이 기기 저장
//   ① 캠프: 로안 +9 · 쌍월 참 · 만 번째 베기 = 로안 그림 → +10 = 금발 그림 · 「?」 카드 체크 4칸 · ⓪ 호칭 빼면 로안
//   ② 수업 방: 학생 폰이 들어오면 players.hero = 16 · base = 0 · 종합실 레이드 줄 그림 = 금발
//   NODE_PATH=$(npm root -g) node tools/e2e/blond29.cjs <폴더> [주소]
const { chromium } = require('playwright');
const { testOpen } = require('./_cls.cjs');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('캠프 ' + e));
  const setMe = (enh) => p.evaluate((enh) => { const m = JSON.parse(localStorage.getItem('citadel-v1-me') || '{}'); m.hero = 0; m.enh = enh; m.title = 'slash10k'; m.socket = { ...(m.socket || {}), 0: 'twin' }; m.seen = { ...(m.seen || {}), hero0: true }; localStorage.setItem('citadel-v1-me', JSON.stringify(m)); }, enh);
  const art = (sel) => p.$eval(sel, (e) => [...e.querySelectorAll('[data-hero]')].map((h) => `hero=${h.dataset.hero}`).join(' ')).catch(() => '');
  await p.goto(B + '?role=camp&room=BL'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.stage');
  await setMe(9); await p.reload(); await p.waitForSelector('.stage'); await p.waitForTimeout(600);
  const a9 = await art('.hero-card .pic'), w9 = await art('[data-k="camp-hero"]').catch(() => '');
  await setMe(10); await p.evaluate(() => { const m = JSON.parse(localStorage.getItem('citadel-v1-me')); m.title = 'none'; localStorage.setItem('citadel-v1-me', JSON.stringify(m)); }); await p.reload(); await p.waitForSelector('.stage'); await p.waitForTimeout(600);
  const aNo = await art('.hero-card .pic'); ok('+10 · 쌍월 참이어도 호칭 「만 번째 베기」가 없으면 로안', /hero=0\b/.test(aNo), aNo);
  await setMe(10); await p.reload(); await p.waitForSelector('.stage'); await p.waitForTimeout(600);
  const a10 = await art('.hero-card .pic');
  const camp10 = await p.$eval('[data-k="camp-hero"]', (e) => getComputedStyle(e).backgroundImage).catch(() => '');
  ok('캠프 +9 = 로안 · +10 = 금발 (카드)', /hero=0\b/.test(a9) && /hero=16\b/.test(a10), `${a9} → ${a10}`);
  ok('캠프 걷는 용사 = 금발', /hero-blond/.test(camp10), (camp10.match(/hero-[a-z0-9-]+/) || [''])[0]);
  await p.screenshot({ path: `${SHOTS}/blond-camp.png` });
  await p.click('button[aria-label="내 용사 보기"]'); await p.waitForSelector('.mh');
  const top = await art('.mh .top .pic');
  ok('내 용사 맨 위 = 금발', /hero=16\b/.test(top), top);
  await p.evaluate(() => { const bs = [...document.querySelectorAll('.mh button')]; const x = bs.find((b) => /용사 바꾸기|바꾸기/.test(b.textContent || '')); x && x.click(); }); await p.waitForTimeout(400);
  const card = await p.$('[data-k="blond-card"]');
  ok('용사 바꾸기에 「?」 카드', !!card);
  if (card) { await card.click(); await p.waitForTimeout(200); const ck = ((await p.textContent('[data-k="blond-checks"]')) || '').replace(/\s+/g, ' '); ok('조건 4 체크 = ✔ ✔ ✔ ✔', (ck.match(/✔/g) || []).length === 4, ck); await p.screenshot({ path: `${SHOTS}/blond-card.png` }); }
  // ①-2 처음 금발이 되는 저장 = 변신 컷인 한 번 (+9 → 🔨 +10 저장)
  await p.evaluate(() => { const m = JSON.parse(localStorage.getItem('citadel-v1-me')); m.enh = 9; m.wallet = { ...(m.wallet || {}), gem: 99999, scroll: 99 }; localStorage.setItem('citadel-v1-me', JSON.stringify(m)); localStorage.removeItem('citadel-v1-blond-seen'); });
  await p.reload(); await p.waitForSelector('.stage'); await p.waitForTimeout(800); await p.$eval('button[aria-label="내 용사 보기"]', (e) => e.click()); await p.waitForSelector('.mh');
  await p.screenshot({ path: `${SHOTS}/blond-mh9.png` }); await p.$eval('.mh .pmain', (e) => e.click()); await p.waitForTimeout(200); // 🔨 +1 고름
  const cut = p.waitForFunction(() => /각성한 로안/.test(document.body.innerText) && !!document.querySelector('.u-band, .u-sub'), null, { timeout: 6000 }).then(() => true).catch(() => false);
  await p.click('[aria-label="저장"]').catch(() => p.click('.mh .pmain')); await p.waitForTimeout(300);
  await p.$eval('.askbox .btn', (e) => e.click()).catch(() => {});
  ok('+10 저장 = 🌟 변신 컷인', await cut);
  await p.screenshot({ path: `${SHOTS}/blond-cutin.png` });
  await p.waitForTimeout(2500);
  // ② 수업 방
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('리모컨 ' + e));
  await t.goto(B + '?role=teacher'); await t.waitForSelector('.tp');
  await testOpen(t, { no: 6, mode: 'remote', bots: 0 });
  const live = await t.evaluate(() => window.__dbGet('school/live'));
  const s = await ctx.newPage(); s.on('pageerror', (e) => errs.push('폰 ' + e)); await s.goto(`${B}?role=student&room=${live.code}&as=test:3`); await s.waitForTimeout(3500);
  const pl = await t.evaluate((c) => Object.values(window.__dbGet(`rooms/${c}/players`) || {}).map((x) => ({ hero: x.hero, base: x.base, enh: x.enh, fx: x.fx })), live.code);
  ok('수업 방 players = 보이는 모습 16 · base 0', pl.some((x) => x.hero === 16 && x.base === 0), JSON.stringify(pl));
  await t.bringToFront(); await t.click('.tact .btn').catch(() => {}); await t.waitForTimeout(1500); // 수업 시작 → 종합실 레이드 줄
  const tv = await ctx.newPage(); await tv.setViewportSize({ width: 1280, height: 720 }); tv.on('pageerror', (e) => errs.push('TV ' + e)); const tvReq = []; tv.on('request', (r) => tvReq.push(r.url()));
  await tv.goto(`${B}?role=hall&room=${live.code}`); await tv.waitForTimeout(2500);
  await tv.click('button:has-text("앞으로")').catch(() => {}); await tv.waitForTimeout(3500); // 개념 → 문제 1 (레이드 줄에 용사)
  ok('종합실 전투 장면 = 금발 시트를 받음 (캔버스)', tvReq.some((u) => /hero-blond-v5\.webp/.test(u)), tvReq.filter((u) => /art\/heroes\//.test(u)).map((u) => u.split('/').pop()).join(' '));
  await tv.screenshot({ path: `${SHOTS}/blond-tv.png` });
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
