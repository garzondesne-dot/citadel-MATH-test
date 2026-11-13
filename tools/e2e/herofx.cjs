// ⚔ 용사 fx (🔨 2026-11-13 · 정식 attack.js · aura.js 옮김): 공격 갤러리 「⚔ 용사 fx」 탭 · 360 × 640
//   근접(로안 Ⅰ · Ⅲ 연타) · 원거리(마녀 = 탄) · 쏘는 기술 · 틀림 · ⚡ 필살기 컷인 · 🌟 진필살기 · 🛡 홀리 방패 · 오라 1 · 7 · 10 → 띠 그림(.fx-spr) · 돌진(.hb 움직임) · 컷인(.ult) · 오라(.au-s) 확인 + 캡처
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch(), errs = []; const s = await (await b.newContext({ viewport: { width: 360, height: 640 } })).newPage();
  s.on('pageerror', (e) => errs.push(String(e))); s.on('console', (m) => { if (m.type() === 'error' && !/favicon|play\(\)|NotAllowed|NotSupported|Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 140)); });
  await s.goto('http://localhost:4173/?role=atk'); await s.waitForSelector('.qwrap .bcard'); await s.click('.tabs2 button:has-text("용사 fx")'); await s.waitForTimeout(300);
  const pick = async (hero, sk, enh = 0) => { await s.selectOption('.hrow select >> nth=0', String(hero)); await s.waitForTimeout(250); await s.selectOption('.hrow select >> nth=1', String(enh)); await s.waitForTimeout(250); if (sk) { await s.click(`.ids .a[data-sk="${sk}"]`); await s.waitForTimeout(250); } await s.waitForSelector('.edge .hb'); await s.waitForTimeout(400); };
  const watch = (ms) => s.evaluate((ms) => new Promise((res) => { const t0 = performance.now(); let spr = 0, mv = 0, ult = 0, proj = 0; const f = () => { spr = Math.max(spr, document.querySelectorAll('.edge .fx-spr').length); proj = Math.max(proj, document.querySelectorAll('.edge .atk-proj').length); const hb = document.querySelector('.edge .hb'); const t = hb && hb.style.translate; if (t) mv = Math.max(mv, Math.abs(parseFloat(t) || 0)); ult = Math.max(ult, document.querySelectorAll('.ult').length); if (performance.now() - t0 < ms) requestAnimationFrame(f); else res({ spr, mv: Math.round(mv), ult, proj }); }; f(); }), ms);
  const shot = async (name, delay) => { await s.waitForTimeout(delay); const r = await s.$eval('.edge', (x) => { const b = x.getBoundingClientRect(); return { x: b.left, y: b.top, width: b.width, height: b.height }; }); await s.screenshot({ path: `${SHOTS}/b54-herofx-${name}.png`, clip: r }); };
  const rows = [];
  const run = async (name, btn, ms, at, at2) => { const p = watch(ms); await s.click(`.ids .a[data-h="${btn}"]`); if (at != null) await shot(name, at); if (at2) await shot(name + '-광역', at2); const r = await p; rows.push(`${name.padEnd(14)} 띠 ${r.spr} · 돌진 ${r.mv}px · 탄 ${r.proj} · 컷인 ${r.ult}`); await s.waitForTimeout(500); return r; };
  await pick(0, 'cut'); let r = await run('근접Ⅰ-베기', 'hit', 1600, 380); if (!r.spr || r.mv < 30) errs.push('근접 베기');
  await pick(0, 'slash'); r = await run('근접Ⅲ-연타', 'hit', 2200, 520); if (!r.spr) errs.push('Ⅲ 연타');
  r = await run('틀림', 'miss', 1400, 300); if (r.spr) errs.push('틀림인데 이펙트');
  await pick(1, ''); const sk1 = await s.$eval('.ids .a.on', (x) => x.dataset.sk); r = await run(`원거리-${sk1}`, 'hit', 2000, 450); if (!r.proj && !r.spr) errs.push('원거리');
  await pick(0, 'twin'); r = await run('⚡필살기', 'ult', 3200, 600, 1300); if (!r.ult) errs.push('필살기 컷인');
  r = await run('🌟진필살기', 'true', 3200, 700, 1300); if (!r.ult) errs.push('진필살기 컷인');
  for (const lv of [1, 7, 10]) { await pick(0, 'cut', lv); const n = await s.$$eval('.edge .hero .au-s', (x) => x.length); rows.push(`오라 +${lv}: 그림 조각 ${n}`); if (!n) errs.push(`오라 ${lv}`); await shot(`오라${lv}`, 300); }
  r = await run('🛡홀리방패', 'holy', 2600, 1900); const gd = await s.$$eval('.gd-fx', (x) => x.length).catch(() => 0); rows.push(`홀리 방패 그림 ${gd}`);
  rows.forEach((x) => console.log('  ' + x));
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
