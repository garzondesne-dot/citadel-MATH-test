// #171 좁힌 규칙에서 처음 쓰는 한 바퀴 (에뮬레이터 · REST 지름길 없이 · 시간표만 미리 넣음)
//   ① 교사 폰: 나 → 🔐 교사 계정 만들기 → 수업 탭 → 6차시 🧪 테스트로 열기 → 수업 화면 · 「⚔ 수업」 메뉴로 돌아가기
//   ② TV: 종합실 키 화면 → 교사 폰에 보이는 키 → 조작 막대
//   ③ 학생: 첫 화면 가입 → 캠프(차원문 열림) → 입장 → 대기실 → 캠프로 → ⚙ → 로그아웃 → 첫 화면(「교사 · 종합실 ›」 보임)
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
const B = 'http://localhost:4173/', E = 'emu=127.0.0.1';
const { rest } = require('./_emu.cjs');
const log = (...a) => console.log(...a);
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' });
  const W = {}; for (let d = 1; d <= 5; d++) { W[d] = {}; for (let q = 1; q <= 7; q++) W[d][q] = '1-3'; } await rest('school/sched', 'PUT', W);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), errs = [];
  const open = async (u, w = 390, h = 844) => { const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage(); p.on('pageerror', (e) => errs.push(`${u}: ${e}`)); p.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push(`${u}: ${m.text().slice(0, 140)}`); }); await p.goto(B + u); return p; };
  // ① 교사
  const t = await open(`?role=teacher&${E}`); await t.waitForSelector('.tabs', { timeout: 20000 });
  await t.click('.tabs button:has-text("나")'); await t.click('.item:has-text("교사 로그인")'); await t.waitForSelector('.sheet');
  await t.fill('.fld[type=email]', 'teacher@school.test'); await t.fill('.fld[type=password]', 'pw123456'); await t.click('.sheet .lk');
  await t.waitForTimeout(3000); await t.waitForSelector('.tabs', { timeout: 20000 });
  await t.click('.tabs button:has-text("수업")'); await t.waitForTimeout(500);
  await t.click('.tt:not([disabled])'); await t.click('.pk3 .pk:has-text("6차시")'); await t.click('.sub2 button:has-text("테스트")'); await t.waitForTimeout(1500);
  const live = await rest('school/live'); log('① 교사 계정 → 수업 열기:', live ? `${live.cls} · ${live.code}` : '✗ 안 열림'); if (!live) errs.push('① 수업 열기');
  const key = (await t.textContent('.codek small').catch(() => '')).replace(/\D/g, ''); log('   교사 폰 종합실 키:', key);
  await t.screenshot({ path: `${SHOTS}/b46-teacher-live.png` });
  // ② TV
  const tv = await open(`?role=hall&${E}`, 1280, 720); await tv.waitForSelector('.kin', { timeout: 20000 }); await tv.fill('.kin', key); await tv.click('.kgo');
  await tv.waitForSelector('.dock', { state: 'attached', timeout: 15000 }).catch(() => {}); const tvOk = !!(await tv.$('.dock')); log('② TV 키 → 진행:', tvOk ? '○' : '✗'); if (!tvOk) errs.push('② TV');
  // ③ 학생
  const s = await open(`?${E}`); await s.waitForSelector('select', { timeout: 20000 });
  await s.selectOption('select >> nth=0', '1-3'); await s.waitForTimeout(200); await s.selectOption('select >> nth=1', '1'); await s.waitForTimeout(300);
  await s.click('.links button:has-text("가입")'); await s.click('button.pw >> nth=0'); for (const d of '1234') await s.click(`.pad .keys button:has-text("${d}")`);
  await s.waitForTimeout(200); if (await s.$('.pad')) for (const d of '1234') await s.click(`.pad .keys button:has-text("${d}")`); else { await s.click('button.pw >> nth=1'); for (const d of '1234') await s.click(`.pad .keys button:has-text("${d}")`); }
  await s.waitForTimeout(200); await s.click('.title .pmain'); await s.waitForSelector('.stage', { timeout: 20000 }); await s.waitForTimeout(1500);
  const gate = (await s.textContent('.pmain')).trim(); log('③ 학생 가입 → 캠프 · 주요 단추:', gate); if (!/던전 입장/.test(gate)) errs.push('③ 캠프 차원문');
  await s.click('.pmain'); await s.waitForURL(/role=student/, { timeout: 10000 }).catch(() => {}); await s.waitForTimeout(2000);
  const lobby = (await s.textContent('body')).replace(/\s+/g, ' '); log('   입장:', /입장 완료|기다려요/.test(lobby) ? '대기실 ○' : `✗ ${lobby.slice(0, 80)}`); if (!/입장 완료|기다려요/.test(lobby)) errs.push('③ 대기실');
  await s.goto(`${B}?${E}`); await s.waitForSelector('.stage', { timeout: 20000 }); await s.waitForTimeout(800);
  const pill = await s.$('.beta-pill:not(.old)'), srv = await s.$eval('.srv', (x) => x.textContent).catch(() => null);
  log('   캠프 BETA · 시험 서버 글자:', pill || srv ? `✗ 보임 ${srv ?? ''}` : '숨김 ○'); if (pill || srv) errs.push('#162 학생 화면 BETA 글자');
  await s.click('button[aria-label="설정"]'); await s.waitForSelector('.sheet .build'); log('   ⚙ 설정 맨 아래:', (await s.textContent('.sheet .build')).trim()); await s.click('.sheet .pmain'); await s.waitForTimeout(300);
  // #172 ‹ 메뉴 → 교사 폰 · 교실 TV · 로그아웃
  await s.click('.top .back'); await s.waitForSelector('.sheet .menu'); const mi = await s.$$eval('.sheet .mi b', (xs) => xs.map((x) => x.textContent).join(' · ')); log('   ‹ 메뉴:', mi); if (!/교사 폰.*교실 TV.*로그아웃/.test(mi)) errs.push('#172 메뉴');
  await s.screenshot({ path: `${SHOTS}/b47-camp-menu.png` });
  await s.click('.sheet .mi:has-text("로그아웃")'); await s.waitForSelector('.title', { timeout: 20000 }); await s.waitForTimeout(500);
  const menu = await s.$('.links button:has-text("교사 · 종합실")'); log('   ⚙ 로그아웃 → 첫 화면 · 「교사 · 종합실 ›」:', menu ? '○' : '✗'); if (!menu) errs.push('③ 로그아웃 → 메뉴');
  await s.screenshot({ path: `${SHOTS}/b46-logout-title.png` });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0');
  await b.close();
})();
