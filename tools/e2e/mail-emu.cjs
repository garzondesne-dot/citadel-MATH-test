// 📮 학생 우편함 켜기 (에뮬레이터 · 정식 mail.js 옮김 · b202): 학생 1-3 · 3번 캠프 → 그 뒤에 온 🎁 선물 · ✉ 메시지(💎 붙음) · 📢 공지
//   → 📮 빨간 숫자 → 우편함 = 최근 순 4줄(공지 · 메시지 · 선물 · 옛 답장) · 「받기」 → 💎 · got · 두 번 못 받음 → 닫으면 빨간 숫자 0 → 새로 고침해도 0 (선물 두 번 안 들어옴)
//   + 교사 「소식 → 보내기」 반 전체 메시지 = 그 반 학생 우편함에 공지 + 메시지
const { chromium } = require('playwright');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/', E = 'emu=127.0.0.1', PID = 's1_3_3';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest('', 'PATCH', { roster: { '1-3': { 3: '시험삼' } }, rosterMask: { '1-3': { 3: '시*삼' } }, mail: { [PID]: { fbr_old: { text: '버그 알려 줘서 고마워', g: 0, at: 1000, kind: 'reply', q: '버그', got: true } } } });
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a);
  const s = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); s.on('pageerror', (e) => errs.push(String(e))); s.setDefaultTimeout(15000);
  await s.goto(`${B}?${E}`); await s.waitForSelector('.title', { timeout: 20000 }); await s.waitForTimeout(800);
  await s.selectOption('select >> nth=0', '1-3'); await s.waitForTimeout(200); await s.selectOption('select >> nth=1', '3'); await s.waitForTimeout(300);
  if (!(await s.$('.pw:has(small)'))) await s.click('.lk:has-text("가입")');
  await s.click('.pw >> nth=0'); for (const k of '12341234') await s.click(`.pad button:text-is("${k}")`);
  await s.click('.title .act .pmain'); await s.waitForTimeout(3500);
  const fh = await s.$('button:has-text("과 시작"), button:has-text("와 시작")'); if (fh) { await fh.click(); await s.waitForTimeout(1200); }
  const pid = await s.evaluate(() => (window.__uid ? null : null)); void pid;
  // 📮 안 읽은 수 = 이름표 빨간 숫자 · 🏕 캠프 A(b207) 뒤로는 말풍선 「소식 n」
  //   📜 #72 뒤 = 이름표 빨간 배지 [data-k="cnt-mail"] (없으면 0)
  const dot = async () => (await s.$eval('[data-k="cnt-mail"], [data-prop="mail"] .dot, [data-prop="mail"] .bub', (x) => (x.textContent.match(/\d+/) || ['0'])[0]).catch(() => '0'));
  log('① 캠프 처음 📮 숫자:', await dot(), '(옛 답장 = 처음 연 적 없으니 안 읽음 1)');
  // 캠프에 들어온 뒤 온 소식 (캠프 받기 = 들어올 때 한 번 → 이건 「받기」 단추로)
  const now = Date.now();
  await rest(`gifts/${PID}/fg_new`, 'PUT', { g: 3, at: now, fun: '🎁 7번 선물 · 힘내!', from: 'release' });
  await rest(`gifts/${PID}/${now}_abc0m`, 'PUT', { g: 10, at: now + 1, code: 'mail', mail: true });
  await rest(`mail/${PID}/${now}_abc0`, 'PUT', { text: '이번 주 잘했어요', g: 10, at: now + 1, kind: 'msg' });
  await rest('school/notice/1-3/' + (now + 2), 'PUT', { text: '월요일 형성평가', at: now + 2 });
  await s.waitForTimeout(1500);
  const d1 = await dot(); log('② 소식 온 뒤 📮 숫자:', d1); if (Number(d1) < 3) errs.push('빨간 숫자');
  await s.screenshot({ path: `${SHOTS}/mail-dot.png` });
  const g0 = Number(await rest('gem/1-3/3/total')) || 0;
  await s.click('[data-prop="mail"]'); await s.waitForSelector('[data-k="mailbox"]'); await s.waitForTimeout(400);
  const rows = await s.$$eval('[data-k="mailbox"] [data-mail]', (x) => x.map((e) => `${e.dataset.mail}${e.classList.contains('unread') ? '*' : ''}`)); log('③ 우편함 줄:', rows.join(' '));
  if (rows.slice(0, 4).join(' ') !== 'notice* msg* gift* reply*') errs.push('줄 순서 · 안 읽음');
  await s.screenshot({ path: `${SHOTS}/mail-box.png` });
  await s.click('[data-claim="fg_new"]'); await s.waitForTimeout(800);
  const t = await s.textContent('[data-k="mailbox"] .toast').catch(() => ''); const got = await rest(`gifts/${PID}/fg_new/got`);
  await s.waitForTimeout(1200); const g1 = Number(await rest('gem/1-3/3/total')) || 0;
  log('④ 받기 →', t.trim(), '| got', got, '| 💎', g0, '→', g1, '| 받기 단추 남음', !!(await s.$('[data-claim="fg_new"]')));
  if (got !== true || !(await s.$('[data-claim="fg_new"]')) === false) errs.push('받기');
  await s.click('.sheet .x'); await s.waitForTimeout(500);
  const d2 = await dot(); log('⑤ 닫은 뒤 📮 숫자:', d2); if (d2 !== '0') errs.push('읽음');
  await s.reload(); await s.waitForTimeout(4000);
  const g2 = Number(await rest('gem/1-3/3/total')) || 0, d3 = await dot();
  log('⑥ 새로 고침 → 📮', d3, '| 💎', g1, '→', g2, '(선물 두 번 안 들어옴)'); if (d3 !== '0' || g2 !== g1) errs.push('새로 고침 뒤');
  // 교사 = 소식 → 보내기 → 1-3 반 전체 메시지
  const tp = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); tp.on('pageerror', (e) => errs.push(String(e))); tp.on('dialog', (d) => d.accept());
  await tp.goto(`${B}?role=teacher&${E}`); await tp.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(tp, '.tabs');
  await tp.click('.tabs button:has-text("소식")'); await tp.waitForTimeout(400); await tp.click('.seg button:has-text("보내기")'); await tp.waitForTimeout(400);
  await tp.selectOption('select >> nth=0', '1-3').catch(() => {}); await tp.fill('textarea >> nth=0', '내일 준비물: 학습지'); await tp.waitForTimeout(200);
  await tp.click('button:has-text("보내기 · 1-3반")'); await tp.waitForTimeout(1500);
  const d4 = await dot(); log('⑦ 교사 반 전체 메시지 → 학생 📮', d4); if (Number(d4) < 1) errs.push('교사 보내기 → 빨간 숫자');
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
