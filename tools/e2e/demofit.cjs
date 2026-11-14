// 🎮 시연 창 = 스크롤 없이 한 화면 (📜 2026-11-14 「웬만하면 스크롤 안 되면 좋겠어 · 좌우 폭을 조금 줄여서」)
//   차시마다: 테스트 수업 → 그 몬스터 → TV 시연 → (고르기 문제면 💡 정답대로 눌러 다 맞힘까지) → 1920 × 1080 · 1366 × 768 에서 창 안 스크롤 0 · 문제 글자 TV px
//   사용: NODE_PATH=$(npm root -g) node tools/e2e/demofit.cjs <폴더> <차시id:몬스터id> …
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const [SHOTS = '.', ...args] = process.argv.slice(2), B = 'http://localhost:4173/', ROOT = path.join(__dirname, '../..');
const packFile = (id) => (/^set-1[12]$/.test(id) ? path.join(ROOT, `tools/pack-upload/official/${id}.json`) : path.join(ROOT, `src/subjects/common-math2/lessons/${id}.json`));
(async () => {
  const b = await chromium.launch(), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  for (const arg of args) {
    const [id, mid] = arg.split(':');
    const ctx = await b.newContext(), t = await ctx.newPage(); await t.setViewportSize({ width: 400, height: 860 });
    await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tabs');
    if (/^set-1[12]$/.test(id)) { await t.click('.tabs button:has-text("준비")'); await t.click('.seg3 button:has-text("도구")'); await t.click('[data-k="packup-go"]'); await t.setInputFiles('[data-k="packfile"]', packFile(id)); await t.waitForSelector('[data-k="packsum"]'); await t.waitForTimeout(800); await t.click('.sheet .btn.pmain'); await t.waitForNavigation({ timeout: 10000 }).catch(() => {}); await t.waitForSelector('.tabs'); }
    await t.click('.tabs button:has-text("준비")'); await t.click('[data-k="lpick-go"]'); await t.click(`[data-k="lpick"] .grid [data-id="${id}"]`); await t.click('.tact .btn'); await t.waitForSelector('[data-k="bots"]'); await t.click('[data-k="bot-sw"]');
    await t.waitForFunction(() => !document.querySelector('.tact .btn')?.disabled, null, { timeout: 15000 });
    const target = JSON.parse(fs.readFileSync(packFile(id), 'utf8')).steps.findIndex((s) => s.id === mid);
    for (let g = 0; g < 30; g++) { const st = await t.evaluate(() => { const L = window.__dbGet('school/live'); return window.__dbGet(`rooms/${L.code}`).state.step; }); if (st === target) break; await t.click('.tact .btn'); await t.waitForTimeout(250); }
    if (/지금 등장/.test(await t.textContent('.tact .btn'))) await t.click('.tact .btn');
    const code = await t.evaluate(() => window.__dbGet('school/live').code);
    const tv = await ctx.newPage(); await tv.setViewportSize({ width: 1920, height: 1080 }); await tv.goto(`${B}?role=hall&room=${code}`); await tv.waitForSelector('nav.dock', { timeout: 20000 }); await tv.waitForTimeout(1200);
    await tv.mouse.move(960, 540); await tv.click('nav.dock .t:has-text("시연")'); await tv.waitForSelector('.dpane .pmain', { timeout: 15000 }); await tv.waitForTimeout(800);
    const meas = async (tag) => { await tv.waitForTimeout(1200); return tv.evaluate((tag) => { const s = document.querySelector('.dpane .scr'), ph = document.querySelector('.dpane .phone'), k = ph.getBoundingClientRect().width / 390, q = s.querySelector('.q2, .qt'); return { tag, over: s.scrollHeight - s.clientHeight, k: +k.toFixed(2), fs: q ? Math.round(parseFloat(getComputedStyle(q).fontSize) * k) : 0 }; }, tag); };
    const shots = [];
    for (const [W, H] of [[1920, 1080], [1366, 768]]) { await tv.setViewportSize({ width: W, height: H }); const m = await meas(`문제 ${W}`); shots.push(m); ok(`${arg} ${W}×${H} 문제 = 창 안 스크롤 0`, m.over <= 0, `배율 ${m.k} · 문제 글자 ${m.fs}px · 넘침 ${m.over}`); await tv.screenshot({ path: path.join(SHOTS, `demofit-${arg.replace(':', '_')}-q-${W}.png`) }); }
    // 고르기 문제 = 💡 정답대로 눌러 다 맞힘까지 (소레이드 · 형성평가는 문제 화면만)
    if (!/boss/.test(mid)) {
      await tv.setViewportSize({ width: 1920, height: 1080 }); await tv.waitForTimeout(400);
      for (let g = 0; g < 8; g++) {
        await tv.click('.dpane .bar button:has-text("정답")').catch(() => {}); await tv.waitForTimeout(250);
        const rev = (await tv.textContent('.dpane .rev').catch(() => '')).replace(/^💡\s*/, ''); await tv.click('.dpane .bar button:has-text("정답")').catch(() => {});
        const opts = await tv.$$eval('.dpane .opt', (xs) => xs.map((x) => x.textContent.trim())); if (!opts.length) break;
        const want = opts.findIndex((o) => rev.split(' · ').some((r) => r.replace(/^(\d+\)|졸개 \S+|대장)\s*/, '').trim() === o));
        if (want < 0) break; await tv.locator('.dpane .opt').nth(want).click(); await tv.waitForTimeout(200);
        const pm = tv.locator('.dpane .pmain'); if (await pm.isDisabled()) break; await pm.click(); await tv.waitForTimeout(1600);
        if (/모두 맞혔|다 맞혔|퍼펙트|처치|일격|필살기/.test(await tv.textContent('.dpane'))) break;
      }
      for (const [W, H] of [[1920, 1080], [1366, 768]]) { await tv.setViewportSize({ width: W, height: H }); const m = await meas(`다 맞힘 ${W}`); const txt = (await tv.textContent('.dpane .scr')).replace(/\s+/g, ' '); ok(`${arg} ${W}×${H} 다 맞힌 뒤 = 창 안 스크롤 0`, m.over <= 0, `배율 ${m.k} · 넘침 ${m.over} · 「${txt.slice(-60)}」`); await tv.screenshot({ path: path.join(SHOTS, `demofit-${arg.replace(':', '_')}-done-${W}.png`) }); }
    }
    await ctx.close();
  }
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}` : '✅ 오류 0'); await b.close();
})();
