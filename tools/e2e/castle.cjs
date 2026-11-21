// 🏰 성채 팩 · ➕ 추가 팩 (📜 2026-11-14) — 390 × 844 · 이 기기 저장
//   ① 교사: 준비 → ➕ 추가 팩 → 「📦 팩 올리기」에 eval-1 · eval-2 = 오류 0 · 저장 → 카드 2장 · 같은 id 다시 = 「새 판으로 바꿀까요?」
//   ② 진도 6 → 학생 캠프 성채 시트 = 층 2개(층 순서) → 1층 = no ≤ 6 방 열림 · 👑 잠김 · 2층 = 모두 잠김
//   ③ 03번 방: 소문제 1 틀림 → 틀린 것만 새 숫자(판 1) · 맞힌 것은 잠김 → 다시 공격 = 처치 · 기록 bonus/1-1/3/eval-1/q03
//   ④ 6방 더 처치(기록) → 👑 보스 방 열림 (11방 × 60% = 7) ⑤ 교사 👁 미리 보기 = 같은 방 화면 · 기록 없음
// 사용: npx vite build → npx vite preview --port 4173 → NODE_PATH=$(npm root -g) node tools/e2e/castle.cjs <그림 폴더>
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/', DIR = path.join(__dirname, '../pack-upload/castle');
const E1 = JSON.parse(fs.readFileSync(path.join(DIR, 'eval-1.json'), 'utf8'));
const stab = (v) => JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]])) : x)); // 키 순서 상관없이
const norm = (t) => String(t).replace(/\s+/g, '').replace(/^\d+[⑴⑵⑶⑷⑸⑹]?/, '');
(async () => {
  const b = await chromium.launch(), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push(String(e)));
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tabs');
  await t.click('.tabs button:has-text("차시 팩")'); await t.click('[data-k="castle-go"]'); await t.waitForSelector('[data-k="addons"]'); // 📦 #22 차시 팩 탭 → 🏰 성채 팩
  const closeTop = async () => { const xs = t.locator('button.x[aria-label="닫기"]:visible'); if (await xs.count()) await xs.last().click().catch(() => {}); else await t.locator('.bg').last().click({ position: { x: 5, y: 5 } }).catch(() => {}); await t.waitForTimeout(250); };
  const toCastle = async () => { if (await t.$('[data-k="addons"]')) return; for (let i = 0; i < 4 && (await t.$('.sheet')); i++) await closeTop(); await t.click('[data-k="castle-go"]'); await t.waitForSelector('[data-k="addons"]'); };
  const openRow = async (id) => { await toCastle(); await t.click(`[data-k="addon-card"][data-id="${id}"]`); await t.waitForSelector('.sheet [data-k="addon-vis"]'); }; // 📦 팩 탭: 층 줄 → 시트
  const over = async (p, w) => { const o = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 0) errs.push(`가로 넘침 ${o}px · ${w}`); };
  // ① 올리기
  const up = async (f) => { if (!(await t.$('[data-k="addon-up"]'))) { for (let i = 0; i < 4 && (await t.$('.sheet')); i++) await closeTop(); await t.click('[data-k="castle-go"]'); } await t.click('[data-k="addon-up"]'); /* 📦 #22 올리기 = 성채 시트 → 올리기 시트 */ await t.waitForSelector('[data-k="packup"]'); await t.setInputFiles('[data-k="packfile"]', path.join(DIR, f)); await t.waitForSelector('[data-k="packup"][data-kind="castle"] [data-k="packsum"]'); await t.waitForTimeout(200); };
  for (const f of ['eval-1.json', 'eval-2.json']) {
    await up(f);
    const sum = (await t.textContent('[data-k="packsum"]')).trim(), errN = await t.$$eval('[data-k="packiss"] li.err', (x) => x.length).catch(() => 0);
    ok(`① ${f} 검사 = 오류 0`, /✔ 검사 통과/.test(sum) && errN === 0, sum);
    if (f === 'eval-1.json') { await t.screenshot({ path: `${SHOTS}/castle-1-upload.png` }); await over(t, '올리기'); }
    await t.click('.sheet .btn.pmain'); await t.waitForSelector('.sheet .ok'); ok(`① ${f} 저장`, true, (await t.textContent('.sheet .ok')).trim());
    await closeTop(); await t.waitForTimeout(200);
  }
  await toCastle(); const cards = await t.$$eval('[data-k="addon-card"]', (x) => x.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  ok('① 📦 팩 탭 층 줄 2개 (층 순서 · 12방 · 11방 · 처치 n)', cards.length === 2 && /1층.*12방 · 처치 0/.test(cards[0]) && /2층.*11방/.test(cards[1]), cards.join(' | '));
  await openRow('eval-1'); ok('① eval-1~3 = 🗑 지우기 없음(숨김만) · 시트 = 해금 · 미리 보기 · 보임 · 내려받기', (await t.$$('[data-k="addon-del"]')).length === 0 && !!(await t.$('.sheet [data-k="addon-unlock"]')) && !!(await t.$('.sheet [data-k="addon-dl"]'))); await t.screenshot({ path: `${SHOTS}/castle-2b-sheet.png` }); await closeTop(); await t.waitForTimeout(150);
  await t.$eval('[data-k="addons"]', (e) => e.scrollIntoView()); await t.waitForTimeout(150);
  await t.screenshot({ path: `${SHOTS}/castle-2-cards.png` }); await over(t, '카드');
  await up('eval-1.json');
  ok('① 같은 id 다시 = 「새 판으로 바꿀까요?」 · 방 기록 그대로 12', /새 판으로 바꿀까요/.test(await t.textContent('[data-k="castle-replace"]').catch(() => '')) && /12개/.test(await t.textContent('[data-k="castle-replace"]').catch(() => '')) && /새 판으로 바꾸기/.test(await t.textContent('.sheet .btn.pmain')));
  await t.screenshot({ path: `${SHOTS}/castle-3-replace.png` });
  await t.click('.sheet .btn.pmain'); await t.waitForSelector('.sheet .ok'); await closeTop();
  // 👀 숨김 → 다시 보임
  await openRow('eval-2'); await t.click('.sheet [data-k="addon-vis"]'); await t.waitForTimeout(200);
  const hid = await t.evaluate(() => window.__dbGet('prep/addons/castle/eval-2/hide'));
  await t.click('.sheet [data-k="addon-vis"]'); await t.waitForTimeout(200); await closeTop(); await t.waitForTimeout(150);
  ok('① 👀 보임/숨김 스위치 = 서버 hide 칸', hid === true && (await t.evaluate(() => window.__dbGet('prep/addons/castle/eval-2/hide'))) == null);
  // ② 진도 6
  await t.evaluate(() => window.__dbSet('school/last/1-1', { lesson: 'x', no: 6, at: Date.now(), done: true, code: '1' }));
  const s = await ctx.newPage(); s.on('pageerror', (e) => errs.push(String(e)));
  await s.goto(B); await s.evaluate(() => { localStorage.setItem('citadel-v1-login', JSON.stringify({ cls: '1-1', num: 3 })); }); await s.reload(); await s.waitForSelector('.stage');
  await s.click('button[aria-label="성채"]'); await s.waitForSelector('.sheet .floor');
  const fl = await s.$$eval('.sheet .floor', (x) => x.map((e) => e.getAttribute('data-floor')));
  ok('② 캠프 성채 시트 = 보이는 층 (층 순서)', fl.join(',') === 'eval-1,eval-2', fl.join(','));
  await s.screenshot({ path: `${SHOTS}/castle-4-camp-sheet.png` });
  await s.click('.sheet .floor[data-floor="eval-1"]'); await s.waitForSelector('[data-k="castle"] [data-room]');
  const rooms = await s.$$eval('[data-k="castle"] [data-room]', (x) => x.map((e) => `${e.getAttribute('data-room')}:${e.getAttribute('data-open')}`));
  ok('② 1층 = no ≤ 6 방 모두 열림 · 👑 q12 잠김 (처치 0 / 7)', rooms.filter((r) => r.endsWith(':1')).length === 11 && rooms.includes('q12:0'), rooms.join(' '));
  await s.screenshot({ path: `${SHOTS}/castle-5-rooms.png` }); await over(s, '방 목록');
  // ③ q03 = 소문제 1 틀림 · 2 맞힘
  const room = E1.rooms.find((r) => r.id === 'q03');
  const findQ = (txt) => { for (const [k, v] of room.vers.entries()) for (const q of v) if (norm(txt).endsWith(norm(q.q).slice(-24))) return { q, k }; return null; };
  const curQ = async () => findQ(await s.$eval('.drun .q2', (e) => e.textContent));
  const pick = async (k) => { await s.click(`.drun .opts .opt >> nth=${k}`); await s.waitForTimeout(150); };
  const main = async () => { await s.waitForFunction(() => { const x = document.querySelector('.drun button.pmain'); return x && !x.disabled; }, null, { timeout: 15000 }); await s.click('.drun button.pmain'); await s.waitForTimeout(250); };
  await s.click('[data-room="q03"]'); // 🏰 방 칸 누르면 바로 도전 (11/17 #16)
  await s.waitForSelector('.drun .q2', { timeout: 10000 });
  const a1 = await curQ(); ok('③ 첫 판 = 판 0 숫자', a1 && a1.k === 0, a1 && a1.q.q);
  await pick((Number(a1.q.a) + 1) % 4); await main();
  const a2 = await curQ(); await pick(Number(a2.q.a)); await s.screenshot({ path: `${SHOTS}/castle-6-q.png` }); await main(); // 공격
  await s.waitForTimeout(1500); await s.screenshot({ path: `${SHOTS}/castle-7-graded.png` });
  await main(); // 다음 틀린 문제 (생각 시간 뒤)
  const b1 = await curQ();
  ok('③ 틀린 소문제만 다시 = 새 숫자(판 1)', b1 && b1.k === 1 && b1.q.q !== a1.q.q, b1 && b1.q.q);
  await pick(Number(b1.q.a)); await s.screenshot({ path: `${SHOTS}/castle-8-retry.png` }); await main();
  await s.waitForSelector('[data-k="castle-res"]', { timeout: 15000 });
  const res = await s.$eval('[data-k="castle-res"]', (e) => ({ c: e.getAttribute('data-clear'), t: e.textContent.replace(/\s+/g, ' ') }));
  const rec = await s.evaluate(() => window.__dbGet('bonus/1-1/3/eval-1/q03'));
  ok('③ 처치 · 기록 bonus/1-1/3/eval-1/q03 = clear · tries 2', res.c === '1' && rec && rec.clear === true && rec.tries === 2 && rec.runs === 1, `${res.t} · ${JSON.stringify(rec)}`);
  await s.screenshot({ path: `${SHOTS}/castle-9-clear.png` });
  // 💎 정식 값 (📜 2026-11-14 머리): 처음 처치 = 방 8 + 성채 첫 방 4 (두 번째 판에 처치라 「첫 판에 처치」 6 없음) · EXP 5
  const got = await s.$$eval('[data-k="castle-got"] li', (xs) => xs.map((x) => x.textContent.trim())).catch(() => []);
  ok('③ 보상 = +5 EXP · 💎 +8 방 · 💎 +4 첫 방', got.join('|') === '+5 EXP|💎 +8 성채 방 처치|💎 +4 성채 첫 방', got.join(' · '));
  // ④ 6방 더 → 👑
  await s.evaluate(() => { for (const r of ['q01', 'q02', 'q04', 'q05', 'q06', 'q08']) window.__dbSet(`bonus/1-1/3/eval-1/${r}`, { clear: true, tries: 1, runs: 1, at: Date.now() }); });
  await s.click('[data-k="castle"] button.pmain'); await s.click('[data-k="castle"] .back'); await s.waitForTimeout(200);
  await s.click('button[aria-label="성채"]'); await s.waitForSelector('.sheet .floor'); await s.click('.sheet .floor[data-floor="eval-1"]'); await s.waitForSelector('[data-room="q12"]');
  const boss = await s.$eval('[data-room="q12"]', (e) => e.getAttribute('data-open')), sum = await s.textContent('[data-k="castle-sum"]');
  ok('④ 7 / 11 처치 = 👑 보스 방 열림', boss === '1' && /처치 7/.test(sum), sum.trim());
  await s.screenshot({ path: `${SHOTS}/castle-10-boss.png` });
  // ⑤ 교사 미리 보기 = 같은 방 화면 · 기록 없음
  const before = stab(await t.evaluate(() => window.__dbGet('bonus')));
  await t.reload(); await t.click('.tabs button:has-text("차시 팩")'); await t.click('[data-k="castle-go"]'); await t.waitForSelector('[data-k="addon-card"]');
  ok('⑤ 층 줄 처치 n = 1', /처치 1/.test(await t.textContent('[data-k="addon-card"][data-id="eval-1"]')));
  await openRow('eval-1'); await t.click('.sheet [data-k="addon-look"]'); await t.waitForSelector('[data-k="castle"] [data-room]');
  const pv = await t.$$eval('[data-k="castle"] [data-room]', (x) => x.filter((e) => e.getAttribute('data-open') === '1').length);
  ok('⑤ 미리 보기 = 12방 모두 열림', pv === 12, String(pv));
  await t.click('[data-room="q03"]'); await t.waitForSelector('.drun .q2', { timeout: 10000 });
  const same = await t.evaluate(() => !!document.querySelector('.drun .qwrap') && !!document.querySelector('.drun .pmain'));
  await t.click('.drun .opts .opt >> nth=0'); await t.waitForTimeout(150); await t.click('.drun button.pmain');
  await t.screenshot({ path: `${SHOTS}/castle-11-preview.png` });
  await t.click('.drun .quit'); await t.waitForTimeout(300);
  const after = stab(await t.evaluate(() => window.__dbGet('bonus')));
  ok('⑤ 미리 보기 = 학생과 같은 문제 카드 · 기록 없음', same && after === before, `카드 ${same} · 기록 ${after === before ? '같음' : `${before} → ${after}`}`);
  console.log(out.join('\n'));
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
  process.exit(errs.length ? 1 : 0);
})();
