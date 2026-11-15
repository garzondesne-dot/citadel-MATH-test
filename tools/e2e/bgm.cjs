// 🎵 배경음 되살림 (📜 2026-11-14 · 정식 hallBgm · ui.js 그대로)
//   ① 학생 첫 화면 · 캠프 = camp · 📋 게시판 · 🎯 허수아비 = 없음 ② TV 대기실 lobby · 개념 없음 · 몬스터마다 raid-1 → 2 → 3 · 보스 boss-1|2 · 🎚 전투 음량 10%부터
//   ③ 📄 문제 창 = 멈춤 + duck · 🎮 시연 = duck 10% · ④ TV 🔇 = 없음 ⑤ 수업 끝 = 없음
//   사용: NODE_PATH=$(npm root -g) node tools/e2e/bgm.cjs <폴더>
const { chromium } = require('playwright');
const [SHOTS = '.'] = process.argv.slice(2), B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }), errs = [], out = [];
  const ok = (n, c, i = '') => { console.log(`${c ? '✅' : '❌'} ${n}`); out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const dock = async (p, name) => { await p.mouse.move(700, 500); await p.mouse.move(800, 450); await p.waitForTimeout(250); await p.click(`nav.dock .t:has-text("${name}")`, { timeout: 5000 }); };
  const ctx = await b.newContext(), now = (p) => p.evaluate(() => window.__bgm && window.__bgm());
  // ① 학생 폰
  const ph = await ctx.newPage(); await ph.setViewportSize({ width: 390, height: 844 }); ph.on('pageerror', (e) => errs.push(String(e)));
  await ph.goto(B); await ph.evaluate(() => { localStorage.clear(); localStorage.setItem('citadel-sound', JSON.stringify({ sfx: true, bgm: true })); }); await ph.reload(); // 🔇 학생 폰 처음 = 끔 (11/15) → 켠 학생 기준 await ph.waitForTimeout(1500);
  let v = await now(ph); ok('① 첫 화면 = camp', v && v.phone === 'camp' && v.playing === 'camp', JSON.stringify(v));
  await ph.goto(B + '?role=camp'); await ph.waitForTimeout(1500);
  v = await now(ph); ok('① 캠프 = camp 이어서', v && v.playing === 'camp' && v.vol > 0, JSON.stringify(v));
  await ph.close();
  // ② TV
  const t = await ctx.newPage(); await t.setViewportSize({ width: 400, height: 860 }); t.on('pageerror', (e) => errs.push(String(e)));
  await t.goto(B + '?role=teacher'); await t.waitForSelector('.tabs');
  await t.click('.tabs button:has-text("준비")'); await t.click('[data-k="lpick-go"]'); await t.click('[data-k="lpick"] .grid [data-id="set-02"]'); await t.click('.tact .btn'); await t.waitForSelector('.att');
  const code = await t.evaluate(() => window.__dbGet('school/live').code);
  const s = await ctx.newPage(); await s.setViewportSize({ width: 390, height: 844 }); await s.goto(`${B}?role=student&room=${code}&as=1-1:3`); await s.waitForTimeout(2000);
  v = await now(s); ok('① 수업 중 학생 폰 = 배경음 없음', !v || !v.playing, JSON.stringify(v));
  const tv = await ctx.newPage(); await tv.setViewportSize({ width: 1600, height: 900 }); tv.on('pageerror', (e) => errs.push(String(e)));
  await tv.goto(`${B}?role=hall&room=${code}`); await tv.waitForSelector('nav.dock', { timeout: 20000 }); await tv.waitForTimeout(1500);
  v = await now(tv); ok('② 대기실 = lobby', v && v.playing === 'lobby', JSON.stringify(v));
  await t.waitForFunction(() => !document.querySelector('.tact .btn')?.disabled, null, { timeout: 15000 });
  const seq = []; let sheetDone = false;
  for (let g = 0; g < 30; g++) {
    const st = await t.evaluate(() => { const L = window.__dbGet('school/live'), R = window.__dbGet(`rooms/${L.code}`); return { i: R.state.step, lobby: R.state.lobby }; });
    const kind = await tv.evaluate(() => document.querySelector('.h-stp .on, [data-k="stepkind"]')?.textContent || '');
    await tv.waitForTimeout(900); v = await now(tv); seq.push(`${st.i}:${v.tv ?? '-'}${v.scale !== 1 ? `@${v.scale}` : ''}`);
    if (v.tv === 'raid-1' && !sheetDone) { sheetDone = true;
  await dock(tv, '문제'); await tv.waitForTimeout(900);
  v = await now(tv); ok('③ 📄 문제 창 = 멈춤(hold) + duck', v && v.hold.includes('tv') && v.duck && !v.playing, JSON.stringify(v));
  await dock(tv, '문제'); await tv.waitForTimeout(1200);
  v = await now(tv); ok('③ 닫으면 다시 · duck 풀림', v && !v.hold.length && !v.duck && /raid/.test(v.playing || ''), JSON.stringify(v));
    }
    if (v.tv && v.tv.startsWith('boss')) break;
    const lab = await t.textContent('.tact .btn'); if (/마무리|끝/.test(lab)) break;
    await t.click('.tact .btn'); await t.waitForTimeout(500);
  }
  const s2 = seq.join(' ');
  ok('② 개념 · 도입 = 없음 · 몬스터마다 raid-1 → raid-2 → …', /:-/.test(s2) && /raid-1/.test(s2) && /raid-2/.test(s2) && s2.indexOf('raid-1') < s2.indexOf('raid-2'), s2);
  ok('② 보스 = boss-1|2', /boss-[12]/.test(s2), s2);
  ok('② 🎚 전투 음량 = 체력 100% 에서 10%', /raid-1@0\.1\b/.test(s2), s2);
  // ③ 🎮 시연 (보스 단계)
  await dock(tv, '시연'); await tv.waitForTimeout(1200);
  v = await now(tv); ok('③ 🎮 시연 = duck 10% (곡은 그대로)', v && v.duck && /boss/.test(v.playing || '') && v.vol < 0.05, JSON.stringify(v));
  await tv.screenshot({ path: `${SHOTS}/bgm-demo.png` });
  await tv.click('.dp button:has-text("닫기")').catch(() => dock(tv, '시연').catch(() => {})); await tv.waitForTimeout(1000);
  // ④ TV 🔇
  await tv.click('[data-k="tvset"]').catch(() => {}); await tv.waitForTimeout(300);
  await tv.click('button[role="menuitemcheckbox"]:has-text("소리")').catch(() => {}); await tv.waitForTimeout(1200);
  v = await now(tv); ok('④ TV 🔇 = 곡 없음', v && !v.tv, JSON.stringify(v));
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
