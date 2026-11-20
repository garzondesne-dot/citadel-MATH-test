// 🔥 모닥불 친구 · 이 기기 · 체험판 = 가상 친구 3 (📜 2026-11-20) — 그루터기 3자리 · 카드 · 인사 하루 1번
//   NODE_PATH=$(npm root -g) node tools/e2e/campfire.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  for (const [tag, url] of [['이 기기', '?role=camp&room=CF'], ['체험판', 'trial/']]) {
    const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(B + url); await p.waitForTimeout(3000);
    if (tag === '체험판') { await p.click('[data-k="trial-stu"]'); await p.waitForSelector('[data-k="first-hero"]'); await p.click('[data-k="first-hero"] .ba-main, [data-k="first-hero"] button:has-text("시작")'); await p.waitForTimeout(400); await p.click('[data-k="trial-card"] >> nth=1'); await p.waitForSelector('[data-k="stutry"]'); await p.click('[data-k="try-close"]'); await p.waitForTimeout(1500); } // castle41.cjs 와 같은 길
    else { await p.evaluate(() => { const m = JSON.parse(localStorage.getItem('citadel-v1-me') || '{}'); m.seen = { ...(m.seen || {}), hero: true }; localStorage.setItem('citadel-v1-me', JSON.stringify(m)); }); await p.reload(); await p.waitForTimeout(3500); }
    for (let i = 0; i < 3 && (await p.$('.sheet .x')); i++) { await p.click('.sheet .x').catch(() => {}); await p.waitForTimeout(300); }
    const n = (await p.$$('[data-k="cf-friend"]')).length;
    ok(`${tag} 그루터기 친구 3`, n === 3, String(n));
    if (!n) continue;
    await p.click('[data-k="cf-friend"] >> nth=1'); await p.waitForTimeout(500);
    ok(`${tag} 카드 · 인사 단추 4`, !!(await p.$('[data-k="cf-card"]')) && (await p.$$('[data-hi]')).length === 4);
    await p.click('[data-hi="🔥"]'); await p.waitForTimeout(400);
    ok(`${tag} 보냄 · 같은 친구 또 = 꺼짐`, /보냈어요/.test((await p.textContent('[data-k="cf-note"]')) || '') && (await p.$eval('[data-hi="👋"]', (e) => e.disabled)));
    await p.screenshot({ path: `${SHOTS}/cf-${tag === '체험판' ? 'trial' : 'dev'}.png` });
  }
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
