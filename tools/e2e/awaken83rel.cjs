// 🚦 #83 정식(release) 빌드 확인 = 로안만 각성 + 새 연출(📜 11/20 선생님 a) · 녹스는 각성 안 됨 — awaken83.cjs 를 로안으로 바꾼 판
// (원본 설명) ⚡ #83 용사별 각성 (📜 2026-11-20) — 이 기기 저장 + 수업 방 + 종합실
//   ① 캠프: 녹스 +10 · 이클립스(Ⅳ) · 「혈월의 기사」 = 각성 모습 118 · 호칭 빼면 녹스(18)
//   ② 용사 바꾸기: 고른 용사 카드 아래 ⚡ 각성 칸 4칸 ✔ · 다른 용사 = 실루엣 · ✕ · 모루 꺼진 판 = 리라 「이 판에서는 각성 없음」
//   ③ +9 → +10 저장 = ⚡ 각성 컷인(금빛 이름 띠) 한 번
//   ④ 수업 방 players.hero = 118 · base = 18 · 종합실이 각성 시트를 받음 · 첫 필살기 = 각성 컷인 (화면 시험 고리)
//   NODE_PATH=$(npm root -g) node tools/e2e/awaken83.cjs <폴더> [주소]
const { chromium } = require('playwright');
const { testOpen } = require('./_cls.cjs');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('캠프 ' + e));
  const setMe = (o) => p.evaluate((o) => { const m = JSON.parse(localStorage.getItem('citadel-v1-me') || '{}'); m.hero = 0; m.enh = o.enh; m.title = o.title ?? 'slash10k'; m.socket = { ...(m.socket || {}), 0: 'twin', 18: 'eclipse' }; m.seen = { ...(m.seen || {}), hero: true }; m.test = true; m.wallet = { ...(m.wallet || {}), gem: 9999, scroll: 30, ver: 1, buys: [...new Set([...((m.wallet || {}).buys || []), 'hero_18', 'hero_11', 'fx_eclipse', 'fx_twin', 'fx_slash', 'fx_moon'])] }; localStorage.setItem('citadel-v1-me', JSON.stringify(m)); }, o);
  const art = (sel) => p.$eval(sel, (e) => [...e.querySelectorAll('[data-hero]')].map((h) => `hero=${h.dataset.hero}`).join(' ')).catch(() => '');
  await p.goto(B + '?role=camp&room=AW'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(2500);
  await setMe({ enh: 10, title: 'none' }); await p.reload(); await p.waitForSelector('.stage'); await p.waitForTimeout(600);
  ok('호칭 없으면 로안(0)', /hero=0\b/.test(await art('.hero-card .pic')));
  await setMe({ enh: 10 }); await p.reload(); await p.waitForSelector('.stage'); await p.waitForTimeout(800);
  const a10 = await art('.hero-card .pic'), camp = await p.$eval('[data-k="camp-hero"]', (e) => e.outerHTML).catch(() => '');
  ok('조건 4 = 각성한 로안 16 (카드)', /hero=16\b/.test(a10), a10);
  ok('캠프 용사 = 금발 시트', /blond/.test(camp) || /hero=16/.test(camp), (camp.match(/hero-[a-z0-9-]+\.webp/) || [''])[0]);
  ok('A2 캠프 카드 반짝임 + ✦ 금빛 이름', !!(await p.$('.hero-card.awk-shine')) && !!(await p.$('.hero-card .awk-name')));
  await p.screenshot({ path: `${SHOTS}/awk-camp.png` });
  await p.click('button[aria-label="내 용사 보기"]'); await p.waitForSelector('.mh');
  ok('내 용사 맨 위 = 16', /hero=16\b/.test(await art('.mh .top .pic')));
  await p.evaluate(() => { const x = [...document.querySelectorAll('.mh button')].find((b) => /용사 바꾸기|바꾸기/.test(b.textContent || '')); x && x.click(); }); await p.waitForTimeout(500);
  const box = ((await p.textContent('[data-k="awaken-box"]').catch(() => '')) || '').replace(/\s+/g, ' ');
  ok('⚡ 각성 칸(로안 카드) = 각성한 로안 · ✔ 4', /각성한 로안/.test(box) && (box.match(/✔/g) || []).length === 4, box);
  await p.screenshot({ path: `${SHOTS}/awk-box-on.png` });
  await p.click('.swc[aria-label^="녹스"]').catch(() => {}); await p.waitForTimeout(300);
  ok('정식: 녹스 카드엔 ⚡ 칸 없음', !(await p.$('[data-k="awaken-box"]')));
  await p.click('.swc[aria-label^="리라"]').catch(() => {}); await p.waitForTimeout(300);
  ok('정식: 리라 카드엔 ⚡ 칸 없음', !(await p.$('[data-k="awaken-box"]')));
  await p.screenshot({ path: `${SHOTS}/awk-box-off.png` });
  // ③ 처음 각성 = 컷인
  await setMe({ enh: 9 }); await p.evaluate(() => localStorage.removeItem('citadel-v1-blond-seen'));
  await p.reload(); await p.waitForSelector('.stage'); await p.waitForTimeout(800); await p.$eval('button[aria-label="내 용사 보기"]', (e) => e.click()); await p.waitForSelector('.mh');
  await p.$eval('.mh .pmain', (e) => e.click()); await p.waitForTimeout(200);
  const cut = p.waitForSelector('[data-k="awaken-cut"]', { timeout: 6000 }).then(() => true).catch(() => false);
  await p.click('[aria-label="저장"]').catch(() => p.click('.mh .pmain')); await p.waitForTimeout(300);
  await p.$eval('.askbox .btn', (e) => e.click()).catch(() => {});
  ok('+10 저장 = ⚡ 각성 컷인', await cut);
  await p.waitForTimeout(450); await p.screenshot({ path: `${SHOTS}/awk-cutin.png` });
  const band = await p.textContent('[data-k="awaken-cut"] .ak-band').catch(() => '');
  ok('컷인 띠 = 「⚡ 각성 로안」', /⚡ 각성 로안/.test(band || ''), band);
  await p.waitForTimeout(2000);
  // ④ 수업 방 · 종합실
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('리모컨 ' + e));
  await t.goto(B + '?role=teacher'); await t.waitForSelector('.tp');
  await testOpen(t, { no: 6, mode: 'remote', bots: 0 });
  const live = await t.evaluate(() => window.__dbGet('school/live'));
  const s = await ctx.newPage(); s.on('pageerror', (e) => errs.push('폰 ' + e)); await s.goto(`${B}?role=student&room=${live.code}&as=test:3`); await s.waitForTimeout(3500);
  const pl = await t.evaluate((c) => Object.values(window.__dbGet(`rooms/${c}/players`) || {}).map((x) => ({ hero: x.hero, base: x.base, enh: x.enh, fx: x.fx })), live.code);
  ok('수업 방 players = 16 · base 0', pl.some((x) => x.hero === 16 && x.base === 0), JSON.stringify(pl));
  await t.bringToFront(); await t.click('.tact .btn').catch(() => {}); await t.waitForTimeout(1500);
  const tv = await ctx.newPage(); await tv.setViewportSize({ width: 1280, height: 720 }); tv.on('pageerror', (e) => errs.push('TV ' + e)); const tvReq = []; tv.on('request', (r) => tvReq.push(r.url()));
  await tv.goto(`${B}?role=hall&room=${live.code}`); await tv.waitForTimeout(2500);
  await tv.click('button:has-text("앞으로")').catch(() => {}); await tv.waitForTimeout(3500);
  ok('종합실 = 금발 시트를 받음 · 녹스 각성 시트 안 받음', tvReq.some((u) => /hero-blond-v5\.webp/.test(u)) && !tvReq.some((u) => /awk-v5/.test(u)), tvReq.filter((u) => /art\/heroes\//.test(u)).map((u) => u.split('/').pop()).join(' '));
  await tv.screenshot({ path: `${SHOTS}/awk-tv.png` });
  // ⑤ TV 🌟 진필살기(시험 고리) = 첫 필살기 → 각성 컷인 → 일반 금빛 컷인 → ⚡ 각성 연출(녹스 = 핏빛 색조)
  const tcut = tv.waitForSelector('[data-k="awaken-cut"]', { timeout: 5000 }).then(() => true).catch(() => false);
  await tv.evaluate(() => window.__tvTrue?.(0));
  ok('TV 첫 필살기 = 각성 컷인', await tcut);
  const vfx = await tv.waitForSelector('[data-k="awk-vfx-blond"]', { timeout: 6000 }).then(() => true).catch(() => false);
  ok('TV 각성 연출 = 로안 전용 (광역 대신)', vfx);
  await tv.waitForTimeout(300); await tv.screenshot({ path: `${SHOTS}/awk-tv-vfx.png` });
  await tv.waitForTimeout(2500);
  const tcut2 = await tv.waitForSelector('[data-k="awaken-cut"]', { timeout: 2500 }).then(() => true).catch(() => false);
  await tv.evaluate(() => window.__tvTrue?.(0)); await tv.waitForTimeout(400);
  ok('두 번째 필살기 = 각성 컷인 없음', !(await tv.$('[data-k="awaken-cut"]')) && !tcut2);
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
