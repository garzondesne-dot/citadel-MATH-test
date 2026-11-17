// ✅ 도장 모드 (📜 2026-11-17 #32) — 이 기기 저장 · 🧪 테스트 + 🤖 3 · 폰 360 · 390
//   보기 줄 끝 「✅ 도장」 · 켜면 칸 톡 = 📜 +1(창 없음) · ✅ 표시 · 3초 되돌리기 · 같은 칸 다시 = 그대로 · 결석 칸 = 안 눌림
//   학생판 · 「지금」 칸 · 2×5 막대 y 그대로 · 다른 보기 = 끝 · ⚙ 도장 끔 = 단추 없음
//   NODE_PATH=$(npm root -g) node tools/e2e/stamp32.cjs <폴더> [주소]
const { chromium } = require('playwright');
const { testOpen } = require('./_cls.cjs');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [];
  for (const W of [360, 390]) {
    const ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${W} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(`${W} ${t}`); };
    const t = await (await b.newContext({ viewport: { width: W, height: 800 } })).newPage(); t.on('pageerror', (e) => errs.push('리모컨 ' + e));
    await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tp');
    await testOpen(t, { no: 6, mode: 'remote', bots: 3 }); await t.waitForSelector('[data-k="bots"]'); await t.waitForTimeout(2000); await t.click('.tact .btn'); await t.waitForTimeout(1000);
    const live = await t.evaluate(() => window.__dbGet('school/live')), P = `rooms/${live.code}`;
    const get = (p) => t.evaluate((p) => window.__dbGet(p), p), set = (p, v) => t.evaluate(([p, v]) => window.__dbSet(p, v), [p, v]);
    const ys = () => t.evaluate(() => ['[data-k="now-cell"]', '.nums', '.rdock'].map((s) => Math.round(document.querySelector(s)?.getBoundingClientRect().top ?? -1)).join(','));
    const y0 = await ys();
    const btn = await t.$('[data-k="stamp-mode"]');
    ok('보기 줄 끝에 「✅ 도장」', !!btn && /✅ 도장/.test(await btn.textContent()));
    await t.click('[data-k="stamp-mode"]'); await t.waitForTimeout(300);
    ok('켜도 학생판 · 「지금」 칸 · 막대 y 그대로', (await ys()) === y0, `${y0} → ${await ys()}`);
    const bots = Object.keys((await get(`${P}/players`)) || {}), u = bots[0];
    const cell = (n) => `.nums .n[data-n="${n}"]`;
    const num = await get(`${P}/players/${u}/num`);
    await t.click(cell(num)); await t.waitForTimeout(300);
    ok('칸 톡 = 도장 📜 +1 (창 없음)', !!(await get(`${P}/stamp/${u}`)) && !(await t.$('.sheet')), JSON.stringify(Object.keys((await get(`gifts/${u}`)) || {})));
    ok('칸에 ✅ · 되돌리기 띠', !!(await t.$(`${cell(num)} [data-k="stamped"]`)) && !!(await t.$('[data-k="stamp-undo"]')));
    await t.screenshot({ path: `${SHOTS}/stamp-${W}.png` });
    await t.click('[data-k="stamp-back"]'); await t.waitForTimeout(300);
    ok('되돌리기 = 📜 회수', !(await get(`${P}/stamp/${u}`)) && !Object.keys((await get(`gifts/${u}`)) || {}).some((k) => k.startsWith('stamp_')));
    await t.click(cell(num)); await t.waitForTimeout(200); await t.click(cell(num)); await t.waitForTimeout(200);
    const gs = Object.keys((await get(`gifts/${u}`)) || {}).filter((k) => k.startsWith('stamp_')).length;
    ok('다시 톡 = 한 수업 한 번', gs === 1, `도장 ${gs}개`);
    await t.waitForTimeout(3300); ok('3초 뒤 띠 사라짐', !(await t.$('[data-k="stamp-undo"]')));
    const ab = bots[1], an = await get(`${P}/players/${ab}/num`); await set(`${P}/absent/${ab}`, true); await t.waitForTimeout(400);
    await t.click(cell(an)); await t.waitForTimeout(300);
    ok('결석 칸 = 안 눌림', !(await get(`${P}/stamp/${ab}`)));
    await t.click('[data-view="today"]'); await t.waitForTimeout(300);
    ok('다른 보기 = 도장 모드 끝', !(await t.$('[data-k="stamp-mode"].on')));
    await t.click('[data-view="now"]'); await t.waitForTimeout(300);
    const n2 = await get(`${P}/players/${bots[2]}/num`); await t.click(cell(n2)); await t.waitForTimeout(400);
    ok('도장 모드 끝 = 칸 톡은 원래대로 학생 창', !!(await t.$('.sheet')) && !(await get(`${P}/stamp/${bots[2]}`)));
    await t.keyboard.press('Escape').catch(() => {}); await t.$eval('.sheet [aria-label="닫기"]', (e) => e.click()).catch(() => {});
    await set('school/features', { bundle: 'full', on: { stamp: false } }); await t.waitForTimeout(600);
    ok('⚙ 도장 끔 = 단추 없음', !(await t.$('[data-k="stamp-mode"]')));
    await t.context().close();
  }
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
