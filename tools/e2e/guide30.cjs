// 📊 길잡이 (📜 2026-11-17 #30) — 이 기기 저장 · 🧪 테스트 6차시 + 🤖 3
//   ④ 끝 시각이 가까운데 개념 2 → 「📊 이 속도면 +n분 · 🎯 문제 3 복습으로」 · 8초 뒤 📊 점 · 창(근거) · 누르면 보냄 · 그 단계엔 다시 안 뜸
//   ⑤ 문제 1 첫 시도 0% · 개념 4(형성평가 앞) → 「📊 약한 개념 = 개념 1 · 0%」 → 📺 TV 에 개념 1 칸 다시 · 닫기
//   ⚙ 길잡이 끔 = 안 뜸 · TV 에는 길잡이 글 없음
//   NODE_PATH=$(npm root -g) node tools/e2e/guide30.cjs <폴더> [주소]
const { chromium } = require('playwright');
const { testOpen } = require('./_cls.cjs');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('리모컨 ' + e));
  const txt = async (s) => ((await t.textContent(s).catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tp'); await t.evaluate(() => { window.__botSpeed = 4; window.__botAcc = 0; }); // 🤖 첫 시도 모두 틀림 (⑤ 약한 개념)
  await testOpen(t, { no: 6, mode: 'remote', bots: 3 }); await t.waitForSelector('[data-k="bots"]');
  const live = await t.evaluate(() => window.__dbGet('school/live')), P = `rooms/${live.code}`;
  await t.click('.tact .btn'); await t.waitForTimeout(1200);
  const set = (p, v) => t.evaluate(([p, v]) => window.__dbSet(p, v), [p, v]);
  const get = (p) => t.evaluate((p) => window.__dbGet(p), p);
  const find = async (re) => { for (let i = 0; i < 20; i++) { await set(`${P}/state/step`, i); await t.waitForTimeout(250); if (re.test(await txt('[data-k="now-cell"]'))) return i; } return -1; }; // 팩마다 단계 순서가 달라 이름으로 찾음
  await set(`${P}/state/deadline`, Date.now() + 120 * 60e3);
  const iC2 = await find(/개념 2/), iC4 = await find(/개념 4/);
  const iM1 = await find(/문제 1/);
  console.log('단계 · 개념 2 =', iC2, '· 개념 4 =', iC4, '· 문제 1 =', iM1);
  await set(`${P}/state/stepAt`, Date.now()); await t.waitForTimeout(800); await t.click('button:has-text("지금 등장")').catch(() => {}); // 정찰 끝 → 🤖 공격
  for (let i = 0; i < 80; i++) { const n = await t.evaluate((P) => { const R = window.__dbGet(P) || {}; return Object.keys((R.subs || {}).m1 || {}).length + Object.keys((R.chain || {}).m1 || {}).length; }, P); if (n >= 3) break; await t.waitForTimeout(500); } // 🤖 3명이 문제 1 첫 시도
  // ④ 끝 시각 1분 뒤 · 개념 2
  await set(`${P}/state/deadline`, Date.now() + 60e3); await set(`${P}/state/step`, iC2); await t.waitForTimeout(1500);
  const g4 = await txt('[data-k="guide"]');
  ok('④ 「지금」 칸 윗줄 = 이 속도면 +n분 · 🎯 문제 3 복습으로', /이 속도면 \+\d+분/.test(g4) && /문제 3 복습으로/.test(g4), g4);
  const h = await t.$eval('[data-k="now-cell"]', (e) => Math.round(e.getBoundingClientRect().height));
  ok('「지금」 칸 높이 그대로 74px', h === 74, `${h}px`);
  await t.screenshot({ path: `${SHOTS}/guide-time.png` });
  await t.waitForTimeout(8500);
  ok('8초 뒤 📊 점으로 접힘', !(await t.$('[data-k="guide"]')) && !!(await t.$('[data-k="guide-dot"]')));
  await t.click('[data-k="guide-dot"]'); await t.waitForTimeout(300);
  ok('📊 점 누르면 다시 펼침', !!(await t.$('[data-k="guide"]')));
  await t.click('[data-k="guide-open"]'); await t.waitForSelector('[data-k="guide-why"]');
  const why = await txt('[data-k="guide-why"]');
  ok('띠 글자 = 근거 창 (남은 예상 · 끝 시각 · 맨 뒤 몬스터)', /남은 단계 예상 \d+분/.test(why) && /문제 3/.test(why), why);
  await t.screenshot({ path: `${SHOTS}/guide-sheet.png` });
  await t.click('[data-k="guide-go2"]'); await t.waitForTimeout(600);
  ok('누르면 문제 3 → 🎯 복습으로 (state.sent)', !!(await get(`${P}/state/sent/m3`)));
  ok('그 단계엔 다시 안 뜸', !(await t.$('[data-k="guide"]')) && !(await t.$('[data-k="guide-dot"]')));
  // ⑤ 시간 넉넉 · 문제 1 첫 시도 모두 틀림 · 개념 4 (형성평가 앞)
  await set(`${P}/state/deadline`, Date.now() + 120 * 60e3);
  await set(`${P}/state/step`, iC4); await t.waitForTimeout(1500);
  const g5 = await txt('[data-k="guide"]');
  ok('⑤ 형성평가 앞 = 약한 개념 = 개념 1 · 0% · 📺 개념 1 칸 다시 띄우기', /약한 개념 = 개념 1 · 0%/.test(g5) && /개념 1 칸 다시 띄우기/.test(g5), g5);
  await t.screenshot({ path: `${SHOTS}/guide-weak.png` });
  const tv = await ctx.newPage(); await tv.setViewportSize({ width: 1280, height: 720 }); tv.on('pageerror', (e) => errs.push('TV ' + e));
  await tv.goto(`${B}?role=hall&room=${live.code}`); await tv.waitForTimeout(2500);
  ok('TV 에는 길잡이 글 없음', !/이 속도면|약한 개념|길잡이/.test(await tv.evaluate(() => document.body.innerText)));
  await t.bringToFront(); await t.click('[data-k="guide-go"]'); await t.waitForTimeout(800);
  ok('누르면 state.recall = 개념 1 · 리모컨 띠 「📺 … TV 에 띄움 · 닫기」', (await get(`${P}/state/recall`)) === 'c1' && /TV 에 띄움/.test(await txt('[data-k="recall-band"]')), await txt('[data-k="recall-band"]'));
  await tv.bringToFront(); await tv.waitForTimeout(1500);
  ok('TV = 개념 1 칸 다시 보기', !!(await tv.$('[data-k="tv-recall"]')), await tv.$eval('[data-k="tv-recall"] b', (e) => e.textContent).catch(() => ''));
  await tv.screenshot({ path: `${SHOTS}/guide-tv-recall.png` });
  await t.bringToFront(); await t.click('[data-k="recall-off"]'); await t.waitForTimeout(800);
  ok('닫기 = TV 다시 보기 닫힘', !(await get(`${P}/state/recall`)) && !(await tv.$('[data-k="tv-recall"]')));
  // ⚙ 끔
  const iC1 = await find(/개념 1/); await set(`${P}/state/deadline`, Date.now() + 60e3); await t.waitForTimeout(1500); // 개념 2 는 이미 눌러서 그 단계엔 안 뜸 → 개념 1 에서
  const onBefore = !!(await t.$('[data-k="guide"]'));
  await set('school/features', { bundle: 'full', on: { guide: false } }); await t.waitForTimeout(1200);
  ok('⚙ 「📊 길잡이」 끔 = 안 뜸', onBefore && !(await t.$('[data-k="guide"]')) && !(await t.$('[data-k="guide-dot"]')), `켬 ${onBefore}`);
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
