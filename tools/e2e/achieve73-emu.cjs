// 🏆 #73 도전과제 달성 연출 · ⛺ 기록 텐트 · 📺 전설 줄 (에뮬레이터 학생 + 이 기기 종합실)
//   ① 허수아비 복습 100판 기록 → 캠프 = 👑 전설 컷인 먼저 → ⚔ 도전 띠 → 🌱 첫걸음 띠 (하나씩) · 누르면 그 자리 🎁 받기(gem log chal_)
//   ② 다시 들어오면 = 안 띄움(학생마다 bonus/…/ach) ③ 위 막대 🏆 없음 · 텐트 = 기록 방(도전과제 · 칭호 · 도감 탭) · 받을 것 = 텐트 이름표 숫자
//   ④ 📺 마무리 화면 = 「🏆 ○○ 용사 『칭호』 달성!」 (방 players/{uid}/ach)
//   NODE_PATH=$(npm root -g) node tools/e2e/achieve73-emu.cjs <그림 폴더>
const { chromium } = require('playwright');
const { rest } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/?emu=127.0.0.1';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest('', 'PATCH', { roster: { '1-3': { 3: '시험삼' } }, rosterMask: { '1-3': { 3: '시*삼' } } });
  await rest('school/features', 'PUT', { bundle: 'full', on: { hero: true, scarecrow: true, board: true, citadel: true, forge: true } });
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); await ctx.addInitScript(() => { try { localStorage.setItem('citadel-wake-tip', '1'); } catch {} });
  const s = await ctx.newPage(); s.on('pageerror', (e) => errs.push(String(e)));
  await s.goto(B); await s.waitForSelector('.title', { timeout: 20000 }); await s.waitForTimeout(800);
  await s.selectOption('select >> nth=0', '1-3'); await s.waitForTimeout(200); await s.selectOption('select >> nth=1', '3'); await s.waitForTimeout(300);
  if (!(await s.$('.pw:has(small)'))) await s.click('.lk:has-text("가입")');
  await s.click('.pw >> nth=0'); for (const k of '12341234') await s.click(`.pad button:text-is("${k}")`);
  await s.click('.title .act .pmain'); await s.waitForTimeout(3500);
  const fh = await s.$('button:has-text("과 시작"), button:has-text("와 시작")'); if (fh) { await fh.click(); await s.waitForTimeout(1200); }
  ok('③ 위 막대 🏆 단추 없음', !(await s.$('[data-k="chal-go"]')));
  // 복습 100판 (허수아비 방 기록)
  await rest('bonus/1-3/3/set-02', 'PUT', { m1: { clear: true, tries: 100, at: 1 } });
  await s.reload(); await s.waitForTimeout(800);
  const pop = async () => s.$eval('[data-k="ach-pop"]', (e) => ({ tier: e.dataset.tier, t: e.textContent.replace(/\s+/g, ' ').trim() })).catch(() => null);
  let p1 = null; for (let i = 0; i < 60 && !(p1 = await pop()); i++) await s.waitForTimeout(150);
  ok('① 처음 = 👑 전설 컷인', p1?.tier === 'leg' && /허수아비의 친구/.test(p1?.t || ''), JSON.stringify(p1));
  await s.waitForTimeout(1500); await s.screenshot({ path: `${SHOTS}/ach-leg.png` });
  await s.click('[data-k="ach-pop"]'); await s.waitForTimeout(400);
  const lg = await rest('gem/1-3/3/log/chal_review100'); ok('   누르면 그 자리 🎁 받기 (chal_review100)', !!lg, JSON.stringify(lg));
  let p2 = null; for (let i = 0; i < 20; i++) { p2 = await pop(); if (p2?.tier === 'adv') break; await s.waitForTimeout(200); }
  ok('   다음 = ⚔ 도전 띠 (💎 숫자)', p2?.tier === 'adv' && /💎\+\d+/.test(p2.t), JSON.stringify(p2));
  await s.waitForTimeout(1300); await s.screenshot({ path: `${SHOTS}/ach-adv.png` });
  let p3 = null; for (let i = 0; i < 30; i++) { p3 = await pop(); if (p3?.tier === 'seed') break; await s.waitForTimeout(200); }
  ok('   다음 = 🌱 첫걸음 띠', p3?.tier === 'seed', JSON.stringify(p3));
  await s.waitForTimeout(700); await s.screenshot({ path: `${SHOTS}/ach-seed.png` });
  await s.waitForTimeout(3000);
  const seen = await rest('bonus/1-3/3/ach'); ok('② 본 것 = 학생마다 서버 기록', !!seen && Object.keys(seen).length >= 3, JSON.stringify(Object.keys(seen || {})));
  await s.reload(); await s.waitForTimeout(5000);
  ok('② 다시 들어오면 = 안 띄움', !(await pop()));
  const tg = await s.$eval('[data-k="tag-tentdeco"]', (e) => e.textContent.trim()).catch(() => '');
  ok('③ 넘긴 것 = 기록 텐트 이름표 숫자', /기록 텐트\d+/.test(tg), tg);
  await s.$eval('[data-hot="tentdeco"]', (e) => e.click()); await s.waitForSelector('[data-k="rec-room"]', { timeout: 8000 }); await s.waitForTimeout(600);
  const tabs = await s.$$eval('[data-k^="rec-tab-"]', (xs) => xs.map((x) => x.textContent.trim()));
  ok('③ 텐트 = 기록 방 (도전과제 · 칭호 · 도감)', tabs.length >= 3 && /도전과제/.test(tabs[0]), tabs.join(' '));
  await s.screenshot({ path: `${SHOTS}/ach-tent.png` });
  await s.click('[data-k="rec-tab-ttl"]'); await s.waitForTimeout(300); ok('   칭호 탭 = 「허수아비의 친구」 가짐', /허수아비의 친구/.test(await s.textContent('[data-k="rec-titles"]')));
  await s.screenshot({ path: `${SHOTS}/ach-tent-ttl.png` });
  // 📺 마무리 화면 줄 (이 기기 · 종합실 시험 모드 · 방 players 에 ach)
  const h = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); h.on('pageerror', (e) => errs.push('TV ' + e));
  await h.goto('http://localhost:4173/?role=hall&mode=test&room=AC73'); await h.waitForSelector('.dock'); await h.waitForTimeout(1500);
  await h.evaluate(() => window.__tvFake?.(1)); await h.waitForTimeout(800); await h.evaluate(() => { window.__dbSet('rooms/AC73/players/u9', { nick: '시험', hero: 2, at: Date.now(), ach: [{ id: 'review100', name: '허수아비의 친구', title: '허수아비의 친구' }] }); });
  for (let i = 0; i < 40 && !(await h.$('.endv')); i++) { await h.mouse.move(600, 360); await h.click('.dock .go', { timeout: 1500 }).catch(() => {}); await h.waitForTimeout(350); }
  const line = await h.textContent('[data-k="tv-legach"]').catch(() => '');
  ok('④ 📺 마무리 = 「🏆 ○○ 용사 『칭호』 달성!」', /용사 『허수아비의 친구』 달성!/.test(line || ''), line);
  await h.screenshot({ path: `${SHOTS}/ach-tv.png` });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
