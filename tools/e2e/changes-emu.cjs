// 🆕 바뀐 것 알림 (에뮬레이터 · 📜 2026-11-15 · ?chan=rel = 시험 주소에서 정식 꼴)
//   👩‍🏫 ① 정식 첫 로그인 = 아래 창(이번 판만) · 확인했어요 ② 두 번째 기기(같은 계정) = 창 없음 ③ 판 건너뛰기(본 판 b204) = 창에 b207 · b206 · b205 + 소식 탭 한 통씩
//      ④ 베타 = 창 없음 · 소식 탭 「🧪 [베타 …]」 한 통 · 다시 열어도 같은 판 두 번 X · 정식 본 판과 따로 ⑤ 「나」 → 📜 바뀐 것
//   🎒 ⑥ 정식 학생 캠프 = 「🆕 새 소식」 한 번 · 알았어요 → 다시 안 뜸 · 우편함 「📢 새 소식」 ⑦ 판 건너뛰기 = 묶어 최대 5줄 ⑧ 베타 학생 = 안 뜸
const { chromium } = require('playwright');
const { rest } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/', E = 'emu=127.0.0.1';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' });
  await rest('', 'PATCH', { roster: { '1-3': { 3: '시험삼' } }, rosterMask: { '1-3': { 3: '시*삼' } } });
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const build = (await (await fetch(`${B}version.json`)).json()).build;
  const teacher = async (make, q = '&chan=rel') => {
    const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(`${B}?role=teacher${q}&${E}`); await p.waitForSelector('.tgate', { timeout: 20000 });
    await p.fill('.tgate .fld.tid', 'kim01'); await p.fill('.tgate .fld[type=password]', 'pw123456'); await p.click(make ? '.tgate .lk' : '[data-k="gate-go"]');
    await p.waitForTimeout(2500); await p.waitForSelector('.tabs', { timeout: 20000 }); await p.waitForTimeout(1200); return p;
  };
  const vers = (p) => p.$$eval('[data-k="changes"] [data-ver]', (x) => x.map((e) => e.dataset.ver)).catch(() => []);
  const okBtn = (p) => p.$eval('.sheet .pmain', (e) => e.click());
  // ① 정식 첫 로그인
  const A = await teacher(true);
  const uid = await A.evaluate(() => window.__uid && window.__uid());
  let v = await vers(A); ok('① 정식 첫 교사 로그인 = 아래 창 · 이번 판만', v.length === 1 && v[0] === build, v.join(','));
  await A.screenshot({ path: `${SHOTS}/changes-teacher.png` });
  await okBtn(A); await A.waitForTimeout(800);
  ok('① 확인했어요 → 본 판 = 지금 판', (await rest(`school/teacher/seen/${uid}/rel`)) === build);
  // ② 두 번째 기기
  const B2 = await teacher(false); v = await vers(B2); ok('② 두 번째 기기(같은 계정) = 창 없음', v.length === 0, v.join(','));
  // ③ 판 건너뛰기
  await rest(`school/teacher/seen/${uid}/rel`, 'PUT', 'b204'); await A.reload(); await A.waitForSelector('.tabs'); await A.waitForTimeout(1500);
  v = await vers(A); ok('③ 판 건너뛰기(본 판 b204) = 못 본 판 모두 · 최신부터', v.join(',') === Array.from({ length: Number(build.slice(1)) - 204 }, (_, k) => `b${Number(build.slice(1)) - k}`).join(','), v.join(','));
  await A.screenshot({ path: `${SHOTS}/changes-skip.png` });
  await okBtn(A); await A.waitForTimeout(600);
  const inbox = Object.keys((await rest('school/inbox')) || {}).filter((k) => k.startsWith('news_'));
  ok('③ 소식 탭 = 판마다 한 통 (정식)', ['b205', 'b206', 'b207'].every((x) => Number(x.slice(1)) > Number(build.slice(1)) || inbox.includes(`news_rel_${x}`)), inbox.join(','));
  // ④ 베타
  const Bt = await teacher(false, ''); v = await vers(Bt);
  const ib1 = Object.keys((await rest('school/inbox')) || {}).filter((k) => k.startsWith('news_beta_'));
  ok('④ 베타 = 창 없음 · 소식 탭 「🧪 베타」 한 통 · 본 판(베타) 따로', v.length === 0 && ib1.length === 1 && (await rest(`school/teacher/seen/${uid}/beta`)) === build && (await rest(`school/teacher/seen/${uid}/rel`)) === build, `${ib1.join(',')}`);
  await Bt.click('.tabs button:has-text("소식")'); await Bt.waitForTimeout(500); await Bt.click('.nb:has-text("베타")').catch(() => {}); await Bt.waitForTimeout(400);
  await Bt.screenshot({ path: `${SHOTS}/changes-beta-inbox.png` });
  await Bt.reload(); await Bt.waitForSelector('.tabs'); await Bt.waitForTimeout(1200);
  ok('④ 베타 다시 열기 = 같은 판 두 번 X', Object.keys((await rest('school/inbox')) || {}).filter((k) => k.startsWith('news_beta_')).length === 1);
  // ⑤ 나 → 📜 바뀐 것
  await Bt.click('.tabs button:has-text("나")'); await Bt.waitForTimeout(300); await Bt.click('[data-k="changes"]'); await Bt.waitForTimeout(500);
  v = await vers(Bt); ok('⑤ 「나」 → 📜 바뀐 것 = 지난 판 다시 보기', v.length >= 10 && v[0] === build, `${v.length}판`);
  // 🎒 학생
  const stu = async (q) => {
    const s = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); s.on('pageerror', (e) => errs.push(String(e)));
    await s.goto(`${B}?${q}${E}`); await s.waitForSelector('.title', { timeout: 20000 }); await s.waitForTimeout(800);
    await s.selectOption('select >> nth=0', '1-3'); await s.waitForTimeout(200); await s.selectOption('select >> nth=1', '3'); await s.waitForTimeout(300);
    if (!(await s.$('.pw:has(small)'))) await s.click('.lk:has-text("가입")');
    const join = !!(await s.$('.pw:has(small)'));
    await s.click('.pw >> nth=0'); for (const k of join ? '12341234' : '1234') await s.click(`.pad button:text-is("${k}")`);
    await s.click('.title .act .pmain'); await s.waitForTimeout(3500);
    const fh = await s.$('button:has-text("과 시작"), button:has-text("와 시작")'); if (fh) { await fh.click(); await s.waitForTimeout(1500); }
    return s;
  };
  const lines = (s) => s.$$eval('[data-k="stu-news"] li', (x) => x.map((e) => e.textContent.trim())).catch(() => []);
  const S1 = await stu('chan=rel&'); await S1.waitForTimeout(1500);
  let l = await lines(S1); ok('⑥ 정식 학생 캠프 = 「🆕 새 소식」 (이번 판 학생 줄)', l.length >= 1 && l.length <= 5, l.join(' | '));
  await S1.screenshot({ path: `${SHOTS}/changes-student.png` });
  await S1.$eval('.sheet .pmain', (e) => e.click()); await S1.waitForTimeout(800);
  ok('⑥ 알았어요 → 본 판 · 우편함 「📢 새 소식」', (await rest('accounts/1-3/3/seen')) === build && Object.keys((await rest('mail/s1-3_3')) || (await rest('mail')) || {}).length > 0);
  await S1.reload(); await S1.waitForTimeout(4500); l = await lines(S1); ok('⑥ 다시 열기 = 안 뜸', l.length === 0, l.join(' | '));
  await rest('accounts/1-3/3/seen', 'PUT', 'b204'); await S1.reload(); await S1.waitForTimeout(4500); l = await lines(S1);
  ok('⑦ 판 건너뛰기 = 묶어 최대 5줄', l.length >= 2 && l.length <= 5, `${l.length}줄`);
  await S1.$eval('.sheet .pmain', (e) => e.click()).catch(() => {});
  await rest('accounts/1-3/3/seen', 'PUT', 'b204'); const S2 = await stu(''); await S2.waitForTimeout(1500); l = await lines(S2);
  ok('⑧ 베타 학생 = 안 뜸', l.length === 0, l.join(' | '));
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
