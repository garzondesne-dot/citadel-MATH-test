// 🧑‍🏫 시연 다 맞힘 = 정답 확인 + 일격 단추 한 화면 (📜 2026-11-17 #12 「정답체크장면 급하게 나오고 공격 고르기로 넘어감 · 차분히 둘다 보이게」)
//   시험 모드 TV → 문제 1 → 🎮 시연 → 💡 정답대로 칩 · 보기를 눌러 다 맞힘 → ① 폰(문항 ✔ 줄) 그대로 보임 ② 그 아래 「⚔ 일반 공격 · ⚡ 필살기」 ③ 학생용 ⚡ 기술 고르기 안 보임 ④ 4초 기다려도 저절로 안 넘어감
//   NODE_PATH=$(npm root -g) node tools/e2e/demowin.cjs <폴더> [주소] [차시 = set-05]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/', LID = process.argv[4] || 'set-05';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const tv = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage(); tv.on('pageerror', (e) => errs.push(String(e)));
  await tv.goto(`${B}?role=hall&mode=test&lesson=${LID}&room=DW1`); await tv.waitForSelector('.dock', { timeout: 20000 }); await tv.evaluate(() => window.__tvFake?.(3));
  for (let i = 0; i < 12 && !(await tv.$('.dock .t:has-text("시연"):not([disabled])')); i++) { await tv.click('.dock .go').catch(() => {}); await tv.waitForTimeout(900); }
  if (/지금 등장/.test((await tv.textContent('.dock .go').catch(() => '')) || '')) await tv.click('.dock .go');
  await tv.click('.dock .t:has-text("시연")'); await tv.waitForSelector('.dpane .pmain', { timeout: 15000 }); await tv.waitForTimeout(1200);
  const revOn = () => tv.evaluate(() => { const bt = [...document.querySelectorAll('.dpane .dp > .bar button')].find((x) => /정답/.test(x.textContent || '')); if (bt && /펼치기/.test(bt.textContent || '')) bt.click(); });
  for (let g = 0; g < 12 && !(await tv.$('[data-k="tstrike"]')); g++) {
    await revOn(); await tv.waitForTimeout(250);
    const rev = ((await tv.textContent('.dpane .rev').catch(() => '')) || '').replace(/^💡\s*/, '');
    const cur = await tv.evaluate(() => { const cs = [...document.querySelectorAll('.dpane .cell')]; const i = cs.findIndex((c) => c.classList.contains('now')); return i < 0 ? 0 : i; });
    const line = (rev.split(' · ')[cur] || rev.split(' · ')[0] || '').replace(/^(\d+\)|졸개 \S+|대장)\s*/, '').trim();
    const opts = await tv.$$('.dpane .opt'), chips = await tv.$$('.dpane .chips button, .dpane .chip');
    if (opts.length) { const tx = await Promise.all(opts.map((o) => o.textContent())); const w = tx.findIndex((t) => (t || '').trim() === line); await opts[Math.max(0, w)].click(); }
    else if (chips.length) { const want = (line.match(/[^{},\s]+/g) || []); for (const c of chips) { const t = ((await c.textContent()) || '').trim(); if (want.includes(t)) await c.click(); } }
    await tv.waitForTimeout(200); const pm = tv.locator('.dpane .pmain').first(); if (await pm.isEnabled().catch(() => false)) await pm.click(); await tv.waitForTimeout(1500);
  }
  ok('다 맞힘 → 일격 단추 나옴', !!(await tv.$('[data-k="tstrike"]')));
  const st = await tv.evaluate(() => { const vis = (e) => !!e && e.getBoundingClientRect().height > 0 && getComputedStyle(e).display !== 'none'; const box = document.querySelector('.dpane .box'), sk = document.querySelector('.dpane .bcard.sk'), stk = document.querySelector('[data-k="tstrike"]'); return { box: vis(box), okLines: document.querySelectorAll('.dpane .scr .okline, .dpane .scr .row').length, sk: vis(sk), order: box && stk ? box.getBoundingClientRect().bottom <= stk.getBoundingClientRect().top + 1 : false, btn: [...document.querySelectorAll('[data-k="tstrike"] button')].map((x) => x.textContent.trim()) }; });
  ok('① 폰(정답 확인) 그대로 보임', st.box && st.okLines > 0, JSON.stringify(st));
  ok('② 폰 아래에 「⚔ 일반 공격 · ⚡ 필살기」', st.order && st.btn.length === 2 && /일반 공격/.test(st.btn[0]) && /필살기/.test(st.btn[1]));
  ok('③ 학생용 ⚡ 기술 고르기 안 보임', !st.sk);
  await tv.screenshot({ path: `${SHOTS}/demowin-0.png` }); await tv.waitForTimeout(4000);
  ok('④ 4초 뒤에도 그대로 (저절로 안 넘어감)', !!(await tv.$('[data-k="tstrike"]')) && !!(await tv.$('.dpane .box .phone')));
  await tv.screenshot({ path: `${SHOTS}/demowin-1.png` });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
