// #158 📄 학습지 칸 그림 = 서버 prep/{차시}/img/{칸} (에뮬레이터): TV 📖 개념 2분할 · 📄 문제 창 · 학생 「📘 이 문제의 개념」 이 그림으로 · 그림 없는 칸은 글자
// 사용: 에뮬레이터 + npm run build → npx vite preview --port 4173 → NODE_PATH=$(npm root -g) node tools/e2e/prep.cjs <그림 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
const B = 'http://localhost:4173/', E = '&emu=127.0.0.1', NS = 'demo-citadel-test-default-rtdb', DBU = 'http://127.0.0.1:9000';
const rest = (path, method = 'GET', body) => fetch(`${DBU}/${path}.json?ns=${NS}`, { method, headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }).then((r) => r.json());
const log = (...a) => console.log(...a);
(async () => {
  await rest('', 'DELETE');
  const b = await chromium.launch(), errs = [];
  // 시험 그림 (흰 바탕 칸 그림 흉내) — 브라우저 캔버스로 만든 webp
  const mk = await b.newPage();
  const img = async (t) => mk.evaluate((t) => { const c = document.createElement('canvas'); c.width = 800; c.height = 420; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 800, 420); g.fillStyle = '#222'; g.font = 'bold 48px sans-serif'; g.fillText(t, 40, 120); g.strokeRect(20, 20, 760, 380); return c.toDataURL('image/webp'); }, t);
  await rest('prep/set-06/img', 'PUT', { c1: await img('학습지 개념 1 (그림)'), m1: await img('학습지 문제 1 (그림)') });
  // 리모컨 6차시 테스트 → TV · 학생
  const W = {}; for (let d = 1; d <= 5; d++) { W[d] = {}; for (let q = 1; q <= 7; q++) W[d][q] = '1-3'; } await rest('school/sched', 'PUT', W);
  const open = async (url, w, h) => { const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(`${url}: ${e}`)); await p.goto(B + url); return p; };
  const t = await open(`?role=teacher${E}`, 360, 640); await t.waitForSelector('.tabs', { timeout: 20000 }); await require('./_emu.cjs').asAdmin(t, '.tabs'); // 🔐 #163-① 교사 = admins
  await t.click('.tt:not([disabled])'); await t.click('.pk3 .pk:has-text("6차시")'); await t.click('.sub2 button:has-text("테스트")'); await t.waitForTimeout(800);
  const live = await rest('school/live');
  const tv = await open(`?role=hall${E}`, 1280, 720); await require('./_emu.cjs').asHost(tv, live.code); await tv.waitForSelector('.dock', { timeout: 20000 }); // 🔐 TV = 종합실 키로 hosts
  const st = await open(`?role=student&room=${live.code}&as=1-3:1${E}`, 390, 844);
  const go = async () => { await tv.mouse.move(600, 400); await tv.click('.dock .go'); await tv.waitForTimeout(900); };
  for (let g = 0; g < 4 && !(await tv.$('.split')); g++) await go();
  await tv.waitForSelector('.split .pi img', { timeout: 10000 }).catch(() => {});
  const c = await tv.evaluate(() => [...document.querySelectorAll('.split .cpane')].map((x) => (x.querySelector('.pi img') ? '그림' : '글자')));
  log('① TV 개념 2분할 (왼 c1 · 오른 m1):', c.join(' · ')); if (c.join() !== '그림,그림') errs.push('개념 2분할 그림');
  await tv.screenshot({ path: `${SHOTS}/b39-prep-concept.png` });
  await tv.click('.split .cpane >> nth=0'); await tv.waitForTimeout(300); log('   왼쪽 누름 → 크게:', await tv.$eval('.split', (x) => x.className.includes('z1')));
  await tv.click('.split .cpane >> nth=0'); await tv.waitForTimeout(200);
  await go(); // 문제 1
  await tv.mouse.move(600, 400); await tv.click('.dock .t:has-text("문제")'); await tv.waitForTimeout(1200);
  const sh = await tv.evaluate(() => !!document.querySelector('.ov.sheet .pi img')); log('② 📄 문제 창 (m1):', sh ? '그림' : '글자'); if (!sh) errs.push('문제 창 그림');
  await tv.screenshot({ path: `${SHOTS}/b39-prep-sheet.png` });
  await tv.mouse.move(600, 400); await tv.click('.dock .t:has-text("문제")'); await tv.waitForTimeout(300);
  // 학생 📘
  await st.waitForSelector('.cpt', { timeout: 15000 }); await st.click('.cpt'); await st.waitForSelector('.sheet'); await st.waitForTimeout(1200);
  const sp = await st.evaluate(() => !!document.querySelector('.sheet .pi img')); log('③ 학생 📘 이 문제의 개념 (c1):', sp ? '그림' : '글자'); if (!sp) errs.push('학생 개념 그림');
  await st.screenshot({ path: `${SHOTS}/b39-prep-phone.png` });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0');
  await b.close();
})();
