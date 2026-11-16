// 🔐 종합실(TV) 입장 비밀번호 노출 0 (📜 2026-11-14 🐞 「종합실 입장할 때 비번 노출됨」 · 에뮬레이터)
//   교사 수업 열기 → TV 입장 화면: 입력 칸 = 글자 가림(.mask · 비밀번호 칸이 아니라 브라우저 「저장?」 안 뜸 · 📜 2026-11-14) · 👁 누르는 동안만 보임 → 맞는 키로 입장
//   주소 · localStorage · sessionStorage · 콘솔 · TV 화면 글자에 키 0 · 학생이 읽는 방(rooms/…/hosts) 에 키 0(true 만) · 새로 고침 = 기억(암호문)으로 다시 입장
//   사용: 에뮬레이터 켬 → NODE_PATH=$(npm root -g) node tools/e2e/tvkey.cjs <폴더>
const { chromium } = require('playwright'); const path = require('path');
const [SHOTS = '.'] = process.argv.slice(2), B = 'http://localhost:4173/', E = '&emu=127.0.0.1', NS = 'demo-citadel-test-default-rtdb', DBU = 'http://127.0.0.1:9000';
const rest = (p, method = 'GET', body) => fetch(`${DBU}/${p}.json?ns=${NS}`, { method, headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }).then((r) => r.json());
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  const W = {}; for (let d = 1; d <= 5; d++) { W[d] = {}; for (let q = 1; q <= 7; q++) W[d][q] = '1-3'; } await rest('school/sched', 'PUT', W);
  const b = await chromium.launch(), errs = [], out = [], logs = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const tc = await b.newContext({ viewport: { width: 360, height: 640 } }), t = await tc.newPage();
  await t.goto(`${B}?role=teacher${E}`); await t.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await require('./_emu.cjs').asAdmin(t, '.tabs');
  await t.click('[data-cls="1-3"]'); await t.click('.pk3 .pk:has-text("6차시")'); await require('./_cls.cjs').testOpen(t); await t.waitForTimeout(1200);
  const live = await rest('school/live'), code = live.code, key = await rest(`secrets/${code}/hallKey`);
  ok('교사가 수업 열기 · 키 만들어짐', /^\d{4}$/.test(String(key)), `방 ${code}`);
  const vc = await b.newContext({ viewport: { width: 1280, height: 720 } }), tv = await vc.newPage(); tv.on('console', (m) => logs.push(m.text()));
  await tv.goto(`${B}?role=hall${E}`); await tv.waitForSelector('[data-k="tv-key"]', { timeout: 20000 });
  const masked = () => tv.$eval('[data-k="tv-key"]', (e) => e.classList.contains('mask') && getComputedStyle(e).webkitTextSecurity === 'disc');
  const type0 = await tv.getAttribute('[data-k="tv-key"]', 'type'); ok('입력 칸 = 글자 가림(.mask · 비밀번호 칸 아님)', type0 === 'text' && (await masked()), type0);
  await tv.fill('[data-k="tv-key"]', String(key)); await tv.waitForTimeout(200);
  const vis = await tv.evaluate((k) => document.body.innerText.includes(k), String(key)); ok('친 뒤 화면 글자에 키 없음(● 로 가림)', !vis);
  await tv.screenshot({ path: path.join(SHOTS, 'tvkey-masked.png') });
  const eye = await tv.$('[data-k="tv-key-eye"]'); const bb = await eye.boundingBox(); await tv.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await tv.mouse.down();
  const m1 = await masked(); await tv.mouse.up(); await tv.waitForTimeout(100); const m2 = await masked();
  ok('👁 누르는 동안만 보임', !m1 && m2, `${m1} → ${m2}`);
  await tv.click('.kgo'); await tv.waitForSelector('nav.dock', { timeout: 20000 }).catch(() => {});
  ok('맞는 키로 입장', !!(await tv.$('nav.dock')));
  const k = String(key), leak = await tv.evaluate((k) => ({ url: location.href.includes(k), ls: Object.keys(localStorage).some((x) => (localStorage.getItem(x) || '').includes(k) || x.includes(k)), ss: Object.keys(sessionStorage).some((x) => (sessionStorage.getItem(x) || '').includes(k)), text: document.body.innerText.includes(k) }), k);
  ok('주소 · localStorage · sessionStorage · TV 화면 글자에 키 0', !leak.url && !leak.ls && !leak.ss && !leak.text, JSON.stringify(leak));
  ok('콘솔에 키 0', !logs.some((l) => l.includes(k)), `${logs.length}줄`);
  const hosts = await rest(`rooms/${code}/hosts`); ok('학생이 읽는 방 hosts = true 만(키 글자 없음)', hosts && Object.values(hosts).every((v) => v === true), JSON.stringify(hosts));
  await tv.screenshot({ path: path.join(SHOTS, 'tvkey-in.png') });
  // 새로 고침 = 기억(암호문 · IndexedDB)으로 다시 입장
  await tv.reload(); await tv.waitForSelector('nav.dock', { timeout: 20000 }).catch(() => {});
  ok('새로 고침 = 다시 입장(기억)', !!(await tv.$('nav.dock')) && !(await tv.$('[data-k="tv-key"]')));
  // 옛 판 평문 칸 = 읽자마자 지움
  await tv.evaluate((k) => localStorage.setItem('citadel-tv-key', k), k); await tv.reload(); await tv.waitForTimeout(3000);
  ok('옛 판 평문 칸 = 옮기고 지움', !(await tv.evaluate(() => localStorage.getItem('citadel-tv-key'))));
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}` : '✅ 오류 0'); await b.close();
})();
