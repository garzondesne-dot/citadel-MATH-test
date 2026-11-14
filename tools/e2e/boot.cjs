// ⏳ 로딩 화면 + 당겨서 새로 고침 막기 (📜 2026-11-14 선생님 · 머리 🔨 · 모든 판 공통 화면 규칙)
//   ① 느린 네트워크(스크립트 3초 · 10초 늦춤): 첫 그림부터 「⏳ 불러오는 중…」 + ↻ · 8초 = 「인터넷이 느려요」 + 🔄 새로 고침 · 앱이 뜨면 사라짐
//   ② 학생 폰 · 교사 폰 · TV · 체험(?role=atk): html · body overscroll-behavior-y = none · 안쪽 스크롤 칸 = contain · 손가락 당겨 내림(터치) 뒤 새로 고침 없음
//   ③ 새 판 받는 중(?v=) 글자 · 교사 탭 새로 고침 뒤 복귀
const { chromium, devices } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], out = [];
  const ctx = await b.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' }); // 서비스 워커가 받으면 늦춤이 안 걸림
  // ① 느린 스크립트
  for (const ms of [3000, 15000]) {
    const p = await ctx.newPage();
    await p.route(/\/assets\/index-.*\.js$/, async (r) => { await new Promise((ok) => setTimeout(ok, ms)); await r.continue(); });
    const t0 = Date.now(); await p.goto(B + '?role=teacher', { waitUntil: 'commit' });
    await p.waitForSelector('#boot', { timeout: 3000 }); const first = Date.now() - t0;
    const s0 = await p.$eval('#boot', (x) => ({ vis: getComputedStyle(x).display !== 'none' && getComputedStyle(x).opacity !== '0', text: x.innerText, late: x.classList.contains('late') }));
    await p.screenshot({ path: `${SHOTS}/boot-${ms}-0.png` });
    out.push(`⏳ 스크립트 ${ms / 1000}초 늦춤 · 첫 표시 ${first}ms: ${s0.vis ? '보임' : '안 보임'} · 「${s0.text.split('\n')[1] || s0.text}」`); if (!s0.vis || !/불러오는 중/.test(s0.text)) errs.push('첫 순간 로딩 표시');
    if (ms > 8000) { await p.waitForTimeout(8500); const s1 = await p.$eval('#boot', (x) => ({ late: x.classList.contains('late'), btn: !!x.querySelector('button') && getComputedStyle(x.querySelector('.slow')).display !== 'none', text: x.innerText })); await p.screenshot({ path: `${SHOTS}/boot-slow-8s.png` }); out.push(`⏳ 8초 뒤: ${s1.btn ? '「인터넷이 느려요」 + 🔄 새로 고침 보임' : '단추 없음'}`); if (!s1.btn || !/인터넷이 느려요/.test(s1.text)) errs.push('8초 새로 고침 단추'); }
    await p.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await p.waitForTimeout(400);
    const gone = await p.$eval('#boot', (x) => getComputedStyle(x).display === 'none' || getComputedStyle(x).opacity === '0').catch(() => true);
    out.push(`⏳ 앱 뜬 뒤 로딩 표시 ${gone ? '사라짐' : '남음'}`); if (!gone) errs.push('앱 뜬 뒤 로딩 남음');
    await p.close();
  }
  // ③ 새 판 받는 중
  { const p = await ctx.newPage(); await p.route(/\/assets\/index-.*\.js$/, async (r) => { await new Promise((ok) => setTimeout(ok, 1500)); await r.continue(); }); await p.goto(B + '?role=teacher&v=b999', { waitUntil: 'commit' }); await p.waitForSelector('#boot'); const t = await p.$eval('#boot-t', (x) => x.textContent); await p.screenshot({ path: `${SHOTS}/boot-update.png` }); out.push(`🔄 새 판 길: 「${t}」`); if (!/새 판 받는 중/.test(t)) errs.push('새 판 받는 중'); await p.close(); }
  // ② 당겨 내림
  for (const [name, url, sel] of [['학생 첫 화면', '', 'body'], ['교사 폰', '?role=teacher', '.tabs, .tgate'], ['TV', '?role=hall&mode=test&room=BOOT', '.dock, .tvgate, .gate'], ['체험 · 갤러리', '?role=atk', '.qwrap .bcard']]) {
    const p = await ctx.newPage(); let reloads = 0; p.on('framenavigated', (f) => { if (f === p.mainFrame()) reloads++; });
    await p.goto(B + url); await p.waitForSelector(sel, { timeout: 20000 }); await p.waitForTimeout(500); reloads = 0;
    const ob = await p.evaluate(() => { const inner = [...document.querySelectorAll('*')].filter((e) => { const cs = getComputedStyle(e); return /(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight; }); return { html: getComputedStyle(document.documentElement).overscrollBehaviorY, body: getComputedStyle(document.body).overscrollBehaviorY, inner: inner.length, innerOk: inner.every((e) => getComputedStyle(e).overscrollBehaviorY !== 'auto') }; });
    // 손가락으로 위에서 아래로 끌기 (CDP 터치)
    const c = await p.context().newCDPSession(p);
    const tp = (type, y) => c.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: 180, y }] });
    await tp('touchStart', 120); for (let y = 140; y <= 620; y += 40) { await tp('touchMove', y); await p.waitForTimeout(16); } await tp('touchEnd'); await p.waitForTimeout(1200);
    const ok = ob.html === 'none' && ob.body === 'none' && ob.innerOk && reloads === 0;
    out.push(`📱 ${name}: html ${ob.html} · body ${ob.body} · 안쪽 스크롤 칸 ${ob.inner}개 ${ob.innerOk ? 'contain' : '❌ auto'} · 당겨 내린 뒤 새로 고침 ${reloads}번 ${ok ? '✅' : '❌'}`); if (!ok) errs.push(`${name} 당겨 내림`);
    await p.close();
  }
  // 교사 탭 새로 고침 뒤 복귀
  { const p = await ctx.newPage(); await p.goto(B + '?role=teacher'); await p.waitForSelector('.tabs, .tgate'); const tabs = await p.$('.tabs');
    if (tabs) { const btn = await p.$('.tabs button:nth-child(3)'); await btn.click(); await p.waitForTimeout(300); const u1 = p.url(); await p.reload(); await p.waitForSelector('.tabs'); const on = await p.$eval('.tabs [aria-current="page"], .tabs .on', (x) => x.textContent).catch(() => '?'); out.push(`🔁 교사 탭 새로 고침 뒤: ${u1.split('?')[1]} → 「${on.trim()}」`); if (!/tab=/.test(u1)) errs.push('탭 주소'); }
    else out.push('🔁 교사 탭: 로그인 문(시험 서버) → 건너뜀');
    await p.close(); }
  console.log(out.join('\n'));
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
