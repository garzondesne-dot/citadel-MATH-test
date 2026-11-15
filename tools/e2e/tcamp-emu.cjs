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
  await t.click('button[aria-label="성채"]'); await t.waitForTimeout(1300); // 🏕 D 용사가 걸어간 뒤 열림
  const go = await t.$('.sheet button:has-text("성채 들어가기")'); if (go) { await go.click(); await t.waitForTimeout(600); }
  const fl = await t.$('[data-floor="eval-1"]'); if (fl) { await fl.click(); await t.waitForTimeout(300); const in1 = await t.$('button:has-text("1층 들어가기")'); if (in1) await in1.click(); }
  await t.waitForSelector('[data-k="castle"] [data-room]', { timeout: 8000 }).catch(() => {});
  const rooms = await t.$$eval('[data-k="castle"] [data-room]', (x) => x.length).catch(() => 0), lockedR = await t.$$eval('[data-k="castle"] [data-room][disabled], [data-k="castle"] [data-room].lock', (x) => x.length).catch(() => -1);
  await t.screenshot({ path: `${SHOTS}/tcamp-castle.png` });
  ok('③ 🏰 성채 1층 = 방 12 · 잠김은 👑 보스 방 하나뿐(처치 60%)', rooms >= 12 && lockedR <= 1, `방 ${rooms} · 잠김 ${lockedR}`);
  await t.goto(`${B}?role=camp&from=me&${E}`); await t.waitForTimeout(3500);
  await t.click('[data-prop="scare"]').catch(() => t.click('[data-todo="scare"]')); await t.waitForTimeout(1400); // 🏕 D 용사가 걸어간 뒤 열림
  const sc = ((await t.textContent('.sheet').catch(() => '')) || '').replace(/\s+/g, ' ');
  await t.screenshot({ path: `${SHOTS}/tcamp-scare.png` });
  ok('③ 🎯 허수아비 시트 = 차시 목록', /차시/.test(sc), sc.slice(0, 120));
  await t.goto(`${B}?role=camp&from=me&${E}`); await t.waitForTimeout(3500);
  for (let i = 0; i < 3 && (await t.$('.sheet')); i++) { const x = await t.$('.sheet button[aria-label="닫기"], .sheet .x, .sheet button:has-text("✕")'); if (x) await x.click().catch(() => {}); else await t.mouse.click(195, 40); await t.waitForTimeout(500); } // 새로 고침 뒤 보던 시트 복귀(설계) 닫기
  await t.click('[data-k="wallet"]', { timeout: 5000 }); await t.waitForTimeout(800);
  const hv = ((await t.evaluate(() => document.body.innerText)) || '').replace(/\s+/g, ' ');
  await t.screenshot({ path: `${SHOTS}/tcamp-hero.png` });
  ok('③ 🧙 내 용사 = 선생님 · 강화 +10 (서버 교사 용사)', !!(await t.$('.sheet, [role="dialog"]')) && /선생님/.test(hv) && /\+10/.test(hv), hv.slice(0, 120));
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
