// 🚶 💡 로딩 첫 화면 = 걷는 용사 + 한 줄 팁 (📜 2026-11-16 · DECISIONS 「⏳ 로딩 화면」) + ⏱ 로딩 시간 재기 (빠른 망 · 느린 와이파이 · 처음 · 다시 · 새 판)
//   NODE_PATH=$(npm root -g) node tools/e2e/bootwalk.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  // ① 모습: 아주 느리게 → 첫 화면에 머묾
  { const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('' + e));
    await p.route('**/assets/*.js', async (r) => { await new Promise((z) => setTimeout(z, 9500)); r.continue(); });
    await p.goto(B, { waitUntil: 'commit' }); await p.waitForTimeout(900);
    const bg = await p.$eval('[data-k=boot-walk]', (e) => getComputedStyle(e).backgroundImage);
    ok('처음 연 폰 = 로안 걷기', /hero-sword-v5\.webp/.test(bg), bg.slice(-40));
    const wz = await p.$eval('[data-k=boot-walk]', (e) => { const c = getComputedStyle(e); return `${c.width} ${c.height} ${c.backgroundSize}`; }); ok('세밀 시트 칸 = 256 × 144 (#50)', /^256px 144px 1024px 1728px/.test(wz), wz);
    const t1 = await p.textContent('[data-k=boot-tip]'); ok('팁 = 늘 맞는 팁(1 · 6 · 12)', /학습지에 먼저|빈칸을 다 채웠는지|몬스터는 문제/.test(t1), t1);
    await p.screenshot({ path: `${SHOTS}/boot-roan.png` });
    await p.waitForTimeout(4300); const t2 = await p.textContent('[data-k=boot-tip]'); ok('4초 뒤 팁 바뀜', t2 !== t1, t2);
    await p.waitForTimeout(3500); ok('8초 넘으면 🔄 새로 고침', await p.isVisible('#boot .slow button'));
    await p.screenshot({ path: `${SHOTS}/boot-late.png` }); await ctx.close(); }
  // ② 앱이 한 번 뜬 폰 = 기억 (내 용사 · 켜진 기능 팁) · 서비스 워커 막음(저장된 엔진이 바로 떠서 첫 화면이 안 보이지 않게)
  { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }); const p = await ctx.newPage();
    await p.goto(B); await p.waitForFunction(() => document.getElementById('boot')?.style.display === 'none', null, { timeout: 20000 }).catch(() => {});
    await p.evaluate(() => { const m = JSON.parse(localStorage.getItem('citadel-v1-me') || 'null'); }); await p.waitForTimeout(500);
    await p.evaluate(() => dispatchEvent(new Event('pagehide')));
    const m = await p.evaluate(() => JSON.parse(localStorage.getItem('citadel-boot') || 'null'));
    ok('앱이 기억을 적음 (용사 시트 · 팁 번호)', !!m && /\.webp$/.test(m.h) && m.t.length >= 3, JSON.stringify(m));
    await p.close(); const q = await ctx.newPage(); await q.route('**/assets/*.js', async (r) => { await new Promise((z) => setTimeout(z, 4000)); r.continue().catch(() => {}); });
    await q.goto(B, { waitUntil: 'commit' }); await q.evaluate(() => localStorage.setItem('citadel-boot', JSON.stringify({ h: 'hero-witch-v6.webp', t: [3, 11] })));
    await q.reload({ waitUntil: 'commit' }); await q.waitForTimeout(800); const p2 = q;
    ok('첫 화면이 보이는 중', await q.isVisible('[data-k=boot-walk]'));
    ok('다음 열기 = 기억한 내 용사', /hero-witch-v5/.test(await p2.$eval('[data-k=boot-walk]', (e) => getComputedStyle(e).backgroundImage)));
    ok('켜진 기능 팁만', /도움|모루/.test(await p2.textContent('[data-k=boot-tip]')));
    await p2.screenshot({ path: `${SHOTS}/boot-witch.png` }); await ctx.close(); }
  // ③ ⏱ 재기: 앱이 그려질 때까지(첫 화면이 사라지는 때)
  const NET = { fast: null, wifi: { offline: false, latency: 150, downloadThroughput: (2 * 1024 * 1024) / 8, uploadThroughput: (1 * 1024 * 1024) / 8 }, slow: { offline: false, latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 } };
  const rows = [];
  for (const [nm, cond] of Object.entries(NET)) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
    if (cond) await cdp.send('Network.emulateNetworkConditions', cond);
    let bytes = 0; await cdp.send('Network.enable'); cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength || 0; });
    const run = async (url) => { const t0 = Date.now(); await p.goto(url, { waitUntil: 'commit' }); await p.waitForFunction(() => document.getElementById('boot')?.style.display === 'none', null, { timeout: 120000 }).catch(() => {}); return ((Date.now() - t0) / 1000).toFixed(1); };
    bytes = 0; const first = await run(B); const fb = bytes;
    await p.waitForTimeout(2500); // 서비스 워커 저장
    bytes = 0; const again = await run(B); const ab = bytes;
    bytes = 0; const nv = await run(B + '?v=new'); 
    rows.push(`${nm} | 처음 ${first}초 (${(fb / 1e6).toFixed(1)}MB) | 다시 ${again}초 (${(ab / 1e6).toFixed(1)}MB) | 새 판(?v) ${nv}초`);
    await ctx.close();
  }
  log('⏱ ' + rows.join('\n⏱ '));
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
