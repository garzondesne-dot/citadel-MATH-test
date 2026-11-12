// #138 시험 서버(에뮬레이터)에서 학생 캠프 → 수업 입장 두 길 (브라우저 3개 · 창마다 저장 따로)
//   ① 교사가 1-3반 🧪 테스트로 열기 → 1-3반 1번(가입) 캠프 차원문이 저절로 열림 → 「n차시 던전 입장」 → 대기실 1명
//   ② 1-4반 1번(가입 · 다른 반이라 차원문 닫힘) → 「🚪 코드」 → 수업 코드 6자리 → 대기실 2명 · 틀린 코드 = 한 줄 안내
//   ③ 교사 대기실 맨 위 「🚪 코드 ### ###」 → QR 시트(주소 ?join=코드 · TV 주소) → 새 폰이 그 주소로 → 1-5반 1번 가입 → 바로 대기실 3명
// 사용: 에뮬레이터 + npm run build → npx vite preview --port 4173 → NODE_PATH=$(npm root -g) node tools/e2e/gate.cjs <그림 폴더>
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
  const signup = async (p, cls, num) => {
    await p.waitForSelector('select'); await p.selectOption('select >> nth=0', cls); await p.waitForTimeout(200); await p.selectOption('select >> nth=1', String(num)); await p.waitForTimeout(200);
    await p.click('.links button:has-text("가입")'); await p.click('button.pw >> nth=0'); for (const d of '1234') await p.click(`.pad .keys button:has-text("${d}")`);
    await p.waitForTimeout(150); if (await p.$('.pad')) for (const d of '1234') await p.click(`.pad .keys button:has-text("${d}")`);
    await p.click('.title .pmain'); await p.waitForTimeout(2500);
  };
  // 학생 둘이 먼저 캠프에 (수업 전 = 차원문 닫힘)
  const s1 = await open(`?${E}`); await signup(s1, '1-3', 1);
  const s2 = await open(`?${E}`); await signup(s2, '1-4', 1);
  const before = await s1.$eval('.act .btn', (x) => x.disabled); log('수업 전 1-3 캠프 입장 단추 막힘:', before);
  // 교사: 1-3 · 6차시 🧪 테스트로 열기
  const t = await open(`?role=teacher&${E}`); await t.waitForSelector('.tabs', { timeout: 20000 });
  await t.click('.tt:not([disabled])'); await t.click('.pk3 .pk:has-text("6차시")'); await t.click('.sub2 button:has-text("테스트")'); await t.waitForTimeout(1500);
  const live = await rest('school/live'); log('school/live:', live.cls, live.code, '테스트', live.test);
  // ① 1-3 학생 = 차원문 저절로 열림
  await s1.waitForFunction(() => { const g = document.querySelector('.act .btn'); return g && !g.disabled; }, null, { timeout: 10000 }).catch(() => errs.push('① 1-3 캠프 차원문이 안 열림'));
  log('① 1-3 캠프 입장 단추:', (await s1.textContent('.act .btn')).trim()); await s1.screenshot({ path: `${SHOTS}/b22-camp-open.png` });
  await s1.click('.act .btn'); await s1.waitForTimeout(2500);
  // ② 1-4 학생 = 닫힘 → 🚪 코드
  log('② 1-4 캠프 입장 단추 막힘:', await s2.$eval('.act .btn', (x) => x.disabled), '| 🚪 코드 단추', !!(await s2.$('.codebtn')));
  await s2.click('.codebtn'); await s2.fill('.cin', '123'); await s2.click('.cgo'); const e1 = (await s2.textContent('.cerr')).trim();
  await s2.fill('.cin', '999999'); await s2.click('.cgo'); const e2 = (await s2.textContent('.cerr')).trim();
  log('   틀린 코드:', e1, '|', e2); await s2.fill('.cin', live.code); await s2.screenshot({ path: `${SHOTS}/b22-code.png` }); await s2.click('.cgo'); await s2.waitForTimeout(2500);
  await t.waitForTimeout(1500);
  // ③ 교사 대기실 🚪 코드 · QR 시트 → 새 폰 ?join= → 가입 → 바로 대기실
  const jt = (await t.textContent('.join')).replace(/\s+/g, ' ').trim(); await t.click('.join'); await t.waitForTimeout(300);
  const qr = await t.$eval('.qrbox', (x) => ({ svg: !!x.querySelector('svg path'), txt: x.textContent.replace(/\s+/g, ' ').trim() }));
  log('③ 교사 대기실:', jt, '| QR 시트 그림', qr.svg, '|', qr.txt.slice(0, 120)); await t.screenshot({ path: `${SHOTS}/b22-qr.png` });
  await t.click('.sheet .act .btn').catch(() => {});
  const s3 = await open(`?join=${live.code}&${E}`); await signup(s3, '1-5', 1); await s3.waitForTimeout(1500);
  log('   새 폰 ?join= → 가입 뒤 주소:', new URL(s3.url()).search);
  if (!s3.url().includes(`room=${live.code}`)) errs.push('③ ?join= 로그인 뒤 수업으로 안 감');
  await t.waitForTimeout(1500);
  const players = Object.values((await rest(`rooms/${live.code}/players`)) || {}).map((x) => `${x.cls}:${x.num}`);
  const lobby = ((await t.textContent('.mid')).match(/(\d+)\s*\/\s*\d+/) || ['?'])[0];
  log('대기실: 서버 players', players.join(' · '), '| 리모컨', lobby);
  if (players.length !== 3) errs.push(`대기실 ${players.length}명`);
  await t.screenshot({ path: `${SHOTS}/b22-lobby.png` });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0');
  await b.close();
})();
