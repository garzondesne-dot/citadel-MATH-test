// #142-1 🏕 쉼터 놀이 (에뮬레이터 · TV + 리모컨 + 폰 3대 · 창마다 저장 따로)
//   리모컨 🏕 → 시트(놀이 5칸 · 분 · 주요 단추 68 · 바닥 75 · 스크롤 0) → 폰 ② 기다림
//   ⚖ 밸런스(3명 = ✊✌️✋) 한 판: 폰 둘 고름 · 하나 안 고름 → 💤 덮개 + 🙋 · TV 숫자 칸 살아남음
//   🔄 반대로 = TV 막대에서 시작 · ⭕ OX 타임(오늘) 한 문장 + 🔴 집중 = 놀이 시계 멈춤 · 🙊 눈치 끝까지 → 보상 gifts · 리모컨 「다음 ▶」 = 쉼터 끝
// 사용: 에뮬레이터 + npm run build → npx vite preview --port 4173 → NODE_PATH=$(npm root -g) node tools/e2e/rest.cjs <그림 폴더>
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
  const t = await open(`?role=teacher&${E}`); await t.waitForSelector('.tabs', { timeout: 20000 }); await require('./_emu.cjs').asAdmin(t, '.tabs'); // 🔐 #163-① 교사 = admins
  await t.click('[data-cls="1-3"]'); await t.click('.pk3 .pk:has-text("6차시")'); await t.click('.sub2 button:has-text("테스트")'); await t.waitForTimeout(1500);
  const live = await rest('school/live'); const code = live.code; log('수업', live.cls, code);
  const tv = await open(`?role=hall&${E}`, { width: 1280, height: 720 }); await require('./_emu.cjs').asHost(tv, code); // 🔐 TV = 종합실 키로 hosts
  const ph = []; for (let n = 1; n <= 3; n++) ph.push(await open(`?role=student&room=${code}&as=1-3:${n}&${E}`));
  await wait(3000);
  await t.click('.tact .btn'); await wait(1500); // ▶ 수업 시작
  const fun = () => rest(`rooms/${code}/fun`);
  // ① 리모컨 🏕 → 시트
  await t.click('.rdock button:has-text("쉼터")'); await t.waitForSelector('.games'); await wait(500);
  const sh = await t.evaluate(() => { const m = document.querySelector('.sheet .act .btn.rbig').getBoundingClientRect(), bd = document.querySelector('.sheet .body'); return { h: Math.round(m.height), gap: Math.round(innerHeight - m.bottom), games: document.querySelectorAll('.games .game').length, scroll: bd.scrollHeight > bd.clientHeight + 1, gh: Math.round(document.querySelector('.games .game').getBoundingClientRect().height), txt: document.querySelector('.sheet .act .btn.rbig').textContent.trim() }; });
  log('① 시트: 놀이', sh.games, '칸 · 칸 높이', sh.gh, '· 주요 단추', sh.h, '· 바닥', sh.gap, '· 스크롤', sh.scroll, '·', sh.txt);
  if (sh.games !== 5 || sh.h !== 68 || Math.abs(sh.gap - 75) > 1 || sh.scroll || sh.gh !== 84) errs.push('① 시트 치수');
  await t.screenshot({ path: `${SHOTS}/b26-remote-sheet.png` });
  await t.click('.rstep button[aria-label="1분 늘리기"]'); await wait(300);
  const rm = await rest('school/teacher/restMin'), rmin = (await rest(`rooms/${code}/state/rest`)).min; log('   분 ＋ → 기억', rm, '· 쉼터', rmin, '분'); if (rm !== 6 || rmin !== 6) errs.push('① 분 기억');
  // ② 폰 기다림
  const w2 = await ph[0].textContent('.fun .act .btn'); log('② 폰:', w2.trim(), '| 고리', (await ph[0].textContent('.fun .ring')).trim()); if (!/기다리는/.test(w2)) errs.push('② 폰 기다림');
  await ph[0].screenshot({ path: `${SHOTS}/b26-phone-wait.png` });
  // ③ ⚖ 밸런스 (3명 = 가위바위보)
  await t.click('.games .game:has-text("밸런스")'); await t.click('.sheet .act .btn.rbig'); await wait(1500);
  let f = await fun(); log('③ ⚖ 시작: rps', f.rps, '· 손', f.q.join(' '), '· 살아 있음', Object.keys(f.alive).length);
  const opts = await ph[0].$$eval('.fun .opt', (xs) => xs.length); log('   폰 선택지', opts, '개'); if (opts !== 3) errs.push('③ 가위바위보 3칸');
  await ph[0].click('.fun .opt >> nth=0'); await ph[1].click('.fun .opt >> nth=1'); await wait(500);
  await ph[0].screenshot({ path: `${SHOTS}/b26-phone-pick.png` });
  await tv.screenshot({ path: `${SHOTS}/b26-tv-pick.png` });
  const tvBox = await tv.textContent('.nbox').catch(() => ''); log('   TV 숫자 칸:', tvBox.replace(/\s+/g, ' ').trim()); if (!/살아남음/.test(tvBox)) errs.push('③ TV 숫자 칸');
  const dock = await tv.evaluate(() => { document.dispatchEvent(new MouseEvent('mousemove')); return [...document.querySelectorAll('.dock .t small')].map((x) => x.textContent).join(' '); }); log('   TV 막대:', dock); if (!/밸런스 반대로 OX 눈치게임 디펜스/.test(dock)) errs.push('③ TV 막대 놀이 5개');
  await wait(15500);
  f = await fun(); log('   판정:', f.phase, '· 💤', JSON.stringify(f.zz || {}), '· 남음', Object.keys(f.alive).join(','));
  await wait(700);
  const cov = await ph[2].$eval('.fun .cover', (x) => x.textContent.replace(/\s+/g, ' ').trim()).catch(() => ''); log('④ 안 고른 폰 덮개:', cov); if (!/관전 중/.test(cov) || !/다음 판부터 참여/.test(await ph[2].textContent('.fun .pmain'))) errs.push('④ 💤 덮개');
  await ph[2].screenshot({ path: `${SHOTS}/b26-phone-zz.png` });
  await ph[2].click('.fun .pmain'); await wait(300); const cov2 = await ph[2].$('.fun .cover'); log('   🙋 누름 → 덮개', cov2 ? '그대로' : '걷힘');
  if (cov2) errs.push('④ 🙋 뒤 덮개');
  await t.click('.rdock button:has-text("쉼터")'); await wait(300); await t.click('.sheet .act .btn.rbig'); await wait(800); log('   ■ 놀이 그만 →', await fun());
  await t.click('.sheet .x'); await wait(300);
  // 🔄 반대로 = TV 막대
  await tv.mouse.move(600, 400); await tv.click('.dock .t:has-text("반대로")'); await wait(1200); f = await fun(); log('🔄 TV 막대 → 놀이', f && f.kind, '· 판', f && f.n);
  if (!f || f.kind !== 'rev') errs.push('🔄 TV 시작');
  await tv.click('.dock .t:has-text("반대로")'); await wait(800);
  // ⭕ OX 타임(오늘) + 🔴 집중
  await t.click('.rdock button:has-text("쉼터")'); await t.click('.games .game:has-text("OX")'); await wait(200);
  const oxw = await t.$$eval('.oxw button', (xs) => xs.map((x) => x.textContent).join('/')); await t.click('.oxw button:has-text("오늘")'); await t.screenshot({ path: `${SHOTS}/b26-remote-ox.png` });
  await t.click('.sheet .act .btn.rbig'); await wait(1500); f = await fun(); log('⭕ OX(', oxw, ') 시작:', f.kind, '·', f.s);
  for (const p of ph) await p.click('.fun .opt >> nth=0');
  await t.click('.rdock button:has-text("집중")'); await wait(1500);
  const fz = await fun(), s1 = (await ph[0].textContent('.fun .ring')).trim(); await wait(2500); const s2 = (await ph[0].textContent('.fun .ring')).trim();
  log('🔴 집중: frz', !!fz.frz, '· 폰 초', s1, '→ 2.5초 뒤', s2); if (!fz.frz || s1 !== s2) errs.push('🔴 집중 멈춤');
  await t.click('.rdock button:has-text("집중")'); await wait(1500); const fu = await fun(); log('   풀림: frz', fu.frz ?? null, '· to 밀림', fu.to - fz.to, 'ms'); if (fu.frz != null || !(fu.to - fz.to > 2000)) errs.push('🔴 풀림');
  await wait(Math.max(0, fu.to - Date.now()) + 1500); f = await fun(); log('   OX 판정:', f.phase, '·', JSON.stringify(f.marks));
  await ph[0].screenshot({ path: `${SHOTS}/b26-phone-ox.png` });
  await t.click('.rdock button:has-text("쉼터")'); await t.click('.sheet .act .btn.rbig'); await wait(600); await t.click('.sheet .x').catch(() => {});
  // 🙊 눈치 끝까지
  await t.click('.rdock button:has-text("쉼터")'); await t.click('.games .game:has-text("눈치")'); await t.click('.sheet .act .btn.rbig'); await wait(4200);
  await ph[0].click('.fun .act .btn'); await wait(1200); await ph[1].click('.fun .act .btn'); await wait(1500);
  f = await fun(); log('🙊 눈치:', f.phase, '· 말함', JSON.stringify(f.said), '· 탈락', JSON.stringify(f.out));
  await tv.screenshot({ path: `${SHOTS}/b26-tv-nun.png` });
  await wait(5000); f = await fun(); log('   끝:', f.phase, '· 우승', (f.win || []).join(','));
  await wait(1500);
  const gifts = await rest('gifts'); const got = Object.entries(gifts || {}).map(([u, g]) => `${u}:${Object.values(g).map((x) => `💎${x.g}${x.x ? `+${x.x}EXP` : ''}(${x.fun})`).join(',')}`);
  log('   보상 gifts:', got.join(' | ')); if (!got.length) errs.push('🙊 보상 없음');
  await ph[0].screenshot({ path: `${SHOTS}/b26-phone-nun-end.png` });
  // 360×640 스크롤 0
  const sc = await Promise.all(ph.map((p) => p.evaluate(() => { const m = document.querySelector('.fun'); return m ? m.scrollHeight <= m.clientHeight + 1 && document.documentElement.scrollWidth <= innerWidth : 'x'; })));
  log('360×640 스크롤 없음:', sc.join(' ')); if (sc.some((x) => x !== true)) errs.push('스크롤');
  // 「다음 ▶」 = 쉼터 끝
  await t.click('.tact .btn'); await wait(1200); const st = await rest(`rooms/${code}/state`); log('리모컨 다음 ▶ → 쉼터', st.rest ?? null, '· 놀이', await fun());
  if (st.rest) errs.push('다음 ▶ 뒤 쉼터 남음');
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0');
  await b.close();
})();
