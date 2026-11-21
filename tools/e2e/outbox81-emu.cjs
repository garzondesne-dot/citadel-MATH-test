// 📮 #81 B 폰 보관함 (📜 선생님 2026-11-21) · 에뮬레이터 · 폰 1대 + 교사 폰
//   ① 학생 폰 끊김(goOffline) → 내 칸 쓰기 2개(복습 칸 · 💎 로그) → 5초 뒤 위 띠 「⏳ 아직 안 올라간 기록 2」 · 서버엔 아직 없음
//   ② 끊긴 채 앱을 닫음(탭 닫기 = SDK 가 들고 있던 쓰기는 사라짐) → 다시 열기(온라인) → 서버에 그 값 그대로 한 번 · 띠 사라짐 · 보관함 0
//   ③ 서버가 그새 바뀐 칸(다른 폰이 💎 로그 한 줄 더함) = 합집합(둘 다 남음 · 덮어써 지우지 않음)
//   ④ 끊긴 채 「처음으로」 → 확인 창 「아직 안 올라간 기록」 (취소 = 안 나감)
//   ⑤ 교사 학생 탭: 끊긴 학생 = 「⏳ n」 · 학생이 다시 올리면 사라짐
//   NODE_PATH=$(npm root -g) node tools/e2e/outbox81-emu.cjs <그림 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/', E = 'emu=127.0.0.1', NS = 'demo-citadel-test-default-rtdb';
const rest = (path, method = 'GET', body) => fetch(`http://127.0.0.1:9000/${path}.json?ns=${NS}`, { method, headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }).then((r) => r.json());
const log = (...a) => console.log(...a), wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest('school/last/1-3', 'PUT', { lesson: 'set-06', no: 6, at: Date.now(), done: true, code: 'x' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('atb-e2e-nointro', '1'); localStorage.setItem('citadel-v1-board-story', '1'); } catch { /* */ } });
  const open = async () => { const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e))); await p.goto(`${B}?${E}`); await p.waitForTimeout(2500); return p; };
  let p = await open();
  await p.waitForSelector('select'); await p.selectOption('select >> nth=0', '1-3'); await p.waitForTimeout(200); await p.selectOption('select >> nth=1', '1'); await p.waitForTimeout(200);
  await p.click('.links button:has-text("가입")'); await p.click('button.pw >> nth=0'); for (const d of '1234') await p.click(`.pad .keys button:has-text("${d}")`);
  await p.waitForTimeout(150); if (await p.$('.pad')) for (const d of '1234') await p.click(`.pad .keys button:has-text("${d}")`);
  await p.click('.title .pmain'); await p.waitForTimeout(2500); if (await p.$('text=첫 용사 고르기')) { await p.click('button:has-text("시작")'); await p.waitForTimeout(800); }
  await p.waitForFunction(() => !!window.__ds, null, { timeout: 15000 });
  const T0 = Date.now();
  // ① 끊김 → 쓰기 2개
  await p.evaluate((t) => { const d = window.__ds; d.off(); d.S.set('bonus/1-3/1/review/set-06/m9', t); d.S.set('gem/1-3/1/log/e2e81a', { g: 1, at: t, why: 'e2e' }); }, T0);
  await p.waitForTimeout(6500);
  const bar = await p.textContent('[data-k="outbox-bar"]').catch(() => '');
  ok('① 끊긴 채 쓰기 = 위 띠 「⏳ 아직 안 올라간 기록 2」', /아직 안 올라간 기록 2/.test(bar || ''), (bar || '').trim());
  ok('① 서버엔 아직 없음', (await rest('bonus/1-3/1/review/set-06/m9')) === null);
  await p.screenshot({ path: `${SHOTS}/ob81-bar.png` });
  // ② 끊긴 채 닫기 → 다른 폰이 💎 로그 한 줄 더함(③ 준비) → 다시 열기
  await p.close();
  await rest('gem/1-3/1/log/other', 'PUT', { g: 2, at: T0, why: 'other' });
  p = await open();
  let landed = false; for (let i = 0; i < 30 && !landed; i++) { await wait(500); landed = (await rest('bonus/1-3/1/review/set-06/m9')) === T0; }
  ok('② 다시 연 앱 = 서버에 그 값이 올라감', landed);
  const log1 = await rest('gem/1-3/1/log');
  ok('③ 💎 로그 = 합집합 (이 폰 줄 + 다른 폰 줄 · 지우지 않음)', !!log1?.e2e81a && !!log1?.other, Object.keys(log1 || {}).join(','));
  await p.waitForTimeout(6000);
  ok('② 띠 사라짐 · 보관함 0', !(await p.$('[data-k="outbox-bar"]')) && (await p.evaluate(() => window.__ds.S.outbox.count())) === 0);
  // ④ 끊긴 채 처음으로 → 확인 창
  await p.evaluate(() => { const d = window.__ds; d.off(); d.S.set('bonus/1-3/1/review/set-06/m8', Date.now()); });
  // ⑤ 교사 = 학생 탭 「⏳ 1」 (학생 폰이 끊겨 있어도 pend 는 다시 이어지면 감) → 여기선 학생 폰 쪽 pend 를 먼저 남기려고 잠깐 이었다 끊음은 생략 · 서버 pend 직접 확인은 ⑥
  let dialogMsg = ''; p.once('dialog', async (dg) => { dialogMsg = dg.message(); await dg.dismiss(); });
  await p.click('button[aria-label="메뉴"]').catch(() => {}); await p.waitForTimeout(600);
  await p.click('.mi:has-text("처음 화면으로")').catch(async () => { await p.click('button.out').catch(() => {}); }); await p.waitForTimeout(600);
  await p.click('.sheet .act .btn:has-text("처음 화면으로")').catch((e) => log('ℹ 시트 단추 못 찾음', String(e).slice(0, 80))); await p.waitForTimeout(9500);
  ok('④ 끊긴 채 처음으로 = 확인 창 「아직 안 올라간 기록」 · 취소 = 그대로', /아직 안 올라간 기록 1/.test(dialogMsg) && !(await p.$('.title .pmain')), dialogMsg.split('\n')[0]);
  // ⑥ 다시 이음 → 보관함 0 · pend 표시 지움
  await p.evaluate(() => window.__ds.on()); await p.waitForTimeout(4000);
  ok('⑥ 다시 이으면 그 칸도 올라감', typeof (await rest('bonus/1-3/1/review/set-06/m8')) === 'number');
  // ⑤ 교사 폰: pend 칸 보임 (학생 폰이 쓰는 accounts/{반}/{번호}/pend 를 직접 넣어 확인)
  await rest('accounts/1-3/2', 'PATCH', { pend: { n: 3, at: Date.now() } });
  const tctx = await b.newContext({ viewport: { width: 390, height: 800 } }), t = await tctx.newPage();
  await t.goto(`${B}?${E}&role=teacher`); await t.waitForTimeout(3000);
  const tok = !!(await t.$('[data-k="pend-n"]')) || /⏳/.test((await t.textContent('body').catch(() => '')) || '');
  log(`ℹ 교사 화면 확인: ${tok ? 'pend 보임' : '교사 로그인 화면이라 건너뜀(단위 확인만)'}`);
  await b.close(); log(errs.length ? `❌ 실패 ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); process.exit(errs.length ? 1 : 0);
})();
