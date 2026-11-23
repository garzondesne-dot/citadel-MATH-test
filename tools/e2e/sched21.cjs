// 📅 시간표 · ⏰ 자동 열기 · ⚙ 상시 설정 · ✉ 소식 단추 · 🙂 나 · 📺 입장 대기 화면 (📜 2026-11-17 #21 A · C · D · E) — 이 기기 저장
//   월 08:58 (KST) 로 시계를 맞춤 · 시간표 월 1교시 = 1-3
//   NODE_PATH=$(npm root -g) node tools/e2e/sched21.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
const mon0858 = Date.UTC(2026, 10, 15, 23, 58); // 11/16 월 08:58 KST
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await ctx.clock.install({ time: mon0858 });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + '?role=teacher'); await p.waitForSelector('.tabs'); await p.waitForTimeout(400);
  const txt = async (s) => ((await p.textContent(s).catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  // D 📅 시간표
  await p.click('.tabs button:has-text("시간표")'); await p.click('[data-k="top-sched"]'); await p.waitForTimeout(200);
  ok('D 처음 = 「📅 시간표 쓰기 시작」 한 번', !!(await p.$('[data-k="sched-start"]')));
  await p.click('[data-k="sched-start"]'); await p.waitForTimeout(200);
  ok('D 누르면 사라지고 월~금 × 7교시', !(await p.$('[data-k="sched-start"]')) && (await p.$$('[data-cell]')).length === 35);
  await p.click('[data-cell="1-1"]'); await p.waitForSelector('[data-k="cell-pick"]');
  const picks = await p.$$eval('[data-k="cell-pick"] [data-pick]', (x) => x.map((e) => e.dataset.pick));
  ok('D 칸 톡 = 고르기 창(반 + ✕ 없음 · 1-6 없음)', picks.includes('none') && !picks.includes('1-6'), picks.join(','));
  await p.click('[data-pick="1-3"]'); await p.waitForTimeout(150);
  ok('D 고르면 저장 · 닫힘', (await txt('[data-cell="1-1"]')) === '1-3' && !(await p.$('[data-k="cell-pick"]')));
  await p.click('[data-cell="1-1"]'); await p.waitForSelector('[data-k="cell-pick"]'); await p.keyboard.press('Escape'); await p.click('.sheet .x').catch(() => {}); await p.waitForTimeout(150);
  await p.click('[data-cell="1-1"]').catch(() => {}); await p.keyboard.press('Escape'); await p.click('.sheet .x').catch(() => {}); await p.waitForTimeout(150);
  ok('D 톡을 거듭해도 반이 안 바뀜', (await txt('[data-cell="1-1"]')) === '1-3', await txt('[data-cell="1-1"]'));
  const b1 = await txt('[data-k="bell-2"] small');
  await p.click('[data-k="bell-2"]'); await p.click('[data-k="bell-m5"]'); await p.click('[data-k="bell-save"]'); await p.waitForTimeout(200);
  ok('D 교시 단추 = 시종 −5 · 저장', (await txt('[data-k="bell-2"] small')) !== b1, `${b1} → ${await txt('[data-k="bell-2"] small')}`);
  await p.screenshot({ path: `${SHOTS}/s21-sched.png` });
  // A ⚙ 상시 설정 · 수업 길이
  await p.click('[data-k="tgear"]'); await p.waitForSelector('[data-k="tset"]');
  const items = await txt('[data-k="tset"]');
  ok('A ⚙ = 소리 · 앱 · 시간표 · 로그아웃', /소리/.test(items) && /홈 화면/.test(items) && /시간표 쓰는 중/.test(items) && /로그아웃/.test(items), items.slice(0, 120));
  await p.click('[data-k="set-sched"]'); await p.click('[aria-label="5분 줄이기"]'); await p.waitForTimeout(100);
  ok('A 수업 길이 50 → 45', (await txt('[data-k="len-v"]')) === '45분');
  await p.screenshot({ path: `${SHOTS}/s21-gear.png` });
  await p.click('.sheet .act .btn'); await p.click('.sheet .act .btn').catch(() => {}); await p.waitForTimeout(200);
  // A ✉ 소식 · 🙂 나
  await p.click('.tabs button:has-text("소식")'); await p.waitForTimeout(200);
  ok('A 소식 위 🔔 알림 · 📜 바뀐 것', !!(await p.$('[data-k="news-note"]')) && !!(await p.$('[data-k="changes"]')));
  await p.click('[data-k="changes"]'); await p.waitForTimeout(200); ok('📜 바뀐 것 창', /바뀐 것/.test(await txt('.sheet'))); await p.click('.sheet .act .btn').catch(() => {}); await p.waitForTimeout(150);
  await p.click('.tabs button:has-text("나")'); await p.waitForTimeout(200);
  const me = await txt('.mid');
  ok('A 나 = 용사 카드 · 내 캠프 · 종합실 키 / 소리 / 로그아웃 없음', /내 캠프/.test(me) && !/종합실/.test(me) && !/소리/.test(me) && !/로그아웃/.test(me), me.slice(0, 120));
  // E 📅 오늘 시간표 · ⏰ 자동 열기
  await p.click('.tabs button:has-text("수업")'); await p.waitForTimeout(300);
  ok('E 수업 탭 맨 위 = 📅 오늘 시간표 · 1교시 1-3 · ▶ 바로 열기', /1-3반/.test(await txt('[data-k="today"]')) && !!(await p.$('[data-k="go-now"]')));
  await p.click('[data-k="auto-sw"]'); await p.waitForTimeout(150);
  ok('E ⏰ 자동 열기 켬 · 안내 「교사 폰 앱이 켜져 있어야 열려요」', /켬/.test(await txt('[data-k="auto-sw"]')) && /교사 폰 앱이 켜져 있거나 교사 로그인한 종합실 PC/.test(await txt('[data-k="auto-note"]')));
  await p.screenshot({ path: `${SHOTS}/s21-today.png` });
  // C 📺 입장 대기 화면 · E 자동 열기 = 종합실 PC
  const tv = await ctx.newPage(); await tv.setViewportSize({ width: 1280, height: 720 }); tv.on('pageerror', (e) => errs.push('TV ' + e));
  await tv.goto(B + '?role=hall'); await tv.waitForSelector('[data-k="tv-entry"]', { timeout: 15000 }).catch(() => {});
  const e0 = ((await tv.textContent('[data-k="tv-entry"]').catch(() => '')) || '').replace(/\s+/g, ' ');
  ok('C 입장 대기 = QR · 다음 수업 1-3 · 「선생님이 수업을 열면」 · ⏰ 자동 · ⛶', /1-3반/.test(e0) && /수업을 열면/.test(e0) && /다음 자동 열기/.test(e0) && /먼저 켜진 쪽이 열어요|교사 폰 앱을 켜 두거나/.test(e0) && !!(await tv.$('[data-k="tv-full2"]')) && !!(await tv.$('[data-k="tv-entry"] svg, [data-k="tv-entry"] canvas, [data-k="tv-entry"] img')), e0.slice(0, 160));
  ok('C TV 교사 캠프 없음', !(await tv.$('.campv')));
  await tv.screenshot({ path: `${SHOTS}/s21-tv-entry.png` });
  // 1분 전 🔔 (교사 폰) · 시작종 → TV 가 엶
  await p.bringToFront(); await ctx.clock.fastForward('01:20'); await p.waitForTimeout(1200); // 08:59:20
  ok('E 1분 전 🔔 교사 폰 [취소] · [다른 차시]', /1분 뒤 자동으로/.test(await txt('.sheet')) && !!(await p.$('[data-k="soon-cancel"]')) && !!(await p.$('[data-k="soon-other"]')));
  await p.screenshot({ path: `${SHOTS}/s21-soon.png` });
  await p.click('[data-k="soon-ok"]');
  await p.bringToFront(); await ctx.clock.fastForward('01:00'); await p.waitForTimeout(12000);
  const lv = await p.evaluate(() => window.__dbGet('school/live'));
  ok('E 📜 11/24 시작종 = 교사 폰 · 교사 PC 중 한 기기가 1-3 ⭐ 차시 엶', lv?.cls === '1-3' && !lv.test, JSON.stringify(lv));
  const done = await p.evaluate(() => window.__dbGet('school/auto/done'));
  ok('E done 칸 = 한 번 연 표시 (두 기기 켜져도 한 번)', JSON.stringify(done || {}).includes(lv?.code || '@') && !JSON.stringify(done || {}).includes('…'), JSON.stringify(done));
  ok('E 교사 폰 = 수업 화면(대기실)으로', !!(await p.$('.lbar .live')));
  await tv.bringToFront(); await tv.waitForTimeout(2500);
  const e1 = ((await tv.textContent('[data-k="tv-entry"]').catch(() => '')) || '').replace(/\s+/g, ' ');
  ok('C 연 뒤 = 오늘 수업 · 들어온 학생 · 코드', /오늘 수업/.test(e1) && /들어온 학생/.test(e1) && /수업 코드/.test(e1), e1.slice(0, 160));
  await tv.screenshot({ path: `${SHOTS}/s21-tv-open.png` });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
