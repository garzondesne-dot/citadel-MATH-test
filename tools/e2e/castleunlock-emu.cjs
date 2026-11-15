// 🔓 성채 교사 수동 해금 (에뮬레이터 · b195): 성채 1층 팩 + 1-3 학생(진도 0 = 모든 방 잠김) → 교사 준비 ➕ 추가 팩 「🔓 해금 관리」
//   → 1-3 · q1 스위치 → 학생 성채 q1 열림(실시간) → 👑 q12 스위치 = 60% 없이 열림 → 🔓 전체 해금 = 12방 → 자동 끔 + 🔒 전체 잠금 = 0방 · 「선생님이 열어 주면」 → 다른 반(1-4) 은 그대로
const { chromium } = require('playwright');
const fs = require('fs');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', PACK = process.argv[3], B = 'http://localhost:4173/', E = 'emu=127.0.0.1';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  const P = JSON.parse(fs.readFileSync(PACK, 'utf8'));
  await rest('', 'PATCH', { roster: { '1-3': { 3: '시험삼' } }, rosterMask: { '1-3': { 3: '시*삼' } }, prep: { addons: { castle: { [P.id]: P } } } });
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a);
  const s = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); s.on('pageerror', (e) => errs.push(String(e))); s.setDefaultTimeout(15000);
  await s.goto(`${B}?${E}`); await s.waitForSelector('.title', { timeout: 20000 }); await s.waitForTimeout(800);
  await s.selectOption('select >> nth=0', '1-3'); await s.waitForTimeout(200); await s.selectOption('select >> nth=1', '3'); await s.waitForTimeout(300);
  if (!(await s.$('.pw:has(small)'))) await s.click('.lk:has-text("가입")');
  await s.click('.pw >> nth=0'); for (const k of '12341234') await s.click(`.pad button:text-is("${k}")`);
  await s.click('.title .act .pmain'); await s.waitForTimeout(3500);
  const fh = await s.$('button:has-text("과 시작"), button:has-text("와 시작")'); if (fh) { await fh.click(); await s.waitForTimeout(1200); }
  await s.click('button[aria-label="성채"]'); await s.waitForTimeout(500); await s.click('.sheet button:has-text("성채 들어가기")'); await s.waitForSelector('[data-k="castle"]');
  const openN = () => s.$$eval('[data-k="castle"] [data-room][data-open="1"]', (x) => x.map((e) => e.dataset.room));
  const line = (r) => s.$eval(`[data-k="castle"] [data-room="${r}"]`, (x) => x.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');
  log('① 학생 1-3 (진도 0) 열린 방:', JSON.stringify(await openN()), '|', await s.textContent('[data-k="castle-sum"]'));
  if ((await openN()).length) errs.push('처음부터 열림');
  const t = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); t.on('pageerror', (e) => errs.push(String(e)));
  await t.goto(`${B}?role=teacher&${E}`); await t.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(t, '.tabs');
  await t.click('.tabs button:has-text("준비")'); await t.waitForTimeout(600);
  await t.click(`[data-k="addon-card"][data-id="${P.id}"] [data-k="addon-unlock"]`); await t.waitForSelector('[data-k="castle-unlock"]');
  await t.click('[data-k="castle-unlock"] .chips [data-cls="1-3"]'); log('   해금 시트 방:', JSON.stringify(await t.$$eval('[data-k="castle-unlock"] [data-room]', (x) => x.map((e) => e.dataset.room)))); await t.screenshot({ path: `${SHOTS}/unlock-sheet.png` }); await t.click('[data-k="castle-unlock"] [data-room="q01"]'); await t.waitForTimeout(1500);
  log('② 교사 1-3 q1 열기 → 서버', JSON.stringify(await rest(`school/castleOpen/${P.id}/1-3`)), '| 학생 열린 방', JSON.stringify(await openN()));
  if (JSON.stringify(await openN()) !== '["q01"]') errs.push('q1 열림');
  await t.click('[data-k="castle-unlock"] [data-room="q12"]'); await t.waitForTimeout(1500);
  log('③ 👑 q12 열기 (60% 없이) → 학생', JSON.stringify(await openN())); if (!(await openN()).includes("q12")) errs.push('보스 60% 없이');
  await t.screenshot({ path: `${SHOTS}/unlock-teacher.png` });
  await t.click('[data-k="unlock-all"]'); await t.waitForTimeout(1500);
  log('④ 🔓 전체 해금 → 학생', (await openN()).length, '방'); if ((await openN()).length !== P.rooms.length) errs.push('전체 해금');
  await s.screenshot({ path: `${SHOTS}/unlock-student-all.png` });
  await t.click('[data-k="auto-switch"]'); await t.click('[data-k="lock-all"]'); await t.waitForTimeout(1500);
  log('⑤ 자동 끔 + 🔒 전체 잠금 → 학생', (await openN()).length, '방 · q03 줄:', await line("q03"), '| 서버 auto', await rest(`school/castleAuto/${P.id}`));
  if ((await openN()).length || !(await line("q03")).includes('선생님이 열어 주면')) errs.push('잠금 · 자동 끔 문구');
  await t.click('[data-k="castle-unlock"] .chips [data-cls="모든 반"]'); await t.click('[data-k="castle-unlock"] [data-room="q02"]'); await t.waitForTimeout(1200);
  const all = await rest(`school/castleOpen/${P.id}`); log('⑥ 모든 반 q2 →', Object.keys(all || {}).length, '반에 q2', Object.values(all || {}).filter((v) => v && v.q02).length, '| 학생', JSON.stringify(await openN()));
  if (JSON.stringify(await openN()) !== '["q02"]') errs.push('모든 반');
  await t.click('[data-k="auto-switch"]'); await t.waitForTimeout(500); log('⑦ 자동 다시 켬 → 서버', await rest(`school/castleAuto/${P.id}`));
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
