// 📱 화면 꺼짐 방지 (📜 2026-11-14 「교사 폰 리모컨은 자동 화면 꺼짐 안 되게」): 리모컨 열기 → wakeLock 잡힘 · 다른 앱 갔다 오면 다시 잡힘 · 나가면 놓음 · 지원 안 되는 폰 = 띠 한 번(새로 고침 뒤 다시 안 뜸)
//   사용: NODE_PATH=$(npm root -g) node tools/e2e/wake.cjs <폴더>
const { chromium } = require('playwright'); const path = require('path');
const [SHOTS = '.'] = process.argv.slice(2), B = 'http://localhost:4173/';
const FAKE = () => { window.__wl = { req: 0, rel: 0, live: null }; const mk = () => { const ls = []; const l = { released: false, addEventListener: (t, f) => ls.push(f), release: async () => { if (l.released) return; l.released = true; window.__wl.rel++; ls.forEach((f) => f()); } }; return l; }; Object.defineProperty(navigator, 'wakeLock', { value: { request: async () => { window.__wl.req++; const l = mk(); window.__wl.live = l; return l; } }, configurable: true }); };
const NONE = () => { Object.defineProperty(navigator, 'wakeLock', { value: undefined, configurable: true }); };
(async () => {
  const b = await chromium.launch(), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const open = async (t) => { await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tabs'); await t.click('.tabs button:has-text("준비")'); await t.click('[data-k="lpick-go"]'); await t.click('[data-k="lpick"] .grid [data-id="set-02"]'); await t.click('.tact .btn'); await t.waitForSelector('.att'); await t.waitForTimeout(600); };
  { const ctx = await b.newContext({ viewport: { width: 400, height: 860 } }); await ctx.addInitScript(FAKE); const t = await ctx.newPage();
    await open(t);
    const w1 = await t.evaluate(() => ({ ...window.__wake(), req: window.__wl.req }));
    ok('리모컨 열면 wakeLock 잡힘', w1.held && w1.req >= 1, JSON.stringify(w1));
    // 다른 앱 = 브라우저가 풀어 버림 → 돌아옴(visibilitychange)
    await t.evaluate(async () => { await window.__wl.live.release(); Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    const w2 = await t.evaluate(() => window.__wake()); ok('가려지면 풀림', !w2.held);
    await t.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }); await t.waitForTimeout(200);
    const w3 = await t.evaluate(() => ({ ...window.__wake(), req: window.__wl.req })); ok('돌아오면 다시 잡힘', w3.held && w3.req >= 2, JSON.stringify(w3));
    ok('지원되는 폰 = 띠 없음', !(await t.$('[data-k="wake-tip"]')));
    await ctx.close(); }
  { const ctx = await b.newContext({ viewport: { width: 400, height: 860 } }); await ctx.addInitScript(NONE); const t = await ctx.newPage();
    await open(t); await t.waitForTimeout(300);
    const tip = await t.$('[data-k="wake-tip"]'); ok('지원 안 되는 폰 = 안내 띠', !!tip, tip ? (await tip.textContent()).slice(0, 40) : '');
    await t.screenshot({ path: path.join(SHOTS, 'wake-tip.png') });
    await t.reload(); await t.waitForTimeout(1500);
    // 새로 고침 = 이 기기 기억 → 다시 안 뜸 (localStorage 지우지 않음)
    ok('같은 기기 다시 = 띠 안 뜸', !(await t.$('[data-k="wake-tip"]')));
    await ctx.close(); }
  // 📱 학생 앱 전부 (📜 2026-11-14 「학생용 폰도」): 캠프 · 📋 게시판 · 🏰 성채 시트 = 잡힘 · 가려지면 풀림 · 돌아오면 다시
  { const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await ctx.addInitScript(FAKE); const c = await ctx.newPage();
    await c.goto(B + '?role=camp&room=WK1'); await c.waitForSelector('.stage'); await c.waitForTimeout(500);
    ok('학생 캠프 = 잡힘', (await c.evaluate(() => window.__wake())).held);
    await c.click('button[aria-label="📋 게시판"]'); await c.waitForSelector('.bd'); await c.waitForTimeout(300);
    ok('📋 게시판 = 잡힘', (await c.evaluate(() => window.__wake())).held);
    await c.close(); const c2 = await ctx.newPage(); await c2.goto(B + '?role=camp&room=WK1'); await c2.waitForSelector('.stage'); await c2.click('button[aria-label="성채"]'); await c2.waitForSelector('.sheet'); await c2.waitForTimeout(300);
    ok('🏰 성채 시트 = 잡힘', (await c2.evaluate(() => window.__wake())).held);
    await c2.evaluate(async () => { await window.__wl.live.release(); Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    ok('학생 · 가려지면 풀림', !(await c2.evaluate(() => window.__wake())).held);
    await c2.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }); await c2.waitForTimeout(200);
    ok('학생 · 돌아오면 다시 잡힘', (await c2.evaluate(() => window.__wake())).held);
    await ctx.close(); }
  { const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await ctx.addInitScript(NONE); const c = await ctx.newPage();
    await c.goto(B + '?role=camp&room=WK2'); await c.waitForSelector('.stage'); await c.waitForTimeout(800);
    ok('학생 캠프 · 미지원 = 띠 한 번', !!(await c.$('[data-k="wake-tip"]')));
    await c.reload(); await c.waitForSelector('.stage'); await c.waitForTimeout(800); ok('학생 · 다시 열면 띠 없음', !(await c.$('[data-k="wake-tip"]')));
    await ctx.close(); }
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}` : '✅ 오류 0'); await b.close();
})();
