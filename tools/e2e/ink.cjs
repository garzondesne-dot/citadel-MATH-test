// #139 교실 TV ✏ 필기 = 정식 ink.js: 도구 = 오른쪽 가운데 세로(빨강 · 파랑 · 검정 · 🖍 · 🧽 | ↶ · 🗑 · ✕) · ↶ = 한 획씩
//   획 3개 → ↶ 두 번 → 1개 남음(그림도) · 1280 × 720 · 1920 × 1080 에서 도구가 오른쪽 가운데 · 위 막대 · 조작 막대와 안 겹침
// 사용: npm run build → npx vite preview --port 4173 → NODE_PATH=$(npm root -g) node tools/e2e/ink.cjs <그림 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a);
  for (const [w, h] of [[1280, 720], [1920, 1080]]) {
    const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(`http://localhost:4173/?role=hall&mode=test&room=INK${w}`); await p.waitForSelector('.dock'); const st = await p.context().newPage(); await st.goto(`http://localhost:4173/?role=student&room=INK${w}`); await st.waitForTimeout(800); await p.bringToFront();
    await p.mouse.move(w / 2, h / 2); await p.waitForTimeout(200); for (let k = 0; k < 3 && !(await p.$('.dock .t:has-text("필기")')); k++) { await p.click('.dock .go'); await p.waitForTimeout(300); await p.mouse.move(w / 2 + k, h / 2); } await p.click('.dock .t:has-text("필기")'); await p.waitForSelector('.inkbar');
    const box = await p.$eval('.inkbar', (x) => { const r = x.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
    const near = (a, c) => Math.abs(a - c) < 4;
    const cy = box.y + box.h / 2, right = w - (box.x + box.w);
    const order = await p.$$eval('.inkbar > *', (xs) => xs.map((x) => (x.tagName === 'HR' ? '|' : x.getAttribute('aria-label'))).join(' '));
    const lap = await p.evaluate(() => { const a = document.querySelector('.inkbar').getBoundingClientRect(); return ['.top', '.dock'].filter((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return a.left < r.right && r.left < a.right && a.top < r.bottom && r.top < a.bottom; }); });
    log(`${w}×${h} 도구: 오른쪽 여백 ${Math.round(right)} · 세로 가운데 ${Math.round(cy)} / ${h / 2} · 세로 ${box.h > box.w} · 겹침 ${lap.join(',') || '없음'} | ${order}`);
    if (!near(cy, h / 2) || right > w * 0.04 || box.h <= box.w || lap.length) errs.push(`${w}: 도구 자리`);
    // 획 3개 → ↶ 두 번 → 1개
    const ink = async () => p.evaluate(() => { const c = document.querySelector('.ink'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let k = 0; for (let i = 3; i < d.length; i += 4 * 7) if (d[i] > 0) k++; return k; });
    for (const [k, y] of [[0, 0.35], [1, 0.5], [2, 0.65]]) { await p.mouse.move(w * 0.2, h * y); await p.mouse.down(); await p.mouse.move(w * 0.5, h * y, { steps: 8 }); await p.mouse.up(); if (k === 1) await p.click('.inkbar [aria-label="파랑"]'); }
    const s3 = await p.$eval('.ink', (c) => c.dataset.strokes), px3 = await ink();
    await p.screenshot({ path: `${SHOTS}/b24-ink-${w}.png` });
    await p.click('.inkbar [aria-label^="되돌리기"]'); await p.click('.inkbar [aria-label^="되돌리기"]');
    const s1 = await p.$eval('.ink', (c) => c.dataset.strokes), px1 = await ink();
    log(`   획 ${s3} (점 ${px3}) → ↶ ↶ → 획 ${s1} (점 ${px1})`);
    if (s3 !== '3' || s1 !== '1' || !(px1 > 0 && px1 < px3 / 2)) errs.push(`${w}: 되돌리기`);
    await p.click('.inkbar [aria-label="모두 지움"]'); log('   🗑 →', await p.$eval('.ink', (c) => c.dataset.strokes), '| ↶ 흐림', await p.$eval('.inkbar [aria-label^="되돌리기"]', (x) => x.disabled));
    await p.click('.inkbar [aria-label="필기 끔"]'); if (await p.$('.inkbar')) errs.push(`${w}: 끔`);
  }
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0');
  await b.close();
})();
