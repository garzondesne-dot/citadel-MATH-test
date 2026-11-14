// 🔗 옛 정식 주소 이어 주기 (📜 2026-11-14 출시 막는 것 8 · 에뮬레이터): 교사 수업 열기 →
//   ① TV ?role=hall&code=X&key=Y = 저절로 입장(hosts) · 주소에 key · code 남지 않음 ② 학생 ?role=student&code=X = 그 방(room=X)으로 · 주소 = room
//   사용: 에뮬레이터 켬 → NODE_PATH=$(npm root -g) node tools/e2e/oldurl.cjs <폴더>
const { chromium } = require('playwright'); const path = require('path');
const [SHOTS = '.'] = process.argv.slice(2), B = 'http://localhost:4173/', E = '&emu=127.0.0.1', NS = 'demo-citadel-test-default-rtdb', DBU = 'http://127.0.0.1:9000';
const rest = (p, method = 'GET', body) => fetch(`${DBU}/${p}.json?ns=${NS}`, { method, headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }).then((r) => r.json());
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  const W = {}; for (let d = 1; d <= 5; d++) { W[d] = {}; for (let q = 1; q <= 7; q++) W[d][q] = '1-3'; } await rest('school/sched', 'PUT', W);
  const b = await chromium.launch(), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const t = await (await b.newContext({ viewport: { width: 360, height: 640 } })).newPage();
  await t.goto(`${B}?role=teacher${E}`); await t.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await require('./_emu.cjs').asAdmin(t, '.tabs');
  await t.click('[data-cls="1-3"]'); await t.click('.pk3 .pk:has-text("6차시")'); await t.click('.sub2 button:has-text("테스트")'); await t.waitForTimeout(1200);
  const live = await rest('school/live'), code = live.code, key = String(await rest(`secrets/${code}/hallKey`));
  // ① TV 옛 주소
  const tv = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); tv.on('pageerror', (e) => errs.push(String(e)));
  await tv.goto(`${B}index.html?role=hall&code=${code}&key=${key}${E}`); await tv.waitForSelector('nav.dock', { timeout: 20000 }).catch(() => {});
  const url = tv.url(); ok('① TV 옛 주소 = 저절로 입장', !!(await tv.$('nav.dock')));
  ok('① 주소에 key · code 없음', !url.includes(key) && !/[?&]code=/.test(url) && !/[?&]key=/.test(url), url.replace(B, ''));
  const hosts = await rest(`rooms/${code}/hosts`); ok('① hosts = true 만', hosts && Object.values(hosts).every((v) => v === true), JSON.stringify(hosts));
  ok('① 화면 글자에 키 없음', !(await tv.evaluate((k) => document.body.innerText.includes(k), key)));
  // 틀린 키 = 입장 안 됨 · 주소에서 지움
  const tv2 = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  await tv2.goto(`${B}?role=hall&code=${code}&key=0000${E}`); await tv2.waitForTimeout(4000);
  ok('① 틀린 키 = 입장 안 됨(키 칸 그대로) · 주소에서 지움', !(await tv2.$('nav.dock')) && !tv2.url().includes('key='), tv2.url().replace(B, ''));
  // ② 학생 옛 주소 (정식 QR 꼴)
  const s = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); s.on('pageerror', (e) => errs.push(String(e)));
  await s.goto(`${B}index.html?role=student&code=${code}&as=1-3:4${E}`); await s.waitForTimeout(4000);
  const su = s.url(); const joined = await rest(`rooms/${code}/players/s1_3_4`);
  ok('② 학생 옛 주소 = 그 수업 방에 들어감', !!joined, JSON.stringify(joined)?.slice(0, 60));
  ok('② 주소 = room 으로 바뀜', new RegExp(`[?&]room=${code}`).test(su) && !/[?&]code=/.test(su), su.replace(B, ''));
  await s.screenshot({ path: path.join(SHOTS, 'oldurl-student.png') });
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
