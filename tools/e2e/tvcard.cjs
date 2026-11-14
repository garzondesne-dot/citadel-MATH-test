// 📺 TV 개념 · 문제 칸 그림 = 칸 안에 전체 (🐞 2026-11-15 「누르면 사진이 너무 커져 상단만 보임」): 보통 긴 칸(2:3) = 비율 유지 · 잘림 0 · 가운데
//   아주 긴 칸(13차시처럼 몬스터 이름 + 문제 + ★ · 1:3.7) = 폭 가득 + 스크롤 + 「⬇ 더 보기」 · 1080p · 720p · 크게 보기(누름)
//   사용: NODE_PATH=$(npm root -g) node tools/e2e/tvcard.cjs <폴더>
const { chromium } = require('playwright');
const [SHOTS = '.'] = process.argv.slice(2), B = 'http://localhost:4173/';
const draw = (w, h, label) => `(() => { const c = document.createElement('canvas'); c.width = ${w}; c.height = ${h}; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, ${w}, ${h}); g.strokeStyle = '#c00'; g.lineWidth = 8; g.strokeRect(4, 4, ${w} - 8, ${h} - 8); g.fillStyle = '#123'; g.font = 'bold 44px sans-serif'; g.fillText('${label} 위', 30, 70); g.fillText('${label} 아래 끝', 30, ${h} - 40); return c.toDataURL('image/webp'); })()`;
(async () => {
  const b = await chromium.launch(), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const ctx = await b.newContext(), t = await ctx.newPage(); await t.setViewportSize({ width: 400, height: 860 });
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tabs');
  await t.click('.tabs button:has-text("준비")'); await t.click('[data-k="lpick-go"]'); await t.click('[data-k="lpick"] .grid [data-id="set-06"]'); await t.click('.tact .btn'); await t.waitForTimeout(800);
  const c1 = await t.evaluate(draw(600, 900, '개념 c1')), m1 = await t.evaluate(draw(600, 2200, '문제 m1'));
  await t.evaluate(([a, b2]) => { window.__dbSet('prep/set-06/img/c1', a); window.__dbSet('prep/set-06/img/m1', b2); }, [c1, m1]);
  const code = await t.evaluate(() => window.__dbGet('school/live').code);
  const st = await ctx.newPage(); await st.setViewportSize({ width: 390, height: 844 }); await st.goto(`${B}?role=student&room=${code}&as=1-1:3`); await st.waitForTimeout(2000);
  await t.waitForFunction(() => !document.querySelector('.tact .btn')?.disabled, null, { timeout: 15000 }); await t.click('.tact .btn'); await t.waitForTimeout(600); // 대기실 → 개념 1
  for (const [w, h] of [[1920, 1080], [1280, 720]]) {
    const tv = await ctx.newPage(); await tv.setViewportSize({ width: w, height: h }); tv.on('pageerror', (e) => errs.push(String(e)));
    await tv.goto(`${B}?role=hall&room=${code}`); await tv.waitForSelector('.split .cpane', { timeout: 15000 }); await tv.waitForTimeout(1500);
    const m = async () => tv.$$eval('.split .cpane', (ps) => ps.filter((p) => getComputedStyle(p).display !== 'none').map((p) => { const im = p.querySelector('.pimg img'), box = p.querySelector('.pi.fill'); if (!im || !box) return null; const r = im.getBoundingClientRect(), q = box.getBoundingClientRect(); return { tall: box.dataset.tall === 'true', inside: r.top >= q.top - 1 && r.bottom <= q.bottom + 1 && r.left >= q.left - 1 && r.right <= q.right + 1, ratio: +(r.height / r.width).toFixed(2), more: !!p.querySelector('.more'), w: Math.round(r.width), bw: Math.round(q.width), cx: Math.round(r.left + r.width / 2 - (q.left + q.width / 2)) }; }));
    const a = await m(); await tv.screenshot({ path: `${SHOTS}/tvcard-${h}-split.png` });
    ok(`${h}p 둘로 나눔: 개념 = 칸 안에 전체 · 비율 그대로 · 가운데`, a[0] && a[0].inside && !a[0].tall && Math.abs(a[0].ratio - 1.5) < 0.05 && Math.abs(a[0].cx) <= 2, JSON.stringify(a[0]));
    ok(`${h}p 둘로 나눔: 아주 긴 문제 칸 = 폭 가득 · 스크롤 · ⬇ 더 보기`, a[1] && a[1].tall && a[1].more && a[1].w >= a[1].bw - 2, JSON.stringify(a[1]));
    await tv.click('.split .cpane >> nth=0'); await tv.waitForTimeout(500); const z = await m(); await tv.screenshot({ path: `${SHOTS}/tvcard-${h}-zoom.png` });
    ok(`${h}p 개념 크게 보기(누름) = 그래도 칸 안에 전체(위만 보이지 않음)`, z[0] && z[0].inside && !z[0].tall, JSON.stringify(z[0]));
    // 📄 문제 창(리모컨 「문제」 = 다음 몬스터 칸 m1 · 아주 긴 칸) = 폭 가득 스크롤 · 더 보기
    await tv.mouse.move(w / 2, h / 2); await tv.click('nav.dock .t:has-text("문제")').catch(() => {}); await tv.waitForTimeout(1200);
    const sh = await tv.$eval('.ov.sheet .pi.fill', (x) => ({ tall: x.dataset.tall, more: !!x.querySelector('.more') })).catch(() => null); await tv.screenshot({ path: `${SHOTS}/tvcard-${h}-sheet.png` });
    ok(`${h}p 📄 문제 창 = 같은 맞춤(아주 긴 칸 = 스크롤 · 더 보기)`, sh && sh.tall === 'true' && sh.more, JSON.stringify(sh));
    await tv.mouse.move(w / 2 + 5, h / 2 + 5); await tv.click('nav.dock .t:has-text("문제")', { force: true }).catch(() => {}); await tv.waitForTimeout(600); // 📄 닫기(방 상태라 다음 화면에도 남음)
    await tv.close();
  }
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
