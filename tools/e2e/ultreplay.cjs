// 🐞 필살기 · 공격 다시 재생 (📜 2026-11-15 머리 🔨): 개념 단계 → 다음 몬스터에서 앞 몬스터의 필살기 · 공격이 또 나옴
//   ① TV 🎮 시연 폰: 시연 필살기 → 시연 닫기 → 다음 단계 → 시연 다시 열기 = 재생 0번
//   ② 학생 폰(이 기기 테스트): 몬스터 1 필살기 → 개념(장면 사라짐) → 몬스터 2(장면 새로) = 재생 0번 · 새 공격은 1번
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push(String(e)));
  await t.goto(`${B}?role=hall&mode=test&room=UR1`); await t.waitForSelector('.dock', { timeout: 20000 }); await t.evaluate(() => window.__tvFake && window.__tvFake(3)); await t.waitForTimeout(600);
  const plays = (pg) => pg.evaluate(() => window.__atkPlays || 0);
  const go = async () => { await t.mouse.move(800, 450); await t.waitForTimeout(150); const g = t.locator('.dock .go').first(); if (await g.isVisible().catch(() => false)) await g.click(); await t.waitForTimeout(700); };
  const demoBtn = () => t.locator('.dock button:has-text("시연")').first();
  // 몬스터 단계까지 (시연 단추가 켜질 때까지)
  for (let i = 0; i < 12; i++) { await t.mouse.move(800, 450); if (await demoBtn().isEnabled().catch(() => false)) break; await go(); }
  ok('TV 몬스터 단계 (시연 가능)', await demoBtn().isEnabled().catch(() => false));
  // 🧑‍🏫 선생님 일격 = 시연 다 맞힘과 같은 길(tstrike) · 이 기기 시계가 서버보다 60초 앞선 것처럼(정식 교실 PC 에서 생긴 엇갈림)
  const st = (pg) => pg.evaluate(() => window.__tstrikes || 0);
  const k0 = await st(t); await t.evaluate(() => { const r = Date.now; Date.now = () => r() + 60000; window.__tvStrikeSet(true); Date.now = r; }); await t.waitForTimeout(1200);
  ok('① 시연 필살기 일격 1번', (await st(t)) === k0 + 1, `${k0} → ${await st(t)}`);
  await t.waitForTimeout(3000); const k1 = await st(t); let moved = 0;
  for (let i = 0; i < 6; i++) { await go(); moved++; await t.waitForTimeout(500); if (moved >= 2 && await demoBtn().isEnabled().catch(() => false)) break; }
  await t.waitForTimeout(2500);
  ok('① 개념 → 다음 몬스터 = 지난 일격 재생 0번', (await st(t)) === k1, `${k1} → ${await st(t)} · 단계 ${moved}번 넘김`);
  await t.screenshot({ path: `${SHOTS}/ultreplay-tv.png` });
  // ② 학생 폰 = 같은 방 (이 기기 · 같은 브라우저)
  const s = await ctx.newPage(); await s.setViewportSize({ width: 390, height: 844 }); s.on('pageerror', (e) => errs.push(String(e)));
  await s.goto(`${B}?role=student&mode=test&room=UR1`); await s.waitForTimeout(3000);
  const scene = () => s.evaluate(() => !!document.querySelector('.scene, .edge, [data-k="scene"]'));
  const q0 = await plays(s); await s.evaluate(() => window.__heroAtk({ miss: false, hits: 3, ult: true })); await s.waitForTimeout(600);
  log(`   학생 장면 있음 ${await scene()} · 재생 ${q0} → ${await plays(s)}`);
  // 학생 폰 장면을 내렸다 다시 올림 = 페이지 안에서 다시 열기 (개념 단계와 같은 길: 장면 컴포넌트가 새로 생김)
  await t.bringToFront(); for (let i = 0; i < 3; i++) await go();
  await s.bringToFront(); await s.waitForTimeout(2500); const q1 = await plays(s);
  await t.bringToFront(); for (let i = 0; i < 3; i++) await go();
  await s.bringToFront(); await s.waitForTimeout(3000);
  ok('② 학생 폰 단계가 바뀌어도 앞 필살기 재생 0번', (await plays(s)) === q1, `${q1} → ${await plays(s)}`);
  await s.evaluate(() => window.__heroAtk({ miss: false, hits: 1 })); await s.waitForTimeout(600);
  ok('② 새 공격은 1번', (await plays(s)) === q1 + ((await scene()) ? 1 : 0), `${q1} → ${await plays(s)} (장면 ${await scene()})`);
  await s.screenshot({ path: `${SHOTS}/ultreplay-phone.png` });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
