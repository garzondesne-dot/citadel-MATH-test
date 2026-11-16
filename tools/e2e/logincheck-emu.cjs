// 🔑 월요일 아침 로그인 점검 (에뮬레이터 · b205): 학생 폰 상황 다섯 가지
//   ② 아무 기억 없는 폰 → 반 · 번호 · 4자리 → 캠프(서버 💎) ① 로그인 기억만 남은 폰(세션 없음 · 옛 앱 · 다른 앱) → 「로그인 풀림」 → 다시 로그인 → 캠프
//   ③ 선생님 0000 초기화(교사 화면 학생 시트) → 옛 4자리 = 안내 · 0000 = 들어감 · 기록 그대로 ④ 비밀번호 3번 틀림 = 안내 · 맞으면 들어감
//   ⑤ 같은 계정 두 앱(두 폰) → 둘 다 캠프 · 새로 고침해도 안 쫓겨남
const { chromium } = require('playwright');
const { rest, asAdmin } = require('./_emu.cjs');
const B = 'http://localhost:4173/', E = 'emu=127.0.0.1';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest('', 'PATCH', { roster: { '1-3': { 3: '시험삼', 4: '시험사' } }, rosterMask: { '1-3': { 3: '시*삼', 4: '시*사' } } });
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const phone = async () => { const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e))); return p; };
  const toTitle = async (p) => { await p.goto(`${B}?${E}`); await p.waitForSelector('.title, [data-k="todo"], .camp', { timeout: 20000 }); await p.waitForTimeout(1500); };
  const enter = async (p, num, pw, join = false) => {
    await p.selectOption('select >> nth=0', '1-3'); await p.waitForTimeout(200); await p.selectOption('select >> nth=1', String(num)); await p.waitForTimeout(300);
    if (join && !(await p.$('.pw:has(small)'))) await p.click('.lk:has-text("가입")');
    await p.click('.pw >> nth=0'); for (const k of join ? pw + pw : pw) await p.click(`.pad button:text-is("${k}")`);
    await p.click('.title .act .pmain'); await p.waitForTimeout(3500);
    const fh = await p.$('button:has-text("과 시작"), button:has-text("와 시작")'); if (fh) { await fh.click(); await p.waitForTimeout(1200); }
  };
  const inCamp = async (p) => !(await p.$('.title'));
  const errText = async (p) => ((await p.$eval('.title .err, .title [role="alert"], .title .msg', (x) => x.textContent).catch(() => '')) || '').trim();
  // 준비: 3번 가입(정식에서 옮긴 학생과 같은 꼴 = 이메일 · 비번 로그인) · 서버 💎 21
  const p0 = await phone(); await toTitle(p0); await enter(p0, 3, '1234', true); await rest('gem/1-3/3/total', 'PUT', 21); await rest('records/1-3/3/set-02', 'PUT', { at: 1, no: 2, mons: { m1: 'o' } });
  // ② 기억 없는 폰
  const p2 = await phone(); await toTitle(p2); await enter(p2, 3, '1234');
  ok('② 기억 없는 폰 → 4자리로 캠프', await inCamp(p2), `💎 21 보임 ${await p2.evaluate(() => document.body.innerText.includes('21'))}`);
  // ① 로그인 기억만 남은 폰 (세션 없음)
  const p1 = await phone(); await p1.goto(`${B}?${E}`); await p1.evaluate(() => localStorage.setItem('citadel-v1-login', JSON.stringify({ cls: '1-3', num: 3 }))); await p1.reload(); await p1.waitForTimeout(4500);
  const m1 = await p1.textContent('[data-k="relogin"]').catch(() => '');
  ok('① 기억만 남은 폰 → 첫 화면 + 「로그인 풀림」', !(await inCamp(p1)) && !!m1, m1.trim());
  await enter(p1, 3, '1234'); ok('① 다시 로그인 → 캠프 · 서버 💎', (await inCamp(p1)) && (await p1.evaluate(() => document.body.innerText.includes('21'))));
  // ⑤ 두 앱 (p0 · p2 · p1 모두 같은 계정) → 새로 고침해도 그대로
  for (const [k, p] of [['p0', p0], ['p2', p2]]) { await p.reload(); await p.waitForTimeout(4000); ok(`⑤ 같은 계정 다른 폰(${k}) 새로 고침 → 캠프 그대로`, await inCamp(p)); }
  // ④ 비밀번호 3번 틀림
  const p4 = await phone(); await toTitle(p4);
  let last = ''; for (let i = 0; i < 3; i++) { await enter(p4, 3, '9999'); last = await errText(p4); }
  ok('④ 3번 틀림 → 안내 · 들어가지 않음', !(await inCamp(p4)) && /비밀번호|선생님/.test(last), last);
  await p4.reload(); await p4.waitForTimeout(1500); await enter(p4, 3, '1234'); ok('④ 그다음 맞는 4자리 → 캠프', await inCamp(p4));
  // ③ 선생님 0000 초기화 (교사 화면 → 학생 시트)
  const t = await phone(); await t.goto(`${B}?role=teacher&${E}`); await t.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(t, '.tabs');
  await t.click('.tabs button:has-text("학생")'); await t.waitForTimeout(400); await t.click('.chips button:text-is("1-3")').catch(() => {}); await t.waitForTimeout(400);
  await t.click('.seg button:has-text("명단")').catch(() => {}); await t.waitForTimeout(300); await t.click('.pc[aria-label^="3번"]'); await t.waitForTimeout(500);
  t.on('dialog', (d) => d.accept()); const rb = await t.$('button:has-text("0000")'); if (rb) { await rb.click(); await t.waitForTimeout(400); const c2 = await t.$('.sheet button:has-text("0000"), button:has-text("초기화")'); if (c2) await c2.click().catch(() => {}); }
  await t.waitForTimeout(1200); const acc = await rest('accounts/1-3/3'); ok('③ 교사 0000 초기화 → 서버 표시(판 올림 · reset)', !!acc && acc.reset === true && Number(acc.g) >= 1, JSON.stringify({ g: acc && acc.g, reset: acc && acc.reset }));
  const p3 = await phone(); await toTitle(p3); await enter(p3, 3, '1234'); const m3 = await errText(p3);
  ok('③ 초기화 뒤 옛 4자리 → 「0000 으로」 안내', !(await inCamp(p3)) && /0000/.test(m3), m3);
  await p3.reload(); await p3.waitForTimeout(1500); await enter(p3, 3, '0000');
  const m3b = await errText(p3); ok('③ 0000 → 「새 비밀번호 4자리를 정해요」 (정식 그대로)', !(await inCamp(p3)) && /새 비밀번호/.test(m3b) && !!(await p3.$('[data-k="newpin"]')), m3b);
  for (const k of '0000') await p3.click(`.pad button:text-is("${k}")`); await p3.click('.title .act .pmain'); await p3.waitForTimeout(2500);
  ok('③ 새 비밀번호 0000 = 안 됨', !(await inCamp(p3)) && /0000 말고/.test(await errText(p3)), await errText(p3));
  await p3.click('[data-k="newpin"]'); for (const k of '5678') await p3.click(`.pad button:text-is("${k}")`); await p3.click('.title .act .pmain'); await p3.waitForTimeout(3500);
  { const fh = await p3.$('button:has-text("과 시작"), button:has-text("와 시작")'); if (fh) { await fh.click(); await p3.waitForTimeout(1200); } }
  ok('③ 새 4자리 → 캠프 · 기록 · 💎 그대로', (await inCamp(p3)) && (await p3.evaluate(() => document.body.innerText.includes('21'))), JSON.stringify({ reset: await rest('accounts/1-3/3/reset') }));
  const p3b = await phone(); await toTitle(p3b); await enter(p3b, 3, '0000'); ok('③ 다른 폰 · 0000 = 안 됨 (이미 새 비밀번호)', !(await inCamp(p3b)), await errText(p3b));
  await p3b.reload(); await p3b.waitForTimeout(1500); await enter(p3b, 3, '5678'); ok('③ 다른 폰 · 새 4자리 = 캠프', await inCamp(p3b));
  // 🔑 학생 스스로 비밀번호 바꾸기 (📜 2026-11-16 · ⚙ → 🔑) : 틀린 지금 비번 = 안내 · 맞으면 바뀜 → 다른 폰 새 4자리로
  await p3b.click('button.gear'); await p3b.waitForTimeout(400); await p3b.click('[data-k="pw-open"]'); await p3b.waitForTimeout(300);
  await p3b.fill('[data-k="pw-cur"]', '1111'); await p3b.fill('[data-k="pw-new"]', '2468'); await p3b.fill('[data-k="pw-new2"]', '2468'); await p3b.click('.sheet .act .pmain, .sheet button.pmain'); await p3b.waitForTimeout(2500);
  ok('🔑 지금 비번 틀림 = 안내', /지금 비밀번호가 달라요/.test((await p3b.textContent('[data-k="pw-msg"]').catch(() => '')) || ''));
  await p3b.fill('[data-k="pw-cur"]', '5678'); await p3b.click('.sheet .act .pmain, .sheet button.pmain'); await p3b.waitForTimeout(3000);
  ok('🔑 맞으면 바뀜 (창 닫힘)', !(await p3b.$('[data-k="pw-cur"]')));
  const p3c = await phone(); await toTitle(p3c); await enter(p3c, 3, '2468'); ok('🔑 다른 폰 · 새 비번 2468 = 캠프', await inCamp(p3c));
  // 옛 폰(p0)은 이제 다른 로그인 → 새로 고침하면 「로그인 풀림」 (정식도 초기화 뒤 다시 로그인)
  await p0.reload(); await p0.waitForTimeout(4500); log('   (참고) 초기화 전 로그인한 폰 새로 고침 →', (await inCamp(p0)) ? '캠프' : '첫 화면 · 다시 로그인');
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
