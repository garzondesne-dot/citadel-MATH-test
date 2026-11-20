// 👩‍🏫 교사 「나」 → ⛺ 내 캠프 (에뮬레이터 · 🐞 b205 「교사 계정 내 캠프 안 들어가짐」 · b206)
//   교사 폰(admins) → 나 탭 → 내 캠프 = 캠프 화면 · 그다음 🏰 성채 · 🎯 허수아비 · 🧙 내 용사 한 번씩 열림
const { chromium } = require('playwright');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/', E = 'emu=127.0.0.1';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {}); if (process.env.SEED) require(process.env.SEED);
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const t = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  t.on('pageerror', (e) => errs.push(String(e))); t.on('console', (m) => { if (m.type() === 'error') log('   console:', m.text().slice(0, 200)); });
  await t.goto(`${B}?role=teacher&${E}`); await t.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(t, '.tabs');
  await t.click('.tabs button:has-text("나")'); await t.waitForTimeout(600);
  await t.click('a.item:has-text("내 캠프")'); await t.waitForTimeout(4500);
  await t.screenshot({ path: `${SHOTS}/tcamp-1.png` });
  const url = t.url(), body = (await t.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 200);
  ok('① 내 캠프 열림', /role=camp/.test(url) && !!(await t.$('[data-k="wallet"], .ptop')), `${url.replace(B, '')} · ${body}`);
  // ② 교사 폰에 학생 로그인 기억이 남아 있을 때 (교사가 학생으로 시험해 본 폰)
  await rest('', 'PATCH', { roster: { '1-3': { 3: '시험삼' } }, rosterMask: { '1-3': { 3: '시*삼' } }, accounts: { '1-3': { 3: { uid: 'stu-uid', g: 1 } } } });
  await t.goto(`${B}?role=teacher&tab=me&${E}`); await t.evaluate(() => localStorage.setItem('citadel-v1-login', JSON.stringify({ cls: '1-3', num: 3 })));
  await t.reload(); await t.waitForSelector('.tabs', { timeout: 20000 }); await t.waitForTimeout(800);
  await t.click('.tabs button:has-text("나")').catch(() => {}); await t.waitForTimeout(500);
  await t.click('a.item:has-text("내 캠프")'); await t.waitForTimeout(4500);
  await t.screenshot({ path: `${SHOTS}/tcamp-2.png` });
  const body2 = (await t.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 200);
  ok('② 학생 로그인 기억 있는 교사 폰 → 내 캠프', /role=camp/.test(t.url()) && /선생님/.test(body2), `${t.url().replace(B, '')} · ${body2}`);
  // ③ 한 판씩: 🏰 성채 (모든 방 열림) · 🎯 허수아비 · 🧙 내 용사
  const shut = async () => { await t.keyboard.press('Escape').catch(() => {}); for (const sel of ['.sheet button:has-text("닫기")', '[data-k="castle"] .back', '.back']) { const x = await t.$(sel); if (x) { await x.click().catch(() => {}); break; } } await t.waitForTimeout(500); };
  await t.$eval('[data-zone="castle"]', (x) => x.click()); await t.waitForTimeout(1300); // 🏕 D 용사가 걸어간 뒤 열림 · 📜 성채 자리 = 늘 반짝(움직임) → Playwright 「멈춘 뒤 누름」이 끝나지 않아 바로 누름
  const go = await t.$('.sheet button:has-text("성채 들어가기")'); if (go) { await go.click(); await t.waitForTimeout(600); }
  const fl = await t.$('[data-floor="eval-1"]'); if (fl) { await fl.click(); await t.waitForTimeout(300); const in1 = await t.$('button:has-text("1층 들어가기")'); if (in1) await in1.click(); }
  await t.waitForSelector('[data-k="castle"] [data-room]', { timeout: 8000 }).catch(() => {});
  const rooms = await t.$$eval('[data-k="castle"] [data-room]', (x) => x.length).catch(() => 0), lockedR = await t.$$eval('[data-k="castle"] [data-room][disabled], [data-k="castle"] [data-room].lock', (x) => x.length).catch(() => -1);
  await t.screenshot({ path: `${SHOTS}/tcamp-castle.png` });
  // 🏰 성채 = 올린 성채 팩이 있어야 층이 열림 (📜 2026-11-14 · 팩 있는 길 = tools/e2e/castle.cjs) → 팩 없는 시험 서버 = 빈 안내 한 줄
  const empty = /아직 열린 층이 없어요/.test((await t.textContent('.sheet').catch(() => '')) || '');
  ok('③ 🏰 성채 = 팩 없으면 「아직 열린 층이 없어요」 · 있으면 1층 방 12 · 잠김은 👑 하나뿐', empty || (rooms >= 12 && lockedR <= 1), empty ? '팩 없음 안내' : `방 ${rooms} · 잠김 ${lockedR}`);
  await t.goto(`${B}?role=camp&from=me&${E}`); await t.waitForTimeout(3500);
  // ⏳ 새로 고침 뒤 보던 장면 복귀(#52) = 성채 시트가 다시 열려 있음 → 닫고 누름
  for (let i = 0; i < 3 && (await t.$('.sheet')); i++) { const x = await t.$('.sheet button[aria-label="닫기"], .sheet .x, .sheet button:has-text("닫기")'); if (x) await x.click().catch(() => {}); await t.waitForTimeout(400); }
  const scErr = await t.click('[data-prop="scare"]', { timeout: 8000 }).then(() => '', (e) => String(e).split('\n').slice(0, 6).join(' | ')); if (scErr) log('   허수아비 누름 실패:', scErr); await t.waitForTimeout(1400); // 🏕 D 용사가 걸어간 뒤 열림
  const sc = ((await t.textContent('.sheet').catch(() => '')) || '').replace(/\s+/g, ' ');
  await t.screenshot({ path: `${SHOTS}/tcamp-scare.png` });
  ok('③ 🎯 허수아비 시트 = 차시 목록', /차시/.test(sc), sc.slice(0, 120));
  await t.goto(`${B}?role=camp&from=me&${E}`); await t.waitForTimeout(3500);
  for (let i = 0; i < 3 && (await t.$('.sheet')); i++) { const x = await t.$('.sheet button[aria-label="닫기"], .sheet .x, .sheet button:has-text("✕")'); if (x) await x.click().catch(() => {}); else await t.mouse.click(195, 40); await t.waitForTimeout(500); } // 새로 고침 뒤 보던 시트 복귀(설계) 닫기
  await rest('school/tlook', 'PATCH', { hero: 7, enh: 10 }); await t.waitForTimeout(800); // 🧙 서버 교사 용사 = +10 으로 둠 (교사 탭은 이 값을 씀 · 없으면 현자 +0)
  await t.click('button.hero-card', { timeout: 5000 }); await t.waitForTimeout(800);
  const hv = ((await t.evaluate(() => document.body.innerText)) || '').replace(/\s+/g, ' ');
  await t.screenshot({ path: `${SHOTS}/tcamp-hero.png` });
  ok('③ 🧙 내 용사 = 선생님 · 강화 +10 (서버 교사 용사)', !!(await t.$('.sheet, [role="dialog"]')) && /선생님/.test(hv) && /\+10/.test(hv), hv.slice(0, 120));
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
