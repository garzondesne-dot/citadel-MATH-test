// 🐞 11/21 버그 사냥 · 게시판 던전 연습방 훑기 (이 기기 · 서버 안 씀): 차시 × 인원 × 난이도 봇 관전 ×4 끝까지 → 오류 · 멈춤 · 결과 화면 넘침
//   node tools/e2e/atbsweep.cjs <그림 폴더> [가로 844x390 | 세로 390x844]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', VP = (process.argv[3] || '844x390').split('x').map(Number), B = 'http://localhost:4173/?role=atb';
(async () => {
  const b = await chromium.launch(), rows = [];
  const p0 = await b.newPage({ viewport: { width: VP[0], height: VP[1] } });
  await p0.goto(B); await p0.waitForSelector('[data-k="atb-setup"]');
  const nos = await p0.$$eval('[data-k="atb-setup"] section:first-of-type .chips button', (x) => x.map((e) => e.dataset.no));
  await p0.close();
  for (const no of nos) for (const [size, diff] of [[4, '도전'], [2, '일반'], [1, '연습']]) {
    const p = await b.newPage({ viewport: { width: VP[0], height: VP[1] } }), errs = [];
    p.on('pageerror', (e) => errs.push(String(e).slice(0, 160))); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
    await p.goto(B); await p.waitForSelector('[data-k="atb-setup"]');
    await p.click(`[data-k="atb-setup"] .chips button[data-no="${no}"]`);
    await p.click(`.chips button:text-is("${diff}")`); await p.click('[data-k="atb-mode-watch"]'); await p.click(`.chips button:text-is("${size}인")`);
    await p.click('.chips button:has-text("×4")').catch(() => {});
    const dis = await p.$eval('[data-k="atb-start"]', (e) => e.disabled);
    if (dis) { rows.push({ no, size, diff, st: '출발 막힘', errs }); await p.close(); continue; }
    const t0 = Date.now(); await p.click('[data-k="atb-start"]'); await p.waitForSelector('[data-k="atb-stage"]');
    const done = await p.waitForSelector('[data-k="atb-result"]', { timeout: 240000 }).then(() => true, () => false);
    let fit = null, txt = '';
    if (done) { await p.waitForTimeout(1500); fit = await p.evaluate(() => ({ over: document.documentElement.scrollWidth - innerWidth, out: [...document.querySelectorAll('[data-k="atb-result"] .paper, [data-k="atb-result"] .b, [data-k="atb-res-buttons"] .b')].filter((x) => { const r = x.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1 || r.bottom > innerHeight + 1); }).length, nan: /NaN|undefined|Infinity/.test(document.body.innerText) })); txt = (await p.textContent('[data-k="atb-result"]')).replace(/\s+/g, ' ').slice(0, 80); }
    else { await p.screenshot({ path: `${SHOTS}/sweep-stuck-${no}-${size}-${VP[0]}.png` }); txt = (await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 120))); }
    if (done && (fit.out || fit.over > 0 || fit.nan)) await p.screenshot({ path: `${SHOTS}/sweep-res-${no}-${size}-${VP[0]}.png` });
    rows.push({ no, size, diff, st: done ? '끝' : '⏳ 4분 넘게 안 끝남', sec: Math.round((Date.now() - t0) / 1000), fit, txt, errs: [...new Set(errs)] });
    console.log(JSON.stringify(rows[rows.length - 1]));
    await p.close();
  }
  await b.close();
})();
