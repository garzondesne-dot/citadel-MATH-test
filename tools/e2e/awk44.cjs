// ⚡ #44 각성 GPT 시트 29명 — 캠프 용사 = 각성 모습 그림(-awk-v8 · 숨쉬기 -awk-idle8-v8)이 실제로 받아지고 그려짐
//   NODE_PATH=$(npm root -g) node tools/e2e/awk44.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
const LAD = { 1: 'void', 2: 'cyclone', 3: 'cyclone', 4: 'skylance', 5: 'reap', 6: 'quake', 8: 'skylance', 9: 'quake', 10: 'reap', 11: 'thunder', 12: 'pillar', 13: 'tsunami', 14: 'nova', 15: 'nova', 18: 'eclipse', 19: 'qed', 20: 'qed', 21: 'drill', 22: 'thunder', 23: 'pillar', 24: 'thunder', 25: 'eclipse', 26: 'cyclone', 27: 'drill', 28: 'void', 29: 'meteor', 30: 'drill', 31: 'skylance', 33: 'meteor' };
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  const bad = []; p.on('response', (r) => { if (/awk-(idle8-)?v8\.webp/.test(r.url()) && r.status() >= 400) bad.push(r.url()); });
  await p.goto(B + '?role=camp&room=AW44'); await p.waitForTimeout(2500);
  const ids = Object.keys(LAD).map(Number); const seen = [];
  for (const id of ids) {
    await p.evaluate(({ id, fx }) => { const m = JSON.parse(localStorage.getItem('citadel-v1-me') || '{}'); m.hero = id; m.enh = 10; m.title = `awk_${id}`; m.socket = { ...(m.socket || {}), [id]: fx }; m.seen = { ...(m.seen || {}), hero: true }; m.test = true; m.wallet = { ...(m.wallet || {}), gem: 9999, scroll: 30, ver: 1, buys: [...new Set([...((m.wallet || {}).buys || []), `hero_${id}`])] }; localStorage.setItem('citadel-v1-me', JSON.stringify(m)); }, { id, fx: LAD[id] });
    await p.reload(); await p.waitForTimeout(1200);
    for (let i = 0; i < 3 && (await p.$('.sheet .x')); i++) { await p.click('.sheet .x').catch(() => {}); await p.waitForTimeout(200); }
    const bg = await p.evaluate(() => [...document.querySelectorAll('*')].map((e) => getComputedStyle(e).backgroundImage).filter((s) => /awk-(idle8-)?v8/.test(s)).map((s) => s.match(/hero-[\w-]+\.webp/)?.[0]).join(' '));
    seen.push(`${id}:${bg ? 'O' : 'X'}`);
    if (!bg) errs.push(`${id} 각성 그림 없음`);
    if ([1, 3, 28, 31].includes(id)) await p.screenshot({ path: `${SHOTS}/awk44-${id}.png` });
  }
  ok('29명 캠프 = 각성 그림', !errs.length, seen.join(' '));
  ok('그림 파일 모두 받아짐', !bad.length, bad.join(' '));
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
