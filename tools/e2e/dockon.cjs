// 🚨 교실 TV 조작 막대 늘 보임 (📜 2026-11-16 핫픽스 정식 b210 · 선생님 「리모컨은 그냥 계속 표시되게」) — NODE_PATH=$(npm root -g) node tools/e2e/dockon.cjs <폴더>
const { chromium } = require('playwright');
const B = process.argv[3] || 'http://localhost:4173/', SH = process.argv[2] || '.', DB = 'citadel-v1-test-db';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t} ${d}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('리모컨 ' + e));
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tp');
  if (await t.$('[data-cls="1-3"]')) await t.click('[data-cls="1-3"]'); else { await t.click('text=다른 반'); await t.click('.sheet .pk:has-text("1-3반")'); }
  await t.click('.pk:has-text("6차시")'); await t.click('.tact .btn'); await t.waitForSelector('.nums');
  const live = await t.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.endsWith('|school/live')) return JSON.parse(localStorage.getItem(k)); });
  const code = live.code, key = await t.evaluate((c) => window.__dbGet(`secrets/${c}/hallKey`), code);
  const s = await ctx.newPage(); await s.goto(`${B}?role=student&room=${code}&as=1-3:2`); await s.waitForTimeout(1500);
  const tvc = await b.newContext({ viewport: { width: 1280, height: 720 }, hasTouch: true });
  const tv = await tvc.newPage(); tv.on('pageerror', (e) => errs.push('TV ' + e));
  // 같은 기기 저장소를 쓰도록 같은 컨텍스트가 필요 → 리모컨 컨텍스트에서 TV
  const tv2 = await ctx.newPage(); await tv2.setViewportSize({ width: 1280, height: 720 }); tv2.on('pageerror', (e) => errs.push('TV ' + e));
  await tv2.goto(`${B}?role=hall&code=${code}&key=${key}`); await tv2.waitForTimeout(6000); // 마우스 · 터치 없이 6초
  const vis = await tv2.$eval('nav.dock', (e) => { const cs = getComputedStyle(e); return { op: cs.opacity, pe: cs.pointerEvents }; }).catch(() => null);
  ok('6초 손대지 않아도 조작 막대 보임 · 누를 수 있음', vis && vis.op === '1' && vis.pe !== 'none', JSON.stringify(vis));
  ok('손잡이 · 📌 고정 없음', !(await tv2.$('[data-k="dock-handle"]')) && !(await tv2.$('nav.dock button:has-text("고정")')));
  const st0 = await t.evaluate((c) => window.__dbGet(`rooms/${c}/state/step`), code);
  for (let i = 0; i < 3; i++) { await tv2.click('nav.dock .n.go'); await tv2.waitForTimeout(1500); if ((await t.evaluate((c) => window.__dbGet(`rooms/${c}/state/step`), code)) !== st0) break; }
  const st1 = await t.evaluate((c) => window.__dbGet(`rooms/${c}/state/step`), code);
  ok('TV 막대 「▶」 누르면 수업 진행', st1 !== st0, `${st0} → ${st1}`);
  await tv2.waitForTimeout(5000);
  ok('수업 중에도 계속 보임', await tv2.$eval('nav.dock', (e) => getComputedStyle(e).opacity === '1'));
  await tv2.screenshot({ path: `${SH}/hot-tv.png` });
  const vj = await (await tv2.request.get(B + 'version.json')).json(); ok('version.json = b209', vj.build === 'b209');
  console.log(errs.length ? `❌ ${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
