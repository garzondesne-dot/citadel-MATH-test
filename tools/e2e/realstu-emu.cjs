// 🧑 실제 학생 = 테스트 꼴 아님 (b205 · 📜 머리 「정식과 같게」): 1-3 · 3번 가입 → 서버 💎 · 기록 넣기 → 캠프 · 내 용사
//   테스터 표시 없음 · 호칭 고르기 = 달지 않기 · 새벽의 개척자 + 얻은 것(첫 출정 · 레벨 칭호)만 고를 수 있음 · 나머지 = 잠김 · 💎 = 서버 값
//   + 🧪 시험 반(1-6) 학생 = 테스터 표시 · 호칭 모두
const { chromium } = require('playwright');
const { rest } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/', E = 'emu=127.0.0.1';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest('', 'PATCH', { roster: { '1-3': { 3: '시험삼' }, '1-6': { 2: '베타이' } }, rosterMask: { '1-3': { 3: '시*삼' }, '1-6': { 2: '베*이' } } }); // 1-6 = 기본 시험 반
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a);
  const login = async (cls, num) => {
    const s = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); s.on('pageerror', (e) => errs.push(String(e)));
    await s.goto(`${B}?${E}`); await s.waitForSelector('.title', { timeout: 20000 }); await s.waitForTimeout(800);
    await s.selectOption('select >> nth=0', cls); await s.waitForTimeout(200); await s.selectOption('select >> nth=1', String(num)); await s.waitForTimeout(300);
    if (!(await s.$('.pw:has(small)'))) await s.click('.lk:has-text("가입")');
    await s.click('.pw >> nth=0'); for (const k of '12341234') await s.click(`.pad button:text-is("${k}")`);
    await s.click('.title .act .pmain'); await s.waitForTimeout(3500);
    const fh = await s.$('button:has-text("과 시작"), button:has-text("와 시작")'); if (fh) { await fh.click(); await s.waitForTimeout(1200); }
    return s;
  };
  const s = await login('1-3', 3);
  const g0 = await rest('gem/1-3/3/total'); log('① 새 실제 학생 시작 💎 (서버)', g0); if (Number(g0) !== 0) errs.push('새 계정 시작 💎 = 0 아님');
  await rest('gem/1-3/3/total', 'PUT', 37); await rest('xp/1-3/3/total', 'PUT', 120);
  await rest('records/1-3/3/set-02', 'PUT', { at: 1, no: 2, mons: { m1: 'o' } });
  await s.reload(); await s.waitForTimeout(4000);
  const hero = async (p) => { await p.click('button.hero-card').catch(() => {}); await p.waitForTimeout(800); };
  const titles = async (p) => {
    for (const t of await p.$$('[role="tab"], .tabs button, .seg button')) { const tx = ((await t.textContent()) || '').trim(); if (/기록|호칭/.test(tx)) { await t.click(); break; } }
    await p.waitForTimeout(300); await p.click('button:has-text("호칭 고르기")'); await p.waitForTimeout(500);
    return { can: await p.$$eval('.ttls button.ttp', (x) => x.map((e) => e.textContent.replace('✔', '').trim())), lock: (await p.$$('.ttls .ttp.lock')).length };
  };
  await hero(s);
  const tester = !!(await s.$('.tester')), gemTxt = await s.evaluate(() => document.body.innerText.includes('37'));
  const t1 = await titles(s);
  log('② 실제 학생: 테스터 표시', tester, '| 💎 37 보임', gemTxt, '| 고를 수 있는 호칭', JSON.stringify(t1.can), '| 잠김', t1.lock);
  if (tester || !gemTxt || !t1.can.includes('새벽의 개척자') || !t1.can.includes('첫 출정') || t1.can.length > 6 || t1.lock < 10) errs.push('실제 학생 호칭 · 표시');
  await s.screenshot({ path: `${SHOTS}/realstu-titles.png` });
  const x = await login('1-6', 2); await hero(x);
  const t2 = await titles(x), tester2 = await x.$eval('.tester', () => true).catch(() => false);
  log('③ 🧪 시험 반 학생: 테스터 표시', tester2, '| 고를 수 있는 호칭', t2.can.length); if (!tester2 || t2.can.length < 20) errs.push('시험 반 = 테스트 꼴');
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
