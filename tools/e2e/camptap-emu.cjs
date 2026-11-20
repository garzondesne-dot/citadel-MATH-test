// 👆 11/20 캠프 물건 = 늘 밝게(흐림 없음) · 누르면 톡 + 번쩍 + 반짝이(물건마다 색) · 창은 바로 열림 (에뮬레이터 · 학생 1-3 · 3번)
//   NODE_PATH=$(npm root -g) node tools/e2e/camptap-emu.cjs <그림 폴더>
const { chromium } = require('playwright');
const { rest } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/?emu=127.0.0.1';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest('', 'PATCH', { roster: { '1-3': { 3: '시험삼' } }, rosterMask: { '1-3': { 3: '시*삼' } }, school: { features: { bundle: 'full', on: { hero: true, scarecrow: true, board: true, citadel: true, forge: true } } } });
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const s = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); s.on('pageerror', (e) => errs.push(String(e))); s.setDefaultTimeout(15000);
  await s.addInitScript(() => { try { localStorage.setItem('citadel-wake-tip', '1'); } catch {} });
  await s.goto(B); await s.waitForSelector('.title', { timeout: 20000 }); await s.waitForTimeout(800);
  await s.selectOption('select >> nth=0', '1-3'); await s.waitForTimeout(200); await s.selectOption('select >> nth=1', '3'); await s.waitForTimeout(300);
  if (!(await s.$('.pw:has(small)'))) await s.click('.lk:has-text("가입")');
  await s.click('.pw >> nth=0'); for (const k of '12341234') await s.click(`.pad button:text-is("${k}")`);
  await s.click('.title .act .pmain'); await s.waitForTimeout(3500);
  const fh = await s.$('button:has-text("과 시작"), button:has-text("와 시작")'); if (fh) { await fh.click(); await s.waitForTimeout(1200); }
  await rest(`gifts/s1_3_3/g1`, 'PUT', { g: 1, at: Date.now(), got: false, hold: true }); // 우편함에 할 일 하나 = 예전엔 나머지가 어두워짐
  await s.waitForTimeout(2500); await s.screenshot({ path: `${SHOTS}/camptap-pre.png` }); await s.waitForSelector('[data-prop="scare"]', { state: 'attached' }); await s.waitForTimeout(500);
  const dim = await s.$$eval('.prop', (x) => x.filter((e) => e.classList.contains('dim')).length), todo = await s.$$eval('.prop.todo', (x) => x.map((e) => e.dataset.prop));
  const filt = await s.$$eval('.prop:not(.todo) .img', (x) => x.map((e) => getComputedStyle(e).filter).filter((f) => /brightness\(0\.5/.test(f)).length);
  ok('① 할 일 있는 물건이 있어도 나머지는 밝게 (흐림 0)', dim === 0 && filt === 0, `할 일 = ${todo.join(',')}`);
  await s.screenshot({ path: `${SHOTS}/camptap-0.png` });
  for (const [k, col] of [['scare', 'rgb(110, 231, 160)'], ['dummy', 'rgb(255, 210, 90)'], ['tent', 'rgb(124, 212, 255)'], ['mail', 'rgb(255, 159, 198)']]) {
    const el = await s.$(`[data-prop="${k}"]`); if (!el) { console.log('   (없음)', k); continue; }
    await s.$eval(`[data-prop="${k}"]`, (e) => e.click()); await s.waitForTimeout(90);
    const r = await s.$eval(`[data-prop="${k}"]`, (e) => ({ tp: e.classList.contains('tp'), n: e.querySelectorAll('[data-k="tap-fx"] i').length, c: e.querySelector('[data-k="tap-fx"] i') ? getComputedStyle(e.querySelector('[data-k="tap-fx"] i')).backgroundColor : '' }));
    if (k === 'scare') await s.screenshot({ path: `${SHOTS}/camptap-${k}.png` });
    await s.waitForTimeout(1100); const sheet = !!(await s.$(".sheet, [data-k=\"dummy-list\"], [data-k=\"mailbox\"], .board, .bd, [data-k=\"board\"]")); if (!sheet) await s.screenshot({ path: `${SHOTS}/camptap-nosheet-${k}.png` });
    ok(`② ${k}: 톡 · 반짝이 6 · 색 ${col} · 창 열림 (용사가 걸어간 뒤 · 이펙트는 안 기다림)`, r.tp && r.n === 6 && r.c === col && sheet, JSON.stringify(r));
    await s.keyboard.press('Escape'); await s.waitForTimeout(300); const x = await s.$('.sheet .x, .sheet .close, button[aria-label="닫기"]'); if (x) await x.click().catch(() => {}); await s.waitForTimeout(600);
    if (await s.$('.drun, [data-k="dummy-list"]')) { const back = await s.$('.top .back, button[aria-label="뒤로"]'); if (back) await back.click(); await s.waitForTimeout(600); }
  }
  ok('콘솔 오류 0', !errs.some((e) => /Error/.test(e)), errs.slice(0, 2).join(' | '));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
