// 📅 시간표 켜도 수동 열기 (b206 · 📜 2026-11-15 선생님 「시간표 선택해도 수동으로 열 수 있게」): 월 10:10(2교시) · 시간표 2교시 = 1-3
//   ① 추천 「📅 지금 2교시 = 1-3반 · n차시」 + 아래 늘 반 칩 · 추천 값이 기본 선택(1-3 · n차시) ② 다른 반(1-4) · 다른 차시 골라 열기 → 그 반 · 차시
//   ③ 시간표 밖(일 19:00) = 추천 없음 · 반 칩으로 열기
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
const mon1010 = Date.UTC(2026, 10, 16, 1, 10), sun1900 = Date.UTC(2026, 10, 15, 10, 0);
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const page = async (t) => { const c = await b.newContext({ viewport: { width: 390, height: 844 } }); await c.clock.install({ time: t }); const p = await c.newPage(); p.on('pageerror', (e) => errs.push(String(e))); await p.goto(B + '?role=teacher'); await p.waitForSelector('.tabs'); await p.evaluate(() => { window.__featSet({ bundle: 'full', on: { schedule: true } }); window.__dbSet('school/sched', { 1: { 2: '1-3' } }); }); await p.reload(); await p.waitForSelector('.tabs'); await p.waitForTimeout(600); return p; };
  const p = await page(mon1010);
  const rec = (await p.textContent('[data-k="rec"]').catch(() => '')).replace(/\s+/g, ' ').trim();
  const manual = await p.$$eval('[data-k="cls-manual"] [data-cls]', (x) => x.length);
  const btn = async () => (await p.textContent('.tact .btn')).replace(/\s+/g, ' ').trim();
  ok('① 추천 칸 + 아래 반 칩', /지금 2교시 = 1-3반/.test(rec) && manual >= 5, `${rec} · 반 칩 ${manual}`);
  ok('① 추천 값이 기본 선택', /1-3반 · \d+차시 수업 열기/.test(await btn()), await btn());
  await p.screenshot({ path: `${SHOTS}/schedopen-rec.png` });
  await p.click('[data-k="cls-manual"] [data-cls="1-4"]'); await p.click('.pk3 .pk:has-text("6차시")');
  ok('② 다른 반 · 다른 차시로 바꿈', /1-4반 · 6차시 수업 열기/.test(await btn()), await btn());
  await p.click('.tact .btn'); await p.waitForTimeout(1500);
  const live = await p.evaluate(() => window.__dbGet('school/live'));
  ok('② 연 수업 = 1-4반 · 6차시', !!live && live.cls === '1-4' && /06/.test(String(live.lesson)), JSON.stringify(live && { cls: live.cls, lesson: live.lesson }));
  const q = await page(sun1900);
  const rec2 = await q.$('[data-k="rec"]'); await q.click('[data-k="cls-manual"] [data-cls="1-2"]'); await q.click('.pk3 .pk:has-text("6차시")');
  const b2 = (await q.textContent('.tact .btn')).replace(/\s+/g, ' ').trim();
  ok('③ 시간표 밖(일 19:00) = 추천 없음 · 반 칩으로 열기', !rec2 && /1-2반 · 6차시 수업 열기/.test(b2), b2);
  await q.screenshot({ path: `${SHOTS}/schedopen-off.png` });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
