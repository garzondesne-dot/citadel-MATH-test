// 🐞 #44 ⑤ 「소리 없애야 되는데 왜 나오는 거야」 — TV ⚙ 「소리 끔」 = 공격 · 필살기 · 수업 사건 효과음까지 전부 · 새로 고침해도 끈 채로
//   NODE_PATH=$(npm root -g) node tools/e2e/tvmute44.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] }), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  await ctx.addInitScript(() => { window.__snd = 0; const st = AudioBufferSourceNode.prototype.start; AudioBufferSourceNode.prototype.start = function (...a) { window.__snd++; return st.apply(this, a); }; const pl = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { if (/\/sfx\//.test(this.src)) window.__snd++; return pl.call(this); }; });
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push(String(e)));
  const open = async () => {
    await t.goto(B + '?role=hall&mode=test&room=MUT1'); await t.waitForSelector('.dock'); await t.evaluate(() => window.__tvFake(6)); await t.waitForTimeout(800);
    for (let g = 0; g < 10 && !(await t.$('.arena2')); g++) { await t.mouse.move(800, 450); await t.click('.dock .go'); await t.waitForTimeout(500); }
    await t.waitForFunction(() => !document.querySelector('.sc') && typeof window.__tvAtk === 'function', null, { timeout: 15000 }).catch(() => {}); await t.waitForTimeout(1500);
  };
  const burst = async () => { await t.mouse.click(5, 5); const n0 = await t.evaluate(() => window.__snd); await t.evaluate(() => { for (let k = 0; k < 4; k++) window.__tvAtk(k, 'hit', 2); window.__tvAtk(5, 'hit', 3, undefined, true); }); await t.waitForTimeout(5000); return (await t.evaluate(() => window.__snd)) - n0; };
  await open();
  const on = await burst(); ok('소리 켬 = 공격 · 필살기 효과음 남', on > 0, `${on}번`);
  await t.click('[data-k="tvset"]'); await t.waitForTimeout(300); await t.evaluate(() => { const m = [...document.querySelectorAll('[role="menuitemcheckbox"]')].find((e) => /소리/.test(e.textContent)); if (m) m.click(); });
  await t.waitForTimeout(300);
  const lab = await t.evaluate(() => [...document.querySelectorAll('[role="menuitemcheckbox"]')].map((e) => e.textContent.trim()).find((x) => /소리/.test(x)) || '');
  const off = await burst(); ok('⚙ 소리 끔 = 효과음 0', /끔/.test(lab) && off === 0, `${lab} · ${off}번`);
  await open(); await t.click('[data-k="tvset"]'); await t.waitForTimeout(300); const lab2 = await t.evaluate(() => [...document.querySelectorAll('[role="menuitemcheckbox"]')].map((e) => e.textContent.trim()).find((x) => /소리/.test(x)) || '');
  await t.click('[data-k="tvset"]').catch(() => {}); const off2 = await burst(); ok('새로 고침해도 끈 채로 · 효과음 0', /끔/.test(lab2) && off2 === 0, `${lab2} · ${off2}번`);
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
