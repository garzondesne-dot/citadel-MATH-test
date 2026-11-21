// 🗺 게시판 던전 조우 · 정찰 (📜 요청 #69) — 이 기기 · 미리 보기 서버 4173
//   ① 1인 처음 = 조우(어둡게 · 이름 띠 · 쿵) → 정찰 카드(약점 · 공격 3종 → 역할 · 내 임무 · 분노 30%) · 그동안 엔진 멈춤 → 「⚔ 준비 완료」 = 일찍 3 · 2 · 1 → 전투
//   ② 같은 차시 다시 = 조우 1초 · 정찰 5초 + 「⏭ 건너뛰기」 ③ 4인(나 + 봇 3) = 봇 바로 준비 · 정찰 시간 다 되면 저절로 ④ 두 폰(?role=atbnet2) = 모두 준비해야 시작 ⑤ 세로 90° 돌림
//   node tools/e2e/atbintro.cjs [캡처 폴더]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/?role=atb';
(async () => {
  const b = await chromium.launch(), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const start = async (pg, { no = '6', size } = {}) => {
    await pg.waitForSelector('[data-k="atb-setup"]'); await pg.click(`[data-k="atb-setup"] .chips button[data-no="${no}"]`); await pg.click('[data-k="atb-mode-play"]');
    if (size) await pg.click(`[data-k="atb-setup"] .chips button:has-text("${size}인")`);
    await pg.click('[data-k="atb-start"]'); await pg.waitForSelector('[data-k="atb-stage"]');
  };
  const phase = (pg) => pg.evaluate(() => document.querySelector('[data-k="atb-intro"]')?.getAttribute('data-phase') ?? 'fight');
  const t = (pg) => pg.evaluate(() => globalThis.__atb.S.t);

  // ① 1인 처음
  const p = await b.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 }); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B); await p.evaluate(() => localStorage.clear()); await p.reload(); await start(p, { size: 1 });
  await p.waitForTimeout(500); ok('① 조우 = 어둡게 · 보스 이름 띠 · 보스 쿵', (await phase(p)) === 'meet' && !!(await p.$('[data-k="atb-intro-name"]')) && !!(await p.$('.boss.drop')), await p.textContent('[data-k="atb-intro-name"]'));
  await p.screenshot({ path: `${SHOTS}/atb-r69-meet-844.png` });
  await p.waitForTimeout(2400); ok('① 정찰 카드', (await phase(p)) === 'scout' && !!(await p.$('[data-k="atb-scout"]')));
  ok('#64 조우 = 등장 대사', /뒤집어도/.test(await p.textContent('[data-k="atb-intro-line"]')), await p.textContent('[data-k="atb-intro-line"]'));
  const card = await p.textContent('[data-k="atb-scout"]');
  ok('① 카드 = 약점 · 공격 3종 → 탱커 · 서포터 · 딜러 · 내 임무 · 분노 30%', /약점/.test(card) && /탱커/.test(card) && /서포터/.test(card) && /딜러/.test(card) && /내 임무/.test(card) && /30%/.test(card), card.replace(/\s+/g, ' ').slice(0, 160));
  ok('① 정찰 = 10초 남음 표시', /⏳ (9|10)초/.test(await p.textContent('[data-k="atb-scout-left"]')));
  await p.screenshot({ path: `${SHOTS}/atb-r69-scout-844.png` });
  await p.waitForTimeout(1500); ok('① 정찰 중 엔진 멈춤 (시간 0 · 보스 시계 0)', (await t(p)) === 0 && (await p.evaluate(() => globalThis.__atb.S.bossT)) === 0);
  await p.click('[data-k="atb-scout-go"]'); await p.waitForTimeout(300); ok('① 준비 완료 = 바로 3 · 2 · 1', (await phase(p)) === 'count', await p.textContent('[data-k="atb-intro-count"]'));
  await p.screenshot({ path: `${SHOTS}/atb-r69-count-844.png` });
  await p.waitForTimeout(3300); ok('① 셈 끝 = 전투 (시간 흐름)', (await phase(p)) === 'fight' && (await t(p)) > 0);
  // 💬 #64 보스 대사: 분노 · 쓰러질 때
  await p.evaluate(() => { const S = globalThis.__atb.S; S.evN++; S.ev.push({ k: 'rage', t: S.t, on: 'rage', n: S.evN }); }); await p.waitForTimeout(1300);
  const rs = await p.textContent('[data-k="atb-boss-say"][data-say="rage"]').catch(() => ''); ok('#64 분노 = 보스 말풍선', /숨만 고르면/.test(rs), rs);
  await p.screenshot({ path: `${SHOTS}/atb-r64-rage-844.png` });
  // 판 끝 = 이 차시 만남 기록
  await p.waitForTimeout(2000); await p.evaluate(() => { const S = globalThis.__atb.S; S.end = { win: true, why: '', t: S.t }; }); await p.waitForTimeout(600);
  const ds = await p.textContent('[data-k="atb-boss-say"][data-say="down"]').catch(() => ''); ok('#64 이김 = 「쓰러질 때」 말풍선 (결과 직전)', /숨이 닿지/.test(ds), ds);
  await p.screenshot({ path: `${SHOTS}/atb-r64-down-844.png` }); await p.waitForTimeout(2600);
  ok('#64 말풍선 뒤 결과 화면 · 연습방 = 공적 없음 문구', !!(await p.$('[data-k="atb-nomerit"]')), await p.textContent('[data-k="atb-nomerit"]').catch(() => ''));
  ok('① 판 끝 = 만남 기록 (atb-met:6)', (await p.evaluate(() => localStorage.getItem('atb-met:6'))) === '1');

  // ② 같은 차시 다시 = 짧게
  await p.goto(B); await start(p, { size: 1 }); await p.waitForTimeout(1300);
  ok('② 다시 = 조우 1초 뒤 정찰', (await phase(p)) === 'scout');
  ok('② 정찰 5초 · 「⏭ 건너뛰기」', /⏳ [345]초/.test(await p.textContent('[data-k="atb-scout-left"]')) && /건너뛰기/.test(await p.textContent('[data-k="atb-scout-go"]')));
  await p.waitForTimeout(5000); ok('② 정찰 시간 끝 = 저절로 셈 · 전투', ['count', 'fight'].includes(await phase(p)));
  await p.close();

  // ③ 4인 (나 + 봇 3) · 처음 차시 = 봇 준비 표시 · 시간 다 되면 저절로
  const q = await b.newPage({ viewport: { width: 844, height: 390 } }); q.on('pageerror', (e) => errs.push(String(e)));
  await q.goto(B); await q.evaluate(() => localStorage.clear()); await q.reload(); await start(q, { no: '9', size: 4 }); await q.waitForTimeout(2900);
  const rd = await q.textContent('[data-k="atb-scout-ready"]').catch(() => '');
  ok('③ 4인 = 봇 3 준비 ✔ · 나 …', (rd.match(/✔/g) || []).length === 3 && /…/.test(rd), rd.replace(/\s+/g, ' '));
  await q.waitForTimeout(10500); ok('③ 정찰 10초 끝 = 저절로 셈', ['count', 'fight'].includes(await phase(q)));
  await q.waitForTimeout(3500); ok('③ 전투 시작 = 봇이 움직임', (await phase(q)) === 'fight' && (await t(q)) > 0);
  await q.close();

  // ⑤ 세로 90° 돌림
  const v = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); v.on('pageerror', (e) => errs.push(String(e)));
  await v.goto(B); await v.evaluate(() => localStorage.clear()); await v.reload(); await start(v, { size: 1 }); await v.waitForTimeout(2900);
  const fit = await v.evaluate(() => { const c = document.querySelector('[data-k="atb-scout"]')?.getBoundingClientRect(), g = document.querySelector('[data-k="atb-scout-go"]')?.getBoundingClientRect(); return !!c && !!g && g.left >= 0 && g.right <= innerWidth && g.top >= 0 && g.bottom <= innerHeight; });
  ok('⑤ 세로 90° = 정찰 카드 · 준비 단추 화면 안', fit); await v.screenshot({ path: `${SHOTS}/atb-r69-scout-rot-390.png` });
  await v.tap('[data-k="atb-scout-go"]'); await v.waitForTimeout(3500); ok('⑤ 세로 = 준비 → 전투', (await phase(v)) === 'fight');
  await v.close();

  // ④ 두 폰 = 모두 준비해야 시작
  const n = await b.newPage({ viewport: { width: 860, height: 800 } }); n.on('pageerror', (e) => errs.push(String(e)));
  await n.goto('http://localhost:4173/?role=atbnet2'); await n.waitForSelector('[data-k="phone-2"]');
  const fr = async (i) => (await (await n.$(`[data-k="phone-${i}"]`)).contentFrame());
  const A = await fr(1), C = await fr(2); await A.waitForSelector('[data-k="atb-stage"]', { timeout: 15000 }); await C.waitForSelector('[data-k="atb-stage"]', { timeout: 15000 });
  await A.waitForSelector('[data-k="atb-scout-go"]', { timeout: 8000 }); await C.waitForSelector('[data-k="atb-scout-go"]', { timeout: 8000 });
  await A.click('[data-k="atb-scout-go"]'); await n.waitForTimeout(2200);
  ok('④ 한 폰만 준비 = 아직 정찰 (둘 다)', (await phase(A)) === 'scout' && (await phase(C)) === 'scout', `${await phase(A)}/${await phase(C)}`);
  const rA = await A.textContent('[data-k="atb-scout-ready"]'); ok('④ 준비 표시가 친구 폰에도', (await C.textContent('[data-k="atb-scout-ready"]')).includes('✔') && rA.includes('✔'));
  await C.click('[data-k="atb-scout-go"]'); await n.waitForTimeout(2200);
  ok('④ 둘 다 준비 = 둘 다 셈', ['count', 'fight'].includes(await phase(A)) && ['count', 'fight'].includes(await phase(C)), `${await phase(A)}/${await phase(C)}`);
  await n.waitForTimeout(3500); ok('④ 전투 시작 = 같이', (await phase(A)) === 'fight' && (await phase(C)) === 'fight');
  await n.close();

  ok('오류 0', errs.filter((e) => !/^[①-⑤]/.test(e)).length === 0, errs.filter((e) => !/^[①-⑤]/.test(e)).slice(0, 3).join(' | '));
  console.log(out.join('\n')); await b.close(); process.exit(errs.length ? 1 : 0);
})();
