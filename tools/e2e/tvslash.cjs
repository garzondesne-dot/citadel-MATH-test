// ⚔ 새 스킬 fx 시제품 「⚔ 베기 Ⅰ~Ⅳ」 TV (?newfx · Pixi): 1명 Ⅰ~Ⅳ 캡처(움직임 몇 칸) · 지금 띠와 나란히 · 30명 동시 성능(CPU 4배 느리게 · 1920 × 1080 · 평균 · 최저 fps · 최장 프레임 ms · 덜어 낸 단계)
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
const FX = ['cut', 'moon', 'slash', 'twin'];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), errs = [];
  const open = async (newfx, W, H, room) => {
    const hall = await (await b.newContext({ viewport: { width: W, height: H } })).newPage(); hall.on('pageerror', (e) => errs.push(String(e)));
    await hall.goto(B + `?role=hall&mode=test&room=${room}${newfx ? '&newfx' : ''}`); await hall.waitForSelector('.dock');
    await hall.evaluate(() => window.__tvFake(1)); await hall.waitForTimeout(700);
    const next = async () => { await hall.mouse.move(W / 2, H / 2); await hall.click('.dock .go'); await hall.waitForTimeout(500); };
    await next(); await next(); for (let g = 0; g < 8 && !(await hall.$('.arena2')); g++) await next();
    await hall.waitForFunction(() => !document.querySelector('.sc'), null, { timeout: 12000 }).catch(() => {});
    return hall;
  };
  // ① 1명 · Ⅰ~Ⅳ · 지금 ↔ 새 것 · 칸 몇 장 (GPU 없는 곳에선 시각이 밀려 쓸모없음 → 결정적 비교는 tools/fxbake/compare.cjs · SKIP1=1 이면 건너뜀)
  if (!process.env.SKIP1) for (const newfx of [false, true]) {
    const hall = await open(newfx, 1280, 720, `TS${newfx ? 'N' : 'O'}`); await hall.evaluate(() => window.__tvFake(1)); await hall.waitForTimeout(2500);
    for (let t = 0; t < 4; t++) {
      await hall.evaluate(([fx, ult]) => window.__tvAtk(0, 'hit', 3, fx, ult, true), [FX[t], t === 3]);
      const at = t === 3 ? [1400, 1550, 1700, 1850, 2000, 2200] : [330, 420, 500, 580, 680, 800];
      let last = 0; for (let i = 0; i < at.length; i++) { await hall.waitForTimeout(at[i] - last); last = at[i]; await hall.screenshot({ path: `${SHOTS}/slash-${newfx ? 'new' : 'old'}-${t + 1}-${i}.png`, clip: { x: 300, y: 120, width: 680, height: 420 } }); }
      await hall.waitForTimeout(2500);
    }
    await hall.close();
  }
  // ② 30명 동시 · CPU 4배 느리게 · 1080p
  for (const rate of (process.env.RATES || '1,4').split(',').map(Number)) for (const newfx of [false, true]) {
    const hall = await open(newfx, 1920, 1080, `TP${newfx ? 'N' : 'O'}`); await hall.evaluate(() => window.__tvFake(30)); await hall.waitForTimeout(3500);
    const cdp = await hall.context().newCDPSession(hall); await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    const m = hall.evaluate(() => new Promise((res) => { const ts = []; let last = performance.now(); const t0 = last; const f = (t) => { ts.push(t - last); last = t; if (t - t0 < 4000) requestAnimationFrame(f); else { const fps = ts.map((d) => 1000 / d); res({ avg: Math.round(1000 / (ts.reduce((a, d) => a + d, 0) / ts.length)), min: Math.round(Math.min(...fps.slice(2))), worst: Math.round(Math.max(...ts.slice(2))), st: window.__slash?.stats?.() }); } }; requestAnimationFrame(f); }));
    await hall.evaluate((FX) => { for (let k = 0; k < 30; k++) window.__tvAtk(k, 'hit', 2, FX[k % 4], false, true); }, FX);
    await hall.waitForTimeout(700); await hall.screenshot({ path: `${SHOTS}/slash-${newfx ? 'new' : 'old'}-30.png` });
    const r = await m; await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    console.log(`${newfx ? '새 것' : '지금 띠'} 30명 동시 (CPU ×${rate} · 1080p): 평균 ${r.avg}fps · 최저 ${r.min}fps · 최장 프레임 ${r.worst}ms${r.st ? ` · 단계 ${r.st.level} · 동시 ${r.st.live} · 줄 ${r.st.queue}` : ''}`);
    await hall.close();
  }
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.slice(0, 4).join('\n')}` : '✅ 오류 0'); await b.close();
})();
