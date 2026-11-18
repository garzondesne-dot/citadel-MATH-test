// 🔑 #59 입장 열쇠 — 에뮬레이터 · 교사 실제 팩 올리기(v4 · keys) → 1-3 수업 열기 → 실제 학생 로그인(1-3 · 3번)
//   ① 팩 올리기 미리 보기 「🔑 열쇠 3」 · 서버 팩에 keys(엔진 꼴) ② 대기실 「🔑 열쇠 얻기 (0 / 3)」 → 판 0 한 문제씩 · 맞힘 = 획득 · 틀림 = 💡 + 정답 → 바로 🔑 (다시 풀기 없음)
//   ③ 리모컨 대기실 「🔑 열쇠 1 / 1 · 많이 틀린 열쇠」 ④ 수업 문제 2: (2) 🔑 · 첫 시도 다 맞힘 = 🎁 보물상자 ⑤ 열쇠 없는 학생 = 🔒 회색
//   ⑥ 🎯 허수아비 「🔑 열쇠 연습」 = 틀린 열쇠만 · 판 1 · 2 · 기록 bonus/…/review/keyp_ex-11 · 💎 = 스위치 끔(기록만)
const { chromium } = require('playwright');
const path = require('path');
const { rest, asAdmin } = require('./_emu.cjs');
const K = require('../pack-upload/keys/keys-11.json');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/', E = 'emu=127.0.0.1';
(async () => {
  await rest('', 'DELETE'); await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-citadel-test/accounts', { method: 'DELETE' }).catch(() => {});
  await rest('', 'PATCH', { roster: { '1-3': { 3: '시험삼', 4: '시험사' } }, rosterMask: { '1-3': { 3: '시*삼', 4: '시*사' } }, school: { features: { bundle: 'full', on: { hero: true, scarecrow: true } } } });
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const page = async (u, w = 390, h = 844) => { const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage(); p.on('pageerror', (e) => errs.push(String(e))); p.on('dialog', (d) => d.accept()); p.setDefaultTimeout(15000); await p.goto(`${B}${u}${u.includes('?') ? '&' : '?'}${E}`); return p; };
  // ── 교사: v4 팩 올리기 ──
  const t = await page('?role=teacher'); await t.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await asAdmin(t, '.tabs');
  await t.click('.tabs button:has-text("차시 팩")'); await t.waitForTimeout(400); await t.click('[data-k="packup-go"]');
  await t.setInputFiles('[data-k="packfile"]', path.join(__dirname, '../pack-upload/keys/ex-11-v4.json')); await t.waitForSelector('[data-k="packsum"]'); await t.waitForTimeout(600);
  const sum = (await t.textContent('[data-k="packsum"]')).replace(/\s+/g, ' ');
  ok('① 팩 올리기 미리 보기 = 검사 통과 · 🔑 열쇠 3', /검사 통과/.test(sum) && /🔑 열쇠 3/.test(sum), sum.slice(0, 160));
  await t.screenshot({ path: `${SHOTS}/k59-upload.png` });
  await t.evaluate(() => { window.__noReload = true; }); await t.click('.sheet .btn.pmain'); await t.waitForTimeout(2500);
  const srv = await rest('prep/packs/ex-11');
  ok('① 서버 팩 = keys 3 · 엔진 꼴(question · choices)', !!srv && Array.isArray(srv.keys) && srv.keys.length === 3 && !!srv.keys[0].vers[0].question && Array.isArray(srv.keys[0].vers[0].choices), srv && srv.keys ? srv.keys.map((k) => k.name).join(' · ') : '없음');
  await t.goto(`${B}?role=teacher&${E}`); await t.waitForSelector('.tabs', { timeout: 20000 }); await t.waitForTimeout(800);
  // ── 교사: 1-3 · 11차시 수업 열기 ──
  await t.click('.tabs button:has-text("수업")'); await t.waitForTimeout(400);
  await t.click('[data-k="cls-row"] button:has-text("1-3")'); await t.waitForTimeout(200); await t.click('.pk[data-no="11"]'); await t.waitForTimeout(200);
  await t.click('[data-k="open-go"]'); await t.waitForTimeout(400); if (await t.$('[data-k="open-yes"]')) await t.click('[data-k="open-yes"]'); await t.waitForTimeout(1500);
  const live = await rest('school/live'); ok('1-3 · 11차시 수업 열림', !!live && live.cls === '1-3' && live.lesson === 'ex-11', JSON.stringify(live));
  const code = live && live.code;
  // ── 학생: 실제 로그인 (1-3 · 3번) → 던전 입장 → 대기실 ──
  const s = await page('');
  await s.waitForSelector('.title', { timeout: 20000 }); await s.waitForTimeout(800);
  await s.selectOption('select >> nth=0', '1-3'); await s.waitForTimeout(200); await s.selectOption('select >> nth=1', '3'); await s.waitForTimeout(300);
  if (!(await s.$('.pw:has(small)'))) await s.click('.lk:has-text("가입")');
  await s.click('.pw >> nth=0'); for (const k of '12341234') await s.click(`.pad button:text-is("${k}")`);
  await s.click('.title .act .pmain'); await s.waitForTimeout(3500);
  const fh = await s.$('button:has-text("과 시작"), button:has-text("와 시작")'); if (fh) { await fh.click(); await s.waitForTimeout(1200); }
  await s.click('button.pmain:has-text("던전 입장")'); await s.waitForSelector('[data-k="key-gate"]', { timeout: 15000 });
  const g0 = (await s.textContent('[data-k="key-go"]')).replace(/\s+/g, ' ');
  ok('② 대기실 = 「🔑 열쇠 얻기 (0 / 3)」', /🔑 열쇠 얻기 \(0 \/ 3\)/.test(g0), g0);
  await s.screenshot({ path: `${SHOTS}/k59-lobby.png` });
  await s.click('[data-k="key-go"]'); await s.waitForSelector('[data-k="key-sheet"]');
  const ans = (id, right) => { const v = K.keys.find((x) => x.id === id).vers[0], i = Number(v.a); return v.ch[right ? i : (i + 1) % v.ch.length]; };
  const pick = async (txt) => { await s.click(`[data-k="key-sheet"] .opt:text-is("${txt}")`); await s.click('.sheet .pmain'); await s.waitForTimeout(400); };
  await pick(ans('k1', true)); ok('② 열쇠 1 맞힘 = 「🔑 열쇠 획득!」', !!(await s.$('[data-k="key-ok"]')));
  await s.click('.sheet .pmain'); await s.waitForTimeout(300);
  await pick(ans('k2', false)); const no = (await s.textContent('[data-k="key-no"]').catch(() => '')).replace(/\s+/g, ' ');
  ok('② 열쇠 2 틀림 = 💡 한 줄 + 정답 · 다시 풀기 없음 · 🔑 받음', /💡/.test(no) && /답 = 2k² − 2k/.test(no) && !(await s.$('.sheet .pmain:has-text("다시")')), no.slice(0, 90));
  await s.screenshot({ path: `${SHOTS}/k59-wrong.png` });
  await s.click('.sheet .pmain'); await s.waitForTimeout(300); await pick(ans('k3', true)); await s.click('.sheet .pmain'); await s.waitForTimeout(500);
  const pk = await rest(`rooms/${code}/players/s1_3_3/keys`);
  ok('② 기록 = k1 ok · k2 틀림(ok false) · k3 ok', pk && pk.k1?.ok === true && pk.k2?.ok === false && pk.k3?.ok === true, JSON.stringify(pk));
  ok('② 다 모음 = 「🔑 열쇠 3개 준비 끝!」', /준비 끝/.test(await s.textContent('[data-k="key-gate"]')));
  await s.screenshot({ path: `${SHOTS}/k59-lobby-done.png` });
  // ── 리모컨 대기실 ──
  await t.waitForTimeout(800);
  const kl = (await t.textContent('[data-k="key-stats"]').catch(() => '')).replace(/\s+/g, ' ');
  ok('③ 리모컨 대기실 = 「🔑 열쇠 1 / 1 · 많이 틀린 열쇠 = 2( ) + 1 꼴로 묶기(1명)」', /🔑 열쇠 1 \/ 1/.test(kl) && /많이 틀린 열쇠 = 2\( \) \+ 1 꼴로 묶기\(1명\)/.test(kl), kl);
  await t.screenshot({ path: `${SHOTS}/k59-remote.png` });
  // ── 수업: 문제 2 (단계 4) 로 바로 · 정찰 0 ──
  await rest(`rooms/${code}/meta/solve`, 'PUT', 0);
  await rest(`rooms/${code}/state`, 'PATCH', { step: 4, stepAt: Date.now() });
  await s.waitForSelector('[data-k="key-tag"]', { timeout: 15000 }).catch(() => {});
  const mon = await rest('prep/packs/ex-11/monsters/m2/first');
  for (let i = 0; i < mon.length; i++) {
    const tag = await s.$eval('[data-k="key-tag"]', (e) => e.textContent.trim()).catch(() => '');
    if (i === 1) { ok('④ 소문제 2 위 = 「🔑 배수를 식으로」(금빛)', /🔑 배수를 식으로/.test(tag), tag); await s.screenshot({ path: `${SHOTS}/k59-tag.png` }); }
    if (i === 0) ok('④ 소문제 1 = 열쇠 없는 칸 = 꼬리표 없음', !tag, tag);
    await s.click(`.opt:text-is("${mon[i].choices[mon[i].answerIndex]}")`); await s.waitForTimeout(150);
    await s.click('.line .pmain, button.pmain').catch(() => {}); await s.waitForTimeout(500);
  }
  await s.waitForSelector('[data-k="key-chest"][data-chest="1"]', { timeout: 8000 }).catch(() => {});
  const ch = (await s.textContent('[data-k="key-chest"]').catch(() => '')).replace(/\s+/g, ' ');
  ok('④ 첫 시도 다 맞힘 = 「🔑 열쇠 사용! → 🎁 보물상자 💎 +3」', /열쇠 사용!/.test(ch) && /보물상자 · 💎 \+3/.test(ch), ch);
  await s.screenshot({ path: `${SHOTS}/k59-chest.png` });
  // ── 열쇠 없는 학생 (1-3 · 4번) = 🔒 ──
  const s2 = await page('');
  await s2.waitForSelector('.title', { timeout: 20000 }); await s2.waitForTimeout(800);
  await s2.selectOption('select >> nth=0', '1-3'); await s2.waitForTimeout(200); await s2.selectOption('select >> nth=1', '4'); await s2.waitForTimeout(300);
  if (!(await s2.$('.pw:has(small)'))) await s2.click('.lk:has-text("가입")');
  await s2.click('.pw >> nth=0'); for (const k of '43214321') await s2.click(`.pad button:text-is("${k}")`);
  await s2.click('.title .act .pmain'); await s2.waitForTimeout(3500);
  const fh2 = await s2.$('button:has-text("과 시작"), button:has-text("와 시작")'); if (fh2) { await fh2.click(); await s2.waitForTimeout(1200); }
  await s2.click('button.pmain:has-text("던전 입장")').catch(() => {}); await s2.waitForTimeout(2500);
  ok('⑤ 첫 몬스터 뒤 = 열쇠 얻기 단추 없음', !(await s2.$('[data-k="key-go"], [data-k="key-band"]')));
  await s2.click('.opt >> nth=0').catch(() => {}); await s2.click('button.pmain').catch(() => {}); await s2.waitForTimeout(600);
  const t2 = await s2.$eval('[data-k="key-tag"]', (e) => `${e.dataset.have}|${e.textContent.trim()}`).catch(() => '');
  ok('⑤ 열쇠 없는 학생 = 「🔒 배수를 식으로」(회색)', /^0\|🔒 배수를 식으로/.test(t2), t2);
  await s2.screenshot({ path: `${SHOTS}/k59-lock.png` });
  // ── 🎯 허수아비 열쇠 연습 (수업 기록 = k2 틀림) ──
  await rest('records/1-3/3/ex-11', 'PUT', { at: 1, no: 11, code, mons: { m1: 'o', m2: 'o' }, keys: { n: 3, got: 3, first: 2, by: { k1: 'o', k2: 'x', k3: 'o' }, chest: 2, use: 2, cells: {} } });
  await rest('school/last/1-3', 'PUT', { lesson: 'ex-11', no: 11, at: 1, done: true, code });
  await rest('school/live', 'DELETE');
  await s.goto(`${B}?${E}`); await s.waitForTimeout(3500);
  for (let k = 0; k < 3 && (await s.$('.sheet .x')); k++) { await s.$eval('.sheet .x', (e) => e.click()).catch(() => {}); await s.waitForTimeout(400); }
  await s.waitForSelector('[data-prop="scare"]', { timeout: 15000 }); await s.$eval('[data-prop="scare"]', (e) => e.click()); await s.waitForSelector('[data-k="dummy-list"]'); await s.waitForTimeout(500);
  const kr = (await s.$eval('[data-lesson="ex-11"] [data-k="key-row"]', (e) => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => ''));
  ok('⑥ 허수아비 11차시 = 「🔑 열쇠 연습 · 2( ) + 1 꼴로 묶기」(틀린 열쇠만)', /열쇠 연습/.test(kr) && /2\( \) \+ 1 꼴로 묶기/.test(kr) && !/배수를 식으로/.test(kr), kr);
  await s.$eval('[data-lesson="ex-11"] [data-k="key-row"]', (e) => e.scrollIntoView({ block: 'center' })); await s.screenshot({ path: `${SHOTS}/k59-dummy.png` });
  await s.click('[data-lesson="ex-11"] [data-k="key-prac"]'); await s.waitForSelector('[data-k="key-practice"]');
  const v = K.keys.find((x) => x.id === 'k2').vers;
  const pt1 = (await s.textContent('[data-k="key-practice"]')).replace(/\s+/g, ' ');
  ok('⑥ 연습 = 판 1 (숫자 바뀐 판 · 판 0 아님)', pt1.includes(v[1].q.slice(0, 12)) && !pt1.includes(v[0].q.slice(0, 20)), pt1.slice(0, 80));
  await s.click(`[data-k="key-practice"] .opt:text-is("${v[1].ch[Number(v[1].a)]}")`); await s.click('.sheet .pmain'); await s.waitForTimeout(300); await s.click('.sheet .pmain'); await s.waitForTimeout(300);
  await s.click(`[data-k="key-practice"] .opt:text-is("${v[2].ch[(Number(v[2].a) + 1) % v[2].ch.length]}")`); await s.click('.sheet .pmain'); await s.waitForTimeout(300);
  ok('⑥ 판 2 틀림 = 💡 + 정답', /💡/.test(await s.textContent('[data-k="kp-no"]').catch(() => '')));
  await s.click('.sheet .pmain'); await s.waitForTimeout(800);
  const kp = await rest('bonus/1-3/3/review/keyp_ex-11'), gl = await rest('gem/1-3/3/log/keyp_ex-11');
  ok('⑥ 기록 = k2 맞힘 1 · 연습 1번 · 다 맞히지 못함 = 💎 없음', kp && kp.k2 === 1 && kp.n === 1 && !gl, JSON.stringify(kp));
  await s.click('.sheet .pmain'); await s.waitForTimeout(500); // 결과 창 → 허수아비로
  // 다시 = 판 1 · 2 다 맞힘 → 💎 +1 (차시마다 한 번 · 스위치 기본 켬)
  await s.click('[data-lesson="ex-11"] [data-k="key-prac"]'); await s.waitForSelector('[data-k="key-practice"]');
  for (const j of [1, 2]) { await s.click(`[data-k="key-practice"] .opt:text-is("${v[j].ch[Number(v[j].a)]}")`); await s.click('.sheet .pmain'); await s.waitForTimeout(300); await s.click('.sheet .pmain'); await s.waitForTimeout(400); }
  const gl2 = await rest('gem/1-3/3/log/keyp_ex-11'); ok('⑥ 다 맞힘 = 💎 +1 (gem log keyp_ex-11)', gl2 && gl2.g === 1, JSON.stringify(gl2));
  await s.screenshot({ path: `${SHOTS}/k59-dummy-done.png` });
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
