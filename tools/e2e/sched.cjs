// 📅 시간표 스위치 (📜 2026-11-13 밤 · 기본 끔): 끔 = ① 반 칸 → ② 차시 → 「▶ 수업 열기」 수동 · 준비 탭 「시간표」 없음
//   켬 = 오늘 시간표 칸 + 「시간표 · 교시 시각」 시트(🗓 칸 누르면 반 · 🕘 요일 교시 수 · 교시 시작 · 끝 → school/info) + 🕘 추천 한 줄(누르면 고르기만 · 저절로 안 열림)
//   NODE_PATH=$(npm root -g) node tools/e2e/sched.cjs <폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a);
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + '?role=teacher'); await p.waitForSelector('.tabs'); await p.waitForTimeout(400);
  // ① 끔(기본)
  const off = { tt: await p.$$eval('.tt', (x) => x.length), cls: await p.$$eval('.grid4 [data-cls]', (x) => x.map((e) => e.dataset.cls)) };
  log('① 끔: 시간표 칸', off.tt, '· 반 칸', off.cls.join(' ')); if (off.tt || off.cls.length < 2) errs.push('끔인데 시간표 칸 · 반 칸 아님');
  await p.click('[data-cls="1-3"]'); await p.click('.pk3 .pk:has-text("6차시")'); const btn = (await p.textContent('.tact .btn')).trim(); log('   주요 단추:', btn); if (!/1-3반 · 6차시 수업 열기/.test(btn)) errs.push('수동 열기 단추');
  await p.screenshot({ path: `${SHOTS}/sched-off.png` });
  await p.click('.tabs button:has-text("준비")'); await p.waitForTimeout(200); const tabsOff = await p.$$eval('.seg3 button', (x) => x.map((e) => e.textContent.trim())); log('   준비 탭:', tabsOff.join(' · ')); if (tabsOff.includes('시간표')) errs.push('끔인데 준비 탭에 시간표');
  // ② 켬 → 시간표 · 교시 시각 입력
  await p.evaluate(() => window.__featSet({ bundle: 'full', on: { schedule: true } })); await p.waitForTimeout(300);
  await p.click('.tabs button:has-text("수업")').catch(() => p.click('.tabs button >> nth=0')); await p.waitForTimeout(300);
  const tt = await p.$$eval('.tt', (x) => x.length); log('② 켬: 오늘 시간표 칸', tt); if (!tt) errs.push('켬인데 시간표 칸 없음');
  await p.click('.tlink:has-text("다른 반")'); await p.click('.tlink:has-text("교시 시각")'); await p.waitForSelector('[data-k="sched-bell"]');
  await p.click('[data-k="sched-bell"]'); await p.waitForTimeout(150);
  await p.click('button[aria-label="월 교시 늘리기"]'); await p.fill('[data-k="bs-8"]', '17:10'); await p.dispatchEvent('[data-k="bs-8"]', 'change'); await p.fill('[data-k="be-8"]', '18:00'); await p.dispatchEvent('[data-k="be-8"]', 'change');
  await p.fill('[data-k="bs-1"]', '08:50'); await p.dispatchEvent('[data-k="bs-1"]', 'change');
  await p.screenshot({ path: `${SHOTS}/sched-bell.png` });
  const info = await p.evaluate(() => { const o = {}; for (const k of Object.keys(localStorage)) if (k.includes('school/info')) o[k.split('|')[1]] = JSON.parse(localStorage.getItem(k)); return o; });
  const per = info['school/info/periods'] || {}, bl = info['school/info/bells'] || {};
  log('   저장: 월 교시', (per[1] || per['1'] || []).length, '· 8교시', JSON.stringify(bl[8] || bl['8']), '· 1교시', JSON.stringify(bl[1] || bl['1']));
  if ((per[1] || per['1'] || []).length !== 8 || JSON.stringify(bl[8] || bl['8']) !== '["17:10","18:00"]' || (bl[1] || bl['1'])[0] !== '08:50') errs.push('교시 시각 저장');
  await p.click('[data-k="sched-week"]'); const cell = p.locator('.sg button:not([disabled]) >> nth=0'); for (let k = 0; k < 3; k++) await cell.click();
  const c0 = (await cell.textContent()).trim(); log('   🗓 첫 칸 3번 누름:', c0); if (c0 !== '1-3') errs.push('시간표 칸 반 바뀜');
  await p.screenshot({ path: `${SHOTS}/sched-week.png` });
  await p.click('.sheet .act .btn'); await p.waitForTimeout(300);
  // ③ 추천 한 줄 (오늘 · 지금/다음 교시 칸에 반이 있을 때) — 시계를 월 2교시(10:05 KST)로 맞춘 새 탭
  const W = {}; for (let d = 1; d <= 5; d++) { W[d] = {}; for (let q = 1; q <= 7; q++) W[d][q] = '1-3'; }
  await p.evaluate((w) => { for (const k of Object.keys(localStorage)) if (k.endsWith('|school/features')) { const db = k.split('|')[0]; localStorage.setItem(`${db}|school/sched`, JSON.stringify(w)); } }, W);
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const st = await p.context().storageState(); await ctx2.addInitScript((ls) => { if (!localStorage.length) for (const { name, value } of ls) localStorage.setItem(name, value); }, st.origins[0]?.localStorage || []);
  const q = await ctx2.newPage(); await q.clock.install({ time: new Date('2026-11-16T01:05:00Z') }); q.on('pageerror', (e) => errs.push(String(e)));
  await q.goto(B + '?role=teacher'); await q.waitForSelector('.tabs'); await q.waitForTimeout(600);
  const rec = await q.$eval('[data-k="rec"]', (e) => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => '없음'); log('③ 추천 한 줄:', rec); if (!/지금 2교시 · 1-3반/.test(rec)) errs.push('추천 한 줄');
  await q.click('[data-k="rec"]'); await q.waitForTimeout(200); const bt = (await q.textContent('.tact .btn')).trim(); const opened = await q.$('.tp .live, .rdock');
  log('   누른 뒤 단추:', bt, '· 저절로 열림', !!opened); if (!/1-3반/.test(bt) || opened) errs.push('추천 = 고르기만');
  await q.screenshot({ path: `${SHOTS}/sched-on.png` });
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
