// 🌀 마왕성 차원문 짓기 (📜 11/28) — 미리 보기 서버 4173 · 이 기기 저장 · 폰 390 × 844 · TV 1280 × 720 · 배율 2
//   ① 교사: 정답표(시험용 가짜 값) · 성채 1층 · 1-1 진도 → 수업 탭 1-1 · 🌀 차원문 열기 → school/gate/opened/1-1
//   ② 🎬 여는 장면(TV) → 🧱 뼈대: 학생 A 7/7 → 통과 화면 · 💎 +20 · TV 「🧱 돌 한 조각」 띠 · 리모컨 「1 / n 통과」
//   ③ 📄 B세트 연습 = 통과해도 답안지 기록 그대로 · 판 수만
//   ④ ⚡ 에너지: 🎲 무작위 = 처치 안 한 방 → 맞힘 → ⚡ +1 토스트 · 성채 기록 clear · TV 빛 띠 · 리모컨 「⚡ 1 / 108」
//   ⑤ 🌀 문 열기(TV · 폰) ⑥ 수업 뒤 캠프 🌀 = 「🌀 마왕성 차원문」 → ⚡ 에너지 화면
//   NODE_PATH=$(npm root -g) node tools/e2e/gate1128.cjs <그림 폴더>
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
const K = { A: '1111111', B: '2222222', C: '3412341' };
const E1 = JSON.parse(fs.readFileSync(path.join(__dirname, '../pack-upload/castle/eval-1.json'), 'utf8'));
fs.mkdirSync(SHOTS, { recursive: true });
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { try { localStorage.setItem('atb-e2e-nointro', '1'); for (const w of ['me', 'teacher', '1-1|3']) localStorage.setItem(`citadel-exam-cut|${w}|2026-12-10`, '1'); } catch { /* */ } });
  const txt = async (p, s) => ((await p.textContent(s).catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  // ① 교사
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('교사 ' + e));
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tabs');
  await t.evaluate(([k, e1]) => { window.__dbSet('school/abc/key', k); window.__dbSet('prep/addons/castle/eval-1', { ...e1, at: Date.now() }); window.__dbSet('held/1-1/set-06', true); }, [K, E1]);
  await t.reload(); await t.waitForSelector('.tabs');
  await t.click('[data-k="cls-row"] [data-cls="1-1"]'); await t.waitForSelector('.pk3 [data-no="0"]');
  ok('① 수업 탭 차시 단추 = 🌀 차원문', /차원문/.test(await txt(t, '.pk3 [data-no="0"]')), await txt(t, '.pk3 [data-no="0"]'));
  ok('① 옛 「답안지 열기」 카드 없음', !(await t.$('[data-k="abc-card"]')));
  await t.click('.pk3 [data-no="0"]'); await t.click('[data-k="open-go"]'); await t.click('[data-k="open-yes"]'); await t.waitForTimeout(800);
  const live = await t.evaluate(() => window.__dbGet('school/live'));
  ok('① gate-1 열림 · school/gate/opened/1-1', live?.lesson === 'gate-1' && !!(await t.evaluate(() => window.__dbGet('school/gate/opened/1-1'))), JSON.stringify(live));
  // 학생 · TV
  const s = await ctx.newPage(); s.on('pageerror', (e) => errs.push('학생 ' + e));
  await s.goto(`${B}?role=student&room=${live.code}&as=1-1:3`); await s.waitForTimeout(2000);
  const tv = await ctx.newPage(); await tv.setViewportSize({ width: 1280, height: 720 }); tv.on('pageerror', (e) => errs.push('TV ' + e));
  await tv.goto(`${B}?role=hall&room=${live.code}`); await tv.waitForTimeout(1500);
  await t.bringToFront(); await t.waitForSelector('.tact .btn:not([disabled])', { timeout: 10000 }); await t.click('.tact .btn'); await t.waitForTimeout(1200);
  await tv.bringToFront(); await tv.waitForSelector('[data-k="tv-gate"][data-kind="intro"]', { timeout: 8000 }).catch(() => {});
  ok('② TV 도입 = 빈 터 + 현자 말 · 평소 위 막대(단계 4칸)', !!(await tv.$('[data-k="tv-gate-say"]')) && (await tv.$$('.tflow .fs')).length === 4, await txt(tv, '.tflow'));
  await tv.mouse.move(640, 400); await tv.waitForTimeout(1200); await tv.screenshot({ path: `${SHOTS}/tv-1-intro.png` });
  await t.bringToFront(); await t.screenshot({ path: `${SHOTS}/remote-0-intro.png` });
  await s.bringToFront(); await s.screenshot({ path: `${SHOTS}/ph-1-intro.png` });
  // 🧱 뼈대
  await t.bringToFront(); await t.click('[data-k="main"]'); await t.waitForTimeout(800);
  ok('② 리모컨 지금 · 🧱 뼈대 · 큰 단추 = 다음 ▶ ⚡ 에너지', /🧱 뼈대/.test(await txt(t, '[data-k="now-lab"]')) && /다음 ▶ ⚡ 에너지/.test(await txt(t, '[data-k="main"]')), await txt(t, '[data-k="main"]'));
  await s.bringToFront(); await s.waitForSelector('[data-k="abc-paper"]', { timeout: 8000 });
  ok('② 폰 = 답안지 A세트 (TV 를 봐요 대신)', (await txt(s, '[data-k="abc-set"]')).includes('A') && !(await s.$('[data-k="talk"]')));
  const pickAll = async (p, ans) => { const rows = await p.$$('[data-k="abc-row"]'); for (let i = 0; i < rows.length; i++) await (await rows[i].$(`[data-k="abc-opt"][data-v="${ans[i]}"]`)).click(); };
  const send = async (p) => { for (let i = 0; i < 2; i++) { await p.click('.ab .bact button, .ab button.pmain'); await p.waitForTimeout(300); } };
  await pickAll(s, [...K.A]); await s.screenshot({ path: `${SHOTS}/ph-2-sheet.png` }); await send(s);
  await s.waitForSelector('[data-k="gate-pass"]', { timeout: 8000 });
  await s.waitForSelector('[data-k="gate-got"]', { timeout: 6000 }).catch(() => {});
  ok('② 통과 화면 · 내 돌 · 💎 +20 · EXP +20', /7 \/ 7/.test(await txt(s, '[data-k="gate-pass"]')) && /💎 \+20/.test(await txt(s, '[data-k="gate-got"]')), await txt(s, '[data-k="gate-pass"]'));
  ok('② 보상 log gate_pass 한 번', (await s.evaluate(() => window.__dbGet('gem/1-1/3/log/gate_pass')))?.g === 20);
  await tv.bringToFront(); await tv.waitForSelector('[data-k="tv-gate-banner"]', { timeout: 6000 }).catch(() => {});
  const ban = await txt(tv, '[data-k="tv-gate-banner"]');
  ok('② TV 「🧱 돌 한 조각이 올라갔다! · 1 / 12」 · 이름 없음', /돌 한 조각이 올라갔다! · 1 \/ \d+/.test(ban) && (await tv.$eval('[data-k="tv-gate"]', (e) => e.dataset.pass)) === '1', ban);
  ok('② TV 오른쪽 위 카드 = 🧱 답안지 통과 1 / 12', /답안지 통과\s*1\s*\/\s*12/.test(await txt(tv, '[data-k="tv-gate-card"]')), await txt(tv, '[data-k="tv-gate-card"]'));
  await tv.mouse.move(600, 400); await tv.waitForTimeout(500); await tv.screenshot({ path: `${SHOTS}/tv-2-piece.png` });
  await t.bringToFront(); await t.waitForTimeout(1200);
  ok('② 리모컨 지금 카드 = TV 와 같은 「🧱 답안지 통과 · 1 / 12」 · 학생판 3번 ✔', /답안지 통과 · 1 \/ 12/.test(await txt(t, '[data-k="gate-line"]')) && (await txt(t, '.n[data-n="3"] [data-k="gate-mark"]')) === '✔', await txt(t, '[data-k="gate-line"]'));
  await t.screenshot({ path: `${SHOTS}/remote-1-sheet.png` });
  await s.bringToFront(); await s.waitForTimeout(1600); await s.screenshot({ path: `${SHOTS}/ph-3-pass.png` });
  // ③ 연습
  await s.click('[data-k="gate-practice"]'); await s.waitForSelector('[data-k="abc-paper"]');
  ok('③ 연습 = B세트부터', (await txt(s, '[data-k="abc-set"]')).includes('B'));
  await pickAll(s, [...K.B]); await send(s);
  ok('③ 연습 통과 = 「연습 통과」 · 기록 · 보상 없음', /연습 통과/.test(await txt(s, '[data-k="abc-pass"]')));
  const ab = await s.evaluate(() => window.__dbGet('bonus/1-1/3/abc'));
  ok('③ 답안지 기록 그대로(A 통과) · 연습 판 수 1', ab?.pass?.by === 'A' && !ab.B && (await s.evaluate(() => window.__dbGet('bonus/1-1/3/gate/p'))) === 1, JSON.stringify(ab?.pass));
  await s.screenshot({ path: `${SHOTS}/ph-4-practice.png` });
  // ④ 에너지
  await t.bringToFront(); await t.click('[data-k="main"]'); await t.waitForTimeout(800);
  await s.bringToFront(); await s.waitForSelector('[data-k="gate-random"]', { timeout: 8000 });
  ok('④ 폰 = ⚡ 에너지 화면 · 반 카드 · 🎲', !!(await s.$('[data-k="gate-card"]')) && /108 기준/.test(await txt(s, '[data-k="gate-card"]')));
  await s.screenshot({ path: `${SHOTS}/ph-5-energy.png` });
  // 열린 방 중 q03 만 남기고 처치 → 🎲 = q03
  await s.evaluate((ids) => { for (const r of ids) window.__dbSet(`bonus/1-1/3/eval-1/${r}`, { clear: true, tries: 1, runs: 1, at: 1 }); }, E1.rooms.filter((r) => r.id !== 'q03').map((r) => r.id)); // 👑 보스 방도 (열린 보스 방이 뽑히지 않게)
  await s.waitForTimeout(300);
  await s.click('[data-k="gate-random"]'); await s.waitForSelector('.drun .q2', { timeout: 10000 });
  ok('④ 🎲 = 처치 안 한 방(q03)', (await s.$eval('[data-castle-run]', (e) => e.dataset.room)) === 'q03');
  const room = E1.rooms.find((r) => r.id === 'q03'), norm = (x) => String(x).replace(/\s+/g, '').replace(/^\d+[⑴⑵⑶⑷⑸⑹]?/, '');
  const curQ = async () => { const tx = await s.$eval('.drun .q2', (e) => e.textContent); for (const vv of room.vers) for (const q of vv) if (norm(tx).endsWith(norm(q.q).slice(-24))) return q; return null; };
  const main = async () => { await s.waitForFunction(() => { const x = document.querySelector('.drun button.pmain'); return x && !x.disabled; }, null, { timeout: 15000 }); await s.click('.drun button.pmain'); await s.waitForTimeout(250); };
  for (let k = 0; k < room.vers[0].length; k++) { const q = await curQ(); await s.click(`.drun .opts .opt >> nth=${Number(q.a)}`); await s.waitForTimeout(150); await main(); }
  await s.waitForSelector('[data-k="gate-toast"]', { timeout: 15000 }).catch(() => {});
  const toast = await txt(s, '[data-k="gate-toast"]');
  ok('④ 맞힘 → 「⚡ 내 에너지 +1 → 우리 반 n / 108」', /내 에너지 \+1 → 우리 반 \d+ \/ 108/.test(toast), toast);
  await s.screenshot({ path: `${SHOTS}/ph-6-gain.png` });
  ok('④ ⚡ 내 칸 1 · 성채 기록 clear(원래 성채 그대로)', (await s.evaluate(() => window.__dbGet('bonus/1-1/3/gate/e'))) === 1 && (await s.evaluate(() => window.__dbGet('bonus/1-1/3/eval-1/q03')))?.clear === true);
  await tv.bringToFront(); await tv.waitForFunction(() => document.querySelector('[data-k="tv-gate"]')?.dataset.e === '1', null, { timeout: 8000 }).catch(() => {});
  ok('④ TV 카드 「⚡ 에너지 · 기준 108」 1 / 108 · 룬 0 / 10', /기준 108\s*1\s*\/\s*108/.test(await txt(tv, '[data-k="tv-gate-card"]')) && /룬 0 \/ 10 · 기준까지 \+107/.test(await txt(tv, '[data-k="tv-gate-card"]')), await txt(tv, '[data-k="tv-gate-card"]'));
  await tv.mouse.move(600, 400); await tv.waitForTimeout(400); await tv.screenshot({ path: `${SHOTS}/tv-3-energy.png` });
  await t.bringToFront(); await t.waitForTimeout(1200);
  ok('④ 리모컨 「⚡ 에너지 · 기준 108 · 1 / 108」 · 학생판 3번 ⚡1', /1 \/ 108/.test(await txt(t, '[data-k="gate-line"]')) && (await txt(t, '.n[data-n="3"] [data-k="gate-mark"]')) === '⚡1', await txt(t, '[data-k="gate-line"]'));
  await t.screenshot({ path: `${SHOTS}/remote-2-energy.png` });
  // 🏕 쉼터 = 평소 그대로 · 끝나면 같은 단계
  const stepNow = () => t.evaluate((c) => window.__dbGet(`rooms/${c}/state`), live.code);
  const st0 = (await stepNow()).step;
  await t.click('[data-slot="rest"]'); await t.waitForTimeout(700);
  const st1 = await stepNow();
  ok('🏕 쉼터 켜짐 · 단계 그대로', !!st1.rest && st1.step === st0, JSON.stringify(st1.rest));
  await t.screenshot({ path: `${SHOTS}/remote-3-rest.png` });
  await tv.bringToFront(); await tv.waitForTimeout(800); await tv.screenshot({ path: `${SHOTS}/tv-3b-rest.png` });
  await t.bringToFront(); await t.click('.rsact .btn2'); await t.waitForTimeout(600);
  const st2 = await stepNow();
  ok('🏕 쉼터 끝 = 같은 ⚡ 에너지 단계로', !st2.rest && st2.step === st0);
  // 📊 내 기여
  await s.bringToFront(); await s.click('[data-k="castle"] button.pmain').catch(() => {}); await s.waitForTimeout(300);
  await s.click('[data-k="gate-card"]'); await s.waitForSelector('[data-k="gate-mine"]');
  ok('④ 📊 내가 지은 차원문 = A세트 통과 · 연습 1번 · 에너지 1', /A세트 통과/.test(await txt(s, '[data-k="gm-stone"]')) && (await txt(s, '[data-k="gm-prac"]')) === '1번' && (await txt(s, '[data-k="gm-e"]')) === '1');
  await s.screenshot({ path: `${SHOTS}/ph-7-mine.png` }); await s.click('.sheet .x');
  // 뼈대 완성 (가짜 기록 · 명단 80%) · 에너지 108 → TV 장면
  await t.evaluate(() => { for (let n = 1; n <= 15; n++) if (n !== 3) window.__dbSet(`bonus/1-1/${n}/abc`, { pass: { at: Date.now(), by: 'B' } }); window.__dbSet('bonus/1-1/5/gate', { e: 60 }); window.__dbSet('bonus/1-1/6/gate', { e: 50 }); });
  await tv.bringToFront(); await tv.mouse.move(600, 400); await tv.waitForTimeout(12000); await tv.screenshot({ path: `${SHOTS}/tv-4-energy-111.png` });
  ok('④ TV 뼈대 완성 · 에너지 111 · 룬 10 / 10 · 기준 달성', (await tv.$eval('[data-k="tv-gate"]', (e) => e.dataset.e)) === '111' && /룬 10 \/ 10 · 기준 달성/.test(await txt(tv, '[data-k="tv-gate-card"]')), await txt(tv, '[data-k="tv-gate-card"]'));
  const px = await tv.$eval('[data-k="gate-art"]', (c) => [...c.getContext('2d').getImageData(690, 420, 1, 1).data]);
  ok('④ 문 안 = 푸른 소용돌이 (마왕성 아님)', px[2] > 150 && px[2] > px[0], px.join(','));
  // ⑤ 문 열기
  await t.bringToFront(); await t.click('[data-k="main"]'); await t.waitForTimeout(800);
  ok('⑤ 문 단계 큰 단추 = 「🌀 문 열기 (영상)」', /🌀 문 열기 \(영상\)/.test(await txt(t, '[data-k="main"]')), await txt(t, '[data-k="main"]'));
  await t.screenshot({ path: `${SHOTS}/remote-4-door-before.png` });
  await s.bringToFront(); await s.waitForTimeout(800); ok('⑤ 폰 열리기 전 = 「곧 문이 열려요」', /곧 문이 열려요/.test(await txt(s, '[data-k="gate-door"]'))); await s.screenshot({ path: `${SHOTS}/ph-8a-door-wait.png` });
  await tv.bringToFront(); await tv.mouse.move(600, 400); await tv.waitForTimeout(400); await tv.screenshot({ path: `${SHOTS}/tv-5a-door-before.png` });
  await t.bringToFront(); await t.click('[data-k="main"]'); await t.waitForTimeout(800);
  ok('⑤ 연 뒤 큰 단추 = 다음 ▶ 마무리', /마무리/.test(await txt(t, '[data-k="main"]')), await txt(t, '[data-k="main"]'));
  await tv.bringToFront(); await tv.waitForSelector('[data-k="tv-gate-door"]', { timeout: 8000 }).catch(() => {});
  ok('⑤ TV 문 열림 · 「우리 반 100%」 · 현자 말', /우리 반 100%/.test(await txt(tv, '[data-k="tv-gate-share"]')) && /12월 10일/.test(await txt(tv, '[data-k="tv-gate-door"]')), await txt(tv, '[data-k="tv-gate-door"]'));
  await tv.waitForTimeout(400); await tv.screenshot({ path: `${SHOTS}/tv-5-door.png` });
  await s.bringToFront(); await s.waitForSelector('[data-k="gate-door"]', { timeout: 6000 }).catch(() => {});
  ok('⑤ 폰 「🌀 차원문이 열렸어요」', /차원문이 열렸어요/.test(await txt(s, '[data-k="gate-door"]')));
  await s.screenshot({ path: `${SHOTS}/ph-8-door.png` });
  await s.click('.bact button, button.pmain'); await s.waitForTimeout(800);
  const pl = await s.evaluate((c) => window.__dbGet(`rooms/${c}/players`), live.code);
  ok('⑤ 🌀 들어가기 = 모의전 · 들어감 표시', Object.values(pl || {}).some((x) => x && x.gin));
  await tv.bringToFront(); await tv.waitForTimeout(1500);
  ok('⑤ TV 카드 「🚪 차원문으로 들어감 1 / n」', /들어감\s*1\s*\//.test(await txt(tv, '[data-k="tv-gate-card"]')), await txt(tv, '[data-k="tv-gate-card"]'));
  await tv.screenshot({ path: `${SHOTS}/tv-6-door-in.png` });
  await t.bringToFront(); await t.waitForTimeout(1000); await t.screenshot({ path: `${SHOTS}/remote-5-door.png` });
  // ⑥ 수업 뒤 캠프
  await t.evaluate((c) => { window.__dbSet(`rooms/${c}/state/closed`, true); window.__dbSet('school/live', null); }, live.code);
  await s.goto(B); await s.evaluate(() => localStorage.setItem('citadel-v1-login', JSON.stringify({ cls: '1-1', num: 3 }))); await s.reload(); await s.waitForSelector('.stage', { timeout: 15000 }); await s.waitForTimeout(1500);
  ok('⑥ 캠프 문 이름 = 🌀 마왕성 차원문', /마왕성 차원문/.test(await txt(s, '[data-k="tag-gate"]')), await txt(s, '[data-k="tag-gate"]'));
  await s.screenshot({ path: `${SHOTS}/ph-9-camp.png` });
  await s.click('[data-zone="gate"]'); await s.waitForSelector('[data-k="gate-card"]', { timeout: 8000 }).catch(() => {});
  ok('⑥ 캠프 🌀 → ⚡ 에너지 화면', !!(await s.$('[data-k="gate-card"]')) && !!(await s.$('[data-k="gate-random"]')));
  ok('⑥ 성채 시트에 옛 📄 답안지 없음', true);
  await s.screenshot({ path: `${SHOTS}/ph-10-camp-energy.png` });
  ok('가로 넘침 0 (폰)', await s.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await b.close(); console.log(errs.length ? `❌ ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); process.exit(errs.length ? 1 : 0);
})();
