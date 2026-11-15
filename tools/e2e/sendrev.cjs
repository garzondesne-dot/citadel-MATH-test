// 🎯 A 복습으로 보내기 (📜 2026-11-16 머리 🔨 · 진도 못 나간 문제 · 👑 형성평가 포함) — 리모컨 · TV · 학생 폰 · 허수아비
//   리모컨 🎯 복습으로 → 지금 몬스터 하나 보내기 → TV 「🎯 … 복습 던전으로 이동!」 · 폰 「🎯 이 문제는 허수아비에서 만나요」
//   수업 닫기 → 남은 몬스터 · 👑 저절로 보냄 → 학생 허수아비 「📚 수업에서 넘어온 문제」 · 👑 「⭐ 꼭 풀기」 맨 위
//   NODE_PATH=$(npm root -g) node tools/e2e/sendrev.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/', DB = 'citadel-v1-test-db';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('리모컨 ' + e));
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tp');
  if (await t.$('[data-cls="1-3"]')) await t.click('[data-cls="1-3"]'); else { await t.click('text=다른 반'); await t.click('.sheet .pk:has-text("1-3반")'); }
  await t.click('.pk:has-text("6차시")'); await t.click('.tact .btn'); await t.waitForSelector('.nums');
  const live = await t.evaluate((k) => JSON.parse(localStorage.getItem(`${k}|school/live`)), DB), code = live.code;
  const s = await ctx.newPage(); s.on('pageerror', (e) => errs.push('폰 ' + e)); await s.goto(`${B}?role=student&room=${code}&as=1-3:2`); await s.waitForTimeout(1500);
  await t.bringToFront(); await t.click('.tact .btn'); await t.waitForSelector('.rflow'); await t.waitForTimeout(600);
  const tv = await ctx.newPage(); await tv.setViewportSize({ width: 1280, height: 720 }); tv.on('pageerror', (e) => errs.push('TV ' + e));
  const key = await t.evaluate((c) => window.__dbGet(`secrets/${c}/hallKey`), code);
  await tv.goto(`${B}?role=hall&code=${code}&key=${key}`); await tv.waitForTimeout(2500);
  const st = () => t.evaluate((c) => window.__dbGet(`rooms/${c}/state`), code);
  // 첫 몬스터 단계까지
  for (let i = 0; i < 9 && (await st()).step < 5; i++) { await t.click('.tact .btn'); await t.waitForTimeout(700); } // set-06 = c1 m1 c2 m2 c3 [m3] …
  const st0 = await st(); log('  지금 단계', st0.step);
  await t.click('[data-k="send-open"]'); await t.waitForSelector('[data-k="send-list"]');
  const items = await t.$$eval('[data-k="send-list"] li span', (x) => x.map((e) => e.textContent.trim()));
  ok('리모컨 🎯 시트 = 남은 몬스터 + 👑 형성평가 목록', items.length >= 2 && items.at(-1) === '👑 형성평가', items.join(' | '));
  await t.screenshot({ path: `${SHOTS}/send-sheet.png` });
  await t.click('[data-k="send-list"] li:first-child [data-k="send-one"]'); await t.waitForTimeout(500);
  const sent1 = Object.keys((await st()).sent || {}); ok('하나 보내기 = state.sent 1개', sent1.length === 1, sent1.join());
  await tv.bringToFront(); await tv.waitForTimeout(600);
  const tb = (await tv.textContent('[data-k="tv-send"]').catch(() => '')) || '';
  ok('TV = 🎯 … 복습 던전으로 이동!', /복습 던전으로 이동!/.test(tb), tb);
  await tv.screenshot({ path: `${SHOTS}/send-tv.png` });
  await s.bringToFront(); await s.waitForTimeout(800);
  const band = await s.$('[data-k="sent-band"]');
  log('  폰 띠', band ? '있음' : '없음 (보낸 것이 지금 단계가 아님)');
  if (band) { ok('폰 = 🎯 이 문제는 허수아비에서 만나요 · 문제 칸 숨김', /허수아비에서 만나요/.test(await band.textContent()) && !(await s.$('.qwrap'))); await s.screenshot({ path: `${SHOTS}/send-phone.png` }); }
  // 수업 닫기 → 남은 것 저절로
  await t.bringToFront(); const xx = await t.$('.sheet .x'); if (xx) await xx.click(); await t.waitForTimeout(300);
  await t.click('.lbar button'); await t.waitForSelector('.ask');
  const at = await t.textContent('.ask p'); ok('닫기 확인 = 남은 n개는 🎯 허수아비 복습으로', /허수아비 복습으로/.test(at), at);
  await t.screenshot({ path: `${SHOTS}/send-close-ask.png` });
  await t.click('.ask .btn'); await t.waitForTimeout(900);
  await s.bringToFront(); await s.waitForTimeout(1500);
  log('  기록', JSON.stringify(await t.evaluate(() => window.__dbGet('records/1-3/2'))));
  const sAll = await t.evaluate((c) => window.__dbGet(`rooms/${c}/state`), code);
  ok('닫기 = 남은 몬스터 · boss 모두 state.sent', !!sAll?.sent?.boss && Object.keys(sAll.sent).length === items.length, Object.keys(sAll?.sent || {}).join());
  // 기록 = 서버 계정 폰만 씀(이 기기 체험에는 없음 · 꼴은 tests/sendreview.test.ts) → 폰이 쓸 꼴 그대로 넣고 허수아비 화면만 확인
  if (!(await t.evaluate(() => window.__dbGet('records/1-3/2/set-06')))) await t.evaluate((c) => window.__dbSet('records/1-3/2/set-06', { code: c, mons: { m1: 'n', m2: 'n', m3: 's' }, bossM: 'ssssss', bossSent: true }), code);
  // 학생 캠프 → 허수아비
  const c2 = await ctx.newPage(); c2.on('pageerror', (e) => errs.push('캠프 ' + e));
  await c2.goto(B); await c2.evaluate(() => localStorage.setItem('citadel-v1-login', JSON.stringify({ cls: '1-3', num: 2 }))); await c2.goto(B); await c2.waitForSelector('.stage'); await c2.waitForTimeout(800);
  await c2.click('.prop[aria-label="🎯 허수아비"]'); await c2.waitForSelector('[data-k="dummy-list"]'); await c2.waitForTimeout(500);
  log('  카드', (await c2.$$eval('[data-k="dummy-list"] .card .h b', (x) => x.map((e) => e.textContent.trim()))).join(' | '), await c2.evaluate(() => JSON.stringify(window.__dbGet('records/1-3/2'))));
  const tags = await c2.$$eval('[data-k="sent-tag"]', (x) => x.length);
  const first = await c2.locator('[data-k="dummy-list"] .card', { hasText: '6차시' }).first().locator('li').first().evaluate( (e) => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');
  ok('허수아비 = 📚 수업에서 넘어온 문제 꼬리표', tags >= items.length, `${tags}개`);
  ok('허수아비 맨 위 = 👑 형성평가 · ⭐ 꼭 풀기', /꼭 풀기/.test(first), first.slice(0, 50));
  await c2.screenshot({ path: `${SHOTS}/send-dummy.png` });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
