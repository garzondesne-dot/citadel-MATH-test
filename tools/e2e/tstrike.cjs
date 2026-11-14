// 🧑‍🏫 시연 다 맞힘 = 선생님 일격 (📜 2026-11-14 「교사 시연은 학생이랑 달라 · 퍼펙트 뜨면 필살기 공격」 · 「몬스터 시체 사라지는 기믹」)
//   차시마다: 테스트 수업(가상 학생) → 그 몬스터 → TV 시연 → 💡 정답대로 다 맞힘 → 「⚔ 일반 공격 · ⚡ 필살기」 → 일반 공격 → TV 선생님 돌진 · 「시연 · 데미지 없음」 또는 「💥 소멸!」(쓰러진 몬스터 = 사라짐)
//   kill = 차시id:몬스터:kill 이면 가상 학생이 몬스터를 쓰러뜨릴 때까지 기다린 뒤 시연
//   사용: NODE_PATH=$(npm root -g) node tools/e2e/demofit.cjs <폴더> <차시id:몬스터id> …
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const [SHOTS = '.', ...args] = process.argv.slice(2), B = 'http://localhost:4173/', ROOT = path.join(__dirname, '../..');
const packFile = (id) => (/^set-1[12]$/.test(id) ? path.join(ROOT, `tools/pack-upload/official/${id}.json`) : path.join(ROOT, `src/subjects/common-math2/lessons/${id}.json`));
(async () => {
  const b = await chromium.launch(), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  for (const arg of args) {
    const [id, mid, kill] = arg.split(':');
    const ctx = await b.newContext(), t = await ctx.newPage(); await t.setViewportSize({ width: 400, height: 860 });
    await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tabs');
    if (/^set-1[12]$/.test(id)) { await t.click('.tabs button:has-text("준비")'); await t.click('.seg3 button:has-text("도구")'); await t.click('[data-k="packup-go"]'); await t.setInputFiles('[data-k="packfile"]', packFile(id)); await t.waitForSelector('[data-k="packsum"]'); await t.waitForTimeout(800); await t.click('.sheet .btn.pmain'); await t.waitForNavigation({ timeout: 10000 }).catch(() => {}); await t.waitForSelector('.tabs'); }
    await t.click('.tabs button:has-text("준비")'); await t.click('[data-k="lpick-go"]'); await t.click(`[data-k="lpick"] .grid [data-id="${id}"]`); await t.click('.tact .btn'); await t.waitForSelector('[data-k="bots"]'); await t.click('[data-k="bot-sw"]');
    await t.waitForFunction(() => !document.querySelector('.tact .btn')?.disabled, null, { timeout: 15000 });
    const target = JSON.parse(fs.readFileSync(packFile(id), 'utf8')).steps.findIndex((s) => s.id === mid);
    for (let g = 0; g < 30; g++) { const st = await t.evaluate(() => { const L = window.__dbGet('school/live'); return window.__dbGet(`rooms/${L.code}`).state.step; }); if (st === target) break; await t.click('.tact .btn'); await t.waitForTimeout(250); }
    if (/지금 등장/.test(await t.textContent('.tact .btn'))) await t.click('.tact .btn');
    if (kill) await t.evaluate(() => { window.__botSpeed = 10; });
    if (kill) await t.waitForFunction((m) => { const L = window.__dbGet('school/live'), R = window.__dbGet(`rooms/${L.code}`); return Object.keys((R.subs || {})[m] || {}).length >= 18; }, mid, { timeout: 90000 }).catch(() => {});
    const code = await t.evaluate(() => window.__dbGet('school/live').code);
    const tv = await ctx.newPage(); await tv.setViewportSize({ width: 1920, height: 1080 }); await tv.goto(`${B}?role=hall&room=${code}`); await tv.waitForSelector('nav.dock', { timeout: 20000 }); await tv.waitForTimeout(1200);
    await tv.mouse.move(960, 540); await tv.click('nav.dock .t:has-text("시연")'); await tv.waitForSelector('.dpane .pmain', { timeout: 15000 }); await tv.waitForTimeout(800);
    const meas = async (tag) => { await tv.waitForTimeout(1200); return tv.evaluate((tag) => { const s = document.querySelector('.dpane .scr'), ph = document.querySelector('.dpane .phone'), k = ph.getBoundingClientRect().width / 390, q = s.querySelector('.q2, .qt'); return { tag, over: s.scrollHeight - s.clientHeight, k: +k.toFixed(2), fs: q ? Math.round(parseFloat(getComputedStyle(q).fontSize) * k) : 0 }; }, tag); };
    for (let g = 0; g < 8; g++) {
      await tv.click('.dpane .bar button:has-text("정답")').catch(() => {}); await tv.waitForTimeout(250);
      const rev = (await tv.textContent('.dpane .rev').catch(() => '')).replace(/^💡\s*/, ''); await tv.click('.dpane .bar button:has-text("정답")').catch(() => {});
      const opts = await tv.$$eval('.dpane .opt', (xs) => xs.map((x) => x.textContent.trim())); if (!opts.length) break;
      const want = opts.findIndex((o) => rev.split(' · ').some((r) => r.replace(/^(\d+\)|졸개 \S+|대장)\s*/, '').trim() === o)); if (want < 0) break;
      await tv.locator('.dpane .opt').nth(want).click(); await tv.waitForTimeout(200);
      const pm = tv.locator('.dpane .pmain'); if (await pm.isDisabled()) break; await pm.click(); await tv.waitForTimeout(1500);
      if (await tv.locator('[data-k="tstrike"]').count()) break;
    }
    const sb = await tv.$$eval('[data-k="tstrike"] button', (xs) => xs.map((x) => `${x.textContent.trim()}${x.disabled ? '(잠김)' : ''}`)).catch(() => []);
    ok(`${arg} 다 맞힘 = 「⚔ 일반 공격 · ⚡ 필살기」 (기술 고르기 · 재도전 없음)`, sb.length === 2 && /일반 공격/.test(sb[0]) && /필살기/.test(sb[1]) && !(await tv.locator('.dpane .box:not(.hide) :text("재도전")').count()), sb.join(' / '));
    await tv.screenshot({ path: path.join(SHOTS, `strike-${arg.replace(/:/g, '_')}-btn.png`) });
    const hpDown = await tv.evaluate(() => /0 \//.test(window.__arena?.hp || ''));
    await tv.click('[data-k="tstrike"] button:has-text("일반 공격")');
    let seenHero = false, seenTag = '';
    for (let k = 0; k < 20; k++) { await tv.waitForTimeout(150); if (await tv.locator('.dpane').count()) continue; seenHero = seenHero || (await tv.locator('[data-k="tstrike"]').count()) > 0; const tg = await tv.$$eval('[data-k="ttag"]', (xs) => xs.map((x) => x.textContent)).catch(() => []); if (tg.length) seenTag = tg.join(' '); if (seenTag && seenHero) break; }
    ok(`${arg} 누르면 시연 창 닫힘 · 선생님 용사 돌진 · 「${hpDown ? '💥 소멸!' : '시연 · 데미지 없음'}」`, !(await tv.locator('.dpane').count()) && seenHero && (hpDown ? /소멸/.test(seenTag) : /데미지 없음/.test(seenTag)), `용사 ${seenHero} · 글 「${seenTag}」 · 쓰러짐 ${hpDown}`);
    await tv.waitForTimeout(1500); await tv.screenshot({ path: path.join(SHOTS, `strike-${arg.replace(/:/g, '_')}-after.png`) });
    // 🐞 (📜 2026-11-14 문제점 1) 한 번 누름 = 한 번 · 다음 몬스터로 넘어가도 선생님 일격이 저절로 다시 나오지 않음
    const st0 = await t.evaluate(() => { const L = window.__dbGet('school/live'); return window.__dbGet(`rooms/${L.code}`).state.step; });
    let again = 0;
    for (let g = 0; g < 6; g++) { await t.click('.tact .btn').catch(() => {}); for (let k = 0; k < 6; k++) { await tv.waitForTimeout(150); if (await tv.locator('[data-k="tstrike"]').count()) again++; } }
    const st1 = await t.evaluate(() => { const L = window.__dbGet('school/live'); return window.__dbGet(`rooms/${L.code}`).state.step; });
    ok(`${arg} 다음 단계로 넘어가도 일격 다시 안 나옴 (한 번 누름 = 한 번)`, st1 !== st0 && again === 0, `단계 ${st0} → ${st1} · 다시 나온 횟수 ${again}`);
    if (hpDown) { const gone = await tv.evaluate(() => window.__arenaMonGone?.()); out.push(`ℹ 소멸 뒤 몬스터 숨김(그 단계) = ${gone}`); }
    await ctx.close();
  }
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}` : '✅ 오류 0'); await b.close();
})();
