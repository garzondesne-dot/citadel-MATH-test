// 📦 B 지난 차시에서 넘어온 몬스터 (📜 2026-11-16 머리 🔨) — 리모컨 「수업 열기」 고르기 · ⏱ · TV ⏪ · 학생 폰 · 기록 = 원래 차시
//   6차시를 열어 첫 단계에서 닫음(남은 몬스터 = 🎯 보냄) → 같은 반 8차시 고르기 → 「📦 지난 6차시에서 넘어온 몬스터 n마리」 → 도입 뒤 먼저 → 열기
//   NODE_PATH=$(npm root -g) node tools/e2e/carry.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/', DB = 'citadel-v1-test-db';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('리모컨 ' + e));
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tp');
  const pickCls = async () => { if (await t.$('[data-cls="1-3"]')) await t.click('[data-cls="1-3"]'); else { await t.click('text=다른 반'); await t.click('.sheet .pk:has-text("1-3반")'); } };
  await pickCls(); await t.click('.pk:has-text("6차시")');
  ok('지난 수업 없음 = 📦 칸 없음', !(await t.$('[data-k="carry"]')));
  await t.click('.tact .btn'); await t.waitForSelector('.nums');
  { const c0 = (await t.evaluate((k) => JSON.parse(localStorage.getItem(`${k}|school/live`)), DB)).code; const s0 = await ctx.newPage(); await s0.goto(`${B}?role=student&room=${c0}&as=1-3:2`); await s0.waitForTimeout(1200); await t.bringToFront(); await t.waitForTimeout(400); }
  await t.click('.tact .btn'); await t.waitForSelector('.rflow'); await t.waitForSelector('.tact .btn:not([disabled])'); await t.click('.tact .btn'); await t.waitForTimeout(500);
  await t.click('.lbar button'); await t.waitForSelector('.ask'); await t.click('.ask .btn'); await t.waitForTimeout(800);
  // 같은 반 8차시
  await pickCls(); await t.click('.pk:has-text("8차시")'); await t.waitForSelector('[data-k="carry"]');
  const lab = await t.textContent('[data-k="carry"] .lab');
  ok('📦 지난 6차시에서 넘어온 몬스터 n마리', /지난 6차시에서 넘어온 몬스터 \d+마리/.test(lab), lab);
  ok('처음 = 안 함', await t.$eval('[data-k="carry"] [data-at="none"]', (e) => e.classList.contains('on')));
  const e0 = await t.textContent('[data-k="carry-est"]');
  await t.click('[data-k="carry"] [data-at="intro"]'); await t.waitForTimeout(200);
  const e1 = (await t.textContent('[data-k="carry-est"]')).replace(/\s+/g, ' ');
  ok('⏱ = + n분(넘어온 몬스터)', /\+ [\d.]+분\(넘어온 몬스터\)/.test(e1), e1);
  ok('50분 넘으면 = 「안 함」 권유 한 줄', !/50분을 넘어요/.test(e1) || /허수아비 복습으로 두기를 권해요/.test(e1), e0.slice(0, 40));
  await t.screenshot({ path: `${SHOTS}/carry-home.png` });
  await t.click('.tact .btn'); await t.waitForSelector('.nums');
  const live = await t.evaluate((k) => JSON.parse(localStorage.getItem(`${k}|school/live`)), DB), code = live.code;
  const meta = await t.evaluate((c) => window.__dbGet(`rooms/${c}/meta/carry`), code);
  ok('방 meta/carry = { from: set-06 · at: intro }', meta?.from === 'set-06' && meta.at === 'intro' && meta.ids.length > 0, JSON.stringify(meta));
  const s = await ctx.newPage(); s.on('pageerror', (e) => errs.push('폰 ' + e)); await s.goto(`${B}?role=student&room=${code}&as=1-3:2`); await s.waitForTimeout(1200);
  const tv = await ctx.newPage(); await tv.setViewportSize({ width: 1280, height: 720 }); tv.on('pageerror', (e) => errs.push('TV ' + e));
  const key = await t.evaluate((c) => window.__dbGet(`secrets/${c}/hallKey`), code);
  await tv.goto(`${B}?role=hall&code=${code}&key=${key}`); await tv.waitForTimeout(2000);
  await t.bringToFront();
  let back = '';
  for (let i = 0; i < 6 && !back; i++) { await t.waitForSelector('.tact .btn:not([disabled])', { timeout: 8000 }).catch(() => {}); await t.click('.tact .btn'); await tv.waitForTimeout(1200); back = (await tv.textContent('[data-k="tv-back"]').catch(() => '')) || ''; }
  ok('TV = ⏪ 지난번에 놓친 ○○가 돌아왔다!', /⏪ 지난번에 놓친 「6차시 문제 \d」 몬스터가 돌아왔다!/.test(back), back);
  await tv.screenshot({ path: `${SHOTS}/carry-tv.png` });
  ok('리모컨 = ⏪ 넘어온 몬스터 단계', /⏪/.test(await t.textContent('.tp')), '');
  await s.bringToFront(); await s.waitForTimeout(1200);
  ok('학생 폰 = 문제 화면(같은 길)', !!(await s.$('.qwrap, .bcard, .chain')), '');
  await s.screenshot({ path: `${SHOTS}/carry-phone.png` });
  await t.bringToFront(); await t.screenshot({ path: `${SHOTS}/carry-remote.png` });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
