// #157 📺 TV 전투 장면 (PixiJS) · 글꼴 4 크기 · 2 굵기 · 학생 폰 번들에 PixiJS 없음
//   종합실 테스트 모드 → 첫 몬스터 · 가상 학생 1 · 15 · 26 명 · 1920 × 1080 / 1280 × 720 캡처 · ?dom 대체 장면도 한 장
//   글자: TV 안 보이는 글자 칸(캔버스 밖)의 font-size · font-weight 종류 ≤ 4 · ≤ 2
// 사용: npm run build → npx vite preview --port 4173 → NODE_PATH=$(npm root -g) node tools/e2e/tvarena.cjs <그림 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
const B = 'http://localhost:4173/';
const log = (...a) => console.log(...a);
const FONTS = () => {
  const sz = new Set(), wt = new Set(), bad = [];
  for (const el of document.querySelectorAll('.tv *')) {
    if (el.closest('.dpane') || el.closest('canvas')) continue; // 🎮 시연 칸 = 학생 폰 그대로(폰 규칙)
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    let p = el, hid = false; while (p) { const c = getComputedStyle(p); if (+c.opacity === 0 || c.visibility === 'hidden') { hid = true; break; } p = p.parentElement; } if (hid) continue;
    sz.add(Math.round(parseFloat(cs.fontSize))); wt.add(cs.fontWeight); bad.push(`${el.className || el.tagName}:${Math.round(parseFloat(cs.fontSize))}/${cs.fontWeight}`);
  }
  return { sz: [...sz].sort((a, b) => a - b), wt: [...wt].sort(), list: bad.slice(0, 40) };
};
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), errs = [];
  // ① 학생 폰: PixiJS 를 받지 않음
  { const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), p = await ctx.newPage(), got = [];
    p.on('request', (r) => got.push(r.url()));
    await p.goto(B + '?role=camp&room=TVP'); await p.waitForSelector('.stage'); await p.waitForTimeout(800);
    const px = got.filter((u) => /pixi|arena-|pixi\.js/i.test(u));
    const js = got.filter((u) => /\.js(\?|$)/.test(u)).map((u) => u.split('/').pop());
    log('① 학생 폰 스크립트:', js.join(' '), '| PixiJS:', px.length ? px.join(' ') : '없음'); if (px.length) errs.push('학생 폰이 PixiJS 를 받음');
    await ctx.close(); }
  for (const [W, H] of [[1920, 1080], [1280, 720]]) {
    for (const dom of [false, true]) {
      if (dom && W !== 1920) continue;
      const ctx = await b.newContext({ viewport: { width: W, height: H } }), hall = await ctx.newPage();
      hall.on('pageerror', (e) => errs.push(String(e)));
      const code = `TA${W}${dom ? 'D' : ''}`;
      await hall.goto(B + `?role=hall&mode=test&room=${code}${dom ? '&dom' : ''}`); await hall.waitForSelector('.dock');
      await hall.evaluate(() => window.__tvFake(1)); await hall.waitForTimeout(700);
      const next = async () => { await hall.mouse.move(W / 2, H / 2); await hall.click('.dock .go'); await hall.waitForTimeout(500); };
      await next(); await next(); // 교사 캠프 → 대기실 → 시작
      for (let g = 0; g < 8 && !(await hall.$('.arena2')); g++) await next();
      await hall.waitForFunction(() => !document.querySelector('.sc'), null, { timeout: 12000 }).catch(() => {}); await hall.waitForTimeout(600);
      for (const n of dom ? [15] : [1, 15, 26]) {
        await hall.evaluate((n) => window.__tvFake(n), n); await hall.waitForTimeout(2600);
        const a = await hall.evaluate(() => ({ mode: window.__arena?.mode, mon: window.__arena?.box?.mon, n: window.__arena?.party?.length, s: window.__arena?.party?.[0]?.s }));
        log(`${W}×${H}${dom ? ' DOM' : ''} · ${n}명: 그리기 ${a.mode} · 몬스터 ${Math.round(a.mon.size)}px(높이의 ${Math.round((a.mon.size / H) * 100)}%) · 용사 ${a.n} · 배율 ${a.s?.toFixed(2)}`);
        if (a.mode !== (dom ? 'dom' : 'pixi')) errs.push(`${W} ${n}명 그리기 ${a.mode}`);
        if (a.n !== n) errs.push(`${W} ${n}명 용사 ${a.n}`);
        await hall.mouse.move(W / 2, H / 2); await hall.waitForTimeout(200); // 조작 막대 보이게
        await hall.screenshot({ path: `${SHOTS}/b39-tv-${W}-${n}${dom ? '-dom' : ''}.png` });
        if (n === 15 && !dom) {
          const f = await hall.evaluate(FONTS); log(`   글자 크기 ${f.sz.join(' · ')}px (${f.sz.length}) · 굵기 ${f.wt.join(' · ')} (${f.wt.length})`);
          if (f.sz.length > 4 || f.wt.length > 2) { errs.push(`${W} 글자 ${f.sz.length} · 굵기 ${f.wt.length}`); log('   ', f.list.join(' | ')); }
        }
      }
      // 🎮 시연 = 학생 폰 틀 그대로: 폰 틀 안 노란 주요 단추 = 56 · 바닥 20 (틀 기준 · 배율 나눔) + 같은 문제 학생 폰과 나란히
      if (!dom && W === 1920) {
        await hall.mouse.move(W / 2, H / 2); await hall.click('.dock .t:has-text("시연")'); await hall.waitForSelector('.dpane .phone .pmain'); await hall.waitForTimeout(800);
        const d = await hall.evaluate(() => { const ph = document.querySelector('.dpane .phone'), pr = ph.getBoundingClientRect(), k = pr.height / 844, m = document.querySelector('.dpane .phone .pmain').getBoundingClientRect(); return { k: +k.toFixed(3), h: Math.round(m.height / k), bot: Math.round((pr.bottom - m.bottom) / k), w: Math.round(m.width / k), q: document.querySelector('.dpane .bcard .lab')?.textContent.trim() }; });
        log(`🎮 시연 폰: 배율 ${d.k} · 주요 단추 높이 ${d.h} · 바닥 ${d.bot} · 폭 ${d.w} (폰 390 기준) · 「${d.q}」`);
        if (d.h !== 56 || d.bot !== 20 || d.w !== 358) errs.push(`시연 폰 단추 ${JSON.stringify(d)}`);
        await hall.screenshot({ path: `${SHOTS}/b39-tv-demo.png` });
        const st = await ctx.newPage(); await st.setViewportSize({ width: 390, height: 844 }); await st.goto(B + `?role=student&room=${code}`); await st.waitForSelector('.pmain'); await st.waitForTimeout(1500);
        await st.screenshot({ path: `${SHOTS}/b39-phone-same.png` });
      }
      await ctx.close();
    }
  }
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0');
  await b.close();
})();
