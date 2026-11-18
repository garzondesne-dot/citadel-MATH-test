// 📖 #66 배움터 = 예습 + 복습 (에뮬레이터 · 1-6 시험 학생): 9차시 수업 → 10차시 예습 자동 열림 · 숫자 바꾼 판 · 보상 0 · 반 통계 밖 · 교사 학생 창 한 줄
const { chromium } = require('playwright');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/?emu=127.0.0.1';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest('', 'PATCH', { roster: { '1-6': { 1: '시험일' } }, rosterMask: { '1-6': { 1: '시*일' } }, school: { features: { bundle: 'full', on: { hero: true, scarecrow: true } } } });
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const s = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); s.on('pageerror', (e) => errs.push(String(e)));
  await s.goto(B); await s.waitForSelector('.title', { timeout: 20000 }); await s.waitForTimeout(800);
  await s.selectOption('select >> nth=0', '1-6'); await s.waitForTimeout(200); await s.selectOption('select >> nth=1', '1'); await s.waitForTimeout(300);
  if (!(await s.$('.pw:has(small)'))) await s.click('.lk:has-text("가입")');
  await s.click('.pw >> nth=0'); for (const k of '12341234') await s.click(`.pad button:text-is("${k}")`);
  await s.click('.title .act .pmain'); await s.waitForTimeout(3500);
  const fh = await s.$('button:has-text("과 시작"), button:has-text("와 시작")'); if (fh) { await fh.click(); await s.waitForTimeout(1200); }
  // 수업 전 = 예습 없음
  await s.waitForSelector('[data-prop="scare"]', { timeout: 15000 });
  ok('캠프 이름 = 「허수아비」 (#71 배움터 없앰 · #72 부제 없앰)', /허수아비/.test(await s.textContent('[data-prop="scare"]')));
  await s.$eval('[data-zone="gate"]', (e) => e.click()); await s.waitForTimeout(1200);
  ok('수업 전 = 던전 문 창에 예습 줄 없음', !(await s.$('[data-k="gate-prep"]')));
  await s.keyboard.press('Escape'); await s.reload(); await s.waitForTimeout(3000);
  // 9차시 수업 기록 → 10차시 열림
  await rest('records/1-6/1/set-09', 'PUT', { at: 1, no: 9, mons: { m1: 'o' }, conc: { c1: [1, 1] } });
  await rest('school/last/1-6', 'PUT', { lesson: 'set-09', no: 9, at: 1, done: true, code: '111111' });
  await s.reload(); await s.waitForTimeout(4000); await s.waitForSelector('[data-prop="scare"]', { timeout: 15000 });
  await s.screenshot({ path: `${SHOTS}/prep66-camp.png` });
  const gem0 = await rest('gem/1-6/1'), xp0 = Number(await rest('xp/1-6/1/total')) || 0, rec0 = JSON.stringify(await rest('records/1-6/1'));
  await s.$eval('[data-zone="gate"]', (e) => e.click()); await s.waitForSelector('[data-k="gate-prep"]', { timeout: 15000 }); await s.waitForTimeout(500);
  ok('던전 문 창 = 「🔥 10차시 탐사(예습)」 한 줄 (#71 임시 입구)', /10차시 탐사\(예습\)/.test((await s.textContent('[data-k="gate-prep"]')) || ''));
  await s.screenshot({ path: `${SHOTS}/prep66-study.png` });
  await s.click('[data-k="gate-prep"]'); await s.waitForSelector('[data-k="prep-list"]', { timeout: 15000 }); await s.waitForTimeout(500);
  const lids = await s.$$eval('[data-k="prep-card"]', (xs) => xs.map((x) => x.dataset.lid));
  ok('예습 목록 = 10차시 하나', JSON.stringify(lids) === '["set-10"]', JSON.stringify(lids));
  ok('「연습용 · 보상 없어요」', /연습용 · 보상 없어요/.test(await s.textContent('[data-k="prep-list"]')));
  await s.screenshot({ path: `${SHOTS}/prep66-list.png` });
  await s.click('[data-k="prep-go"] >> nth=0'); await s.waitForSelector('.drun', { timeout: 15000 }); await s.waitForTimeout(2500);
  const mid = await s.evaluate(() => { const st = document.querySelector('[data-prep]'); return st ? null : null; });
  void mid;
  const m1 = await s.$eval('[data-k="prep-card"] li >> nth=0', () => '').catch(() => '');
  void m1;
  const mids = await s.evaluate(() => (window.__prepItems ? 'ok' : 'none'));
  ok('시험 고리 있음', mids === 'ok');
  const first = await s.evaluate(() => { const m = window.__prepMid; return { m, x: window.__prepItems(m) }; });
  const nowQ = JSON.stringify(first?.x?.now?.map((q) => q.question ?? q.q ?? q)), shQ = JSON.stringify(first?.x?.sheet?.map((q) => q.question ?? q.q ?? q));
  ok(`학습지 숫자 안 나옴 (${first?.m}: 첫 판 ≠ 학습지 판)`, !!first && nowQ !== shQ, (nowQ || '').slice(0, 90));
  await s.screenshot({ path: `${SHOTS}/prep66-fight.png` });
  await s.evaluate((m) => window.__prepPerfect(m), first?.m); await s.waitForSelector('[data-k="prep-nogain"]', { timeout: 15000 }).catch(() => {}); await s.waitForTimeout(800);
  const rt = ((await s.textContent('.sheet').catch(() => '')) || '').replace(/\s+/g, ' ');
  ok('처치 창 = 「연습용 · 보상 없어요」 · 💎 · EXP 줄 없음', /처치/.test(rt) && /보상 없어요/.test(rt) && !/💎 \+|EXP/.test(rt), rt.slice(0, 80));
  await s.screenshot({ path: `${SHOTS}/prep66-win.png` }); await s.waitForTimeout(1500);
  const gem1 = await rest('gem/1-6/1'), xp1 = Number(await rest('xp/1-6/1/total')) || 0, rec1 = JSON.stringify(await rest('records/1-6/1'));
  ok('💎 · 📜 · log 그대로', JSON.stringify({ t: gem1?.total, s: gem1?.scroll, l: gem1?.log }) === JSON.stringify({ t: gem0?.total, s: gem0?.scroll, l: gem0?.log }), `${gem0?.total}→${gem1?.total}`);
  ok('EXP 그대로', xp1 === xp0, `${xp0}→${xp1}`);
  ok('수업 기록(반 통계 원본) 그대로', rec1 === rec0);
  const pr = await rest('bonus/1-6/1/review/prep_set-10');
  ok('예습 기록 = review/prep_set-10', pr && pr[first.m] && pr[first.m].tries === 1 && pr[first.m].clear === true, JSON.stringify(pr));
  const bonKeys = Object.keys((await rest('bonus/1-6/1')) || {});
  ok('허수아비 · 성채 칸에 안 섞임 (bonus 맨 위 = review 만)', JSON.stringify(bonKeys) === '["review"]', JSON.stringify(bonKeys));
  // 교사 학생 창
  const t = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); t.on('pageerror', (e) => errs.push(String(e)));
  await t.goto(`${B}&role=teacher`); await t.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(t, '.tabs');
  await t.click('.tabs button:has-text("반")'); await t.waitForTimeout(400); await t.click('.chips button:has-text("1-6")').catch(() => {}); await t.waitForTimeout(1500);
  await t.click('.pc:has-text("시험일")').catch(() => {}); await t.waitForTimeout(900);
  const pl = ((await t.textContent('[data-k="pupil-prep"]').catch(() => '')) || '').trim();
  ok('교사 학생 창 = 「📖 예습: 10차시 1문제」', /📖 예습: 10차시 1문제/.test(pl), pl);
  await t.locator('.ps').screenshot({ path: `${SHOTS}/prep66-teacher.png` }).catch(() => {});
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close(); process.exit(errs.length ? 1 : 0);
})();
