// 📦 차시 팩 탭 두 갈래 (📜 2026-11-17 #26 · 시안 5NtpVpjEcDK1edxsrmBRew ①~④) — 이 기기 저장
//   ① 탭 맨 위 「📦 차시 올리기」(처음 값) · 「🛠 차시 만들기 n/6」 ② 올리기 = 카드 + 🧰 + 아래 고정 「📦 차시 팩 올리기」(목록 펼쳐도 자리 그대로)
//   ③ 만들기 = 6칸 지도 · 한 화면 한 단계 · ◀ · ✔ 했어요 · 다음 ▶ · 5단계 = 올리기 창 · 갈래 바꿔도 위 제목 · 아래 탭 막대 자리 그대로 ④ PC ≥ 900 = 왼쪽 목록 ⑤ 「n개 더」 = 한 줄 높이
//   NODE_PATH=$(npm root -g) node tools/e2e/packs26.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  const txt = async (s) => ((await p.textContent(s).catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  const box = async (s) => p.$eval(s, (e) => { const r = e.getBoundingClientRect(); return { y: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width) }; }).catch(() => null);
  await p.goto(B + '?role=teacher'); await p.evaluate(() => localStorage.clear()); await p.goto(B + '?role=teacher&tab=prep'); await p.waitForSelector('[data-k="packs-tab"]');
  ok('① 두 갈래 · 처음 값 = 📦 차시 올리기', !!(await p.$('[data-k="side-up"].on')) && /0\/6/.test(await txt('[data-k="side-make"]')), await txt('.side'));
  const up0 = await box('[data-k="upbar"]'), tabs0 = await box('.tabs'), title0 = await box('.tbar');
  ok('② 아래 고정 「📦 차시 팩 올리기」 = 탭 막대 바로 위 · 맨 위 큰 카드 · 🛠 진행 카드 없음', up0 && tabs0 && Math.abs(up0.y + up0.h - tabs0.y) <= 12 && !(await p.$('.upbig')) && !(await p.$('.prog')), JSON.stringify({ up0, tabs0 }));
  const more = await box('[data-k="pack-more"]'); ok('⑤ 「n개 더」 = 한 줄 높이', more && more.h <= 48, JSON.stringify(more));
  await p.click('[data-k="pack-more"]'); await p.waitForTimeout(200);
  ok('② 목록 펼쳐도 올리기 단추 자리 그대로', JSON.stringify(await box('[data-k="upbar"]')) === JSON.stringify(up0));
  await p.screenshot({ path: `${SHOTS}/p26-1-up.png` });
  await p.click('[data-k="side-make"]'); await p.waitForSelector('[data-k="build"]');
  ok('③ 만들기 = 6칸 지도 · 지금 단계 하나', (await p.$$('.map [data-step]')).length === 6 && (await p.$$('[data-k="step-now"]')).length === 1 && /^1\./.test(await txt('[data-k="step-now"] .nt')), await txt('[data-k="step-now"] .nt'));
  ok('③ 갈래 바꿔도 위 제목 · 아래 탭 막대 자리 그대로', JSON.stringify(await box('.tbar')) === JSON.stringify(title0) && JSON.stringify(await box('.tabs')) === JSON.stringify(tabs0));
  await p.click('[data-k="step-done-1"]'); await p.waitForTimeout(150);
  ok('③ ✔ 했어요 = 다음 단계로 · 지도 1 ✔', /^2\./.test(await txt('[data-k="step-now"] .nt')) && (await p.$('.map [data-step="1"].ok')) && /1\/6/.test(await txt('[data-k="build-n"]')));
  await p.click('[data-k="step-prev"]'); ok('③ ◀ = 앞 단계', /^1\./.test(await txt('[data-k="step-now"] .nt')));
  await p.click('.map [data-step="5"]'); await p.click('[data-k="step-up"]'); await p.waitForTimeout(300);
  ok('③ 5단계 = 갈래 안에서 올리기 창', !!(await p.$('[data-k="packtext"], [data-k="packfile"]')) && !!(await p.$('[data-k="side-make"].on')));
  await p.keyboard.press('Escape'); await p.click('.sheet .x').catch(() => {}); await p.waitForTimeout(200);
  await p.screenshot({ path: `${SHOTS}/p26-2-make.png` });
  await p.goto(B + '?role=teacher&tab=prep'); await p.waitForSelector('[data-k="packs-tab"]');
  ok('① 탭을 다시 열면 늘 「📦 차시 올리기」 · 진행 기억 1/6', !!(await p.$('[data-k="side-up"].on')) && /1\/6/.test(await txt('[data-k="build-n"]')));
  await p.setViewportSize({ width: 1280, height: 800 }); await p.click('[data-k="side-make"]'); await p.waitForTimeout(200);
  const pc = await p.evaluate(() => { const m = document.querySelector('.map').getBoundingClientRect(), n = document.querySelector('[data-k="step-now"]').getBoundingClientRect(); return { side: m.right <= n.left + 1, mw: Math.round(m.width) }; });
  ok('④ PC ≥ 900 = 왼쪽 단계 목록 · 오른쪽 지금 단계', pc.side, JSON.stringify(pc));
  await p.screenshot({ path: `${SHOTS}/p26-3-pc.png` });
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
