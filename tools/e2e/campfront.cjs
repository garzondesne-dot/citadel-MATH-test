// 🏕 캠프 용사 = 물건 앞 (📜 2026-11-20 선생님 「용사가 자꾸 허수아비 뒤쪽으로 이동함 · 앞쪽으로」) — 390 × 844 · 430 × 932
//   물건을 누르면 그 자리로 걸어감 → 도착했을 때 용사 발이 그 물건(과 겹치는 모든 물건) 발밑보다 아래 · 용사 층 > 물건 층
//   NODE_PATH=$(npm root -g) node tools/e2e/campfront.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  for (const [w, h] of [[390, 844], [430, 932]]) {
    const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(B + '?role=camp&room=CF'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(2500);
    await p.evaluate(() => { const m = JSON.parse(localStorage.getItem('citadel-v1-me') || '{}'); m.seen = { ...(m.seen || {}), hero: true }; localStorage.setItem('citadel-v1-me', JSON.stringify(m)); }); await p.reload(); await p.waitForTimeout(3500);
    const z = await p.evaluate(() => [getComputedStyle(document.querySelector('.hmove')).zIndex, getComputedStyle(document.querySelector('.prop')).zIndex].map(Number));
    ok(`${w} 용사 층 ${z[0]} > 물건 층 ${z[1]}`, z[0] > z[1]);
    for (const k of ['scare', 'mail', 'dummy', 'tent', 'anvil', 'castle', 'gate', 'tentdeco']) {
      const sel = ['castle', 'gate'].includes(k) ? `.zone[data-zone="${k}"]` : k === 'tentdeco' ? '[data-hot="tentdeco"]' : `.prop[data-prop="${k}"]`;
      if (!(await p.$(sel))) continue;
      await p.click(sel, { force: true }); await p.waitForTimeout(560);
      const r = await p.evaluate(() => {
        const H = document.querySelector('[data-k="camp-hero"]').getBoundingClientRect(), hb = H.bottom, hx = [H.left + H.width * 0.25, H.right - H.width * 0.25];
        const bad = [...document.querySelectorAll('.prop .img, .prop img, .prop :first-child')].map((e) => ({ k: e.closest('.prop').dataset.prop, r: e.getBoundingClientRect() })).filter((o) => o.r.width && o.r.left < hx[1] && o.r.right > hx[0] && o.r.top < hb && o.r.bottom > hb + 2).map((o) => `${o.k}(발 ${Math.round(hb)} < 물건 바닥 ${Math.round(o.r.bottom)})`);
        return [...new Set(bad)];
      });
      ok(`${w} ${k} 앞에 섬 = 겹친 물건보다 발이 아래`, r.length === 0, r.join(' '));
      if (k === 'scare') await p.screenshot({ path: `${SHOTS}/front-${w}-scare.png` });
      for (let i = 0; i < 3 && (await p.$('.sheet .x, .mh .back, [aria-label="닫기"]')); i++) { await p.click('.sheet .x, [aria-label="닫기"]').catch(() => {}); await p.waitForTimeout(400); }
      await p.goto(B + '?role=camp&room=CF'); await p.waitForTimeout(2500);
    }
  }
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
