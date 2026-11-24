// 🥏 쉼터 놀이 「알까기 난장판」 (📜 2026-11-24) — 이 기기 저장 · 🧪 테스트 리모컨 + 🤖 5 + 학생 폰 1 + 종합실
//   리모컨 🏕 → 🥏 고르기 → ▶ 시작(모이기) → 폰 🙋 참가 · 🤖 참가 → 리모컨 ▶ 출발 → 준비 → 150박자(폰 = 판 당겼다 놓기 · 점선 미리 보기) → 결과(순위 · 💎)
//   NODE_PATH=$(npm root -g) node tools/e2e/alkkagi1124.cjs <폴더> [주소]
const { chromium } = require('playwright');
const { testOpen } = require('./_cls.cjs');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { window.__AK_SPEED = 0.25; }); // 박자 0.25초 · 준비 1.25초 (화면 시험만 · 판 안 1초는 그대로)
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('리모컨 ' + e));
  const txt = async (p, s) => ((await p.textContent(s).catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  const fun = async (code) => t.evaluate((c) => window.__dbGet(`rooms/${c}/fun`), code);
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tp'); await t.evaluate(() => { window.__botSpeed = 4; });
  await testOpen(t, { no: 6, mode: 'remote', bots: 5 }); await t.waitForSelector('[data-k="bots"]');
  const live = await t.evaluate(() => window.__dbGet('school/live'));
  const s = await ctx.newPage(); s.on('pageerror', (e) => errs.push('폰 ' + e)); await s.goto(`${B}?role=student&room=${live.code}&as=${live.cls === 'test' ? 'test' : live.cls}:3`); await s.waitForTimeout(2500);
  const tv = await ctx.newPage(); await tv.setViewportSize({ width: 1280, height: 720 }); tv.on('pageerror', (e) => errs.push('TV ' + e));
  await t.bringToFront(); await t.click('.tact .btn'); await t.waitForTimeout(800);
  await t.click('[data-slot="rest"]'); await t.waitForSelector('.game');
  ok('🏕 놀이 목록에 🥏 알까기', /알까기/.test(await txt(t, '.games')), await txt(t, '.games'));
  await t.click('.game:has-text("알까기")'); await t.click('.rbig'); await t.waitForTimeout(800);
  ok('▶ 시작 = 모이기', (await fun(live.code))?.phase === 'join');
  await s.bringToFront();
  await s.waitForSelector('[data-k="ak-join"]', { timeout: 10000 }); await s.click('[data-k="ak-join"]'); await s.waitForTimeout(600);
  ok('폰 🙋 참가 → 「참가했어요」', !!(await s.$('[data-k="ak-joined"]')));
  await tv.goto(`${B}?role=hall&room=${live.code}`); await tv.waitForTimeout(2500);
  ok('종합실 = 참가 n명', /참가 \d+명/.test(await txt(tv, '[data-k="ak-tv-join"]')), await txt(tv, '[data-k="ak-tv-join"]'));
  await t.bringToFront(); await t.waitForTimeout(3500);
  if (!(await t.$('[data-k="ak-go"]'))) await t.click('[data-slot="rest"]').catch(() => {});
  await t.click('[data-k="ak-go"]', { timeout: 5000 }); await t.waitForTimeout(800);
  const f1 = await fun(live.code);
  ok('▶ 출발 = 📜 판 반지름 = 2 × max(5.5, 2 + 1.2√인원) · 반지름 절반 원 위', ['ready', 'play'].includes(f1?.phase) && Object.keys(f1.st || {}).length >= 2 && Math.abs(f1.R - 2 * Math.max(5.5, 2 + 1.2 * Math.sqrt(Object.keys(f1.st).length))) < 0.01 && Object.values(f1.st).every((x) => Math.abs(Math.hypot(x.x, x.y) - f1.R / 2) < 0.05), `${f1?.phase} ${f1?.R} ${Object.keys(f1?.st || {}).length}명`);
  await s.bringToFront(); await s.waitForSelector('[data-k="ak-board"]', { timeout: 10000 });
  for (let i = 0; i < 40; i++) { const f = await fun(live.code); if (f?.phase === 'play' && f.st?.s1_6_3?.on && !(f.st.s1_6_3.cd > 0)) break; await s.waitForTimeout(100); }
  // 당기기 = 판 가운데에서 왼쪽 아래로 → 오른쪽 위로 날아감 · 점선 미리 보기
  const bx = await s.$eval('[data-k="ak-board"]', (c) => { const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; });
  await s.mouse.move(bx.x, bx.y); await s.mouse.down(); await s.mouse.move(bx.x - bx.w * 0.12, bx.y + bx.w * 0.12, { steps: 4 }); await s.waitForTimeout(120);
  const dashed = await s.$eval('[data-k="ak-board"]', (c) => { const g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data; let w = 0, r = 0; for (let i = 0; i < d.length; i += 16) { if (d[i] > 240 && d[i + 1] > 240 && d[i + 2] > 240) w++; if (d[i] > 240 && d[i + 1] < 100 && d[i + 2] < 100) r++; } return w + r; });
  ok('당기는 동안 = 점선 미리 보기(흰색 · 판 밖이면 빨강)', dashed > 20, `${dashed}`);
  await s.screenshot({ path: `${SHOTS}/ak-phone-aim.png` });
  ok('📜 폰 = 따라가는 창 · ＋ / － / ⛶ 단추', (await s.$$('[data-k="ak-zoom"] button')).length === 3);
  await s.mouse.up(); await s.waitForTimeout(150);
  const shot = await t.evaluate(([c, g]) => window.__dbGet(`rooms/${c}/fv/ak${g}/s1_6_3`), [live.code, f1.g]);
  ok('놓음 = 발사 저장(각도 · 세기 0 ~ 2 · 번호)', shot && typeof shot.a === 'number' && [0, 1, 2].includes(shot.p) && shot.n >= 1, JSON.stringify(shot));
  await s.waitForTimeout(700);
  const me = (await fun(live.code))?.st?.s1_6_3;
  ok('다음 박자 = 내 알 날아감 · 쉬는 4초 (또는 판 밖으로 떨어짐)', me && me.n >= 1 && (me.cd > 0 || me.on === 0), JSON.stringify(me));
  ok('폰 = 「쉬는 중」 또는 「날아가는 중」', /쉬는 중|날아가는 중|다시 나와요/.test(await txt(s, '[data-k="ak-hint"]')), await txt(s, '[data-k="ak-hint"]'));
  await tv.bringToFront(); await tv.waitForTimeout(600); await tv.screenshot({ path: `${SHOTS}/ak-tv.png` });
  ok('종합실 = 판 · 남은 시간 · 순위', !!(await tv.$('[data-k="ak-tv-board"]')) && /남은 \d+초/.test(await txt(tv, '[data-k="ak-tv-time"]')) && (await tv.$$('[data-k="ak-tv"] .rank li')).length >= 2, await txt(tv, '[data-k="ak-tv-time"]'));
  await t.bringToFront();
  for (let i = 0; i < 120; i++) { const f = await fun(live.code); if (!f || f.phase === 'end') break; await t.waitForTimeout(1000); }
  const fe = await fun(live.code);
  ok('150초 뒤 결과 · 순위 · 점수 (봇이 쏘고 맞힘)', fe?.phase === 'end' && fe.gt >= 150 && Object.keys(fe.rank || {}).length >= 2 && Object.values(fe.sc || {}).some((v) => v > 0), `${fe?.phase} ${fe?.gt} ${JSON.stringify(fe?.sc)}`);
  await s.bringToFront(); await s.waitForTimeout(1500);
  ok('폰 결과 = 내 등수 · 점수', /등 · \d+점|1등/.test(await txt(s, '[data-k="ak-res"]')), await txt(s, '[data-k="ak-res"]'));
  const gift = await t.evaluate(() => { const g = window.__dbGet('gifts/s1_6_3') || {}; return Object.entries(g).filter(([k]) => k.startsWith('ak')).map(([, v]) => v.g); });
  ok('💎 = 1등 30 · 2 · 3등 20 · 참가 10 (선물 칸)', gift.length === 1 && [10, 20, 30].includes(gift[0]), JSON.stringify(gift));
  await s.screenshot({ path: `${SHOTS}/ak-end.png` }); await tv.bringToFront(); await tv.waitForTimeout(600); await tv.screenshot({ path: `${SHOTS}/ak-tv-end.png` });
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
