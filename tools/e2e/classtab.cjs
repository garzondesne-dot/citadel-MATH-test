// ⚔ 수업 탭 수동 열기 (📜 2026-11-17 #21 B · 시안 Uj7jgeePofh2x9fmKzjqGZ ①) — 이 기기 저장(서버 없음)
//   ① 반 줄 = 1-6 숨김 · 맨 끝 🧪 테스트 ② 차시 ⭐ ③ 종합실 키 🎲 / 📌(바꾸기 · 저장) · 반 바꾸면 「반 바뀜 → 차시 · 키 다시」
//   ④ 열기 → 확인 창 → 리모컨 · 🟢 반 = 이어서 · 닫기 ⑤ 🧪 🖥 한 화면 · 🎒 학생 폰 + 진행 리모컨 · 📱 리모컨만(테스트 반 · 🤖 봇)
//   NODE_PATH=$(npm root -g) node tools/e2e/classtab.cjs <폴더> [주소]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + '?role=teacher'); await p.waitForSelector('.tabs'); await p.waitForTimeout(500);
  const txt = async (s) => ((await p.textContent(s).catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  const row = await p.$$eval('[data-k="cls-row"] [data-cls]', (x) => x.map((e) => e.dataset.cls));
  ok('① 반 줄 = 1-6 숨김 · 맨 끝 🧪', !row.includes('1-6') && row[row.length - 1] === 'test', row.join(','));
  ok('반 고르기 전 = 차시 칸 없음', !(await p.$('.pk3')));
  await p.click('[data-cls="1-3"]'); await p.waitForTimeout(200);
  ok('② 차시 칸 · ⭐ 다음 차시', !!(await p.$('.pk3')) && /⭐/.test(await txt('.pk3')));
  await p.click('.pk3 [data-no="6"]'); await p.waitForTimeout(200);
  ok('③ 종합실 키 두 단추', !!(await p.$('[data-key="new"]')) && !!(await p.$('[data-key="fixed"]')));
  await p.click('[data-key="fixed"]'); await p.waitForTimeout(200);
  ok('📌 고정(번호 없음) = 바로 입력칸', !!(await p.$('[data-k="key-in"]')));
  await p.fill('[data-k="key-in"]', '4826'); await p.click('[data-k="key-save"]'); await p.waitForTimeout(200);
  ok('저장 = 크게 보임 + 바꾸기', (await txt('[data-k="key-big"]')) === '4826' && !!(await p.$('[data-k="key-edit"]')));
  ok('요약 한 줄', /1-3반 · 6차시 · 🔑 4826 고정/.test(await txt('[data-k="summary"]')), await txt('[data-k="summary"]'));
  await p.screenshot({ path: `${SHOTS}/classtab-1-real.png` });
  await p.click('[data-cls="1-4"]'); await p.waitForTimeout(150);
  ok('반 바꿈 = 「반 바뀜 → 차시 · 키 다시」 · 차시 풀림', /반 바뀜/.test(await txt('[data-k="flash"]')) && !(await p.$('[data-k="step3"]')));
  await p.click('.pk3 [data-no="6"]'); await p.waitForTimeout(150);
  ok('키 방식 = 지난번(📌) 그대로', await p.$eval('[data-key="fixed"]', (e) => e.classList.contains('on')));
  await p.click('[data-k="open-go"]'); await p.waitForSelector('[data-k="open-ask"]');
  ok('확인 창 = 반 · 차시 크게', /1-4반/.test(await txt('[data-k="open-ask"]')));
  await p.click('[data-k="open-yes"]'); await p.waitForTimeout(1200);
  const live = await p.evaluate(() => window.__dbGet('school/live'));
  const key = live && (await p.evaluate((c) => window.__dbGet(`secrets/${c}/hallKey`), live.code));
  ok('열림 = 1-4 · 고정 키 그대로', live?.cls === '1-4' && !live.test && key === '4826', JSON.stringify(live));
  await p.click('.lbar button, [data-k="home"], .back').catch(() => {}); await p.waitForTimeout(300);
  if (!(await p.$('[data-k="cls-row"]'))) { await p.goto(B + '?role=teacher&tab=class'); await p.waitForSelector('.tabs, .lbar'); await p.waitForTimeout(500); }
  ok('🟢 = 열린 반 표시', /🟢/.test(await txt('[data-cls="1-4"]')), await txt('[data-cls="1-4"]'));
  await p.click('[data-cls="1-4"]'); await p.waitForTimeout(150);
  ok('🟢 반 누름 = 이어서 · 닫기', !!(await p.$('[data-k="go-resume"]')) && !!(await p.$('[data-k="go-stop"]')));
  await p.screenshot({ path: `${SHOTS}/classtab-2-open.png` });
  await p.click('[data-k="go-stop"]'); await p.click('[data-k="stop-yes"]'); await p.waitForTimeout(800);
  ok('⏹ 닫기 = school/live 비움', !(await p.evaluate(() => window.__dbGet('school/live'))));
  // 🧪 테스트
  await p.click('[data-cls="test"]'); await p.click('.pk3 [data-no="6"]'); await p.waitForTimeout(150);
  ok('🧪 ③ 테스트 모드 3개 · 봇 5', (await p.$$('[data-mode]')).length === 3 && (await txt('[data-k="bot-n"]')) === '5명');
  ok('🧪 모드 안 고름 = 키 칸 없음', !(await p.$('[data-key="new"]')));
  await p.click('[data-mode="remote"]'); await p.waitForTimeout(100);
  ok('📱 리모컨만 = 종합실 키 보임', !!(await p.$('[data-key="new"]')));
  await p.click('[data-mode="tv"]'); await p.waitForTimeout(100);
  ok('🖥 = 키 칸 없음 · 보라 「🧪 테스트 열기」', !(await p.$('[data-key="new"]')) && /🧪 테스트 열기/.test(await txt('[data-k="open-go"]')));
  await p.screenshot({ path: `${SHOTS}/classtab-3-test.png` });
  await p.click('[data-k="open-go"]'); await p.click('[data-k="open-yes"]'); await p.waitForSelector('[data-k="tsim"]', { timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(2500);
  ok('🖥 한 화면 = TV + 리모컨', !!(await p.$('[data-k="tsim"] .tv.emb')) && !!(await p.$('[data-k="tsim"] .rem')));
  ok('🖥 = school/live 안 씀(이 폰 메모리)', !(await p.evaluate(() => window.__dbGet('school/live'))));
  await p.screenshot({ path: `${SHOTS}/classtab-4-sim.png` });
  await p.click('[data-k="sim-close"]'); await p.waitForTimeout(300);
  await p.click('[data-mode="stu"]').catch(async () => { await p.click('[data-cls="test"]'); await p.click('.pk3 [data-no="6"]'); await p.click('[data-mode="stu"]'); });
  await p.click('[data-k="open-go"]'); await p.click('[data-k="open-yes"]'); await p.waitForSelector('[data-k="stutry"]', { timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(1500);
  const w0 = await txt('[data-k="try-where"]'); await p.click('[data-k="try-next"]'); await p.waitForTimeout(800); const w1 = await txt('[data-k="try-where"]');
  ok('🎒 학생 폰 + 진행 리모컨(다음 ▶)', !!(await p.$('[data-k="try-remote"]')) && w0 !== w1, `${w0} → ${w1}`);
  await p.screenshot({ path: `${SHOTS}/classtab-5-stu.png` });
  await p.click('[data-k="try-close"]'); await p.waitForTimeout(300);
  if (!(await p.$('[data-mode]'))) { await p.click('[data-cls="test"]'); await p.click('.pk3 [data-no="6"]'); }
  await p.click('[data-mode="remote"]'); await p.click('[data-k="open-go"]'); await p.click('[data-k="open-yes"]'); await p.waitForTimeout(3000);
  const tl = await p.evaluate(() => window.__dbGet('school/live'));
  const pl = tl ? Object.keys((await p.evaluate((c) => window.__dbGet(`rooms/${c}/players`), tl.code)) || {}) : [];
  ok('📱 리모컨만 = 테스트 반 1-6 · test · 🤖 봇 5', tl?.cls === '1-6' && !!tl.test && pl.length >= 5, `${JSON.stringify(tl)} · 들어옴 ${pl.length}`);
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
