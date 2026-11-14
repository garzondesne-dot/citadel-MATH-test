// ⚖ 🔄 ⭕ ✊✌✋ 쉼터 놀이 연출 = 정식 fun.js animate 그대로 (📜 2026-11-15 선생님 「미니게임 기믹이 너무 없어 · 고르면 이동하고 떨어지거나 날아갔는데」)
//   이 기기 모드(서버 없음) · 교사 폰 · 교실 TV 1280 × 720 · 학생 폰 390 × 844 한 브라우저 · 가상 학생 8명(방 players 에만)
//   놀이 상태는 시험이 직접 씀(drv = 먼 미래 → 어느 기기도 시계를 맡지 않음) → 공개 연출 시간표를 TV · 폰에서 함께 확인
//   ⚖ 0.3초 우르르(run-l/r) · 2.0초 금빛 번쩍(flash) · 2.6초 6조각 · 먼지 · 추락(fall · tumble) · 흔들림(fa-quake) · 내 쪽이면 진동
//   🔄 안내 방송(판 시작) · 1.9초 전광판 hot · 숫자 줄어듦 · 띠용(plat.fall) · ⭕ 수학 OX 무너지는 그림 → ox-drop · ✊✌✋ 손 돌다 멈춤 · 진 사람 회색 · 👀 관객 · 💤 관전
//   사용: npx vite build → npx vite preview --port 4173 → NODE_PATH=$(npm root -g) node tools/e2e/funfx.cjs <그림 폴더>
const { chromium } = require('playwright');
const [SHOTS = '.'] = process.argv.slice(2), B = 'http://localhost:4173/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(), errs = [], out = [];
  const ok = (n, c, i = '') => { const line = `${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`; out.push(line); console.log(line); if (!c) errs.push(n); };
  const ctx = await b.newContext();
  await ctx.addInitScript(() => { window.__qk = []; let was = false; setInterval(() => { const on = !!document.querySelector('.fa-arena.fa-quake'); if (on && !was) window.__qk.push(Date.now()); was = on; }, 25); window.__vib = []; try { Object.defineProperty(navigator, 'vibrate', { configurable: true, value: (p) => { window.__vib.push(p); return true; } }); } catch { /* 무시 */ } });
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push(`교사 ${e}`)); await t.setViewportSize({ width: 400, height: 860 });
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tabs');
  await t.click('.tabs button:has-text("준비")'); await t.click('[data-k="lpick-go"]'); await t.click('[data-k="lpick"] .grid [data-id="set-02"]'); await t.click('.tact .btn'); await t.waitForSelector('.att');
  const code = await t.evaluate(() => window.__dbGet('school/live').code);
  const ph = await ctx.newPage(); ph.on('pageerror', (e) => errs.push(`폰 ${e}`)); await ph.setViewportSize({ width: 390, height: 844 });
  await ph.goto(`${B}?role=student&room=${code}&as=1-1:3`); await wait(2000);
  const tv = await ctx.newPage(); tv.on('pageerror', (e) => errs.push(`TV ${e}`)); await tv.setViewportSize({ width: 1280, height: 720 });
  await tv.goto(`${B}?role=hall&room=${code}`); await tv.waitForSelector('nav.dock', { timeout: 20000 }); await wait(1000);
  await t.waitForFunction(() => !document.querySelector('.tact .btn')?.disabled, null, { timeout: 15000 }).catch(() => {});
  await t.click('.tact .btn'); await wait(1500); // ▶ 수업 시작
  const me = await tv.evaluate((c) => Object.entries(window.__dbGet(`rooms/${c}/players`) || {}).find(([, p]) => !p.teacher && Number(p.num) === 3)?.[0], code);
  ok('학생 폰 입장', !!me, me);
  // 가상 학생 8명 (fk1 ~ fk8) · 2초마다 접속 신호
  await tv.evaluate((c) => { const put = () => { for (let i = 1; i <= 8; i++) window.__dbSet(`rooms/${c}/players/fk${i}`, { num: 10 + i, nick: ['가람', '나래', '다온', '라온', '마루', '바다', '사랑', '아라'][i - 1], hero: (i * 3) % 30, seen: Date.now(), cls: '1-1' }); }; put(); setInterval(put, 2000); }, code);
  await tv.evaluate((c) => window.__dbSet(`rooms/${c}/state/rest`, { at: Date.now(), min: 10 }), code); await wait(800);
  const FK = (n) => `fk${n}`;
  // 놀이 상태 쓰기 (drv = 먼 미래 → 시계를 아무도 안 맡음 · 시험이 시간표를 쥠)
  const setFun = (f) => tv.evaluate(([c, f]) => { const now = Date.now(); window.__dbSet(`rooms/${c}/fun`, { g: now, total: 9, at0: now, queue: [0, 1, 2], outAt: {}, qi: 0, s: null, ans: null, why: null, final: false, from: now, drv: { u: 'test', at: now + 600000 }, ...f, to: f.phase === 'pick' ? now + 15000 : now, until: f.phase === 'show' ? now + 6500 : null }); return now; }, [code, f]);
  const probe = (p) => p.evaluate(() => { const A = document.querySelector('.fa-arena'); if (!A) return null; const q = (s) => A.querySelectorAll(s).length;
    return { st: A.dataset.st, run: q('.fa-h.run-l') + q('.fa-h.run-r'), flashA: q('.fa-plat.a.flash'), flashB: q('.fa-plat.b.flash'), broken: q('.fa-plat.broken'), pieces: q('.fa-piece'), dust: q('.fa-dust'), fall: q('.fa-h.fall.tumble'), quake: A.classList.contains('fa-quake'), hot: q('.fa-board.hot'), board: A.querySelector('.fa-board b')?.textContent ?? '', boing: q('.fa-plat.fall'), oxdrop: q('.fa-plat.ox-drop'), plb: A.querySelector('.fa-plat.b')?.style.backgroundImage ?? '', lost: q('.fa-h.fa-lost'), hand: q('.fa-hand'), spin: q('.fa-rps b.spin'), stop: q('.fa-rps.stop'), ann: q('.fa-ann'), gal: q('.fa-g'), gn: A.querySelector('.fa-gn')?.textContent ?? '', figs: q('.fa-h'), meFall: q('.fa-h.me.fall') }; });
  const both = async (tag) => { const [a, c] = await Promise.all([probe(tv), probe(ph)]); return { tv: a, ph: c, tag }; };
  let T0 = 0; const shot = async (n) => { const d = T0 ? ` @${((Date.now() - T0) / 1000).toFixed(2)}s` : ''; await Promise.all([tv.screenshot({ path: `${SHOTS}/funfx-${n}-tv.jpg`, type: 'jpeg', quality: 70 }), ph.screenshot({ path: `${SHOTS}/funfx-${n}-phone.jpg`, type: 'jpeg', quality: 70 })]); console.log(`   📸 funfx-${n}${d}`); };
  // 📸 시간표 그림: 같은 판을 그림마다 새로 띄워(그림 찍는 동안 화면이 멈춰 다음 시각이 밀리지 않게) 그 시각에 TV · 폰을 함께 찍음
  const film = async (tag, f, times) => { for (const ms of times) { T0 = await setFun(f); await at(T0, ms); await shot(`${tag}-${(ms / 1000).toFixed(1)}s`); await wait(Math.max(0, 4200 - ms)); } };
  const at = async (t0, ms) => { const d = t0 + ms - Date.now(); if (d > 0) await wait(d); };
  const alive = (us) => Object.fromEntries(us.map((u) => [u, true]));
  const sfxLog = () => tv.evaluate(() => (window.__sfxLog || []).slice());

  // ── ⚖ 밸런스: 고르기(관객 · 💤) → 공개 ──
  const A1 = [me, FK(1), FK(2)], B1 = [FK(3), FK(4), FK(5), FK(6), FK(7)];
  await setFun({ kind: 'bal', n: 3, rk: 'r3', rps: false, q: ['평생 짜장면만', '평생 짬뽕만'], phase: 'pick', res: null, alive: alive([...A1, ...B1]), zz: { [FK(8)]: 3 } }); await wait(900);
  let p = await both('pick');
  ok('⚖ 고르기: 광장에 8명 · 관객석 1명(👀) · TV 💤 관전', p.tv && p.tv.figs === 8 && p.tv.gal === 1 && /관객 1/.test(p.tv.gn) && (await tv.$('.ov.fun h3 .zz')) != null && p.ph && p.ph.figs === 8, JSON.stringify({ tv: p.tv && [p.tv.figs, p.tv.gal, p.tv.gn], ph: p.ph && p.ph.figs }));
  await shot('bal-0-pick');
  await tv.evaluate(() => { if (window.__sfxLog) window.__sfxLog.length = 0; });
  const SHOW_BAL = { kind: 'bal', n: 3, rk: 'r3', rps: false, q: ['평생 짜장면만', '평생 짬뽕만'], phase: 'show', alive: alive(B1), outAt: Object.fromEntries(A1.map((u) => [u, 3])), res: { a: A1, b: B1, none: [], lose: 'a', out: A1, voided: false, sa: 0, sb: 0 } };
  let t0 = T0 = await setFun(SHOW_BAL);
  await at(t0, 120); p = await both('0.1');
  ok('⚖ 0.1초: 아직 광장(달리기 전)', p.tv.run === 0 && p.ph.run === 0 && p.tv.st === '0', `${p.tv.st}/${p.tv.run}`);
  await at(t0, 600); p = await both('0.6');
  ok('⚖ 0.3초 뒤: 자기 쪽 발판으로 우르르 (run-l · run-r 8명 · TV · 폰)', p.tv.run === 8 && p.ph.run === 8, `TV ${p.tv.run} · 폰 ${p.ph.run}`);
  await at(t0, 2200); p = await both('2.2');
  ok('⚖ 2.0초: 진 쪽 발판 금빛 번쩍 (flash · 금 간 칸)', p.tv.flashA === 1 && p.ph.flashA === 1 && p.tv.broken === 0, JSON.stringify([p.tv.flashA, p.ph.flashA, p.tv.broken]));
  await at(t0, 2850); p = await both('2.85');
  ok('⚖ 2.6초: 발판 6조각 · 먼지 · 3명 빙글 추락', p.tv.broken === 1 && p.tv.pieces === 6 && p.tv.dust >= 1 && p.tv.fall === 3 && p.ph.pieces === 6 && p.ph.fall === 3, JSON.stringify({ tv: [p.tv.pieces, p.tv.dust, p.tv.fall], ph: [p.ph.pieces, p.ph.fall] }));
  { const qk = await Promise.all([tv, ph].map((x) => x.evaluate(() => window.__qk.slice()))), rel = qk.map((a) => a.map((x) => x - t0).filter((d) => d > 0)); ok('⚖ 2.6초: 화면 흔들림(fa-quake) TV · 폰', rel.every((a) => a.some((d) => d >= 2500 && d <= 3100)), JSON.stringify(rel)); }
  ok('⚖ 2.6초: 내 용사도 떨어짐 + 폰 진동', p.ph.meFall === 1 && (await ph.evaluate(() => window.__vib.length)) === 1, JSON.stringify(await ph.evaluate(() => window.__vib)));
  { const cv = await ph.$('.fun .cover'), mt = await ph.textContent('.fun p.me').catch(() => ''); ok('⚖ 공개 중 탈락한 폰 = 덮개 없이 무대 + 「탈락」 글', !cv && /탈락/.test(mt), `덮개 ${!!cv} · ${mt}`); }
  const s1 = await sfxLog(); ok('⚖ 소리: 우르르 · 쾅 · 무너짐 (TV)', ['wind', 'smash', 'hurt'].every((k) => s1.includes(k)) && s1.some((k) => /^block/.test(k)), s1.join(' '));
  await at(t0, 4000); p = await both('4.0');
  ok('⚖ 4.0초: 공개 화면 그대로(판정 글 · 무대 남음)', p.tv && p.tv.broken === 1 && (await tv.$('.ov.fun .ver')) != null && (await ph.$('.fun .ver')) != null);
  await film('bal', SHOW_BAL, [300, 2000, 2600, 4000]);

  // ── 🔄 반대로: 안내 방송 → 공개 (많은 쪽 탈락) ──
  const A2 = [FK(1), FK(2), FK(3), FK(4), FK(5)], B2 = [me, FK(6), FK(7)];
  await setFun({ kind: 'rev', n: 1, rk: 'r1', rps: false, q: ['아침형 인간', '저녁형 인간'], phase: 'pick', res: null, alive: alive([...A2, ...B2]), zz: null }); await wait(1300);
  p = await both('rev-pick'); await shot('rev-0-ann');
  ok('🔄 판 시작 안내 방송(📢) · 전광판 08 · TV 번호표 + 이름', p.tv.ann === 1 && p.ph.ann === 1 && p.tv.board === '08' && (await tv.$$('.fa-arena .fa-nm')).length === 8, `${p.tv.ann}/${p.tv.board}`);
  const vib0 = await ph.evaluate(() => window.__vib.length);
  const SHOW_REV = { kind: 'rev', n: 1, rk: 'r1', rps: false, q: ['아침형 인간', '저녁형 인간'], phase: 'show', alive: alive(B2), res: { a: A2, b: B2, none: [], lose: 'a', out: A2, voided: false, sa: 0, sb: 0 } };
  t0 = T0 = await setFun(SHOW_REV);
  await at(t0, 2150); p = await both('rev-2.1');
  ok('🔄 1.9초: 버저 → 전광판 빨갛게 (아직 08)', p.tv.hot === 1 && p.ph.hot === 1 && p.tv.board === '08', `${p.tv.hot}/${p.tv.board}`);
  await at(t0, 2800); p = await both('rev-2.8');
  ok('🔄 2.4초: 숫자 줄어듦 08 → 03 · 2.6초 스프링 띠용 · 5명 날아감', p.tv.board === '03' && p.tv.boing === 1 && p.tv.fall === 5 && p.ph.boing === 1 && p.tv.pieces === 0, JSON.stringify([p.tv.board, p.tv.boing, p.tv.fall, p.ph.boing]));
  await wait(500); ok('🔄 소리: 띠용(dizzy)', (await sfxLog()).includes('dizzy'));
  ok('🔄 내 쪽이 아니면 진동 없음', (await ph.evaluate(() => window.__vib.length)) === vib0);
  await film('rev', SHOW_REV, [1900, 2400, 2600, 3200]);

  // ── ⭕ 수학 OX: 틀린 쪽 발판 그림 → 무너지는 그림 → 통째로 떨어짐 ──
  const A3 = [me, FK(1), FK(2), FK(3)], B3 = [FK(4), FK(5)];
  const SHOW_OX = { kind: 'ox', n: 1, rk: 'r1', rps: false, q: ['⭕ 맞다', '❌ 아니다'], s: '공집합은 모든 집합의 부분집합이다', ans: 'a', why: 'ø ⊂ A', phase: 'show', alive: alive(A3), res: { a: A3, b: B3, none: [], lose: 'b', out: B3, voided: false, sa: 0, sb: 0 } };
  t0 = T0 = await setFun(SHOW_OX);
  await at(t0, 900); p = await both('ox-0.9');
  ok('⭕ 처음 = ⭕ ❌ 발판 그림', /fun-ox-x-v1/.test(p.tv.plb), p.tv.plb);
  await at(t0, 2250); p = await both('ox-2.2');
  ok('⭕ 2.0초: 무너지는 발판 그림', /fun-ox-x-break/.test(p.tv.plb) && /fun-ox-x-break/.test(p.ph.plb), p.tv.plb);
  await at(t0, 2900); p = await both('ox-2.9');
  ok('⭕ 2.6초: 발판 통째로 떨어짐(ox-drop) · 조각 없음 · 2명 추락', p.tv.oxdrop === 1 && p.ph.oxdrop === 1 && p.tv.pieces === 0 && p.tv.fall === 2, JSON.stringify([p.tv.oxdrop, p.ph.oxdrop, p.tv.pieces, p.tv.fall]));
  await film('ox', SHOW_OX, [2000, 2600, 3200]);

  // ── ✊✌✋ 가위바위보 (5명 이하) ──
  const RA = [me, FK(1)], RB = [FK(2)], RC = [FK(3)];
  await setFun({ kind: 'bal', n: 5, rk: 'r5', rps: true, q: ['✊ 바위', '✌️ 가위', '✋ 보'], phase: 'pick', res: null, alive: alive([...RA, ...RB, ...RC]) }); await wait(900);
  p = await both('rps-pick'); await shot('rps-0-spin');
  ok('✊ 고르기: 선생님 손이 돎(spin) · 발판 없음', p.tv.spin === 1 && p.ph.spin === 1 && (await tv.$$('.fa-arena .fa-plat')).length === 0);
  const SHOW_RPS = { kind: 'bal', n: 5, rk: 'r5', rps: true, q: ['✊ 바위', '✌️ 가위', '✋ 보'], phase: 'show', alive: alive([...RA, ...RC]), res: { a: RA, b: RB, c: RC, none: [], lose: 'b', hand: 'a', out: RB, voided: false, sa: 0, sb: 0 } };
  t0 = T0 = await setFun(SHOW_RPS);
  await at(t0, 400); p = await both('rps-0.4');
  ok('✊ 공개: 손 멈춤(✊) · 머리 위 낸 손 4개 · 아직 회색 없음', p.tv.stop === 1 && p.tv.spin === 0 && p.tv.hand === 4 && p.tv.lost === 0, JSON.stringify([p.tv.stop, p.tv.hand, p.tv.lost]));
  await at(t0, 1200); p = await both('rps-1.2');
  ok('✊ 0.9초: 진 사람(가위) 회색', p.tv.lost === 1 && p.ph.lost === 1 && p.tv.run === 0, `${p.tv.lost}/${p.ph.lost}`);
  await film('rps', SHOW_RPS, [400, 1000]);

  // ── ⭕ OX 타임(탈락 없음): 고르기 → 공개 = 우르르만 · 무너지지 않음 ──
  const SHOW_QUIZ = { kind: 'quiz', n: 1, rk: 'r1', rps: false, q: ['⭕ 맞다', '❌ 아니다'], s: '∅ 의 원소의 개수는 0 이다', ans: 'a', why: 'n(∅) = 0', phase: 'show', alive: alive([me, ...B1]), marks: { [me]: 'o' }, res: { a: [me, FK(3)], b: [FK(4), FK(5), FK(6), FK(7)], none: [], lose: 'b', out: [], voided: false, sa: 0, sb: 0 } };
  t0 = T0 = await setFun(SHOW_QUIZ);
  await at(t0, 3000); p = await both('quiz-3.0');
  ok('⭕ OX 타임: 우르르만 · 무너지지 않음', p.tv.run === 6 && p.tv.pieces === 0 && p.tv.oxdrop === 0 && p.tv.fall === 0, JSON.stringify([p.tv.run, p.tv.oxdrop, p.tv.fall]));
  await film('quiz', SHOW_QUIZ, [400, 2000]);

  // 폰 화면 넘침 없음 (작은 폰 360 × 640)
  await ph.setViewportSize({ width: 360, height: 640 });
  t0 = T0 = await setFun({ kind: 'bal', n: 3, rk: 'r3', rps: false, q: ['평생 짜장면만', '평생 짬뽕만'], phase: 'pick', res: null, alive: alive([...A1, ...B1]) }); await wait(900);
  const fit = await ph.evaluate(() => { const m = document.querySelector('.fun .mid'), a = document.querySelector('.fa-arena'), c = document.querySelector('.fun .card'); if (!m || !a || !c) return null; const M = m.getBoundingClientRect(), R = a.getBoundingClientRect(), C = c.getBoundingClientRect(); return { inside: R.bottom <= M.bottom + 1 && C.top >= M.top - 1, h: Math.round(R.height), w: Math.round(R.width) }; });
  await ph.screenshot({ path: `${SHOTS}/funfx-phone-360.jpg`, type: 'jpeg', quality: 70 });
  ok('📱 360 × 640: 카드 · 무대가 가운데 칸 안', !!fit && fit.inside, JSON.stringify(fit));

  console.log(errs.length ? `❌ ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0');
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
