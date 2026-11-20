// 🔥 모닥불 친구 (📜 2026-11-20) · 에뮬레이터 = 새 규칙(campfire · campHi) · 같은 반 학생 둘
//   1-3 · 1번 · 2번 가입 → 2번 캠프 = 그루터기에 1번 친구 · 누르면 카드(이름 · 스킬) · 👋 보내기 · 같은 날 또 = 막힘
//   1번 캠프 다시 = 「🔥 ○○가 놀러 왔어요! 👋」 띠 + 용사 카드 👋 1 · 교사 ⚙ 모닥불 친구 끔 = 그루터기 빔
//   사용: (1) cd firebase && firebase emulators:start --only database,auth --project demo-citadel-test (2) 빌드 · vite preview (3) NODE_PATH=$(npm root -g) node tools/e2e/campfire-emu.cjs <폴더>
//   ⚠ 에뮬레이터 자료를 처음에 비움 (실제 서버 아님 · 127.0.0.1)
const { chromium } = require('playwright');
const { rest } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/', E = 'emu=127.0.0.1';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest('', 'PATCH', { roster: { '1-3': { 1: '가나다', 2: '라마바' } }, rosterMask: { '1-3': { 1: '가*다', 2: '라*바' } } });
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
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
  const closeSheets = async (p) => { for (let i = 0; i < 4 && (await p.$('.sheet .x')); i++) { await p.click('.sheet .x').catch(() => {}); await p.waitForTimeout(300); } };
  const s1 = await login('1-3', 1); await closeSheets(s1);
  await rest('accounts/1-3/1/hero', 'PUT', 18); await rest('accounts/1-3/1/socket', 'PUT', { 18: 'claw' });
  const s2 = await login('1-3', 2); await closeSheets(s2); await s2.reload(); await s2.waitForTimeout(4000); await closeSheets(s2);
  const fr = await s2.$$eval('[data-k="cf-friend"]', (x) => x.map((e) => e.dataset.num));
  ok('2번 캠프 그루터기 = 같은 반 1번 친구', fr.join() === '1', fr.join());
  ok('2번 내 모닥불 칸 씀(오늘)', !!(await rest('campfire/1-3/2/day')), JSON.stringify(await rest('campfire/1-3/2')));
  await s2.click('[data-k="cf-friend"]'); await s2.waitForTimeout(500);
  const card = ((await s2.textContent('[data-k="cf-card"]').catch(() => '')) || '').replace(/\s+/g, ' ');
  ok('카드 = 녹스 · 스킬', /녹스/.test(card), card);
  const title = ((await s2.textContent('.sheet .t').catch(() => '')) || '');
  ok('카드 이름 = 가린 이름(가*다)', /가\*다/.test(title), title);
  await s2.click('[data-hi="👋"]'); await s2.waitForTimeout(800);
  ok('👋 보냄', /보냈어요/.test((await s2.textContent('[data-k="cf-note"]')) || '') && (await rest('campHi/1-3/1/2/e')) === '👋');
  ok('같은 날 또 = 단추 꺼짐', await s2.$eval('[data-hi="🔥"]', (e) => e.disabled));
  await s2.screenshot({ path: `${SHOTS}/cf-card.png` });
  await s1.reload(); await s1.waitForTimeout(4500);
  const band = (await s1.textContent('[data-k="cf-band"]').catch(() => '')) || '';
  ok('1번 캠프 = 「🔥 라*바가 놀러 왔어요! 👋」 띠', /라\*바가 놀러 왔어요! 👋/.test(band), band);
  ok('1번 용사 카드 👋 1', /👋 1/.test((await s1.textContent('[data-k="cf-hi"]').catch(() => '')) || ''));
  await s1.screenshot({ path: `${SHOTS}/cf-band.png` });
  await s1.reload(); await s1.waitForTimeout(4000);
  ok('띠 = 한 번만 (다시 들어오면 없음)', !(await s1.$('[data-k="cf-band"]')));
  await rest('school/features', 'PUT', { bundle: 'full', on: { campfire: false } }); await s2.reload(); await s2.waitForTimeout(4000);
  ok('교사 ⚙ 모닥불 친구 끔 = 그루터기 빔', (await s2.$$('[data-k="cf-friend"]')).length === 0);
  // 규칙 게시 전 (campfire · campHi 칸이 없는 규칙) = 친구 앉기 · 카드만 · 인사 단추 없음 · 깨지지 않음
  const R = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '../../firebase/database.rules.json'), 'utf8')); delete R.rules.campfire; delete R.rules.campHi;
  const putRules = (r) => fetch('http://127.0.0.1:9000/.settings/rules.json?ns=demo-citadel-test-default-rtdb', { method: 'PUT', headers: { Authorization: 'Bearer owner' }, body: JSON.stringify(r) });
  await putRules(R); await rest('school/features', 'PUT', null); await s2.reload(); await s2.waitForTimeout(4500); await closeSheets(s2);
  ok('게시 전 = 친구 그대로 앉음', (await s2.$$('[data-k="cf-friend"]')).length === 1);
  await s2.click('[data-k="cf-friend"]'); await s2.waitForTimeout(600);
  ok('게시 전 = 카드 있음 · 인사 단추 없음', !!(await s2.$('[data-k="cf-card"]')) && !(await s2.$('[data-hi]')));
  await putRules(JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '../../firebase/database.rules.json'), 'utf8')));
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
