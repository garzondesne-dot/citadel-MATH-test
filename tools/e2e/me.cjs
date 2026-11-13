// #141 학생 기록 = 시험 서버 정식 경로 (에뮬레이터 · 창마다 저장 따로)
//   폰 A 가입(1-3반 1번) → 서버 gem/1-3/1 · xp · accounts 용사 칸 생김 → 선생님 선물 💎 10 → 캠프에서 받음 → 서버 💎 +10
//   폰 B(다른 기기) 같은 계정 로그인 → 캠프 💎 = 폰 A 와 같음 → 교사 🧪 6차시 열기 → 폰 B 입장 → 마무리 → 서버 records/1-3/1/set-06
//   ?as 시험 폰 = 서버 기록 칸을 쓰지 않음(이 기기)
// 사용: 에뮬레이터 + npm run build → npx vite preview --port 4173 → NODE_PATH=$(npm root -g) node tools/e2e/me.cjs <그림 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
const B = 'http://localhost:4173/', E = 'emu=127.0.0.1', NS = 'demo-citadel-test-default-rtdb';
const rest = (path, method = 'GET', body) => fetch(`http://127.0.0.1:9000/${path}.json?ns=${NS}`, { method, headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }).then((r) => r.json());
const log = (...a) => console.log(...a);
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  const W = {}; for (let d = 1; d <= 5; d++) { W[d] = {}; for (let q = 1; q <= 7; q++) W[d][q] = '1-3'; }
  await rest('school/sched', 'PUT', W);
  const b = await chromium.launch(), errs = [];
  const open = async (url) => { const ctx = await b.newContext({ viewport: { width: 360, height: 640 } }); const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(`${url}: ${e}`)); await p.goto(B + url); return p; };
  const enter = async (p, cls, num, join) => {
    await p.waitForSelector('select'); await p.selectOption('select >> nth=0', cls); await p.waitForTimeout(200); await p.selectOption('select >> nth=1', String(num)); await p.waitForTimeout(250);
    if (join) await p.click('.links button:has-text("가입")');
    await p.click('button.pw >> nth=0'); for (const d of '1234') await p.click(`.pad .keys button:has-text("${d}")`);
    await p.waitForTimeout(150); if (join && (await p.$('.pad'))) for (const d of '1234') await p.click(`.pad .keys button:has-text("${d}")`);
    await p.click('.title .pmain'); await p.waitForTimeout(2500);
  };
  const gemText = (p) => p.$eval('.pill', (x) => x.textContent.trim()).catch(() => '?');
  // 폰 A 가입
  const a = await open(`?${E}`); await enter(a, '1-3', 1, true);
  const g0 = await rest('gem/1-3/1'), acc0 = await rest('accounts/1-3/1');
  log('가입 → 서버 gem/1-3/1:', JSON.stringify(g0), '| accounts:', JSON.stringify(acc0), '| 캠프 💎', await gemText(a));
  if (!g0 || g0.total == null || acc0.hero == null) errs.push('가입 뒤 서버 기록 칸 없음');
  // 선생님 선물 → 캠프에서 받음
  await rest('gifts/s1_3_1/t1', 'PUT', { g: 10, at: Date.now(), code: 'x' });
  await a.reload(); await a.waitForTimeout(2500);
  const g1 = await rest('gem/1-3/1'); log('선물 💎 10 받음 → 서버 total', g0.total, '→', g1.total, '| 캠프', await gemText(a));
  if (g1.total !== g0.total + 10) errs.push('선물이 서버 💎 에 안 들어감');
  // 폰 B = 다른 기기 · 같은 계정
  const bp = await open(`?${E}`); await enter(bp, '1-3', 1, false);
  const gb = await gemText(bp); log('폰 B 로그인 → 캠프 💎', gb, '(폰 A', await gemText(a), ')');
  if (!gb.includes(String(g1.total).replace(/\B(?=(\d{3})+(?!\d))/g, ',')) && !gb.includes(String(g1.total))) errs.push(`다른 기기 💎 다름: ${gb}`);
  await bp.screenshot({ path: `${SHOTS}/b25-phoneB-camp.png` });
  // 교사 🧪 6차시 → 폰 B 입장 → 마무리 → records
  const t = await open(`?role=teacher&${E}`); await t.waitForSelector('.tabs', { timeout: 20000 }); await require('./_emu.cjs').asAdmin(t, '.tabs'); // 🔐 #163-① 교사 = admins
  await t.click('[data-cls="1-3"]'); await t.click('.pk3 .pk:has-text("6차시")'); await t.click('.sub2 button:has-text("테스트")'); await t.waitForTimeout(1500);
  await bp.waitForFunction(() => { const g = document.querySelector('.act .btn'); return g && !g.disabled; }, null, { timeout: 10000 }); await bp.click('.act .btn'); await bp.waitForTimeout(2500);
  const main = async () => { await t.waitForSelector('.tact .btn:not([disabled])'); await t.click('.tact .btn'); await t.waitForTimeout(350); };
  for (let k = 0; k < 30; k++) { const m = (await t.textContent('.tact .btn')).trim(); if (/수업 닫기/.test(m)) break; await main(); }
  await bp.waitForTimeout(2000);
  const rec = await rest('records/1-3/1'); log('마무리 → 서버 records/1-3/1:', JSON.stringify(rec).slice(0, 220));
  if (!rec || !rec['set-06']) errs.push('수업 끝 기록이 서버에 없음');
  // ?as 시험 폰 = 서버 기록 칸 안 씀
  const live = await rest('school/live');
  const asP = await open(`?role=student&room=${live.code}&as=1-3:5&${E}`); await asP.waitForTimeout(2000);
  log('?as 1-3:5 폰 → 서버 gem/1-3/5:', JSON.stringify(await rest('gem/1-3/5')));
  if (await rest('gem/1-3/5')) errs.push('?as 폰이 서버 기록을 씀');
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0');
  await b.close();
})();
