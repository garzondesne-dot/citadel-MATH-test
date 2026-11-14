// 🎮 종합실 「시연」 창 = 문제 카드만 (📜 2026-11-14 「전투 장면은 없애도 될 것 같아」)
//   차시마다: 교사 「🧪 테스트 해 보기」 → 첫 몬스터(또는 소레이드)까지 → TV 시연 → 장면 띠 · 💎 · 게임/제출 스위치 없음 · 문제 카드 · 주요 단추 있음 · 넘침 0 · 문제 글자 크기(TV px)
//   사용: NODE_PATH=$(npm root -g) node tools/e2e/demo.cjs <폴더> <차시id[:몬스터id]> …
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const [SHOTS = '.', ...lessons] = process.argv.slice(2), B = 'http://localhost:4173/', ROOT = path.join(__dirname, '../..');
const packFile = (id) => (id === 'set-11' ? path.join(ROOT, 'tools/pack-upload/official/set-11.json') : path.join(ROOT, `src/subjects/common-math2/lessons/${id.split('@')[0]}.json`));
(async () => {
  const b = await chromium.launch(), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  for (const arg of lessons) {
    const [id, want] = arg.split(':');
    const ctx = await b.newContext(), t = await ctx.newPage(); await t.setViewportSize({ width: 400, height: 860 }); t.on('pageerror', (e) => errs.push(`${id} ${e}`));
    await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tabs');
    if (id === 'set-11') { await t.click('.tabs button:has-text("준비")'); await t.click('.seg3 button:has-text("도구")'); await t.click('[data-k="packup-go"]'); await t.setInputFiles('[data-k="packfile"]', packFile(id)); await t.waitForSelector('[data-k="packsum"]'); await t.waitForTimeout(800); await t.click('.sheet .btn.pmain'); await t.waitForNavigation({ timeout: 10000 }).catch(() => {}); await t.waitForSelector('.tabs'); }
    await t.click('.tabs button:has-text("준비")'); await t.click('[data-k="lpick-go"]'); await t.click(`[data-k="lpick"] .grid [data-id="${id}"]`); await t.click('.tact .btn'); await t.waitForSelector('.att'); await t.click('[data-k="bot-sw"]'); await t.waitForFunction(() => !document.querySelector('.tact .btn')?.disabled, null, { timeout: 15000 }); // 🤖 가상 학생 = 수업 시작 단추가 켜지게
    const steps = JSON.parse(fs.readFileSync(packFile(id), 'utf8')).steps, target = want ? steps.findIndex((s) => s.id === want) : steps.findIndex((s) => s.kind === 'monster');
    for (let g = 0; g < 30; g++) { const st = await t.evaluate(() => { const L = window.__dbGet('school/live'); return window.__dbGet(`rooms/${L.code}`).state.step; }); if (st === target) break; await t.click('.tact .btn'); await t.waitForTimeout(250); }
    if (/지금 등장/.test(await t.textContent('.tact .btn'))) await t.click('.tact .btn');
    const code = await t.evaluate(() => window.__dbGet('school/live').code);
    const tv = await ctx.newPage(); await tv.setViewportSize({ width: 1920, height: 1080 }); tv.on('pageerror', (e) => errs.push(`${id} TV ${e}`));
    await tv.goto(B + `?role=hall&room=${code}`); await tv.waitForSelector('.dock', { timeout: 20000 }); await tv.waitForTimeout(1500);
    await tv.mouse.move(960, 540); await tv.click('.dock .t:has-text("시연")'); await tv.waitForSelector('.dpane .phone .pmain', { timeout: 15000 }); await tv.waitForTimeout(1200);
    const r = await tv.evaluate(() => { const d = document.querySelector('.dpane'), ph = d.querySelector('.phone'), k = ph.getBoundingClientRect().width / 390; const q = d.querySelector('.qtext, .q, .card p, .qitem, [class*="ques"]') || d.querySelector('.body p'); const fs = q ? parseFloat(getComputedStyle(q).fontSize) * k : 0; return { scene: !!d.querySelector('.edge'), ms: !!d.querySelector('[data-k="modesw"]'), gem: /💎/.test(d.querySelector('.phone').innerText), card: /문제|형성평가|졸개|대장/.test(d.querySelector('.phone').innerText), main: !!d.querySelector('.pmain'), over: d.scrollWidth - d.clientWidth, k: +k.toFixed(2), fs: Math.round(fs), chain: /졸개|대장/.test(d.innerText), head: (d.querySelector('.phone').innerText || '').split('\n').slice(0, 2).join(' / ') }; });
    ok(`${arg} 장면 띠 · 💎 · 게임/제출 스위치 없음`, !r.scene && !r.ms && !r.gem, JSON.stringify({ scene: r.scene, ms: r.ms, gem: r.gem }));
    ok(`${arg} 문제 카드 · 주요 단추 · 넘침 0`, r.card && r.main && r.over <= 0, `배율 ${r.k} · 문제 글자 ${r.fs}px(TV) · 「${r.head}」`);
    if (want) ok(`${arg} 소레이드 단계(졸개 · 대장)`, r.chain);
    await tv.click('.dpane .bar button:has-text("정답")'); await tv.waitForTimeout(300); const rev = (await tv.textContent('.dpane .rev').catch(() => '')).trim(); ok(`${arg} 💡 정답 펼치기 그대로`, rev.length > 2, rev.slice(0, 50));
    await tv.evaluate(() => [...document.querySelectorAll('nav.dock .t')].find((b) => /고정/.test(b.textContent))?.click()); // 📌 막대 고정 = 늘 떠 있음
    for (const [W, H] of [[1920, 1080], [1366, 768]]) { // 조작 막대를 띄운 채 시연 주요 단추가 다 보임 (🐞 2026-11-14)
      await tv.setViewportSize({ width: W, height: H }); await tv.waitForTimeout(500); await tv.mouse.move(W / 3, H / 2); await tv.mouse.move(W / 2, H / 2); await tv.waitForFunction(() => document.querySelector("nav.dock")?.classList.contains("on"), null, { timeout: 3000 }).catch(() => {}); await tv.waitForTimeout(450);
      const g = await tv.evaluate(() => { const d = document.querySelector('nav.dock'), m = document.querySelector('.dpane .pmain'), pane = document.querySelector('.dpane'); const dr = d.getBoundingClientRect(), mr = m.getBoundingClientRect(), pr = pane.getBoundingClientRect(); return { dockOn: d.classList.contains('on'), dockTop: Math.round(dr.top), dockL: Math.round(dr.left), mBot: Math.round(mr.bottom), paneBot: Math.round(pr.bottom), mTop: Math.round(mr.top), inPane: mr.bottom <= pr.bottom + 1 }; });
      ok(`${arg} ${W}×${H} 막대 떠 있어도 주요 단추 다 보임`, g.dockOn && g.mBot <= g.dockTop && g.inPane, JSON.stringify(g));
      await tv.screenshot({ path: path.join(SHOTS, `demo-${arg.replace(/[:@]/g, '_')}-${W}.png`) });
    }
    await ctx.close();
  }
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
