// 🏆 #68 도전과제 판 (에뮬레이터 · 1-6 시험 학생): 옛 기록 = 「받기」로 뜸 · 받기 = 💎 한 번(하루 한도 밖 · log chal_) · 두 번 눌러도 한 번 · 📜 · 칭호
const { chromium } = require('playwright');
const { rest } = require('./_emu.cjs');
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
  // 옛 기록: 성채 방 처치 · 1층 👑 · 예습 1 · 복습 처치
  await rest('bonus/1-6/1', 'PATCH', { 'eval-1': { q01: { clear: true, tries: 1, at: 1 }, q12: { clear: true, tries: 1, at: 1 } }, 'set-02': { m1: { clear: true, tries: 2, at: 1 } }, review: { 'prep_set-10': { m1: { tries: 1, clear: true, at: 1 } } } });
  await s.reload(); await s.waitForTimeout(4000); await s.waitForSelector('[data-k="chal-go"]', { timeout: 15000 });
  const n = ((await s.textContent('[data-k="chal-n"]').catch(() => '')) || '').trim();
  ok('캠프 🏆 빨간 숫자 = 받을 것 (옛 기록)', Number(n) >= 4, n);
  const g0 = await rest('gem/1-6/1'), tot0 = Number(g0?.total) || 0, sc0 = Number(g0?.scroll) || 0, day0 = JSON.stringify(g0?.day || {});
  await s.click('[data-k="chal-go"]'); await s.waitForSelector('[data-k="chal"]', { timeout: 10000 }); await s.waitForTimeout(500);
  await s.screenshot({ path: `${SHOTS}/chal68-board.png` });
  ok('성채의 문 = 「🎁 받기」', !!(await s.$('[data-chal="castle1"] [data-k="chal-take"]')));
  ok('아직 못 한 과제도 보임 (꾸준한 복습 n / 30)', /\d+ \/ 30/.test((await s.textContent('[data-chal="review30"]')) || ''));
  await s.click('[data-chal="castle1"] [data-k="chal-take"]'); await s.waitForTimeout(150);
  await s.click('[data-chal="castle1"] [data-k="chal-take"]').catch(() => {}); // 두 번 눌러도
  await s.waitForTimeout(1500);
  const g1 = await rest('gem/1-6/1');
  ok('💎 +20 한 번만', (Number(g1?.total) || 0) - tot0 === 20, `${tot0}→${g1?.total}`);
  ok('하루 한도(day) 그대로', JSON.stringify(g1?.day || {}) === day0);
  ok('log chal_castle1 = g 20', g1?.log?.chal_castle1?.g === 20, JSON.stringify(g1?.log?.chal_castle1));
  ok('받은 뒤 = ✔ 받음', /받음/.test((await s.textContent('[data-chal="castle1"]')) || ''));
  await s.click('[data-chal="floor1"] [data-k="chal-take"]'); await s.waitForTimeout(1200);
  const g2 = await rest('gem/1-6/1');
  ok('1층의 왕 = 📜 +1', (Number(g2?.scroll) || 0) - sc0 === 1, `${sc0}→${g2?.scroll}`);
  await s.click('[data-chal="prep1"] [data-k="chal-take"]'); await s.waitForTimeout(1200);
  ok('한 발 앞서 = 칭호만 (💎 그대로)', (Number((await rest('gem/1-6/1'))?.total) || 0) === (Number(g2?.total) || 0) && !!(await rest('gem/1-6/1/log/chal_prep1')));
  await s.screenshot({ path: `${SHOTS}/chal68-after.png` });
  await s.reload(); await s.waitForTimeout(3500); await s.$eval('[data-k="chal-go"]', (e) => e.click()); await s.waitForSelector('[data-k="chal"]'); await s.waitForTimeout(400);
  ok('다시 열어도 받음 그대로 · 받기 단추 없음', !(await s.$('[data-chal="castle1"] [data-k="chal-take"]')) && !(await s.$('[data-chal="floor1"] [data-k="chal-take"]')));
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close(); process.exit(errs.length ? 1 : 0);
})();
