// 🎆 TV 이펙트 첫 묶음 (🔨 2026-11-13): 화려한 연출 끔(= 전) · 켬(= 후) 같은 장면 · 같은 공격 → 퍼펙트 맞힘 · 격파 순간 캡처 + 오류 0
//   NODE_PATH=$(npm root -g) node tools/e2e/tvjuice.cjs <폴더>   · 시험 고리: __tvJuice(on) · __tvAtk(k, kind, dmg, fx, ult, now, perfect) · __tvKill()
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), errs = [];
  const W = 1280, H = 720, hall = await (await b.newContext({ viewport: { width: W, height: H } })).newPage(); hall.on('pageerror', (e) => errs.push(String(e)));
  hall.on('console', (m) => { if (m.type() === 'error' && !/favicon|play\(\)|NotAllowed|Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 160)); });
  await hall.goto(B + '?role=hall&mode=test&room=TJ1'); await hall.waitForSelector('.dock');
  await hall.evaluate(() => window.__tvFake(1)); await hall.waitForTimeout(700);
  const next = async () => { await hall.mouse.move(W / 2, H / 2); await hall.click('.dock .go'); await hall.waitForTimeout(500); };
  await next(); await next(); for (let g = 0; g < 8 && !(await hall.$('.arena2')); g++) await next();
  await hall.waitForFunction(() => !document.querySelector('.sc'), null, { timeout: 12000 }).catch(() => {});
  await hall.evaluate(() => window.__tvFake(8)); await hall.waitForTimeout(2500);
  for (const [tag, on] of [['before', false], ['after', true]]) {
    const ok = await hall.evaluate((on) => window.__tvJuice(on), on); if (ok !== on) errs.push(`스위치 ${tag}`);
    await hall.evaluate(() => window.__tvAtk(0, 'hit', 3, 'cut', false, true, true));
    for (const t of [520, 140, 200]) { await hall.waitForTimeout(t); await hall.screenshot({ path: `${SHOTS}/juice-${tag}-perfect-${t}.png` }); }
    await hall.waitForTimeout(1800);
    await hall.evaluate(() => { window.__tvKill(); window.__tvAtk(1, 'hit', 2, 'slash', false, true, true); });
    for (const [i, t] of [560, 120, 120, 120, 200].entries()) { await hall.waitForTimeout(t); await hall.screenshot({ path: `${SHOTS}/juice-${tag}-kill-${i}.png` }); }
    await hall.waitForTimeout(2500);
    const js = await hall.evaluate(() => window.__tvJuiceStats()); console.log(`${tag}: 히트 스톱 ${js.stops} · 흔들림 최고 ${js.shake}단 · 충격파 ${js.wave ? '○' : '✗'} · 조각 ${js.shards} · 가장 멀리 ${Math.round(js.far)}px`);
    if (on && (!js.stops || js.shake < 3 || !js.wave || js.shards < 30 || js.far < 40)) errs.push('켬인데 연출 빠짐'); if (!on && (js.stops || js.wave)) errs.push('끔인데 연출');
  }
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
