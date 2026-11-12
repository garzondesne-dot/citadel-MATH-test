// ⭐ #129 기호 톡 ↔ 모루: 문제 속 기호 톡 → ☆ 모루에 찜 → 「⭐ 모루에 담았어요」 1.5초 → 캠프 모루 이름표 ★n(익숙한 학생도 보임) → 만든 카드 = 「✅ 내 카드」 · 찜 단추 없음 · ★ 사라짐
// 사용: npm run build → npx vite preview --port 4173 → NODE_PATH=$(npm root -g) node tools/e2e/sym.cjs <그림 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
const B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 760 } });
  const errs = [], log = (...a) => console.log(...a);
  const watch = (p) => { p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); return p; };
  const hall = watch(await ctx.newPage()); await hall.goto(B + '?role=hall&mode=test&room=SY'); await hall.evaluate(() => localStorage.clear()); await hall.reload(); await hall.waitForSelector('.dock');
  const st = watch(await ctx.newPage()); await st.goto(B + '?role=student&room=SY'); await hall.waitForTimeout(800);
  await hall.mouse.move(400, 300); await hall.click('.dock .t:has-text("고정")');
  for (let k = 0; k < 4; k++) { await hall.click('.dock .go'); await hall.waitForTimeout(250); } // 캠프 → 대기실 → 개념 1 → 문제 1
  await hall.waitForFunction(() => !document.querySelector('.sc'), null, { timeout: 9000 });
  await st.waitForSelector('.sy'); const sym = (await st.textContent('.sy')).trim();
  await st.click('.sy'); await st.waitForSelector('.wish');
  log('기호 톡:', sym, '| 단추', (await st.textContent('.wish')).replace(/\s+/g, ' ').trim());
  await st.click('.wish'); await st.waitForTimeout(100); log('① 찜:', (await st.textContent('.toast')).trim(), '| 단추', (await st.textContent('.wish')).replace(/\s+/g, ' ').trim());
  await st.screenshot({ path: `${SHOTS}/b12-sym-wish-360.png` });
  await st.waitForTimeout(1600); log('1.5초 뒤 알림:', (await st.$('.toast')) ? '남음' : '사라짐');
  const cp = watch(await ctx.newPage()); await cp.goto(B + '?role=camp&room=SY'); await cp.waitForSelector('.stage');
  await cp.evaluate(() => { const m = JSON.parse(localStorage.getItem('citadel-v1-me')); m.seen = { castle: true, tent: true, anvil: true, dummy: true, mail: true, gate: true, hero: true }; localStorage.setItem('citadel-v1-me', JSON.stringify(m)); }); await cp.reload(); await cp.waitForSelector('.stage');
  const lab = await cp.$eval('button.prop[aria-label="모루"] .label', (e) => `${e.className.replace(/svelte-\S+/g, '').trim()}:${e.textContent.trim()}`);
  log('② 캠프 모루(익숙한 학생):', lab); if (!/star:모루★1/.test(lab)) errs.push(`모루 이름표 ${lab}`);
  // ⑥ 만든 카드 = ✅ 내 카드
  const card = await st.evaluate(() => { const m = JSON.parse(localStorage.getItem('citadel-v1-me')); const sym = Object.keys(m.wishes)[0]; return sym; });
  await st.evaluate(() => { const m = JSON.parse(localStorage.getItem('citadel-v1-me')); m.cards = { inter: true, union: true, comp: true, diff: true, subset: true, belong: true, notbelong: true, roster: true, builder: true, count: true, empty: true, equal: true, disjoint: true }; localStorage.setItem('citadel-v1-me', JSON.stringify(m)); });
  await st.reload(); await st.waitForSelector('.sy'); await st.click('.sy'); await st.waitForSelector('.sheet');
  log('⑥ 만든 카드:', (await st.$('.mine')) ? (await st.textContent('.mine')).replace(/\s+/g, ' ').trim() : '없음', '| 찜 단추', (await st.$('.wish')) ? '있음' : '없음', '| 찜 기호', card);
  await st.screenshot({ path: `${SHOTS}/b12-sym-mine-360.png` });
  await cp.reload(); await cp.waitForSelector('.stage'); log('만든 뒤 캠프 모루:', await cp.$eval('button.prop[aria-label="모루"] .label', (e) => `${e.className.replace(/svelte-\S+/g, '').trim()}:${e.textContent.trim()}`));
  log('오류', errs);
  await b.close();
})();
