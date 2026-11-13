// ‹ 나가기 (📜 2026-11-13 밤 버그): 교사 「나」 → 💥 공격 갤러리 → 「‹ 나가기」 = 「나」 탭 · 폰 뒤로 가기도 「나」 탭 · 주소로 바로 연 갤러리 = 교사 첫 화면
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [];
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  const meOn = () => p.$eval('.tabs button[aria-current="page"]', (x) => x.textContent).catch(() => '');
  await p.goto(B + '?role=teacher'); await p.waitForSelector('.tabs'); await p.click('.tabs button:has-text("나")'); await p.waitForTimeout(200);
  await Promise.all([p.waitForNavigation(), p.click('a.item:has-text("공격 갤러리")')]); await p.waitForSelector('.gal .back'); await p.screenshot({ path: `${SHOTS}/galback-bar.png`, clip: { x: 0, y: 0, width: 390, height: 120 } });
  await Promise.all([p.waitForNavigation(), p.click('.gal .back')]); await p.waitForSelector('.tabs'); const a = await meOn(); console.log('‹ 나가기 →', a);
  if (!/나/.test(a)) errs.push('나가기 → 「나」 탭 아님');
  await Promise.all([p.waitForNavigation(), p.click('a.item:has-text("공격 갤러리")')]); await p.waitForSelector('.gal'); await p.goBack(); await p.waitForSelector('.tabs'); const c = await meOn(); console.log('뒤로 가기 →', c);
  if (!/나/.test(c)) errs.push('뒤로 → 「나」 탭 아님');
  await p.goto(B + '?role=atk'); await p.waitForSelector('.gal .back'); const h = await p.$eval('.gal .back', (x) => x.getAttribute('href')); console.log('바로 연 갤러리 나가기 →', h); if (h !== '?role=teacher') errs.push('바로 연 갤러리');
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
