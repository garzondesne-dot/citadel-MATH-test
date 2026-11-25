// 🐞 (📜 11/25 머리 🔨 · 선생님 캡처 「너무 배너가 많아서 성채 가려」) 캠프 위 띠(📄 기말 D-day · 🙋 빛나는 순위)가
//   반 탭 · 🏰 성채를 가리지 않는지 — 교사 캠프(반 탭 있음) · 학생 캠프 · 폰 375 · 360 · 미리 보기 서버 4173
//   NODE_PATH=$(npm root -g) node tools/e2e/campband1125.cjs <그림 폴더> [접두]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', TAG = process.argv[3] || 'after', B = 'http://localhost:4173/';
const box = (p, sel) => p.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; }).catch(() => null);
const hit = (a, b) => !!(a && b && a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]);
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  for (const w of [375, 360]) for (const who of ['교사', '학생']) {
    const p = await (await b.newContext({ viewport: { width: w, height: 760 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(B + '?role=camp&from=me'); await p.evaluate(() => { localStorage.setItem('atb-e2e-nointro', '1'); for (const w of ['me', 'teacher']) localStorage.setItem(`citadel-exam-cut|${w}|2026-12-10`, '1'); }); await p.reload(); await p.waitForTimeout(2500);
    if (who === '학생') { await p.click('[data-k="as-stu"]').catch(() => {}); await p.waitForTimeout(800); }
    const B0 = { tabs: await box(p, '[data-k="t-cls"]'), ex: await box(p, '[data-k="exam-band"]'), sh: await box(p, '[data-k="shine-band"]'), one: await box(p, '[data-k="bands"]'), castle: await box(p, '[data-prop="castle"], .obj.castle') };
    const bands = [B0.ex, B0.sh, B0.one].filter(Boolean);
    console.log(w, who, JSON.stringify(B0));
    ok(`${w} ${who} · 띠가 반 탭을 안 가림`, !bands.some((x) => hit(x, B0.tabs)));
    ok(`${w} ${who} · 띠가 성채를 안 가림`, !!B0.castle && !bands.some((x) => hit(x, B0.castle)), JSON.stringify(B0.castle));
    if (TAG === 'after') {
      ok(`${w} ${who} · 띠 한 줄(높이 ≤ 32)`, !!B0.one && !B0.ex && !B0.sh && B0.one[3] - B0.one[1] <= 32, JSON.stringify(B0.one));
      await p.screenshot({ path: `${SHOTS}/band-${TAG}-${w}-${who}.png` });
      await p.click('[data-k="bands"]').catch(() => {}); await p.waitForTimeout(400);
      ok(`${w} ${who} · 누르면 펼침(기말 · 빛나는 순위 두 줄)`, !!(await p.$('[data-k="bands-open"] [data-k="exam-band"]')) && !!(await p.$('[data-k="bands-open"] [data-k="shine-band"]')));
      await p.screenshot({ path: `${SHOTS}/band-${TAG}-${w}-${who}-open.png` });
      await p.click('[data-k="bands-open"] [data-k="exam-band"]').catch(() => {}); await p.waitForTimeout(500);
      ok(`${w} ${who} · 펼친 기말 줄 → 기말 창`, !!(await p.$('.sheet')));
    } else await p.screenshot({ path: `${SHOTS}/band-${TAG}-${w}-${who}.png` });
    ok(`${w} ${who} · 가로 넘침 0`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await p.context().close();
  }
  await b.close(); console.log(errs.length ? `❌ ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); process.exit(errs.length ? 1 : 0);
})();
