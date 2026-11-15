// 🗂 보관함 (에뮬레이터 · 📜 2026-11-15 머리 🔨 「읽은 것 = 받은 소식 → 보관함 · 학생 · 교사 · 읽음은 서버」)
//   🎒 ① 읽은 소식(서버 mseen 보다 앞) = 🗂 보관함 · 새 소식 = 받은 소식 ② 열고 닫으면 서버 accounts/1-3/3/mseen 이 지금으로 ③ 다시 열면 그 소식도 보관함 · 안 받은 🎁 선물은 받은 소식에 남음
//   👩‍🏫 ④ 소식 탭: 읽은 줄 = 🗂 보관함 · 안 읽은 줄 = 받은 것 ⑤ 누르면 읽음(서버) · 이 화면에선 그대로 · 다시 열면 보관함
const { chromium } = require('playwright');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/', E = 'emu=127.0.0.1', PID = 's1_3_3';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest('', 'PATCH', { roster: { '1-3': { 3: '시험삼' } }, rosterMask: { '1-3': { 3: '시*삼' } }, school: { inbox: { a1: { id: 'a1', kind: 'idea', title: '읽은 의견', sub: '1-3반', at: 1000, read: true }, b1: { id: 'b1', kind: 'idea', title: '새 의견', sub: '1-3반', at: 2000 } } } });
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const s = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); s.on('pageerror', (e) => errs.push(String(e))); s.setDefaultTimeout(15000);
  await s.goto(`${B}?${E}`); await s.waitForSelector('.title', { timeout: 20000 }); await s.waitForTimeout(800);
  await s.selectOption('select >> nth=0', '1-3'); await s.waitForTimeout(200); await s.selectOption('select >> nth=1', '3'); await s.waitForTimeout(300);
  if (!(await s.$('.pw:has(small)'))) await s.click('.lk:has-text("가입")');
  await s.click('.pw >> nth=0'); for (const k of '12341234') await s.click(`.pad button:text-is("${k}")`);
  await s.click('.title .act .pmain'); await s.waitForTimeout(3500);
  const fh = await s.$('button:has-text("과 시작"), button:has-text("와 시작")'); if (fh) { await fh.click(); await s.waitForTimeout(1200); }
  const now = Date.now();
  await rest('accounts/1-3/3/mseen', 'PUT', now - 5000);
  await rest(`mail/${PID}`, 'PATCH', { old1: { text: '지난주 메시지', at: now - 60000, kind: 'msg' }, new1: { text: '오늘 메시지', at: now, kind: 'msg' } });
  await rest(`gifts/${PID}/gold`, 'PUT', { g: 5, at: now - 90000, fun: '🎁 안 받은 선물' });
  await s.waitForTimeout(1200);
  const openBox = async () => { await s.$eval('[data-prop="mail"]', (e) => e.click()); await s.waitForSelector('[data-k="mailbox"]'); await s.waitForTimeout(600); };
  const rows = () => s.$$eval('[data-k="mailbox"] .mi b', (x) => x.map((e) => e.textContent.trim()));
  await openBox();
  let r = await rows(), bx = await s.textContent('[data-k="mail-box"]').catch(() => '');
  ok('① 받은 소식 = 오늘 메시지 · 안 받은 선물 / 🗂 보관함 = 지난주(서버 mseen 앞)', r.some((t) => /오늘 메시지/.test(t)) && r.some((t) => /안 받은 선물/.test(t)) && !r.some((t) => /지난주/.test(t)) && /보관함\s*1/.test(bx), `${r.join(' | ')} · ${bx}`);
  await s.click('[data-k="mail-box"]'); await s.waitForTimeout(300); r = await rows(); ok('🗂 보관함 펼침 = 지난주 메시지', r.some((t) => /지난주/.test(t)));
  await s.screenshot({ path: `${SHOTS}/archive-student.png` });
  await s.$eval('.sheet .x', (e) => e.click()); await s.waitForTimeout(800);
  const ms = Number(await rest('accounts/1-3/3/mseen')) || 0; ok('② 닫으면 서버 mseen = 지금', ms >= now, `${ms - now}ms`);
  await openBox(); r = await rows(); bx = await s.textContent('[data-k="mail-box"]').catch(() => '');
  ok('③ 다시 열면 오늘 메시지도 보관함 · 안 받은 선물은 받은 소식', !r.some((t) => /오늘 메시지/.test(t)) && r.some((t) => /안 받은 선물/.test(t)) && /보관함\s*2/.test(bx), `${r.join(' | ')} · ${bx}`);
  // 👩‍🏫
  const t = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); t.on('pageerror', (e) => errs.push(String(e)));
  await t.goto(`${B}?role=teacher&${E}`); await t.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(t, '.tabs');
  await t.click('.tabs button:has-text("소식")'); await t.waitForTimeout(800);
  const tl = () => t.$$eval('.nw .nb b', (x) => x.map((e) => e.textContent.trim()));
  let L = await tl(); ok('④ 받은 것 = 새 의견만', L.includes('새 의견') && !L.includes('읽은 의견'), L.join(' | '));
  await t.click('.nw .nb:has-text("새 의견")'); await t.waitForTimeout(500);
  ok('⑤ 누르면 서버 read · 화면에선 그대로', (await rest('school/inbox/b1/read')) === true && (await tl()).includes('새 의견'));
  await t.click('[data-k="news-box"]'); await t.waitForTimeout(400); L = await tl(); ok('④ 🗂 보관함 = 읽은 의견', L.includes('읽은 의견'), L.join(' | '));
  await t.screenshot({ path: `${SHOTS}/archive-teacher.png` });
  await t.reload(); await t.waitForSelector('.tabs'); await t.waitForTimeout(1500); await t.click('.tabs button:has-text("소식")'); await t.waitForTimeout(800);
  L = await tl(); ok('⑤ 다시 열면 새 의견도 보관함으로 (받은 것에 없음)', !L.includes('새 의견'), L.join(' | '));
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
