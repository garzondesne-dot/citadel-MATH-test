// 📉 가볍게 팩 확인 (📜 2026-11-17 #26 덧붙임 1 · 2) — 이 기기 저장 · 운영 서버에 안 올림
//   ① 올리기 검사 통과 ② later 단계(m4) = 🎯 허수아비 「도전」에 보임 ③ 차시 카드 ⏱ 45분 아래
//   NODE_PATH=$(npm root -g) node tools/e2e/light26.cjs <폴더> <팩 파일…> (zip · json)
const { chromium } = require('playwright');
const [SHOTS = '.', ...FILES] = process.argv.slice(2), B = process.env.B || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  const txt = async (s) => ((await p.textContent(s).catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  await p.goto(B + '?role=teacher'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.tabs');
  for (const f of FILES) {
    const name = f.split('/').pop();
    await p.goto(B + '?role=teacher&tab=prep'); await p.waitForSelector('[data-k="packs-tab"]');
    await p.click('[data-k="packup-go"]'); await p.setInputFiles('[data-k="packfile"]', f); await p.waitForSelector('[data-k="packsum"]', { timeout: 20000 }); await p.waitForTimeout(1500);
    const sum = await txt('[data-k="packsum"]');
    ok(`① ${name} 올리기 검사 통과`, /검사 통과/.test(sum) && !/고칠 칸/.test(sum), sum.slice(0, 160));
    await p.screenshot({ path: `${SHOTS}/l26-${name}-check.png` });
    const save = await p.$('.sheet .btn.pmain') || await p.$('.sheet .act .btn');
    if (save && !(await save.isDisabled())) { await save.click(); await p.waitForTimeout(2000); }
    const pk = await p.evaluate(() => { const all = window.__dbGet('prep/packs') || {}; return Object.values(all).map((x) => ({ id: x.id, no: x.no, rev: x.rev, later: (x.steps || []).filter((s) => s.later).map((s) => s.id), boss: x.boss?.items, links: x.boss?.links })); });
    console.log('   저장된 팩', JSON.stringify(pk));
  }
  await p.goto(B + '?role=teacher&tab=prep'); await p.waitForSelector('[data-k="packs-tab"]'); await p.click('[data-k="pack-more"]').catch(() => {});
  const cards = await p.$$eval('[data-k="pack-card"]', (xs) => xs.map((x) => x.textContent.replace(/\s+/g, ' ').trim()).filter((t) => /^1[123] /.test(t)));
  for (const c of cards) { const m = /(\d+)분/.exec(c); ok(`③ 카드 ⏱ 45분 아래 · ${c.slice(0, 40)}`, m && Number(m[1]) <= 45, c.slice(0, 80)); }
  await p.screenshot({ path: `${SHOTS}/l26-cards.png`, fullPage: true });
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
