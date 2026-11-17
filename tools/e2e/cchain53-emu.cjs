// 🏰 #53 성채 서술형 소레이드 (에뮬레이터 · 실제 학생 로그인 · 새 성채 팩 2 · 3층)
//   ① 2층 10 카드 「⚔ 소레이드 · 5단계」 · 들어가면 단계 1 / 5 · 단계 글 맨 위에 문제 전체 · 「✍ 서술형」 단추(단계 중간)
//   ② 첫 단계 맞힘 → 「나의 풀이」 줄 + 💡 근거 줄(∵ …) ③ 3층 17 👑 = 5단계 · 서술형 단추 ④ 옛 처치 기록(2층 07) = 「✔ 처치 · 📷 서술형 남음」 그대로
const { chromium } = require('playwright');
const { rest } = require('./_emu.cjs');
const R = require('../../src/subjects/common-math2/rubrics.json'), P2 = require('../pack-upload/castle/eval-2.json'), P3 = require('../pack-upload/castle/eval-3.json');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/?emu=127.0.0.1';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  const open3 = Object.fromEntries(P3.rooms.map((r) => [r.id, true])), open2 = Object.fromEntries(P2.rooms.map((r) => [r.id, true]));
  const clr = Object.fromEntries(P3.rooms.filter((r) => !r.boss && !/q1[5-7]/.test(r.id)).map((r) => [r.id, { clear: true, tries: 1, at: 1 }]));
  await rest('', 'PATCH', { roster: { '1-3': { 3: '시험삼' } }, rosterMask: { '1-3': { 3: '시*삼' } }, school: { features: { bundle: 'full', on: { hero: true, scarecrow: true, citadel: true } }, castleOpen: { 'eval-2': { '1-3': open2 }, 'eval-3': { '1-3': open3 } } },
    gcfg: { photo: { on: true, url: 'https://example.invalid/exec', daily: 6, room: 2, cool: 30 } },
    photo_rubric: { 'eval-2': { q07: { ...R['eval-2'].q07, on: true }, q10: { ...R['eval-2'].q10, on: true } }, 'eval-3': { q17: { ...R['eval-3'].q17, on: true } } },
    prep: { addons: { castle: { 'eval-2': P2, 'eval-3': P3 } } }, bonus: { '1-3': { 3: { 'eval-2': { q07: { clear: true, tries: 2, at: 1 } }, 'eval-3': clr } } } });
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const s = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); s.on('pageerror', (e) => errs.push(String(e)));
  await s.goto(B); await s.waitForSelector('.title', { timeout: 20000 }); await s.waitForTimeout(800);
  await s.selectOption('select >> nth=0', '1-3'); await s.waitForTimeout(200); await s.selectOption('select >> nth=1', '3'); await s.waitForTimeout(300);
  if (!(await s.$('.pw:has(small)'))) await s.click('.lk:has-text("가입")');
  await s.click('.pw >> nth=0'); for (const k of '12341234') await s.click(`.pad button:text-is("${k}")`);
  await s.click('.title .act .pmain'); await s.waitForTimeout(3500);
  const fh = await s.$('button:has-text("과 시작"), button:has-text("와 시작")'); if (fh) { await fh.click(); await s.waitForTimeout(1200); }
  const toCastle = async (fl) => {
    for (let k = 0; k < 3 && (await s.$('.sheet .x')); k++) { await s.$eval('.sheet .x', (e) => e.click()).catch(() => {}); await s.waitForTimeout(400); }
    if (!(await s.$('[data-k="castle"]'))) { await s.click('button[aria-label="성채"]'); await s.waitForTimeout(500); await s.click('.sheet button:has-text("성채 들어가기")'); await s.waitForSelector('[data-k="castle"]'); }
    await s.waitForSelector(`[data-floor="${fl}"]`, { timeout: 8000 }); await s.click(`[data-floor="${fl}"]`); await s.waitForSelector('[data-k="castle-sum"]'); await s.waitForTimeout(500);
  };
  const card = (r) => s.$eval(`[data-room="${r}"]`, (e) => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');
  await toCastle('eval-2');
  const c7 = await card('q07'); ok('④ 옛 처치 2층 07 = 「✔ 처치 · 📷 서술형 남음」 그대로', /✔ 처치 · 📷 서술형 남음/.test(c7), c7);
  const info = await card('q10');
  ok('① 2층 10 카드 = 「⚔ 소레이드 · 5단계」', /⚔ 소레이드 · 5단계/.test(info), info);
  await s.screenshot({ path: `${SHOTS}/cchain53-list.png` });
  await s.click('[data-room="q10"]'); await s.waitForSelector('[data-castle-run]', { timeout: 15000 }); await s.waitForTimeout(2500);
  const run = (await s.textContent('[data-castle-run]')) || '';
  ok('① 단계 글 맨 위에 문제 전체(「10 실수 x 에 대하여 … (가) … (나)」)', /10 실수 x 에 대하여[\s\S]*\(가\)[\s\S]*\(나\)/.test(run));
  ok('① 「✍ 서술형」 단추 = 단계 중간(첫 단계)', !!(await s.$('[data-k="castle-wr"]')));
  await s.screenshot({ path: `${SHOTS}/cchain53-run.png` });
  const want = P2.rooms.find((r) => r.id === 'q10').vers[0][0]; const right = want.ch[Number(want.a)];
  const btn = s.locator('button', { hasText: right }).first(); await btn.click(); await s.waitForTimeout(300);
  const atk = s.locator('button.pmain').last(); await atk.click(); await s.waitForTimeout(2500);
  const after = (await s.textContent('[data-castle-run]')) || '';
  ok('② 첫 단계 맞힘 → 💡 근거 줄 「∵ … 부정은 「모든 x 에 대하여 ~p」」', /∵ 「어떤 x 에 대하여 p」의 부정은/.test(after), after.match(/∵[^\n]{0,40}/)?.[0] || '');
  await s.screenshot({ path: `${SHOTS}/cchain53-why.png` });
  await s.click('.quit, [aria-label="그만하기"]').catch(() => {}); await s.waitForTimeout(800);
  for (let k = 0; k < 3 && (await s.$('.sheet .x')); k++) { await s.$eval('.sheet .x', (e) => e.click()).catch(() => {}); await s.waitForTimeout(400); }
  await toCastle('eval-3');
  const c17 = await card('q17'); ok('③ 3층 17 👑 카드 = 「⚔ 소레이드 · 5단계」', /소레이드 · 5단계/.test(c17), c17);
  await s.click('[data-room="q17"]'); await s.waitForSelector('[data-castle-run]', { timeout: 15000 }); await s.waitForTimeout(2500);
  ok('③ 3층 17 들어감 · 「✍ 서술형」 단추', !!(await s.$('[data-k="castle-wr"]')));
  await s.screenshot({ path: `${SHOTS}/cchain53-q17.png` });
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
