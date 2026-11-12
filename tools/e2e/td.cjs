// #142-2 🏰 디펜스 한 판 (에뮬레이터 · TV + 리모컨 + 폰 3대) · 🎵 쉼터 배경음 · 놀이 배경 그림
//   TV 없이 시작 = 안내 · TV 켬 → 리모컨 🏕 → 🏰 시작 → 폰 2대 자리 고르기(1대 안 고름 = 저절로) → 판 시작(calibrate) → 폰 기술 · 리모컨 🛡 · ✨
//   🔴 집중 = TV 계산 멈춤 → 풀면 이어서 → 끝(⏩ 시험 속도) → 결과 · 보상 gifts · 360 × 640 스크롤 0
// 사용: 에뮬레이터 + npm run build → npx vite preview --port 4173 → NODE_PATH=$(npm root -g) node tools/e2e/td.cjs <그림 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
const B = 'http://localhost:4173/', E = 'emu=127.0.0.1', NS = 'demo-citadel-test-default-rtdb';
const rest = (path, method = 'GET', body) => fetch(`http://127.0.0.1:9000/${path}.json?ns=${NS}`, { method, headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }).then((r) => r.json());
const log = (...a) => console.log(...a);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  await rest('', 'DELETE');
  const W = {}; for (let d = 1; d <= 5; d++) { W[d] = {}; for (let q = 1; q <= 7; q++) W[d][q] = '1-3'; }
  await rest('school/sched', 'PUT', W);
  const b = await chromium.launch(), errs = [];
  const open = async (url, vp = { width: 360, height: 640 }) => { const ctx = await b.newContext({ viewport: vp }); const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(`${url}: ${e}`)); await p.goto(B + url); return p; };
  const t = await open(`?role=teacher&${E}`); await t.waitForSelector('.tabs', { timeout: 20000 });
  await t.click('.tt:not([disabled])'); await t.click('.pk3 .pk:has-text("6차시")'); await t.click('.sub2 button:has-text("테스트")'); await t.waitForTimeout(1500);
  const code = (await rest('school/live')).code;
  const ph = []; for (let n = 1; n <= 3; n++) ph.push(await open(`?role=student&room=${code}&as=1-3:${n}&${E}`));
  await wait(2500); await t.click('.tact .btn'); await wait(1500);
  await t.evaluate(() => { window.__TD_PICK = 8000; });
  const fun = () => rest(`rooms/${code}/fun`);
  // TV 없이 → 안내
  await t.click('.rdock button:has-text("쉼터")'); await t.click('.games .game:has-text("디펜스")'); await t.click('.sheet .act .btn.rbig'); await wait(700);
  const toast = await t.textContent('.toast').catch(() => ''); log('TV 없이 🏰:', toast.trim(), '| fun', await fun()); if (!/교실 TV/.test(toast)) errs.push('TV 없이 시작 안내');
  // TV 켬
  const tv = await open(`?role=hall&${E}`, { width: 1280, height: 720 }); await tv.evaluate(() => { window.__TD_SPEED = 6; }); await wait(4000);
  const bgm0 = await tv.evaluate(() => window.__bgm && window.__bgm()); log('🎵 TV 쉼터 곡:', JSON.stringify(bgm0)); if (!bgm0 || bgm0.k !== 'rest') errs.push('쉼터 곡');
  await t.click('.sheet .act .btn.rbig'); await wait(1500);
  let f = await fun(); log('🏰 시작:', f && f.kind, f && f.map, f && f.phase); if (!f || f.kind !== 'td') errs.push('디펜스 시작');
  await ph[0].waitForSelector('.tdp .mini'); await ph[0].screenshot({ path: `${SHOTS}/b31-td-phone-pick.png` });
  await ph[0].click('.tdp .slot >> nth=2'); await ph[1].click('.tdp .slot >> nth=2'); await wait(600); await ph[1].click('.tdp .slot >> nth=5'); await wait(800);
  // #146 🔁 1:1 교환: 폰 1 → 폰 2 자리 신청 · 폰 2 수락 → TV 가 맞바꿈
  await ph[0].click('.tdp .slot >> nth=5'); await wait(1000); await ph[1].screenshot({ path: `${SHOTS}/b31-td-swap-in.png` });
  await ph[1].click('.tdp .swin .ok'); await wait(2000);
  const sw = await rest(`rooms/${code}/tdp/${f.g}`); log('🔁 교환 뒤 자리:', JSON.stringify(sw), '|', (await ph[0].textContent('.tdp .me')).trim()); if (sw['6'] !== 's1_3_1' || sw['3'] !== 's1_3_2') errs.push('자리 교환');
  // ⚙ 용사 바꾸기 (폰 3)
  await ph[2].click('.tdp .hbtn'); await ph[2].waitForSelector('.hgrid'); const nh = await ph[2].$$eval('.hgrid button', (x) => x.length); await ph[2].click('.hgrid button:not(.on) >> nth=0').catch(() => {}); await wait(800);
  log('⚙ 용사 바꾸기: 고를 수 있는 용사', nh, '| tdm', JSON.stringify(await rest(`rooms/${code}/tdm/${f.g}`)));
  log('   폰 1:', (await ph[0].textContent('.tdp .me')).trim(), '| 폰 2:', (await ph[1].textContent('.tdp .me')).trim(), '| 서버 자리', JSON.stringify(await rest(`rooms/${code}/tdp/${f.g}`)));
  await tv.screenshot({ path: `${SHOTS}/b31-td-tv-pick.png` });
  const bgm1 = await tv.evaluate(() => window.__bgm && window.__bgm()); log('🎵 TV 디펜스 곡:', JSON.stringify(bgm1)); if (!bgm1 || bgm1.k !== 'td') errs.push('디펜스 곡');
  await wait(9000);
  f = await fun(); log('   판:', f.phase, '· 타워', (Array.isArray(f.tw) ? f.tw : Object.values(f.tw || {})).map((x) => `${x.u}@${x.s}${x.r ? '🏹' : '🗡'}`).join(' '), '· 몬스터 체력 hp0', f.hp0);
  if (f.phase !== 'play' || !f.hp0) errs.push('판 시작');
  const tw = Array.isArray(f.tw) ? f.tw : Object.values(f.tw || {}); if (!tw.find((x) => x.u === 's1_3_3')) errs.push('안 고른 학생 저절로 자리');
  await wait(4000);
  // ⬆ 판 안 업그레이드 고르기 (⭐ 5 모이면)
  for (let k = 0; k < 40 && !(await ph[0].$('.tdp .ups button')); k++) await wait(500);
  const upOk = !!(await ph[0].$('.tdp .ups button')); if (upOk) { await ph[0].screenshot({ path: `${SHOTS}/b31-td-up.png` }); await ph[0].click('.tdp .ups button >> nth=1'); await wait(1500); const L1 = await rest(`rooms/${code}/tdl/${f.g}`); if (!String((L1.ups || {}).s1_3_1 || '').includes('b')) errs.push('고른 업그레이드 반영'); }
  log('⬆ 업그레이드:', upOk ? 'ok' : '안 뜸', '| tdu', JSON.stringify(await rest(`rooms/${code}/tdu/${f.g}`)), '| 반영', JSON.stringify((await rest(`rooms/${code}/tdl/${f.g}`) || {}).ups)); if (!upOk) errs.push('업그레이드 고르기');
  await ph[0].click('.tdp .pmain'); await t.click('.rdock button:has-text("쉼터")'); await t.waitForSelector('.tdc'); await t.click('.tdc button:has-text("방패")'); await t.click('.tdc button:has-text("응원")'); await t.screenshot({ path: `${SHOTS}/b31-td-remote.png` });
  const sh = await t.evaluate(() => { const bd = document.querySelector('.sheet .body'); return bd.scrollHeight > bd.clientHeight + 1; }); if (sh) errs.push('리모컨 시트 스크롤');
  await t.click('.sheet .x'); await wait(1500);
  f = await fun(); log('   🛡', !!f.sh, '· ✨', JSON.stringify(f.ch || {}), '· 기술', JSON.stringify(await rest(`rooms/${code}/tdt/${f.g}`)));
  await ph[0].screenshot({ path: `${SHOTS}/b31-td-phone-play.png` }); await tv.screenshot({ path: `${SHOTS}/b31-td-tv-play.png` });
  // 🔴 집중 = 계산 멈춤
  await t.click('.rdock button:has-text("집중")'); await wait(1600);
  const a1 = await tv.$eval('.td .tick', (x) => +x.dataset.t); await wait(2500); const a2 = await tv.$eval('.td .tick', (x) => +x.dataset.t);
  log('🔴 집중: TV 계산 초', a1, '→', a2); if (a1 !== a2) errs.push('집중 멈춤');
  await t.click('.rdock button:has-text("집중")'); await wait(2500); const a3 = await tv.$eval('.td .tick', (x) => +x.dataset.t); log('   풀림 →', a3); if (!(a3 > a2)) errs.push('집중 풀림');
  // 끝까지
  for (let k = 0; k < 90; k++) { f = await fun(); if (f && f.phase === 'end') break; await wait(1000); }
  log('끝:', f.phase, JSON.stringify(f.res));
  if (!f.res) errs.push('결과 없음');
  await wait(1500);
  await tv.screenshot({ path: `${SHOTS}/b31-td-tv-end.png` }); await ph[0].screenshot({ path: `${SHOTS}/b31-td-phone-end.png` });
  const gifts = await rest('gifts'); log('보상 gifts:', Object.entries(gifts || {}).map(([u, g]) => `${u}:${Object.values(g).map((x) => `💎${x.g}(${x.fun})`).join(',')}`).join(' | ')); if (!gifts) errs.push('보상 없음');
  const sc = await Promise.all(ph.map((p) => p.evaluate(() => { const m = document.querySelector('.fun'); return !!m && m.scrollHeight <= m.clientHeight + 1 && document.documentElement.scrollWidth <= innerWidth; }))); log('360×640 스크롤 없음:', sc.join(' ')); if (sc.some((x) => !x)) errs.push('폰 스크롤');
  // 다른 놀이 배경 그림 · 곡
  await t.click('.rdock button:has-text("쉼터")'); await wait(400); await t.click('.games .game:has-text("반대로")'); await t.click('.sheet .act .btn.rbig'); await wait(1500);
  const bgImg = await tv.$eval('.ov.fun', (x) => getComputedStyle(x).backgroundImage); const bgm2 = await tv.evaluate(() => window.__bgm && window.__bgm());
  log('🔄 반대로: 배경', /fun-dorm/.test(bgImg) ? 'fun-dorm' : bgImg.slice(0, 60), '· 곡', JSON.stringify(bgm2)); if (!/fun-dorm/.test(bgImg) || bgm2.k !== 'rev') errs.push('반대로 그림 · 곡');
  await tv.screenshot({ path: `${SHOTS}/b31-tv-rev.png` });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0');
  await b.close();
})();
