// 📲 베타 PWA (#38): ① 설치 가능 판정(크롬 CDP getInstallabilityErrors · manifest 칸 · 아이콘 실제 크기) ② 서비스 워커가 화면을 맡음
//   ③ 오프라인으로 첫 화면 열림 ④ 새 판(version.json 이 다름) = 첫 화면에서 막 열면 저절로 한 번 새로 고침 + 맨 위 「🔄 새 판」 띠 · 교사 화면 = 띠만 · 옛 판에 갇히지 않음
//   ⑤ 교사 「나」 📲 홈 화면에 추가 · 아이폰 = 공유 → 홈 화면에 추가 그림
//   NODE_PATH=$(npm root -g) node tools/e2e/pwa.cjs <폴더>   (빌드 dist 를 vite preview 4173 으로 · dist/version.json 을 잠깐 바꿨다 되돌림)
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/', DIST = path.join(__dirname, '../../dist');
const pngSize = (buf) => [buf.readUInt32BE(16), buf.readUInt32BE(20)];
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a);
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  // ① manifest · 아이콘
  const man = await (await p.request.get(B + 'manifest.webmanifest')).json();
  log('① manifest:', man.name, '·', man.short_name, '· id', man.id, '· scope', man.scope, '·', man.display);
  if (man.name !== '모두의 던전 베타' || man.short_name !== '던전 베타' || man.id !== '/citadel-MATH-test/' || man.display !== 'standalone') errs.push('manifest 칸');
  for (const ic of man.icons) { const buf = await (await p.request.get(B + ic.src)).body(); const [w, h] = pngSize(buf); if (`${w}x${h}` !== ic.sizes) errs.push(`아이콘 ${ic.src} ${w}x${h}`); }
  for (const [f, s] of [['icons/apple-touch-icon.png', 180], ['icons/favicon-32.png', 32], ['icons/favicon-16.png', 16]]) { const [w] = pngSize(await (await p.request.get(B + f)).body()); if (w !== s) errs.push(`${f} ${w}`); }
  log('   아이콘', man.icons.map((i) => `${i.sizes}${i.purpose === 'maskable' ? ' maskable' : ''}`).join(' · '), '+ apple 180 · favicon 32 · 16');
  // ② 서비스 워커
  await p.goto(B); await p.waitForSelector('text=교사 · 종합실', { timeout: 15000 });
  await p.evaluate(() => navigator.serviceWorker.ready); await p.reload(); await p.waitForSelector('text=교사 · 종합실');
  const ctl = await p.evaluate(() => !!navigator.serviceWorker.controller); const keys = await p.evaluate(() => caches.keys());
  log('② 서비스 워커가 맡음:', ctl, '· 저장 칸', keys.join(' · ')); if (!ctl || !keys.some((k) => k.startsWith('dgb-core-'))) errs.push('서비스 워커');
  const cdp = await ctx.newCDPSession(p); const inst = await cdp.send('Page.getInstallabilityErrors').catch((e) => ({ installabilityErrors: [{ errorId: String(e) }] }));
  log('   설치 가능 판정 오류:', inst.installabilityErrors.length ? inst.installabilityErrors.map((x) => x.errorId).join(' · ') : '없음 ✔'); if (inst.installabilityErrors.length) errs.push('설치 가능 판정');
  // ③ 오프라인 첫 화면
  await ctx.setOffline(true); await p.reload(); const off = await p.waitForSelector('text=교사 · 종합실', { timeout: 10000 }).then(() => true).catch(() => false);
  await p.screenshot({ path: `${SHOTS}/pwa-offline.png` }); log('③ 오프라인 첫 화면:', off); if (!off) errs.push('오프라인 첫 화면'); await ctx.setOffline(false);
  // ④ 새 판
  const vf = path.join(DIST, 'version.json'), v0 = fs.readFileSync(vf, 'utf8'), cur = JSON.parse(v0).build;
  try {
    fs.writeFileSync(vf, JSON.stringify({ build: 'b999' }));
    const p2 = await ctx.newPage(); p2.on('pageerror', (e) => errs.push(String(e))); await p2.goto(B); await p2.waitForTimeout(3500);
    const u = p2.url(), band = await p2.$eval('[data-k="newbuild"]', (e) => e.textContent.trim()).catch(() => '없음');
    log('④ 첫 화면 새 판: 주소', u.replace(B, '/'), '· 띠', band); if (!/v=b999/.test(u)) errs.push('첫 화면 저절로 새로 고침 아님'); if (!/새 판 b999/.test(band)) errs.push('새 판 띠');
    await p2.waitForTimeout(1500); if ((p2.url().match(/v=/g) || []).length > 1) errs.push('되풀이 새로 고침');
    await p2.screenshot({ path: `${SHOTS}/pwa-newbuild.png` });
    const t = await ctx.newPage(); await t.goto(B + '?role=teacher'); await t.waitForSelector('.tabs'); await t.waitForTimeout(2500);
    const tu = t.url(), tb = !!(await t.$('[data-k="newbuild"]')); log('   교사 화면: 그대로', !/v=/.test(tu), '· 띠', tb); if (/v=/.test(tu) || !tb) errs.push('교사 화면 = 띠만');
    fs.writeFileSync(vf, v0); await t.click('[data-k="newbuild"]'); await t.waitForLoadState(); await t.waitForTimeout(1500);
    const after = await t.$('[data-k="newbuild"]'); log('   띠 누름 → 같은 판이면 띠 사라짐:', !after, `(${cur})`); if (after) errs.push('누른 뒤에도 옛 판');
    // ⑤ 교사 「나」 📲
    await t.click('.tabs button:has-text("나")'); await t.waitForTimeout(300); const it = (await t.textContent('[data-k="install"]')).replace(/\s+/g, ' ').trim(); log('⑤ 교사 「나」:', it);
    await t.click('[data-k="install"]'); await t.waitForSelector('.sheet'); await t.screenshot({ path: `${SHOTS}/pwa-teacher-android.png` });
  } finally { fs.writeFileSync(vf, v0); }
  const ictx = await b.newContext({ ...devices['iPhone 13'] }), ip = await ictx.newPage(); await ip.goto(B + '?role=teacher&tab=me'); await ip.waitForSelector('[data-k="install"]', { timeout: 15000 });
  const isub = (await ip.textContent('[data-k="install"] small')).trim(); await ip.click('[data-k="install"]'); const svg = !!(await ip.waitForSelector('.sheet svg.howto', { timeout: 5000 }).catch(() => null));
  await ip.screenshot({ path: `${SHOTS}/pwa-teacher-iphone.png` }); log('   아이폰:', isub, '· 그림', svg); if (!svg) errs.push('아이폰 그림');
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
