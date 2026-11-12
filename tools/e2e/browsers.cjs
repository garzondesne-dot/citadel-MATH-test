// #131 브라우저 · 기기 통일 — 크롬 · 삼성 인터넷(사용자 에이전트) × 글자 100% · 130%(루트 font-size 흉내) × 360 · 412 · 830(펼친 Fold7) · 1280
//   교사: 학생 탭(명단) · 대시보드(반 · 전체 반 비교) · 대기실 · 리모컨 → 가로 넘침 0 · 칩 · 단추 겹침 0 · 830 이상 = 펼친 모양
//   스크롤 A(#131 덧붙임): 표 안 세로 스크롤 0 · 반 비교 마지막 줄(전체)까지 가운데 스크롤로 닿음 · 머리 줄과 몸 줄 겹침 0
//   + color-scheme 메타 = dark · 글꼴 = Pretendard Variable 로 그려짐
// 사용: npm run build → npx vite preview --port 4173 → NODE_PATH=$(npm root -g) node tools/e2e/browsers.cjs <그림 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
const B = 'http://localhost:4173/';
const SAMSUNG = 'Mozilla/5.0 (Linux; Android 15; SM-F966N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36';
const SIZES = [[360, 640], [412, 915], [830, 1000], [1280, 800]];
(async () => {
  const b = await chromium.launch();
  const errs = [], log = (...a) => console.log(...a);
  for (const [ua, uaName] of [[null, '크롬'], [SAMSUNG, '삼성']]) for (const fs of [100, 130]) for (const [w, h] of SIZES) {
    const tag = `${uaName} ${fs}% ${w}`;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, ...(ua ? { userAgent: ua } : {}) });
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(`${tag}: ${e}`));
    await p.goto(B + '?role=teacher'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.tabs');
    const scale = () => p.evaluate((f) => { document.documentElement.style.fontSize = `${f}%`; }, fs);
    await scale();
    // 넘침 · 겹침 검사 (보이는 칩 · 단추 묶음마다 서로 안 겹침)
    const check = async (where) => {
      const r = await p.evaluate(() => {
        const out = { x: document.scrollingElement.scrollWidth - innerWidth, lap: [] };
        const groups = ['.grp', '.vws', '.chips', '.segrow', '.seg', '.tabs', '.pk3', '.tt7', '.four', '.rdock', '.qk'];
        for (const g of groups) for (const box of document.querySelectorAll(g)) {
          const kids = [...box.children].filter((e) => e.offsetParent !== null).map((e) => [e, e.getBoundingClientRect()]);
          for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
            const [, a] = kids[i], [, c] = kids[j];
            if (a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1) out.lap.push(`${g}: ${kids[i][0].textContent.trim().slice(0, 10)} ↔ ${kids[j][0].textContent.trim().slice(0, 10)}`);
          }
        }
        return out;
      });
      if (r.x > 0) errs.push(`${tag} ${where}: 가로 넘침 ${r.x}`);
      if (r.lap.length) errs.push(`${tag} ${where}: 겹침 ${r.lap.slice(0, 3).join(' | ')}`);
    };
    if (w === 360 && fs === 100) {
      const m = await p.evaluate(() => ({ cs: document.querySelector('meta[name="color-scheme"]')?.getAttribute('content'), root: getComputedStyle(document.documentElement).colorScheme }));
      await p.evaluate(() => document.fonts.ready);
      const font = await p.evaluate(() => document.fonts.check('16px "Pretendard Variable"', '수업 열기'));
      log(`${uaName} · color-scheme 메타 ${m.cs} · 루트 ${m.root} · Pretendard 그려짐 ${font}`);
      if (m.cs !== 'dark' || !font) errs.push(`${tag}: color-scheme · 글꼴`);
    }
    await check('⑫ 수업 열기');
    const col = await p.$eval('.tp .mid', (e) => Math.round(e.getBoundingClientRect().width));
    // 학생 탭 · 명단
    await p.click('.tabs button:has-text("학생")'); await p.waitForTimeout(120); await check('⑯ 명단');
    // 대시보드
    await p.click('.seg button:has-text("대시보드")'); await p.waitForTimeout(200); await scale(); await check('⑳ 대시보드');
    const wide = !!(await p.$('.dash.wide'));
    if ((w >= 720) !== wide) errs.push(`${tag}: 펼친 모양 ${wide}`);
    const xl = await p.evaluate(() => { const x = document.querySelector('.segrow .xlb')?.getBoundingClientRect(), s = document.querySelector('.segrow .seg')?.getBoundingClientRect(); return x && s ? Math.abs(x.top - s.top) < 4 && x.left >= s.right : false; });
    if (!xl) errs.push(`${tag}: ⬇ 엑셀이 [명단 · 대시보드] 줄 오른쪽이 아님`);
    // 전체 · 반 비교: 표 안 세로 스크롤 0 · 마지막 줄까지 닿음 · 머리 줄 겹침 0
    await p.click('.chips button:has-text("전체")'); await p.waitForTimeout(200);
    const t = await p.evaluate(async () => {
      const body = document.querySelector('.dash .body'), tw = document.querySelector('.tw');
      body.scrollTo(0, 1e5); await new Promise((r) => setTimeout(r, 80));
      const rows = [...tw.querySelectorAll('tbody tr')], last = rows[rows.length - 1].getBoundingClientRect(), bb = body.getBoundingClientRect();
      const th = tw.querySelector('thead').getBoundingClientRect(), r0 = rows[0].getBoundingClientRect();
      return { inner: tw.scrollHeight - tw.clientHeight, last: rows[rows.length - 1].textContent.trim().slice(0, 6), seen: last.bottom <= bb.bottom + 1 && last.top >= bb.top - 1, lap: r0.top < th.bottom - 1, n: rows.length };
    });
    if (t.inner > 1 || !t.seen || t.lap) errs.push(`${tag}: 반 비교 표 안 세로 ${t.inner} · 마지막 줄 보임 ${t.seen} · 머리 겹침 ${t.lap}`);
    await check('⑳ 반 비교');
    if (fs === 130 && ua) {
      if (w === 830 || w === 360) { await p.evaluate(() => document.querySelector('.dash .body').scrollTo(0, 0)); await p.screenshot({ path: `${SHOTS}/b15-dash-cmp-${w}.png` }); }
      log(`${tag} · 열 폭 ${col} · 펼침 ${wide} · 반 비교 ${t.n}줄 · 마지막 「${t.last}」 닿음 ${t.seen} · 표 안 세로 ${t.inner}`);
    }
    // 대기실 · 리모컨 (🧪 테스트로 열기)
    await p.click('.tabs button:has-text("수업")'); await p.click('.pk3 .pk:not(.add)'); await p.click('.sub2 button:has-text("테스트")'); await p.waitForTimeout(300); await scale();
    await check('⑬ 대기실');
    if (fs === 130 && ua && w === 830) await p.screenshot({ path: `${SHOTS}/b15-lobby-830.png` });
    const lv = await p.evaluate(() => JSON.parse(localStorage.getItem('citadel-v1-test-db|school/live')));
    const st = await ctx.newPage(); await st.goto(`${B}?role=student&room=${lv.code}&as=1-1:1`); await st.waitForTimeout(500); await p.bringToFront();
    await p.waitForSelector('.tact .btn:not([disabled])', { timeout: 5000 });
    await p.click('.tact .btn'); await p.waitForTimeout(300); await check('⑭ 리모컨');
    if (fs === 130 && ua && (w === 830 || w === 360)) await p.screenshot({ path: `${SHOTS}/b15-remote-${w}.png` });
    await ctx.close();
  }
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0');
  await b.close();
})();
