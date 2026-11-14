// 🌫 정찰 시작 값 = 단계마다 방 정찰 값(차시 준비 60초) · 리모컨 · TV · 학생 폰 같은 값 (🐞 2026-11-14 「여전히 5초」)
//   10차시 🧪 테스트 수업 · 「다음 ▶」로 문제 1 → 2 → 3 → 4(소레이드) → 형성평가 · +30 누르지 않음 · 각 단계 시작 1초 뒤 세 곳의 남은 초 · 「⚔ 지금 등장」으로 넘김
//   사용: NODE_PATH=$(npm root -g) node tools/e2e/scoutall.cjs <폴더>
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const [SHOTS = '.'] = process.argv.slice(2), B = 'http://localhost:4173/', ROOT = path.join(__dirname, '../..');
(async () => {
  const b = await chromium.launch(), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const ctx = await b.newContext(), t = await ctx.newPage(); await t.setViewportSize({ width: 400, height: 860 });
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tabs');
  await t.click('.tabs button:has-text("준비")'); await t.click('[data-k="lpick-go"]'); await t.click('[data-k="lpick"] .grid [data-id="set-10"]'); await t.click('.tact .btn'); await t.waitForSelector('.att');
  const code = await t.evaluate(() => window.__dbGet('school/live').code);
  const s = await ctx.newPage(); await s.setViewportSize({ width: 390, height: 844 }); await s.goto(`${B}?role=student&room=${code}&as=1-1:3`); await s.waitForTimeout(2500);
  const tv = await ctx.newPage(); await tv.setViewportSize({ width: 1280, height: 720 }); await tv.goto(`${B}?role=hall&room=${code}`); await tv.waitForSelector('nav.dock', { timeout: 20000 });
  await t.waitForFunction(() => !document.querySelector('.tact .btn')?.disabled, null, { timeout: 15000 });
  const steps = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/subjects/common-math2/lessons/set-10.json'), 'utf8')).steps;
  const rows = [];
  for (let g = 0; g < 14; g++) {
    const mt = (await t.textContent('.tact .btn')).trim(); if (/수업 닫기/.test(mt)) break;
    await t.click('.tact .btn'); await t.waitForTimeout(1200);
    const st = await t.evaluate(() => { const L = window.__dbGet('school/live'); return window.__dbGet(`rooms/${L.code}`).state.step; }), sp = steps[st];
    if (!sp || !['monster', 'boss'].includes(sp.kind)) continue;
    const remote = Number(((await t.textContent('body')).match(/등장까지\s*(\d+)초/) || [])[1]);
    const tvS = Number(((await tv.textContent('body')).match(/등장까지\s*(\d+)\s*초/) || [])[1]);
    const stu = Number(((await s.textContent('body')).match(/(\d+)초\s*뒤에 몬스터|(\d+)초 뒤 답 칸/) || []).slice(1).find(Boolean));
    rows.push(`${sp.id}: 리모컨 ${remote} · TV ${tvS} · 학생 ${stu}`);
    ok(`${sp.id} 정찰 시작 ≈ 60초 (리모컨 · TV · 학생 폰)`, [remote, tvS, stu].every((v) => v >= 55 && v <= 60) && Math.max(remote, tvS, stu) - Math.min(remote, tvS, stu) <= 2, `리모컨 ${remote} · TV ${tvS} · 학생 ${stu}`);
    await tv.mouse.move(400, 300); await tv.mouse.move(640, 360); await tv.waitForTimeout(300);
    const tvGo = (await tv.textContent('nav.dock .go').catch(() => '')).trim(); ok(`${sp.id} TV 조작 막대 = 「⚔ 지금 등장」`, /지금 등장/.test(tvGo), tvGo);
    if (sp.id === 'm2') { await tv.evaluate(() => document.querySelector('nav.dock .go').click()); await t.waitForTimeout(800); const sl = await t.evaluate(() => { const L = window.__dbGet('school/live'); const R = window.__dbGet(`rooms/${L.code}`); return { step: R.state.step, end: (R.state.solveEnd || {}).m2 }; }); ok('TV 「⚔ 지금 등장」 = 같은 단계에서 정찰 끝 (건너뛰지 않음)', sl.step === st && !!sl.end, JSON.stringify(sl)); continue; }
    if (/지금 등장/.test(await t.textContent('.tact .btn'))) { await t.click('.tact .btn'); await t.waitForTimeout(500); }
  }
  await tv.screenshot({ path: path.join(SHOTS, 'scoutall-tv.png') });
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}` : '✅ 오류 0'); await b.close();
})();
