// 🎯 허수아비 보상 · 기록 = 정식 그대로 (에뮬레이터 · b206 · 📜 머리 🔨 ⑥)
//   실제 학생(1-3 · 3번) · 2차시 수업 기록 = 첫 문제 틀림 · 나머지 맞힘 → 🎯 복습 시작 → 틀린 문제를 맞힘 → ‹ 그만하기
//   ① 서버 bonus/1-3/3/set-02/{문제} = clear · tries 1 ② gem log = firstreview(4) · review_{오늘}_0(3) · 💎 +7 · EXP +5
//   ③ 같은 문제를 또 깸 = 💎 · EXP 0 · tries 2 ④ 맞힌 적 있는 문제를 깸 = 복습 💎 없음 · EXP 5
const { chromium } = require('playwright');
const { rest } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/?emu=127.0.0.1';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest('', 'PATCH', { roster: { '1-3': { 3: '시험삼' } }, rosterMask: { '1-3': { 3: '시*삼' } }, school: { features: { bundle: 'full', on: { hero: true, scarecrow: true } } } });
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const s = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); s.on('pageerror', (e) => errs.push(String(e)));
  await s.goto(B); await s.waitForSelector('.title', { timeout: 20000 }); await s.waitForTimeout(800);
  await s.selectOption('select >> nth=0', '1-3'); await s.waitForTimeout(200); await s.selectOption('select >> nth=1', '3'); await s.waitForTimeout(300);
  if (!(await s.$('.pw:has(small)'))) await s.click('.lk:has-text("가입")');
  await s.click('.pw >> nth=0'); for (const k of '12341234') await s.click(`.pad button:text-is("${k}")`);
  await s.click('.title .act .pmain'); await s.waitForTimeout(3500);
  const fh = await s.$('button:has-text("과 시작"), button:has-text("와 시작")'); if (fh) { await fh.click(); await s.waitForTimeout(1200); }
  await rest('records/1-3/3/set-02', 'PUT', { at: 1, no: 2, mons: { r0: 'o', m1: 'x', s1: 'o', m2: 'o', m3: 'o', m4: 'o', s2: 'o' }, bossM: 'oo' });
  await rest('school/last/1-3', 'PUT', { lesson: 'set-02', no: 2, at: 1, done: true, code: '111111' });
  await s.reload(); await s.waitForTimeout(4000);
  const xp0 = Number(await rest('xp/1-3/3/total')) || 0;
  const round = async (mid) => {
    await s.waitForSelector('[data-prop="scare"]', { timeout: 15000 }); await s.$eval('[data-prop="scare"]', (e) => e.click()); await s.waitForSelector('[data-k="study-review"]', { timeout: 15000 }); await s.click('[data-k="study-review"]'); await s.waitForSelector('[data-k="dummy-list"]'); await s.waitForTimeout(500);
    await s.screenshot({ path: `${SHOTS}/dummy-list-${mid}.png` });
    await s.$eval(`[data-lesson="set-02"] li[data-mid="${mid}"] .go`, (e) => e.click()); await s.waitForSelector('.drun', { timeout: 15000 }); await s.waitForTimeout(2000);
    await s.evaluate((m) => window.__dummyPerfect(m), mid); await s.waitForSelector('[data-k="dummy-got"], .sheet:has-text("이번엔")', { timeout: 15000 }).catch(() => {}); await s.waitForTimeout(800);
    const txt = ((await s.textContent('.sheet').catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    await s.screenshot({ path: `${SHOTS}/dummy-reward-${mid}.png` });
    await s.$eval('.sheet .pmain', (e) => e.click()).catch(() => {}); await s.waitForTimeout(500); // 🎯 허수아비로
    await s.$eval('.sheet .x', (e) => e.click()).catch(() => {}); await s.waitForTimeout(600); // 목록 닫기
    return txt;
  };
  const t1 = await round('m1');
  const bon1 = await rest('bonus/1-3/3/set-02/m1'), g1 = await rest('gem/1-3/3'), keys1 = Object.keys((g1 && g1.log) || {});
  ok('① 서버 기록 = 정식 키 bonus/…/set-02/m1 (clear · tries 1)', !!bon1 && bon1.clear === true && bon1.tries === 1, JSON.stringify(bon1 && { clear: bon1.clear, tries: bon1.tries }));
  ok('② 💎 = 첫 복습 4 + 복습으로 해결 3 · log 키 정식 그대로', Number(g1.total) === 7 && keys1.includes('firstreview') && keys1.some((k) => /^review_\d{4}-\d{2}-\d{2}_0$/.test(k)), `total ${g1.total} · ${keys1.join(',')} · 화면 「${t1.slice(0, 60)}」`);
  const xp1 = Number(await rest('xp/1-3/3/total')) || 0; ok('② EXP +5 (처음 처치)', xp1 - xp0 === 5, `${xp0} → ${xp1}`);
  const t2 = await round('m1');
  const bon2 = await rest('bonus/1-3/3/set-02/m1'), g2 = await rest('gem/1-3/3'), xp2 = Number(await rest('xp/1-3/3/total')) || 0;
  ok('③ 같은 문제 또 = 💎 · EXP 0 · tries 2', Number(g2.total) === 7 && xp2 === xp1 && bon2.tries === 2, `total ${g2.total} · xp ${xp2} · tries ${bon2.tries} · 화면 「${t2.slice(0, 40)}」`);
  await round('m2');
  const g3 = await rest('gem/1-3/3'), xp3 = Number(await rest('xp/1-3/3/total')) || 0;
  ok('④ 맞힌 적 있는 문제 = 복습 💎 없음 · EXP 5', Number(g3.total) === 7 && xp3 - xp2 === 5, `total ${g3.total} · xp +${xp3 - xp2}`);
  // ⑤ 🐞 #44 ① 👑 형성평가 재대결 = 수업과 같은 bossTry 에 답 → 서버 기록 clear · 💎 재대결 + 🏆 업적 · 다시 들어가면 「⚔ 풀기」 아님
  const g4a = await rest('gem/1-3/3'); const t5 = await round('boss');
  const bonB = await rest('bonus/1-3/3/set-02/boss'), g5 = await rest('gem/1-3/3'), k5 = Object.keys((g5 && g5.log) || {});
  ok('⑤ 👑 재대결 = 기록 clear · 💎 bossre + seal', !!bonB && bonB.clear === true && k5.includes('bossre_set-02') && k5.includes('seal_set-02') && Number(g5.total) > Number(g4a.total), `${JSON.stringify(bonB && { clear: bonB.clear, tries: bonB.tries })} · 💎 ${g4a.total} → ${g5.total} · 화면 「${t5.slice(0, 50)}」`);
  await s.$eval('[data-prop="scare"]', (e) => e.click()); await s.waitForSelector('[data-k="study-review"]', { timeout: 15000 }); await s.click('[data-k="study-review"]'); await s.waitForSelector('[data-k="dummy-list"]'); await s.waitForTimeout(500);
  const bl = await s.$eval('[data-lesson="set-02"] li[data-mid="boss"] .go', (e) => e.textContent.trim()).catch(() => '?');
  ok('⑤ 👑 칸 단추 = 「다시」 (「⚔ 풀기」 아님)', bl === '다시', bl); await s.screenshot({ path: `${SHOTS}/dummy-boss-after.png` });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
