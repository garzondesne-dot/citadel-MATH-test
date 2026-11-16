// 📲 리모컨 폰 폭 맞춤 (📜 2026-11-16 머리 🔨 「지금 되나?」): 390px · 수업 열기 → 단계마다 → 몬스터(🙋 · 학생 칸 · 도구 줄 · 막힘 띠 · 도장) · 가로 넘침 0 · 단추 겹침 0 · 캡처
//   NODE_PATH=$(npm root -g) node tools/e2e/remotefit.cjs <폴더> [주소] [차시 이름=6차시]   (이 기기 저장만 · 서버 쓰기 없음)
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/', LN = process.argv[4] || '6차시', DB = 'citadel-v1-test-db';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('리모컨 ' + e));
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tp');
  if (await t.$('[data-cls="1-3"]')) await t.click('[data-cls="1-3"]'); else { await t.click('text=다른 반'); await t.click('.sheet .pk:has-text("1-3반")'); }
  await t.click(`.pk:has-text("${LN}")`); await t.click('.tact .btn'); await t.click('[data-k="open-yes"]'); await t.waitForSelector('.nums');
  const code = await t.evaluate((k) => JSON.parse(localStorage.getItem(`${k}|school/live`)).code, DB);
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) { const s = await ctx.newPage(); await s.goto(`${B}?role=student&room=${code}&as=1-3:${n}`); }
  await t.bringToFront(); await t.waitForTimeout(1200);
  const fit = (name) => t.evaluate(() => {
    const W = document.documentElement.clientWidth, over = document.documentElement.scrollWidth - W;
    const bs = [...document.querySelectorAll('.mid button, .mid .n, .tact button, .lbar button, .rdock button, [data-k="stuck"]')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; });
    const rs = bs.map((e) => ({ r: e.getBoundingClientRect(), t: (e.textContent || '').trim().slice(0, 12) }));
    const cut = rs.filter((x) => x.r.right > W + 1 || x.r.left < -1).map((x) => x.t);
    const lap = []; for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) { const a = rs[i].r, c = rs[j].r; const ix = Math.min(a.right, c.right) - Math.max(a.left, c.left), iy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top); if (ix > 3 && iy > 3 && !(a.left <= c.left && a.right >= c.right && a.top <= c.top && a.bottom >= c.bottom) && !(c.left <= a.left && c.right >= a.right && c.top <= a.top && c.bottom >= a.bottom)) lap.push(`${rs[i].t}↔${rs[j].t}`); }
    return { over, cut, lap: lap.slice(0, 4), n: rs.length };
  });
  const check = async (name) => { const f = await fit(name); ok(`${name} · 넘침 0 · 잘림 0 · 겹침 0`, f.over <= 0 && !f.cut.length && !f.lap.length, JSON.stringify(f)); await t.screenshot({ path: `${SHOTS}/rf-${name}.png` }); };
  await check('0대기실');
  for (let i = 1; i <= 4; i++) {
    await t.click('.tact .btn'); await t.waitForTimeout(700);
    const now = (await t.textContent('.rfcap b').catch(() => '')) || '';
    await check(`${i}${now.replace(/[^가-힣0-9 ]/g, '').trim().replace(/\s+/g, '')}`);
    if (/문제/.test(now)) {
      if (await t.$('.badge.sc')) { await t.click('.tact .btn'); await t.waitForTimeout(600); } // 정찰 일찍 끝
      for (const n of [2, 4, 7]) await t.evaluate(([c, u]) => { for (let k = 0; k < 4; k++) window.__dbSet(`rooms/${c}/subs/m1/${u}/${k}`, [[]]); }, [code, `s1_3_${n}`]); // 칼 다 씀 → 🙋 · ① 칸 막힘
      await t.waitForTimeout(1000); await check(`${i}몬스터-공격중`);
      await t.click('.n[data-n="2"]'); await t.waitForTimeout(500); await check(`${i}학생칸`);
      await t.keyboard.press('Escape'); const x = await t.$('.sheet .x'); if (x) await x.click().catch(() => {}); await t.waitForTimeout(300);
      break;
    }
  }
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
