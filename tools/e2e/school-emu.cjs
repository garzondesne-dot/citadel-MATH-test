// 🏫 학교판 (에뮬레이터 · 📜 머리 🔨): VITE_SCHOOL=srzmf 빌드를 http://localhost:4175/s/srzmf/ 에 띄워 놓고 실행
//   ① 교사: 오류 없이 열림 · 우리 차시(공통수학2 2~10) 없음 · ⚙ 기능 = 모루 · 기호 톡 · 성채 · 성취기준/오개념 = 잠김(과목 팩에 없음) ② 학생 캠프: 모루 · 성채 없음 · 과목 = 중학수학1
const { chromium } = require('playwright');
const { rest, asAdmin } = require('./_emu.cjs');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4175/s/srzmf/';
(async () => {
  const errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest('', 'PATCH', { roster: { '1-3': { 3: '시험삼' } }, rosterMask: { '1-3': { 3: '시*삼' } } });
  const b = await chromium.launch();
  const t = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); t.on('pageerror', (e) => errs.push(String(e.stack || e).slice(0, 600)));
  await t.goto(`${B}?role=teacher&emu=127.0.0.1`); await t.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(t, '.tabs'); await t.waitForSelector('.tabs'); await t.waitForTimeout(2500);
  const body = (await t.textContent('body')).replace(/\s+/g, ' ');
  ok('교사 화면 열림 · 우리 차시(집합 · 명제) 이름 없음', !/집합의 표현|드모르간|명제와 그 부정/.test(body), body.slice(0, 160));
  await t.screenshot({ path: `${SHOTS}/school-teacher.png` });
  await t.click('.tabs button:has-text("나")'); await t.waitForTimeout(400);
  const fs = await t.$('button:has-text("기능")'); if (fs) { await fs.click(); await t.waitForTimeout(600); }
  const feat = (await t.textContent('body')).replace(/\s+/g, ' ');
  ok('⚙ 기능: 과목 팩에 없는 것 = 잠김 줄', /과목 팩에/.test(feat), (feat.match(/모루[^·]{0,40}/) || [''])[0]);
  await t.screenshot({ path: `${SHOTS}/school-feat.png`, fullPage: true });
  const s = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); s.on('pageerror', (e) => errs.push(String(e.stack || e).slice(0, 600)));
  await s.goto(`${B}?emu=127.0.0.1`); await s.waitForSelector('.title', { timeout: 20000 }); await s.waitForTimeout(800);
  const tt = (await s.textContent('.title')).replace(/\s+/g, ' '); ok('첫 화면 과목 = 중학수학1', /중학수학1/.test(tt) && !/공통수학2/.test(tt), tt.slice(0, 120));
  await s.selectOption('select >> nth=0', '1-3'); await s.waitForTimeout(200); await s.selectOption('select >> nth=1', '3'); await s.waitForTimeout(300);
  if (!(await s.$('.pw:has(small)'))) await s.click('.lk:has-text("가입")');
  await s.click('.pw >> nth=0'); for (const k of '12341234') await s.click(`.pad button:text-is("${k}")`);
  await s.click('.title .act .pmain'); await s.waitForTimeout(3500);
  const fh = await s.$('button:has-text("과 시작"), button:has-text("와 시작")'); if (fh) { await fh.click(); await s.waitForTimeout(1500); }
  await s.waitForSelector('.stage', { timeout: 15000 }).catch(() => {});
  const props = await s.$$eval('[data-prop]', (x) => x.map((e) => e.dataset.prop));
  ok('학생 캠프: 모루 · 성채 없음', !props.includes('anvil') && !props.includes('castle'), props.join(','));
  await s.screenshot({ path: `${SHOTS}/school-camp.png` });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
