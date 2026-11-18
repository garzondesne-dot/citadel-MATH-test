// 🏕 캠프 B · D · E (이 기기 · 📜 2026-11-15 선생님 「ABDE 까지 해 줘 · 베타판에서 해 보고 가려낼게」)
//   B 물건 누름 = 반응(기우뚱 · 소리) → 용사가 걸어가서 들어감 · 모닥불 · 숨은 곳(나무 · 달 · 버섯 · 반딧불) = 불똥 · 잎 · 별 · 빛 · 보상 없음
//   D 가만히 두면(시계 16초) 용사가 일어나 걸어감 → 돌아와 앉음 · E 모집 중 방 친구 = 포털 앞 용사 + 「○○님 외 n명이 기다려요」 · 방이 사라지면 없어짐
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await c.clock.install();
  const p = await c.newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(`${B}?role=camp&room=BD1`); await p.waitForSelector('.stage'); await p.clock.runFor(1500);
  const sfx = () => p.evaluate(() => (window.__sfxLog || []).slice(-3));
  // B · 모닥불 · 숨은 곳
  for (const k of ['fire', 'moon', 'tree', 'shroom0', 'fly']) {
    await p.$eval(`[data-hot="${k}"]`, (e) => { const r = e.getBoundingClientRect(); e.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })); });
    await p.clock.runFor(120); const fx = await p.$$eval('.cfx', (x) => x.map((e) => e.className.replace('cfx ', '')));
    ok(`B ${k} = 반응(효과 · 소리) · 창 안 열림`, fx.length > 0 && !(await p.$('.sheet')), `${fx.join(',')} · 소리 ${(await sfx()).join(',')}`);
    if (k === 'fire') await p.screenshot({ path: `${SHOTS}/campB-fire.png` });
    await p.clock.runFor(1200);
  }
  // B + D · 허수아비 누름 = 기우뚱(맞은 칸) · 용사 걷기 → 들어감
  await p.$eval('[data-prop="scare"]', (e) => { const r = e.getBoundingClientRect(); e.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + 5, clientY: r.top + 5 })); });
  await p.clock.runFor(100);
  const st = await p.evaluate(() => ({ pk: !!document.querySelector('[data-prop="scare"].pk'), pose: document.querySelector('[data-k="camp-hero"]')?.dataset.pose, sheet: !!document.querySelector('.sheet') }));
  ok('B 허수아비 = 기우뚱 · D 용사가 걸어감 · 아직 안 들어감', st.pk && st.pose === 'walk' && !st.sheet, JSON.stringify(st));
  await p.screenshot({ path: `${SHOTS}/campD-walk.png` });
  await p.clock.runFor(900);
  ok('D 걸어간 뒤 = 허수아비 창 열림', !!(await p.$('.sheet')), (await sfx()).join(','));
  await p.$eval('.sheet .x', (e) => e.click()); await p.clock.runFor(1500);
  ok('D 창을 닫으면 = 자리로 돌아와 앉음', (await p.$eval('[data-k="camp-hero"]', (e) => e.dataset.pose)) === 'sit');
  // D 가만히 두기
  let seen = new Set(); for (let t = 0; t < 40; t++) { await p.clock.runFor(500); seen.add(await p.$eval('[data-k="camp-hero"]', (e) => e.dataset.pose)); if (seen.has('walk') && t > 2) { await p.screenshot({ path: `${SHOTS}/campD-wander.png` }); break; } }
  ok('D 가만히 두면(최대 20초) 용사가 일어나 걸어 다님', seen.has('walk'), [...seen].join(','));
  for (let t = 0; t < 20 && (await p.$eval('[data-k="camp-hero"]', (e) => e.dataset.pose)) !== 'sit'; t++) await p.clock.runFor(500);
  ok('D 한 바퀴 뒤 다시 앉음', (await p.$eval('[data-k="camp-hero"]', (e) => e.dataset.pose)) === 'sit');
  // 📋 아무도 없을 때 = 오늘의 용사 + 말풍선 차례로 · 누르면 게시판 던전 (11/17 #9)
  { const b0 = await p.$eval('[data-k="board-buddy"]', (e) => ({ real: e.dataset.real, t: e.textContent.trim() })).catch(() => null); await p.clock.runFor(3400); const t1 = await p.textContent('[data-k="board-buddy"]').catch(() => '');
    ok('📋 게시판 옆 오늘의 용사 · 말풍선이 바뀜', !!b0 && b0.real === '0' && /같이 도전|💎 더|한 판만/.test(b0.t) && t1.trim() !== b0.t, `${JSON.stringify(b0)} → ${t1.trim()}`);
    await p.screenshot({ path: `${SHOTS}/campE-buddy.png` });
    await p.click('[data-k="board-buddy"]'); await p.clock.runFor(800); ok('   누르면 게시판 던전', !!(await p.$('.bd'))); await p.click('.bd .back').catch(() => {}); await p.clock.runFor(800); }
  // E 친구 흔적
  await p.evaluate(() => window.__dbSet('school/board/posts/pE', { pid: 'pE', lesson: 'set-02', no: 2, at: Date.now(), host: 'a', phase: 'wait', mem: { a: { uid: 'a', cls: '1-4', num: 1, nick: '하늘', hero: 1, role: 'c', why: '', at: 1 }, b: { uid: 'b', cls: '1-4', num: 2, nick: '바다', hero: 2, role: 'g', why: '', at: 2 } } }));
  await p.clock.runFor(1500);
  // 📋 (📜 2026-11-17 #9): 첫 친구 = 게시판 옆 「같이 하자」 용사 · 나머지 = 포털 앞
  const fr = await p.$$eval('[data-k="friend"]', (x) => x.length), bd = await p.$eval('[data-k="board-buddy"]', (e) => ({ real: e.dataset.real, t: e.textContent })).catch(() => null);
  ok('E 모집 중 방 친구 = 게시판 옆 「하늘님이 같이 하재요!」 + 포털 앞 1', fr === 1 && !!bd && bd.real === '1' && /하늘님이 같이 하재요/.test(bd.t), `${fr} · ${JSON.stringify(bd)}`);
  await p.screenshot({ path: `${SHOTS}/campE-friends.png` });
  await p.clock.resume(); // 나가는 연출(포털로 사라짐)은 진짜 시계로
  await p.evaluate(() => window.__dbSet('school/board/posts/pE', null)); await p.waitForTimeout(1500);
  ok('E 방이 사라지면 = 친구 · 말풍선 없음', (await p.$$eval('[data-k="friend"]', (x) => x.length)) === 0 && !(await p.$('[data-k="friend-bub"]')));
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
