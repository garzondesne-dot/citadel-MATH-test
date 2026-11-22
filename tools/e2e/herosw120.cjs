// 🐞 #120 용사 바꾸기 시트 = 각성 칸이 있어도 용사 격자가 보이고 넘어감 (폰 세로 · 가로 · 태블릿)
//   NODE_PATH=$(npm root -g) node tools/e2e/herosw120.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
const VP = [['phone', 360, 740], ['phone-l', 740, 360], ['iphone', 390, 844], ['tablet', 820, 1180]];
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  for (const [nm, w, h] of VP) {
    const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage(); p.on('pageerror', (e) => errs.push(nm + ' ' + e));
    await p.goto(B + '?role=camp&room=SW'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(2000);
    await p.evaluate(() => { const m = JSON.parse(localStorage.getItem('citadel-v1-me') || '{}'); m.hero = 18; m.enh = 10; m.title = 'awk_18'; m.socket = { ...(m.socket || {}), 18: 'eclipse' }; m.seen = { ...(m.seen || {}), hero: true }; m.test = true; m.wallet = { ...(m.wallet || {}), gem: 9999, scroll: 30, ver: 1, buys: ['hero_18', 'hero_11', 'fx_eclipse'] }; localStorage.setItem('citadel-v1-me', JSON.stringify(m)); localStorage.setItem('citadel-v1-awk-seen-18', '1'); });
    await p.reload(); await p.waitForSelector('.stage'); await p.waitForTimeout(700);
    { const k = p.locator('button:has-text("확인")').first(); if (await k.waitFor({ timeout: 7000 }).then(() => true).catch(() => false)) { await k.click({ force: true }); await p.waitForTimeout(500); } } // ⚡ 각성 해금 연출 닫기
    await p.$eval('button[aria-label="내 용사 보기"]', (e) => e.click()); await p.waitForSelector('.mh'); await p.waitForTimeout(400);
    for (let i = 0; i < 3; i++) { const k = p.locator('button:has-text("확인")').first(); if (await k.isVisible().catch(() => false)) { await k.click({ force: true }); await p.waitForTimeout(400); } }
    await p.evaluate(() => { const x = [...document.querySelectorAll('.mh button')].find((b) => /바꾸기/.test(b.textContent || '')); x && x.click(); }); await p.waitForTimeout(600);
    const m = await p.evaluate(() => { const g = document.querySelector('.hsw .swg'), s = document.querySelector('.hsw'); if (!g || !s) return null; const r = g.getBoundingClientRect(), sr = s.getBoundingClientRect(); return { gh: Math.round(r.height), sh: g.scrollHeight, top: Math.round(r.top), bot: Math.round(r.bottom), sbot: Math.round(sr.bottom), vh: innerHeight, awk: !!document.querySelector('.hsw [data-k="awaken-box"]') }; });
    ok(`${nm} 각성 칸 있음`, m?.awk);
    ok(`${nm} 용사 격자 보임 (높이 ≥ 1줄)`, m && m.gh >= 90, JSON.stringify(m));
    await p.screenshot({ path: `${SHOTS}/sw120-${nm}.png` });
    // 넘겨서 다른 용사 고르기
    await p.evaluate(() => { const g = document.querySelector('.hsw .swg'); const sc = g.closest('.swmid') || g; sc.scrollTop = 99999; });
    await p.waitForTimeout(200);
    const last = p.locator('.hsw .swc').last(); await last.scrollIntoViewIfNeeded();
    const vis = await last.isVisible(); ok(`${nm} 마지막 용사까지 넘어감`, vis);
    await p.locator('.hsw .swc:not(.cur)').first().click({ timeout: 3000, force: true }).catch((e) => errs.push(nm + ' 다른 용사 못 누름 ' + String(e).split('\n').slice(0,6).join(' / ')));
    await p.waitForTimeout(300);
    const bt = (await p.textContent('.hsw .act').catch(() => '')) || '';
    ok(`${nm} 다른 용사 고르면 아래 단추 바뀜`, !/지금 출전 중/.test(bt), bt.replace(/\s+/g, ' ').slice(0, 40));
    await p.screenshot({ path: `${SHOTS}/sw120-${nm}-pick.png` });
    await p.context().close();
  }
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
