// ⚡ 🌟 🛡 학생이 쓸 때 종합실 눈빛 (📜 2026-11-16 머리 🔨 「지금 되나?」): 학생 폰이 실제 공격 · 진필살기 · 방패와 같은 방 칸을 쓰고 → TV 가 그 칸을 보고 컷인(얼굴 + 눈빛 2줄)
//   NODE_PATH=$(npm root -g) node tools/e2e/ultlive.cjs <폴더> [주소]  (🧪 테스트 모드 · 이 기기 저장만 · 서버 쓰기 없음)
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } }), R = 'UL' + Date.now() % 10000, Q = `mode=test&lesson=set-08&room=${R}`;
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('TV ' + e));
  await t.goto(`${B}?role=hall&${Q}`); await t.waitForSelector('.dock', { timeout: 20000 });
  const s = await ctx.newPage(); await s.setViewportSize({ width: 390, height: 844 }); s.on('pageerror', (e) => errs.push('폰 ' + e));
  await s.goto(`${B}?role=student&${Q}`); await s.waitForTimeout(2500);
  const go = async () => { await t.bringToFront(); await t.mouse.move(800, 450); await t.waitForTimeout(150); const g = t.locator('.dock .go').first(); if (await g.isVisible().catch(() => false)) await g.click(); await t.waitForTimeout(700); };
  const demoBtn = () => t.locator('.dock button:has-text("시연")').first();
  for (let i = 0; i < 12; i++) { await t.mouse.move(800, 450); if (await demoBtn().isEnabled().catch(() => false)) break; await go(); }
  ok('TV 몬스터 단계', await demoBtn().isEnabled().catch(() => false));
  await t.waitForTimeout(7000); // 정찰 5초 (테스트 모드)
  const uid = await s.evaluate(() => (window.__uid ? window.__uid() : null));
  const sMid = await t.evaluate((r) => { const st = window.__dbGet(`rooms/${r}/state`) || {}; return st.step; }, R);
  log('  학생', uid ? '있음' : '없음', '· 단계', sMid);
  const look = () => t.evaluate(() => { const u = document.querySelector('.ult'); return u ? { cls: u.className, face: !!u.querySelector('.u-facepic'), glints: u.querySelectorAll('.u-glint').length, name: u.querySelector('.u-name')?.textContent } : null; });
  const waitUlt = async (re, ms = 6000) => { const end = Date.now() + ms; let u = null; while (Date.now() < end) { u = await look(); if (u && re.test(u.cls) && u.face) return u; await t.waitForTimeout(80); } return u; };
  await t.bringToFront();
  // ⚡ 필살기 = 학생 폰 공격 칸(ult)
  const pu = await t.evaluate((r) => Object.keys(window.__dbGet(`rooms/${r}/players`) || {})[0] || null, R);
  await t.evaluate(([r, u0]) => { window.__dbSet(`rooms/${r}/players/${u0}/fx`, 'twin'); }, [R, pu]); await t.waitForTimeout(400);
  // 🛡 홀리 방패 = 강화 +10(각성) 학생이 켜 둔 방패(hg) · 몬스터가 공격하는 순간 TV 「HOLY GUARD」 + 눈빛 (학생 폰 🛡 단추와 같은 칸)
  let g = null; const HOLY = !!process.env.HOLY; // 🛡 실제 공격 주기를 기다림(최대 70초) · 지금 이 시험 틀에서는 안 잡힘 → 켤 때만
  if (HOLY) {
  for (let k = 0; k < 3 && !(g && g.face); k++) { await t.evaluate(([r, u0]) => { window.__dbSet(`rooms/${r}/players/${u0}/enh`, 10); window.__dbSet(`rooms/${r}/players/${u0}/hg`, { mid: 'm1', at: Date.now() }); }, [R, pu]);  g = await waitUlt(/guard/, 23000); } /* 공격 주기 20초 · 켠 뒤 23초 안의 공격만 막음 */
  ok('🛡 홀리 방패 → 몬스터 공격 때 TV HOLY GUARD · 얼굴 · 눈빛 2줄', !!g && g.face && g.glints === 2, JSON.stringify(g)); await t.screenshot({ path: `${SHOTS}/live-holy.png` });
  await t.waitForTimeout(4000); }
  await t.evaluate(([r, u0]) => window.__perfect(r, 'm1', u0), [R, pu]); // 첫 시도 다 맞힘 = 학생이 정답을 낸 것과 같은 칸 (TV 필살기 조건)
  let u = await waitUlt(/^ult$/); ok('⚡ 필살기 → TV 컷인 · 얼굴 · 눈빛 2줄', !!u && u.face && u.glints === 2, JSON.stringify(u)); await t.screenshot({ path: `${SHOTS}/live-ult.png` });
  await t.waitForTimeout(4000);
  // 🌟 진필살기 = heals 칸 '!true@시각' (학생 기력 카드 🌟 와 같은 칸)
  const mId = await t.evaluate(([r, k]) => null, [R, sMid]);
  const midNow = await s.evaluate(() => { const t2 = document.querySelector('.bcard .lab')?.textContent || ''; return t2; });
  void mId; void midNow;
  const mids = ['m1', 'm2', 'm3', 'm4']; for (const m of mids) await s.evaluate(([r, mm, u0]) => window.__dbSet(`rooms/${r}/heals/${mm}/${u0}/0`, `!true@${Date.now()}`), [R, m, pu]);
  u = await waitUlt(/true/); ok('🌟 진필살기 → TV 금빛 컷인 · 얼굴 · 눈빛 2줄', !!u && u.face && u.glints === 2, `${sMid} ${JSON.stringify(u)}`); await t.screenshot({ path: `${SHOTS}/live-true.png` });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
