// ⚔ TV 용사 fx (🔨 2026-11-13): 정식 hall.js 처럼 학생 공격마다 같은 attack() — Pixi(캔버스 위 DOM 층 · 대역) · DOM(?dom) · 오라(캔버스 아래 층)
//   가상 용사 8명(스킬 · 강화 섞음) → __tvAtk(k) 근접 · 원거리 · 틀림 → 띠 그림(.tvfx .fx-spr) · 대역 돌진 · Pixi 용사 숨겼다 다시 · 오라 조각 수
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), errs = [];
  for (const dom of [false, true]) {
    const W = 1280, H = 720, hall = await (await b.newContext({ viewport: { width: W, height: H } })).newPage(); hall.on('pageerror', (e) => errs.push(String(e)));
    await hall.goto(B + `?role=hall&mode=test&room=TH${dom ? 'D' : 'P'}${dom ? '&dom' : ''}`); await hall.waitForSelector('.dock');
    await hall.evaluate(() => window.__tvFake(1)); await hall.waitForTimeout(700);
    const next = async () => { await hall.mouse.move(W / 2, H / 2); await hall.click('.dock .go'); await hall.waitForTimeout(500); };
    await next(); await next(); for (let g = 0; g < 8 && !(await hall.$('.arena2')); g++) await next();
    await hall.waitForFunction(() => !document.querySelector('.sc'), null, { timeout: 12000 }).catch(() => {});
    await hall.evaluate(() => window.__tvFake(8)); await hall.waitForTimeout(2800);
    const aura = await hall.$$eval('.arena2 .au-s', (x) => x.length);
    const run = (k, kind) => hall.evaluate(([k, kind]) => new Promise((res) => { window.__tvAtk(k, kind, 2); const t0 = performance.now(); let spr = 0, mv = 0, prox = 0; const f = () => { spr = Math.max(spr, document.querySelectorAll('.tvfx .fx-spr').length); prox = Math.max(prox, document.querySelectorAll('.tvfx .tvh').length); const hb = document.querySelector('.tvfx .tvh') || document.querySelector('.hr .art[style*="translate"]'); const t = hb && hb.style.translate; if (t) mv = Math.max(mv, Math.abs(parseFloat(t) || 0)); if (performance.now() - t0 < 1800) requestAnimationFrame(f); else res({ spr, mv: Math.round(mv), prox, left: document.querySelectorAll('.tvfx .tvh, .tvfx .tvm').length }); }; f(); }), [k, kind]);
    const tag = dom ? 'DOM' : 'Pixi';
    const r0 = run(0, 'hit'); await hall.waitForTimeout(450); await hall.screenshot({ path: `${SHOTS}/b54-tv-${tag}-hit.png` }); const a0 = await r0;
    const a1 = await run(1, 'hit'); const a2 = await run(2, 'miss');
    console.log(`${tag}: 오라 조각 ${aura} · 근접(0) 띠 ${a0.spr} 돌진 ${a0.mv}px 대역 ${a0.prox} 남음 ${a0.left} · 원거리(1) 띠 ${a1.spr} · 틀림(2) 띠 ${a2.spr}`);
    if (!a0.spr || !a0.mv || a0.left || !aura) errs.push(`${tag} 공격 · 오라`);
    await hall.close();
  }
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
