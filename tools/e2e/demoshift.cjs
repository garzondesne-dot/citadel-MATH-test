// 🎮 시연 창 칸 밀림 (📜 2026-11-17 #11 「시연 보기 누르면 여전히 칸 미세하게 밀림」) — 보기 · 칩 누르기 전 · 뒤 2초 동안 칸 · 단추 · 폰 틀 자리를 잼
//   사용: NODE_PATH=$(npm root -g) node tools/e2e/demoshift.cjs <폴더> <차시id:몬스터id> …
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
    // 📐 (📜 2026-11-17 #11 🐞 「시연 보기 누르면 여전히 칸 미세하게 밀림」): 보기 · 칩을 누르기 전 · 누른 뒤 2초 동안 0.1초마다 칸 자리 · 배율을 잼 → 0.5px 넘게 움직이면 ❌
    const rects = () => tv.evaluate(() => { const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left * 10) / 10, Math.round(b.top * 10) / 10, Math.round(b.width * 10) / 10]; }; const o = { phone: r('.dpane .phone'), card: r('.dpane .bcard'), cell: r('.dpane .cell'), btn: r('.dpane .pmain') }; [...document.querySelectorAll('.dpane .opt, .dpane .chips button, .dpane .chip, .dpane .cell')].forEach((e, i) => { const b = e.getBoundingClientRect(); o[`칸${i}`] = [Math.round(b.left * 10) / 10, Math.round(b.top * 10) / 10, Math.round(b.width * 10) / 10]; }); const a = document.querySelector('.dpane .ans, .dpane [data-k="myans"], .dpane .mine'); if (a) { const b = a.getBoundingClientRect(); o.답줄 = [Math.round(b.left * 10) / 10, Math.round(b.top * 10) / 10, Math.round(b.height * 10) / 10]; } return o; });
    await tv.waitForTimeout(2500); const r0 = await rects(); let worst = 0, where = '';
    const watch = async (n, tag) => { for (let k = 0; k < n; k++) { await tv.waitForTimeout(100); const r1 = await rects(); for (const key of Object.keys(r0)) { if (!r0[key] || !r1[key]) continue; for (let j = 0; j < 3; j++) { const d = Math.abs(r0[key][j] - r1[key][j]); if (d > worst) { worst = d; where = `${tag} · ${key}[${j}] ${r0[key][j]} → ${r1[key][j]} (${k * 100 + 100}ms)`; } } } } };
    const rvb = () => tv.evaluate(() => { const b = [...document.querySelectorAll('.dpane button')].find((x) => /정답/.test(x.textContent || '')); b?.click(); return !!b; });
    await rvb(); await watch(15, '💡 정답 펼치기'); await rvb(); await watch(15, '💡 정답 접기');
    ok(`${arg} 💡 정답 펼치기 · 접기 → 칸 · 단추 · 배율 그대로 (0.5px 이하)`, worst <= 0.5, `가장 큰 움직임 ${worst.toFixed(1)}px · ${where}`);
    worst = 0; where = '';
    const picks = await tv.$$('.dpane .opt, .dpane .chips button, .dpane .chip');
    for (let i = 0; i < Math.min(4, picks.length); i++) { await picks[i].click().catch(() => {}); await watch(8, `보기 ${i + 1}`); }
    ok(`${arg} 보기 4번 누름 → 누를 때마다 0.8초 동안 칸 · 단추 · 배율 그대로 (0.5px 이하)`, worst <= 0.5, `가장 큰 움직임 ${worst.toFixed(1)}px · ${where}`);
    await tv.screenshot({ path: path.join(SHOTS, `demoshift-${arg.replace(':', '_')}.png`) });
    await ctx.close();
  }
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}` : '✅ 오류 0'); await b.close();
})();
