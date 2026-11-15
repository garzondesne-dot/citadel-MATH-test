// ☑ 「모두 고르기」 + 보기 가독성 (📜 2026-11-15 머리 🔨 ④ ⑤): 🎯 허수아비 10차시 문제 3 소레이드 (2) 참인 명제를 모두
//   ④ 보기 = 2 × 2 · 한 줄(줄바꿈 없음) · 글자 20px 넘음 · 360 · 390 폭 넘침 0
//   ⑤ 「모두」 늘 강조 · 처음 = 띠 없음 → 틀림 1번 = 띠 + ☐ 상자 + 고른 정답 ✔ · 고른 오답 ✘ · 다음 시도 ✔ 칸은 고른 채 → 또 틀림 = 띠 없음 · 취소선 0
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  for (const W of [390, 360]) {
    const p = await (await b.newContext({ viewport: { width: W, height: 800 }, deviceScaleFactor: 2 })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(`${B}?role=camp&mode=test&room=MA${W}`); await p.waitForSelector('.stage', { timeout: 20000 });
    await p.click('.prop[aria-label="🎯 허수아비"]'); await p.waitForSelector('[data-k="dummy-list"]'); await p.waitForTimeout(300);
    const card = p.locator('[data-k="dummy-list"] section.card[data-lesson="set-10"]');
    ok(`${W} 10차시 카드`, (await card.count()) > 0); if (!(await card.count())) continue;
    const li = card.locator('li').filter({ hasText: '세 조건' }).first();
    await li.locator('.go').first().evaluate((e) => e.click()); await p.waitForSelector('.drun', { timeout: 15000 }); await p.waitForTimeout(1200);
    // 졸개 ① (포함 관계 고르기) = 맞을 때까지 차례로 (허수아비 = ❤ 없음)
    for (let k = 0; k < 6 && !(await p.$('.chips')); k++) {
      const opts = p.locator('.drun .choices button, .drun .opts button, .drun button.opt'); const n = await opts.count(); if (!n) break;
      await opts.nth(k % n).click(); await p.waitForTimeout(150);
      await p.locator('.drun .pmain, .drun button.pmain').first().click().catch(() => {}); await p.waitForTimeout(1500);
    }
    ok(`${W} (2) 모두 고르기 칸 나옴`, !!(await p.$('.chips')));
    if (!(await p.$('.chips'))) { await p.screenshot({ path: `${SHOTS}/multi-${W}-stuck.png` }); continue; }
    const g = await p.evaluate(() => { const cs = [...document.querySelectorAll('.chips .chip')], r = cs.map((c) => c.getBoundingClientRect()); const lh = parseFloat(getComputedStyle(cs[0]).lineHeight) || 30;
      return { n: cs.length, cols: new Set(r.map((x) => Math.round(x.left))).size, oneLine: r.every((x) => x.height < lh * 1.9 + 24), fs: parseFloat(getComputedStyle(cs[0]).fontSize), over: document.documentElement.scrollWidth - innerWidth, all: !!document.querySelector('mark.all'), band: !!document.querySelector('[data-k="allband"]'), wide: cs.map((c) => c.scrollWidth <= c.clientWidth + 1).every(Boolean) }; });
    ok(`④ ${W} 보기 2 × 2 · 한 줄 · 20px 넘음 · 넘침 0`, g.n === 4 && g.cols === 2 && g.oneLine && g.fs >= 20 && g.over <= 0 && g.wide, JSON.stringify(g));
    ok(`⑤ ${W} 「모두」 강조 · 처음 띠 없음`, g.all && !g.band);
    await p.screenshot({ path: `${SHOTS}/multi-${W}-0.png` });
    // 하나만 골라 틀리게 (정답이 둘이라 하나만 = 늘 틀림) → 그다음 둘을 골라 냄
    const chip = (i) => p.locator('.chips .chip').nth(i);
    await chip(0).click(); await p.locator('.drun .pmain').first().click(); await p.waitForTimeout(2600);
    const nextWrong = async () => { for (let k = 0; k < 3 && !(await p.$('.chips')); k++) { await p.locator('.drun .pmain').first().click().catch(() => {}); await p.waitForTimeout(400); } await p.waitForTimeout(1200); };
    await nextWrong();
    let st = await p.evaluate(() => ({ band: !!document.querySelector('[data-k="allband"]'), ok: document.querySelectorAll('.chip.m-ok').length, bad: document.querySelectorAll('.chip.m-bad').length, box: document.querySelectorAll('.chip .cb').length, on: [...document.querySelectorAll('.chip.on')].map((c) => c.classList.contains('m-ok')), strike: [...document.querySelectorAll('.drun *')].filter((e) => getComputedStyle(e).textDecorationLine.includes('line-through') || e.tagName === 'S').length }));
    await p.screenshot({ path: `${SHOTS}/multi-${W}-after.png` }); log('   본문', (await p.evaluate(() => document.querySelector('.drun')?.innerText.replace(/\s+/g, ' ').slice(0, 400))));
    const wrong1 = st.ok + st.bad > 0;
    log(`   ${W} 1번째 낸 뒤`, JSON.stringify(st));
    if (wrong1) {
      ok(`⑤ ${W} 처음 틀림 = 띠 · ☐ 상자 · ✔/✘ 표시 · 취소선 0`, st.band && st.box === 4 && st.ok + st.bad === 1 && st.strike === 0, JSON.stringify(st));
      ok(`⑤ ${W} 다음 시도 = ✔ 칸만 고른 채`, st.on.length === st.ok && st.on.every(Boolean));
      await p.screenshot({ path: `${SHOTS}/multi-${W}-1.png` });
      // 또 틀림: ✔ 칸 그대로 + 지난 ✘ 칸 다시 고름 → 틀림
      const badIdx = await p.evaluate(() => [...document.querySelectorAll('.chips .chip')].findIndex((c) => c.classList.contains('m-bad')));
      if (badIdx >= 0) await chip(badIdx).click(); else await chip(3).click();
      await p.locator('.drun .pmain').first().click(); await p.waitForTimeout(2600); await nextWrong();
      st = await p.evaluate(() => ({ band: !!document.querySelector('[data-k="allband"]'), marks: document.querySelectorAll('.chip.m-ok, .chip.m-bad').length }));
      ok(`⑤ ${W} 두 번째 틀림 = 띠 없음 (표시는 그대로)`, !st.band && st.marks > 0, JSON.stringify(st));
      await p.screenshot({ path: `${SHOTS}/multi-${W}-2.png` });
    } else log(`   ${W} 우연히 정답 → 틀림 시험 건너뜀`);
  }
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
