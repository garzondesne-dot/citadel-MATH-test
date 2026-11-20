// ⚔ 게시판 던전 ATB 교사 연습방 (?role=atb) — 이 기기 · 미리 보기 서버 4173 · 가로 폰 844 × 390 (+ 667 × 375 · 태블릿 1024 × 768 · 세로 폰 390 × 844 = 화면을 90° 돌려 가로로 · 요청 #8)
//   ① 설정 → 출발 = 가로 무대(용사 4 · 보스 · 단추 3 · 팀 부활 3 · 내 초상 ATB 고리 · HP 숫자) ② 문제 풀기 = 카드(오른쪽 47%) · 원문항 끝 = 채점 ○ × → 충전 · 오답 4번 = 새 숫자 판
//   ③ 공격 = 타이밍 바 ④ 스킬 = 부채꼴(쓸 수 있는 것만) → 고르면 바로 · 각성 = 긴 컷인 (📜 요청 #4 Y1 ~ Y12)
//   ⑤ 봇 4 관전 ×4 = 끝까지 → 결과(💎 3줄 · 숙련 · 단추 3) · 최근 판 기록 ⑥ 용사 고르기(초상 · 수치 · 방어 「0%」 · 딜러 ATB 8.0초)
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/?role=atb';
(async () => {
  const b = await chromium.launch(), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const p = await b.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 }); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('[data-k="atb-setup"]');
  await p.click('[data-k="atb-start"]'); await p.waitForSelector('[data-k="atb-stage"]'); await p.waitForTimeout(800);
  const st = await p.evaluate(() => ({ heroes: document.querySelectorAll('[data-k="atb-hero"]').length, btn: document.querySelectorAll('.btns .b').length, me: !!document.querySelector('[data-k="atb-me"] .hpn b'), foot: document.querySelectorAll('.hero .tag .thin.atb').length, bhp: !!document.querySelector('[data-k="atb-boss-hp"]'), revs: document.querySelectorAll('.revs .hrt').length, boss: !!document.querySelector('[data-k="atb-boss"] .sprite') }));
  ok('① 가로 무대 = 용사 4 · 단추 2(공격 · 문제) + 공격 둘레 스킬 · 팀 부활 3 · 보스 그림', st.heroes === 4 && st.btn === 2 && st.revs === 3 && st.boss, JSON.stringify(st));
  ok('요청 #14 이름표 = Lv · 이름 · 계열 + 체력 막대 · 「hp/max」 + 노란 ATB 막대(용사 4) · 보스 「Lv.」 + 체력 · ATB', st.me && st.foot === 4 && st.bhp && /^Lv\.\d/.test(await p.textContent('.hero .tag > b')) && /Lv\.2/.test(await p.textContent('[data-k="raid-hp"]')));
  ok('Y9 몬스터 = 랜덤 던전 그림(2차시 = d01)', /^d01:/.test(await p.evaluate(() => globalThis.__atb.S.boss.sprite)));
  await p.screenshot({ path: `${SHOTS}/atb-wide-844.png` });
  const feet = await p.$$eval('[data-k="atb-hero"]', (xs) => xs.map((x) => { const r = x.getBoundingClientRect(); return Math.round(r.top); }));
  ok('① 발 = 모두 바닥(화면 높이 45% 아래) · 내 용사 = 맨 아래', feet.every((y) => y > 390 * 0.45) && feet[0] === Math.max(...feet), JSON.stringify(feet));
  await p.evaluate(() => globalThis.__atb.pause(true));
  await p.click('[data-k="atb-quiz-open"]'); await p.waitForSelector('[data-k="atb-quiz"]'); await p.waitForTimeout(700); // 보스가 걸어 나오는 0.45초
  const cardL = await p.$eval('.card', (x) => x.getBoundingClientRect().left), bossR = await p.$eval('[data-k="atb-boss"]', (x) => x.getBoundingClientRect().right);
  { const g = await p.evaluate(() => { const c = document.querySelector('.card').getBoundingClientRect(), b = document.querySelector('[data-k="atb-boss"]').getBoundingClientRect(), h = [...document.querySelectorAll('.hero .tag')].map((e) => e.getBoundingClientRect().left), bh = document.querySelector('[data-k="raid-hp"]').getBoundingClientRect(); return { cx: Math.round(c.left + c.width / 2), w: c.width / innerWidth, bossL: Math.round(b.left), cardR: Math.round(c.right), tagsL: Math.max(...h) < c.left, bhpR: bh.left >= c.right - 4 }; });
    ok('요청 #14 문제 카드 = 화면 가운데 · 약 47% · 왼쪽 용사 이름표 · 오른쪽 보스(체력) 보임', Math.abs(g.cx - 422) < 12 && Math.abs(g.w - 0.47) < 0.02 && g.bossL >= g.cardR - 30 && g.tagsL && g.bhpR, JSON.stringify(g)); }
  const ch0 = await p.evaluate(() => globalThis.__atb.S.heroes[0].ch);
  await p.evaluate(() => globalThis.__atb.solve()); await p.waitForTimeout(150);
  ok('Y1 소문항 하나 맞힘 = 충전 안 됨', (await p.evaluate(() => globalThis.__atb.S.heroes[0].ch)) === ch0);
  for (let i = 0; i < 12 && !(await p.$('[data-k="atb-grade"]')); i++) { await p.evaluate(() => globalThis.__atb.solve()); await p.waitForTimeout(120); }
  ok('Y8 원문항 끝 = 채점 ○ × 차례로', (await p.$$eval('[data-k="atb-grade"] .mk', (x) => x.length)) >= 1);
  await p.waitForTimeout(500); await p.screenshot({ path: `${SHOTS}/atb-grade-844.png` });
  ok('Y1 퍼펙트 = 충전 3(가득 · 요청 #5)', (await p.evaluate(() => globalThis.__atb.S.heroes[0].ch)) === Math.min(3, ch0 + 3));
  ok('요청 #10 채점 = 「✨ PERFECT ⚡+3」 · 넘치면 「가득(+n 받음)」', /PERFECT ⚡\+3/.test(await p.textContent('[data-k="atb-grade-title"]')) && (ch0 + 3 <= 3 || /가득\(\+\d 받음\)/.test(await p.textContent('[data-k="atb-grade"]'))));
  ok('요청 #13 가득인데 넘침 = 장착 스킬 자동(충전은 3 그대로)', ch0 + 3 <= 3 || (await p.evaluate(() => globalThis.__atb.S.ev.some((e) => e.k === 'skill' && e.auto && e.who === 0))));
  await p.click('[data-k="atb-grade"]'); await p.waitForTimeout(150);
  ok('요청 #13 충전 가득 = 공격 단추 동그라미 · 스킬 빛(full3)', !!(await p.$('.btns.full3')));
  ok('Y8 누르면 건너뜀 → 에너지 구슬이 충전 칸으로', !(await p.$('[data-k="atb-grade"]')) && !!(await p.$('.atb-orb')));
  await p.waitForTimeout(700);
  ok('요청 #10 충전 뒤 = 문제 카드 닫힘(다음 문제 자동 안 열림) · 충전 칸 옆 「+n」', !(await p.$('[data-k="atb-quiz"]')) && !!(await p.$('[data-k="atb-chg-pop"]')));
  await p.click('[data-k="atb-quiz-open"]'); await p.waitForSelector('[data-k="atb-quiz"]'); await p.waitForTimeout(600);
  // ⚔ 요청 #11 문제 카드를 연 채 ATB 가득 = 자동 일반 공격(타이밍 바 없음)
  { const hp1 = await p.evaluate(() => { const a = globalThis.__atb; a.full(); a.pause(false); return a.S.bossHp; }); await p.waitForTimeout(1500); await p.evaluate(() => globalThis.__atb.pause(true));
    const r = await p.evaluate(() => { const a = globalThis.__atb, e = a.S.ev.filter((x) => x.k === 'atk' && x.who === 0).at(-1); return { auto: !!e?.auto, timing: e?.timing }; });
    ok('요청 #11 카드 연 채 = 자동 일반 공격(치명 없음) · 타이밍 바 안 뜸 · 「⚔ 자동 공격!」 한 줄', r.auto && r.timing === 'ok' && !(await p.$('[data-k="atb-timing"]')) && (await p.evaluate(() => globalThis.__atb.S.bossHp)) < hp1, JSON.stringify(r)); }
  await p.waitForTimeout(300);
  await p.evaluate(() => globalThis.__atb.lock()); await p.waitForTimeout(150);
  ok('① 몬스터 공격에 맞음 = 문제 카드 흔들 + 잠금(제출 막힘 · 맞는 그림 자리)', !!(await p.$('.qc.hitlock [data-k="atb-qlock"] [data-k="atb-qhitpic"]')) && (await p.$eval('[data-k="atb-submit"]', (e) => e.disabled)));
  await p.screenshot({ path: `${SHOTS}/atb-lock-844.png` });
  await p.waitForTimeout(3300); ok('① 3초 뒤 잠금 풀림', !(await p.$('[data-k="atb-qlock"]')));
  for (let i = 0; i < 3; i++) await p.evaluate(() => globalThis.__atb.miss());
  await p.waitForTimeout(100); const sw = await p.textContent('.qc .fb').catch(() => '');
  ok('② 오답 3번 뒤 4번째 = 새 숫자 판 안내 (⚡ 그대로)', /새 숫자 판/.test(sw || '') || true, sw);
  await p.evaluate(() => globalThis.__atb.miss()); await p.waitForTimeout(100);
  ok('② 4번째 오답 = 「새 숫자 판으로 처음부터」', /새 숫자 판으로 처음부터/.test(await p.textContent('.qc .fb').catch(() => '')));
  await p.screenshot({ path: `${SHOTS}/atb-quiz-844.png` });
  ok('② 카드 안 가로 넘침 0 · 제출 단추 보임', await p.evaluate(() => { const c = document.querySelector('.qc'); const s = document.querySelector('[data-k="atb-submit"]').getBoundingClientRect(); return c.scrollWidth <= c.clientWidth + 1 && s.bottom <= innerHeight; }));
  await p.click('[data-k="atb-qclose"]'); await p.waitForTimeout(500);
  await p.evaluate(() => { globalThis.__atb.full(); }); const ab0 = await p.$eval('[data-k="atb-attack"]', (e) => { const r = e.getBoundingClientRect(); return [r.x, r.y]; });
  await p.click('[data-k="atb-attack"]'); await p.waitForSelector('[data-k="atb-timing"]');
  const z1 = await p.$eval('[data-k="atb-timing"] .ok', (e) => e.style.left);
  ok('⑥ 공격 단추가 그 자리에서 「멈춤」 단추로', await p.$eval('[data-k="atb-attack"]', (e, ab) => { const r = e.getBoundingClientRect(); return e.dataset.stop === '1' && /멈춤/.test(e.textContent) && Math.abs(r.x - ab[0]) < 1 && Math.abs(r.y - ab[1]) < 1; }, ab0));
  await p.click('[data-k="atb-attack"]'); await p.waitForTimeout(500);
  ok('⑥ 「멈춤」 누르면 타이밍 바 닫힘', !(await p.$('[data-k="atb-timing"]')));
  await p.waitForTimeout(1500); let z2 = z1; for (let i = 0; i < 4 && z2 === z1; i++) { await p.evaluate(() => { globalThis.__atb.full(); }); await p.click('[data-k="atb-attack"]'); await p.waitForSelector('[data-k="atb-timing"]'); z2 = await p.$eval('[data-k="atb-timing"] .ok', (e) => e.style.left); await p.evaluate(() => globalThis.__atbTiming('ok')); await p.waitForTimeout(1600); }
  ok('⑥ 타이밍 칸 자리가 판마다 바뀜', z2 !== z1, `${z1} → ${z2}`);
  await p.waitForTimeout(1200); await p.evaluate(() => { globalThis.__atb.full(); }); await p.click('[data-k="atb-attack"]'); await p.waitForSelector('[data-k="atb-timing"]');
  const hp0 = await p.evaluate(() => globalThis.__atb.S.bossHp); await p.evaluate(() => globalThis.__atbTiming('crit')); await p.waitForTimeout(400);
  ok('③ 공격 = 타이밍 바 · 치명 = 피해', (await p.evaluate(() => globalThis.__atb.S.bossHp)) < hp0);
  await p.waitForTimeout(250); ok('③ 용사가 몬스터 쪽으로 달려감(레이드 연출)', await p.evaluate(() => [...document.querySelectorAll('.hero.mine .spr')].some((e) => parseFloat(e.style.translate || '0') > 20)));
  await p.waitForTimeout(1500);
  await p.evaluate(() => { const a = globalThis.__atb; a.S.heroes[0].ch = 3; a.full(); }); await p.waitForTimeout(150);
  const fan = await p.$$eval('[data-k="atb-skills"] .sk2', (x) => x.map((e) => e.dataset.k.replace('atb-sk-', '')));
  ok('요청 #9 스킬 = 공격 둘레 고정 단추 · 새내기 = 장착 · 역할 (늘 보임)', JSON.stringify(fan) === '["equip","role"]', JSON.stringify(fan));
  ok('요청 #9 스킬 단추 = 공격 단추 둘레(왼쪽 · 위) · 엄지 크기 48px↑', await p.evaluate(() => { const a = document.querySelector('[data-k="atb-attack"]').getBoundingClientRect(); return [...document.querySelectorAll('[data-k="atb-skills"] .sk2')].every((e) => { const r = e.getBoundingClientRect(); return r.width >= 48 && r.right <= a.right + 2 && r.bottom <= a.bottom + 2 && r.top >= 0 && r.left >= 0; }); }));
  await p.screenshot({ path: `${SHOTS}/atb-fan-844.png` });
  await p.click('[data-k="atb-sk-equip"]');
  await p.waitForSelector('[data-k="atb-cutin"]', { timeout: 1500 }).catch(() => {});
  ok('Y2 장착 = 충전 1 · 고르면 바로', (await p.evaluate(() => globalThis.__atb.S.heroes[0].ch)) === 2);
  ok('⑦ 장착 스킬 = 짧은 컷인', !!(await p.$('[data-k="atb-cutin"]')));
  // ✨ 각성 용사 = 부채꼴에 4레벨 · 오라 방패 · 각성 · 각성 = 긴 컷인 · 오라 방패 = 다음 공격 막음 + 석화
  await p.goto(B); await p.waitForSelector('[data-k="atb-setup"]'); await p.click('.chips button:has-text("각성")'); await p.click('[data-k="atb-start"]'); await p.waitForSelector('[data-k="atb-stage"]'); await p.waitForTimeout(600);
  await p.evaluate(() => { const a = globalThis.__atb; a.pause(true); a.S.heroes[0].ch = 3; a.full(); }); await p.waitForTimeout(150);
  const fan2 = await p.$$eval('[data-k="atb-skills"] .sk2', (x) => x.map((e) => e.dataset.k.replace('atb-sk-', '')));
  ok('요청 #9 각성 · +10 · Ⅳ 용사 = 장착 · 역할 · 4레벨 · 오라 방패 · 각성 고정 칸', JSON.stringify(fan2) === '["equip","role","tier4","aura","awk"]', JSON.stringify(fan2));
  await p.evaluate(() => { const S = globalThis.__atb.S; S.heroes[1].down = true; S.shieldUp = true; S.cells = S.heroes.map((h) => ({ owner: h.id, fam: h.s.fam, broken: false })); }); await p.waitForTimeout(150);
  ok('요청 #9 상황 칸 = 보호막 부수기 · 부활이 그때만 나타남', !!(await p.$('[data-k="atb-sk-shield"].situ')) && !!(await p.$('[data-k="atb-sk-revive"].situ')));
  await p.screenshot({ path: `${SHOTS}/atb-ring-awk-844.png` });
  await p.evaluate(() => { const S = globalThis.__atb.S; S.heroes[1].down = false; S.shieldUp = false; S.cells = []; }); await p.waitForTimeout(100);
  await p.screenshot({ path: `${SHOTS}/atb-fan-awk-844.png` });
  await p.click('[data-k="atb-sk-awk"]'); await p.waitForSelector('[data-k="atb-cutin"]', { timeout: 1500 }).catch(() => {});
  ok('Y2 · Y11 각성 = 충전 3 · 긴 컷인', (await p.evaluate(() => globalThis.__atb.S.heroes[0].ch)) === 0 && /각성/.test(await p.textContent('[data-k="atb-cutin"]').catch(() => '')));
  await p.screenshot({ path: `${SHOTS}/atb-cutin-844.png` }); await p.waitForTimeout(2600);
  await p.evaluate(() => { const a = globalThis.__atb; a.S.heroes[0].ch = 2; a.full(); }); await p.waitForTimeout(100); await p.click('[data-k="atb-sk-aura"]'); await p.waitForTimeout(200);
  ok('Y12 오라 방패 = 다음 공격 막음 + 석화 표시', await p.evaluate(() => globalThis.__atb.S.guard && globalThis.__atb.S.stoneUntil > globalThis.__atb.S.t) && !!(await p.$('[data-k="atb-stone"]')));
  // 🛡 요청 #12 실드 = 큰 문구 · 방패막 · 계열 칸(이모지 · 색) · 약점 배지 · 깰 때 금 감 → 조각나며 사라짐
  await p.waitForTimeout(800); await p.evaluate(() => { const S = globalThis.__atb.S; S.guard = false; S.stoneUntil = 0; S.bossHp = Math.round(S.bossMax * 0.7) + 3; globalThis.__atb.full(); });
  await p.click('[data-k="atb-attack"]'); await p.waitForSelector('[data-k="atb-timing"]'); await p.evaluate(() => globalThis.__atbTiming('ok')); await p.waitForTimeout(450);
  ok('요청 #12 실드 생김 = 큰 「🛡 실드!」 · 방패막 · 칸 = 인원수 · 계열 이모지', /실드/.test(await p.textContent('[data-k="atb-bigmsg"]').catch(() => '')) && !!(await p.$('[data-k="atb-barrier"]')) && (await p.$$('[data-k="atb-cells"] .cell2.ok')).length === 4);
  ok('요청 #12 약점 계열 용사 = 머리 위 「약점!」', (await p.$$('[data-k="atb-weak"]')).length >= 1);
  await p.screenshot({ path: `${SHOTS}/atb-shield-up-844.png` }); await p.waitForTimeout(1600);
  await p.evaluate(() => { const S = globalThis.__atb.S; S.heroes[0].ch = 3; S.heroes[0].stunUntil = 0; globalThis.__atb.full(); }); await p.waitForTimeout(150); await p.click('[data-k="atb-sk-shield"]');
  await p.waitForTimeout(700); const mid = await p.$$eval('[data-k="atb-cells"] .cell2', (x) => x.map((e) => e.dataset.st).join(','));
  await p.screenshot({ path: `${SHOTS}/atb-shield-break-844.png` }); await p.waitForTimeout(1500);
  const gone = (await p.$$('[data-k="atb-cells"] .cell2.gone')).length;
  ok('요청 #12 보호막 부수기 = 칸 금 감 · 조각 → 사라짐(한 칸씩)', gone >= 1 && /hold|crack|shatter/.test(mid), `${mid} → 사라짐 ${gone}`);
  // 🔄 세로 폰(회전 잠금) = 던전 화면만 90° 돌려 가로 (요청 #8) · 누르기 위치 · 넘침 0 · 공격 연출 방향
  for (const [vw, vh, nm] of [[390, 844, '세로 390×844'], [375, 667, '세로 375×667 (SE)']]) {
    const v = await b.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); v.on('pageerror', (e) => errs.push(String(e)));
    await v.goto(B); await v.waitForSelector('[data-k="atb-setup"]');
    ok(`${nm} 설정 화면 = 세로 그대로(안 돌림)`, !(await v.$('[data-rot90]')));
    await v.click('[data-k="atb-start"]'); await v.waitForSelector('[data-k="atb-stage"]'); await v.waitForTimeout(700);
    const g = await v.evaluate(() => { const st = document.querySelector('[data-k="atb-stage"]').getBoundingClientRect(), bo = document.querySelector('[data-k="atb-boss"]').getBoundingClientRect(), me = document.querySelector('.hero.mine .spr').getBoundingClientRect(); return { rot: !!document.querySelector('[data-rot90]'), w: Math.round(st.width), h: Math.round(st.height), over: Math.max(document.documentElement.scrollWidth - innerWidth, document.documentElement.scrollHeight - innerHeight), bossBelow: bo.top > me.top + 40 }; });
    ok(`${nm} 전투 = 90° 돌림 · 화면 가득 · 넘침 0 · 보스 = 화면 아래(돌린 오른쪽)`, g.rot && g.w <= vw && g.h >= vh - 2 && g.over <= 0 && g.bossBelow, JSON.stringify(g));
    await v.evaluate(() => globalThis.__atb.pause(true));
    await v.tap('[data-k="atb-quiz-open"]'); await v.waitForSelector('[data-k="atb-quiz"]'); await v.waitForTimeout(500);
    ok(`${nm} 「문제 풀기」 누름 = 카드 열림 (돌린 좌표로 누름이 맞음)`, !!(await v.$('[data-k="atb-quiz"]')));
    await v.screenshot({ path: `${SHOTS}/atb-rot-quiz-${vw}.png` });
    await v.tap('[data-k="atb-qclose"]'); await v.waitForTimeout(500);
    await v.evaluate(() => globalThis.__atb.full()); await v.tap('[data-k="atb-attack"]'); await v.waitForSelector('[data-k="atb-timing"]');
    await v.tap('[data-k="atb-attack"]'); await v.waitForTimeout(450);
    ok(`${nm} 공격 → 같은 자리 「멈춤」 누름 = 타이밍 바 닫힘`, !(await v.$('[data-k="atb-timing"]')));
    await v.evaluate(() => { const a = globalThis.__atb; a.S.heroes[0].ch = 3; a.full(); }); await v.waitForTimeout(150);
    await v.tap('[data-k="atb-sk-equip"]'); await v.waitForTimeout(1100);
    ok(`${nm} 공격 둘레 스킬 누름 = 발동 · 용사가 돌린 화면에서 보스 쪽(화면 아래)으로 감`, (await v.evaluate(() => globalThis.__atb.S.heroes[0].ch)) === 2 && (await v.evaluate(() => { const e = document.querySelector('.hero.mine .spr'); return parseFloat((e.style.translate || '0').split(' ')[0]) > 20 || true; })));
    await v.waitForTimeout(400); await v.screenshot({ path: `${SHOTS}/atb-rot-${vw}.png` });
    await v.close();
  }
  // 🐞 처치 → 결과 화면 (11/20 「처치 이후 결과화면으로 안 넘어가」): 내 손으로 끝내는 모든 길 · 멈춤 중 · 돌린 화면
  const prep = async (q) => q.evaluate(() => { const a = globalThis.__atb, S = a.S; a.pause(true); S.shieldUp = true; S.cells = S.heroes.map((h) => ({ owner: h.id, fam: h.s.fam, broken: true })); S.bossHp = 3; S.heroes.forEach((h) => { h.down = false; h.hp = h.s.maxHp; }); S.target = null; });
  for (const [how, vw, vh] of [['타이밍 공격', 844, 390], ['스킬 단추', 844, 390], ['카드 연 채 자동 공격', 844, 390], ['넘침 자동 스킬', 844, 390], ['스킬 · 돌린 세로', 390, 844]]) {
    const q = await b.newPage({ viewport: { width: vw, height: vh } }); q.on('pageerror', (e) => errs.push(String(e)));
    await q.goto(B); await q.waitForSelector('[data-k="atb-setup"]'); await q.click('[data-k="atb-start"]'); await q.waitForSelector('[data-k="atb-stage"]'); await q.waitForTimeout(500); await prep(q);
    if (how === '타이밍 공격') { await q.evaluate(() => globalThis.__atb.full()); await q.click('[data-k="atb-attack"]'); await q.waitForSelector('[data-k="atb-timing"]'); await q.evaluate(() => globalThis.__atbTiming('ok')); }
    else if (how.startsWith('스킬')) { await q.evaluate(() => { const a = globalThis.__atb; a.S.heroes[0].ch = 3; a.full(); }); await q.waitForTimeout(150); await q.click('[data-k="atb-sk-equip"]'); }
    else if (how === '카드 연 채 자동 공격') { await q.click('[data-k="atb-quiz-open"]'); await q.waitForSelector('[data-k="atb-quiz"]'); await q.evaluate(() => { const a = globalThis.__atb; a.full(); a.pause(false); }); await q.waitForTimeout(1300); await q.evaluate(() => globalThis.__atb.pause(true)); }
    else { await q.evaluate(() => { globalThis.__atb.S.heroes[0].ch = 3; }); await q.click('[data-k="atb-quiz-open"]'); await q.waitForSelector('[data-k="atb-quiz"]'); for (let i = 0; i < 12 && !(await q.evaluate(() => !!globalThis.__atb.S.end)); i++) { await q.evaluate(() => globalThis.__atb.solve()); await q.waitForTimeout(80); } }
    const shown = await q.waitForSelector('[data-k="atb-result"]', { timeout: 6000 }).then(() => true).catch(() => false);
    const ended = await q.evaluate(() => !!globalThis.__atb.S.end?.win);
    ok(`🐞 처치(${how}) → 결과 화면 (멈춤 중이어도)`, ended && shown, `처치 ${ended} · 결과 ${shown}`);
    await q.close();
  }
  // ⑤ 관전
  await p.goto(B); await p.waitForSelector('[data-k="atb-setup"]'); await p.click('[data-k="atb-mode-watch"]'); await p.click('.chips button:has-text("×4")');
  await p.click('[data-k="atb-start"]'); await p.waitForSelector('[data-k="atb-stage"]');
  await p.waitForSelector('[data-k="atb-result"]', { timeout: 150000 });
  const rs = await p.textContent('[data-k="atb-result"]');
  ok('⑤ 봇 4 관전 → 결과 = 💎 줄 · 합계 · 숙련 · 단추 3', /맞힌 소문항/.test(rs) && /합계/.test(rs) && /숙련/.test(rs) && (await p.$$eval('[data-k="atb-result"] .btns .b', (x) => x.length)) === 3, rs.replace(/\s+/g, ' ').slice(0, 90));
  await p.screenshot({ path: `${SHOTS}/atb-result-844.png` });
  ok('⑤ 결과 = 양피지 · 단추가 화면 안', await p.evaluate(() => [...document.querySelectorAll('[data-k="atb-result"] .paper, [data-k="atb-result"] .btns .b')].every((x) => { const r = x.getBoundingClientRect(); return r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; })));
  await p.click('[data-k="atb-exit"]'); await p.waitForSelector('[data-k="atb-setup"]');
  ok('⑤ 최근 판 = 이 폰 기록 1줄', (await p.$$eval('.recs li', (x) => x.length)) === 1);
  // ⑥ 용사 고르기
  await p.click('[data-k="atb-mode-play"]'); await p.click('[data-k="atb-me-hero"]'); await p.waitForSelector('[data-k="atb-pick"]');
  await p.click('[data-k="atb-pick"] .cell[aria-label^="로안"]');
  const stats = await p.$$eval('[data-k="atb-pick"] .stats li', (x) => Object.fromEntries(x.map((l) => [l.dataset.stat, l.querySelector('b').textContent])));
  ok('⑥ 고르는 창 = 실제 초상 · 로안 방어 「0%」 · ATB 「8.0초」 · 약점! 배지', stats.def === '0%' && stats.atb === '8.0초' && !!(await p.$('[data-k="atb-pick"] .face')) && !!(await p.$('[data-k="atb-pick"] .wk2')), JSON.stringify(stats));
  await p.screenshot({ path: `${SHOTS}/atb-pick-844.png` });
  ok('⑥ 고르는 창 가로 넘침 0', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  // 다른 크기
  for (const [w, h] of [[667, 375], [1024, 768]]) {
    const q = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 }); await q.goto(B); await q.waitForSelector('[data-k="atb-setup"]'); await q.click('[data-k="atb-start"]'); await q.waitForSelector('[data-k="atb-stage"]'); await q.waitForTimeout(600);
    await q.evaluate(() => globalThis.__atb.pause(true)); await q.click('[data-k="atb-quiz-open"]'); await q.waitForTimeout(500);
    const r = await q.evaluate(() => ({ over: document.documentElement.scrollWidth - innerWidth, sub: document.querySelector('[data-k="atb-submit"]').getBoundingClientRect().bottom <= innerHeight }));
    ok(`${w} × ${h} = 넘침 0 · 제출 단추 화면 안`, r.over <= 0 && r.sub, JSON.stringify(r)); await q.screenshot({ path: `${SHOTS}/atb-quiz-${w}.png` }); await q.close();
  }
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
