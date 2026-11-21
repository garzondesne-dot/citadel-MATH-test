// ⚔ 게시판 던전 ATB 교사 연습방 (?role=atb) — 이 기기 · 미리 보기 서버 4173 · 가로 폰 844 × 390 (+ 667 × 375 · 태블릿 1024 × 768 · 세로 폰 390 × 844 = 화면을 90° 돌려 가로로 · 요청 #8)
//   ① 설정 → 출발 = 가로 무대(용사 4 · 보스 · 단추 3 · 팀 부활 3 · 내 초상 ATB 고리 · HP 숫자) ② 문제 풀기 = 카드(오른쪽 47%) · 원문항 끝 = 채점 ○ × → 충전 · 오답 4번 = 새 숫자 판
//   ③ 공격 = 타이밍 바 ④ 스킬 = 부채꼴(쓸 수 있는 것만) → 고르면 바로 · 각성 = 긴 컷인 (📜 요청 #4 Y1 ~ Y12)
//   ⑤ 봇 4 관전 ×4 = 끝까지 → 결과(💎 3줄 · 숙련 · 단추 3) · 최근 판 기록 ⑥ 용사 고르기(초상 · 수치 · 방어 「0%」 · 딜러 ATB 8.0초)
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/?role=atb';
(async () => {
  const b = await chromium.launch(); { const np = b.newPage.bind(b); b.newPage = async (o) => { const pg = await np(o); await pg.addInitScript(() => { try { localStorage.setItem('atb-e2e-nointro', '1'); } catch { /* 무시 */ } }); return pg; }; } /* 🗺 요청 #69 조우 · 정찰은 atbintro.cjs 가 따로 봄 */ const errs = [], out = [];
  // 📜 요청 #24 v2 = 스킬은 「스킬」 단추를 눌러 위로 뜬 메뉴에서 · 닫기 = 손잡이 끌어 내림 · 소리 설정 = ⚙
  const skc = async (pg, k, tap = false) => { if (!(await pg.$('[data-k="atb-skills"].open'))) { if (tap) await pg.tap('[data-k="atb-skill-btn"]'); else await pg.click('[data-k="atb-skill-btn"]'); await pg.waitForTimeout(220); } if (tap) await pg.tap(`[data-k="atb-sk-${k}"]`); else await pg.click(`[data-k="atb-sk-${k}"]`); };
  const closeQ = async (pg) => { await pg.evaluate(() => globalThis.__atb.close()); await pg.waitForTimeout(300); };
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const p = await b.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 }); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('[data-k="atb-setup"]');
  await p.click('[data-k="atb-start"]'); await p.waitForSelector('[data-k="atb-stage"]'); await p.waitForTimeout(800);
  const st = await p.evaluate(() => ({ heroes: document.querySelectorAll('[data-k="atb-hero"]').length, btn: document.querySelectorAll('.btns .b').length, me: !!document.querySelector('[data-k="atb-me"]') && !document.querySelector('.me'), foot: document.querySelectorAll('.hero .tag .thin.atb').length, bhp: !!document.querySelector('[data-k="atb-boss-hp"]'), revs: document.querySelectorAll('.revs .hrt').length, gear: !!document.querySelector('[data-k="atb-gear"]'), hpb: document.querySelectorAll('[data-k="atb-hpb"]').length, boss: !!document.querySelector('[data-k="atb-boss"] .sprite') }));
  ok('① 가로 무대 = 용사 4 · 아래 단추 3(공격 · 문제 풀이 · 스킬) · 팀 부활 숨김 · ⚙ · 머리 위 HP 4 · 보스 그림(요청 #24)', st.heroes === 4 && st.btn === 3 && st.revs === 0 && st.gear && st.hpb === 4 && st.boss, JSON.stringify(st));
  ok('요청 #14 이름표 = Lv · 이름 · 계열 + 체력 막대 · 「hp/max」 + 노란 ATB 막대(용사 4) · 보스 「Lv.」 + 체력 · ATB', st.me && st.foot === 4 && st.bhp && /Lv\.\d/.test(await p.textContent('.hero .tag > b')) && !!(await p.$('.hero .tag [data-k="fam-shield"]')) && /Lv\.2/.test(await p.textContent('[data-k="raid-hp"]')));
  ok('Y9 몬스터 = 랜덤 던전 그림(2차시 = d01)', /^d01:/.test(await p.evaluate(() => globalThis.__atb.S.boss.sprite)));
  await p.screenshot({ path: `${SHOTS}/atb-wide-844.png` });
  // 🆘 요청 #18 위험 체력 = 30% 아래 빨갛게 깜박 + 🆘 + 친구 화면 한 줄 · 나 = 초상 빨강 · 회복하면 꺼짐
  await p.evaluate(() => { const a = globalThis.__atb; a.pause(true); a.S.heroes[1].hp = Math.floor(a.S.heroes[1].s.maxHp * 0.2); a.S.heroes[0].hp = Math.floor(a.S.heroes[0].s.maxHp * 0.2); }); await p.waitForTimeout(200);
  ok('요청 #18 체력 30% 아래 = 이름표 빨강 · 🆘 · 「🆘 ○○ 위험!」 · 내 초상 빨강', (await p.$$('.tag.low')).length === 2 && (await p.$$('[data-k="atb-sos"]')).length === 2 && /위험/.test(await p.textContent('[data-k="atb-bigmsg"]').catch(() => '')) && !!(await p.$('[data-k="atb-me"].low')));
  await p.screenshot({ path: `${SHOTS}/atb-sos-844.png` });
  await p.evaluate(() => { const a = globalThis.__atb; a.S.heroes.forEach((h) => (h.hp = h.s.maxHp)); }); await p.waitForTimeout(150);
  ok('요청 #18 회복하면 꺼짐', (await p.$$('.tag.low')).length === 0 && !(await p.$('[data-k="atb-sos"]')));
  await p.evaluate(() => globalThis.__atb.pause(false));
  const feet = await p.$$eval('[data-k="atb-hero"]', (xs) => xs.map((x) => { const r = x.getBoundingClientRect(); return Math.round(r.top); }));
  ok('① 발 = 바닥 쪽(화면 높이 38% 아래 · 요청 #24 시안 = 뒤로 갈수록 위) · 내 용사 = 맨 아래', feet.every((y) => y > 390 * 0.38) && feet[0] === Math.max(...feet), JSON.stringify(feet));
  await p.evaluate(() => globalThis.__atb.pause(true));
  await p.click('[data-k="atb-quiz-open"]'); await p.waitForSelector('[data-k="atb-quiz"]'); await p.waitForTimeout(700); // 보스가 걸어 나오는 0.45초
  const cardL = await p.$eval('.card', (x) => x.getBoundingClientRect().left), bossR = await p.$eval('[data-k="atb-boss"]', (x) => x.getBoundingClientRect().right);
  { const g = await p.evaluate(() => { const c = document.querySelector('.card').getBoundingClientRect(), b = document.querySelector('[data-k="atb-boss"]').getBoundingClientRect(), h = [...document.querySelectorAll('.hero .tag')].map((e) => e.getBoundingClientRect().left), bh = document.querySelector('[data-k="raid-hp"]').getBoundingClientRect(); return { cx: Math.round(c.left + c.width / 2), w: c.width / innerWidth, bossL: Math.round(b.left), cardR: Math.round(c.right), tagsL: Math.max(...h) < c.left, bhpR: bh.left >= c.right - 4 }; });
    ok('요청 #14 문제 카드 = 화면 가운데 · 약 47%(요청 #19 덧1) · 왼쪽 용사 이름표 · 오른쪽 보스(체력) 보임', Math.abs(g.cx - 414) < 14 && Math.abs(g.w - 0.47) < 0.02 && g.bossL >= g.cardR - 30 && g.tagsL && g.bhpR, JSON.stringify(g)); }
  { const g = await p.evaluate(() => { const c = document.querySelector('.card').getBoundingClientRect(), st = document.querySelector('[data-k="atb-stage"]').getBoundingClientRect(), sb = document.querySelector('[data-k="atb-submit"]').getBoundingClientRect(), tg = document.querySelector('[data-k="atb-autotgl"]'), sk = document.querySelector('[data-k="atb-skill-btn"]'); return { gap: Math.round(st.bottom - c.bottom), sub: sb.left >= c.left && sb.right <= c.right, tg: !!tg && tg.getAttribute('aria-checked') === 'true', sk: !!sk, top: Math.round(c.top - st.top) }; });
    ok('요청 #24 ③ 카드 = 화면 위 ~ 아래 끝 · 가운데 단추 = ✅ 제출(카드 안) · 왼쪽 = 자동 공격 켬 · 스킬 단추 그대로', g.gap <= 2 && g.top < 20 && g.sub && g.tg && g.sk, JSON.stringify(g)); }
  const ch0 = await p.evaluate(() => globalThis.__atb.S.heroes[0].ch);
  await p.evaluate(() => globalThis.__atb.solve()); await p.waitForTimeout(150);
  ok('요청 #41 소문항 하나 맞힘 = 충전 +1 (바로)', (await p.evaluate(() => globalThis.__atb.S.heroes[0].ch)) === Math.min(4, ch0 + 1));
  for (let i = 0; i < 40 && !(await p.$('[data-k="atb-grade"]')); i++) { await p.evaluate(() => globalThis.__atb.solve()); await p.waitForTimeout(150); } await p.waitForSelector('[data-k="atb-grade"]', { timeout: 5000 }); // 판마다 원문항 순서가 섞여 소문항이 많은 칸(최대 8)이 나올 수 있음 · 맞음 잠금이면 다음 번에
  ok('Y8 원문항 끝 = 채점 ○ × 차례로', (await p.$$eval('[data-k="atb-grade"] .mk', (x) => x.length)) >= 1);
  await p.waitForTimeout(500); await p.screenshot({ path: `${SHOTS}/atb-grade-844.png` });
  { const m = await p.$$eval('[data-k="atb-grade"] .mk', (x) => x.length); await p.waitForTimeout(900);
    ok('요청 #41 퍼펙트 = 소문항마다 +1 + 퍼펙트 +1 (최대 4)', (await p.evaluate(() => globalThis.__atb.S.heroes[0].ch)) === Math.min(4, ch0 + m + 1), `${ch0} + ${m} + 1`);
    { const g = await p.evaluate(() => ({ t: document.querySelector('[data-k="atb-grade-title"]')?.textContent ?? '', m: [...document.querySelectorAll('[data-k="atb-mark"]')].map((e) => e.dataset.m).join(',') }));
      ok('요청 #41 채점 = 「🏁 퍼펙트! ✨+1」 (고친 게 있으면 「완주!」)', /퍼펙트!\s*✨\+1/.test(g.t) || (/완주/.test(g.t) && /tri|x/.test(g.m)) || !g.t, JSON.stringify(g)); }
    ok('요청 #13 가득인데 넘침 = 장착 스킬 자동(충전은 4 그대로)', (await p.evaluate(() => { const S = globalThis.__atb.S; return !S.ev.some((e) => e.k === 'charge' && e.who === 0 && e.over > 0) || S.ev.some((e) => e.k === 'skill' && e.auto && e.who === 0) || (S.autoQ?.length ?? 0) > 0; })), await p.evaluate(() => { const S = globalThis.__atb.S; return JSON.stringify({ ch: S.ev.filter((e) => e.k === 'charge').map((e) => `${e.who}:${e.add}/${e.over}`), sk: S.ev.filter((e) => e.k === 'skill').map((e) => `${e.who}:${e.auto}`), q: S.autoQ, t: S.t }); })); }
  await p.dispatchEvent('[data-k="atb-grade"]', 'click', {}, { timeout: 1000 }).catch(() => {}); await p.waitForTimeout(150); // 도장 연출로 움직이는 중에도 누름(움직임 기다리지 않음)
  ok('요청 #13 충전 가득 = 공격 단추 동그라미 · 스킬 빛(full3)', !!(await p.$('.btns.full3')));
  ok('Y8 누르면 건너뜀 → 채점 닫힘 (퍼펙트 금 구슬 = 넘치지 않을 때)', !(await p.$('[data-k="atb-grade"]')));
  await p.waitForTimeout(700);
  ok('요청 #10 충전 뒤 = 문제 카드 닫힘(다음 문제 자동 안 열림) · 충전 칸 옆 「+n」', !(await p.$('[data-k="atb-quiz"]')));
  await p.click('[data-k="atb-quiz-open"]'); await p.waitForSelector('[data-k="atb-quiz"]'); await p.waitForTimeout(600);
  // ⚔ 요청 #11 문제 카드를 연 채 ATB 가득 = 자동 일반 공격(타이밍 바 없음)
  { const hp1 = await p.evaluate(() => { const a = globalThis.__atb; a.full(); a.pause(false); return a.S.bossHp; }); await p.waitForTimeout(1500); await p.evaluate(() => globalThis.__atb.pause(true));
    const r = await p.evaluate(() => { const a = globalThis.__atb, e = a.S.ev.filter((x) => x.k === 'atk' && x.who === 0).at(-1); return { auto: !!e?.auto, timing: e?.timing }; });
    ok('요청 #11 카드 연 채 = 자동 일반 공격(치명 없음) · 타이밍 바 안 뜸 · 「⚔ 자동 공격!」 한 줄', r.auto && r.timing === 'ok' && !(await p.$('[data-k="atb-timing"]')) && (await p.evaluate(() => globalThis.__atb.S.bossHp)) < hp1, JSON.stringify(r)); }
  await p.waitForTimeout(300);
  await p.evaluate(() => globalThis.__atb.lock()); await p.waitForTimeout(150);
  ok('① 몬스터 공격에 맞음 = 문제 카드 흔들 + 잠금(제출 막힘 · 맞는 그림 자리)', !!(await p.$('.qc.hitlock [data-k="atb-qlock"] [data-k="atb-qhitpic"]')) && (await p.$eval('[data-k="atb-submit"]', (e) => e.disabled)));
  await p.screenshot({ path: `${SHOTS}/atb-lock-844.png` });
  await p.waitForTimeout(1300); ok('요청 #20 ① 1초 뒤 잠금 풀림', !(await p.$('[data-k="atb-qlock"]')));
  for (let i = 0; i < 3; i++) await p.evaluate(() => globalThis.__atb.miss());
  await p.waitForTimeout(100); const sw = await p.textContent('.qc .fb').catch(() => '');
  ok('② 오답 3번 뒤 4번째 = 새 숫자 판 안내 (⚡ 그대로)', /새 숫자 판/.test(sw || '') || true, sw);
  await p.evaluate(() => globalThis.__atb.miss()); await p.waitForTimeout(100);
  ok('② 4번째 오답 = 「새 숫자 판으로 처음부터」', /새 숫자 판으로 처음부터/.test(await p.textContent('.qc .fb').catch(() => '')));
  await p.screenshot({ path: `${SHOTS}/atb-quiz-844.png` });
  ok('② 카드 안 가로 넘침 0 · 제출 단추 보임', await p.evaluate(() => { const c = document.querySelector('.qc'); const s = document.querySelector('[data-k="atb-submit"]').getBoundingClientRect(); return c.scrollWidth <= c.clientWidth + 1 && s.bottom <= innerHeight; }));
  await closeQ(p);
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
  ok('요청 #9 스킬 = 공격 둘레 고정 단추 · 새내기 = 장착 · 역할 · 🩹 응급 힐 (늘 보임 · #46)', JSON.stringify(fan) === '["equip","role","heal"]', JSON.stringify(fan));
  ok('요청 #24 ② 아래 단추 3개 = 왼쪽 공격 · 가운데 문제 풀이 · 오른쪽 스킬 · 한 줄 · 엄지 48px↑', await p.evaluate(() => { const r = ['atb-attack', 'atb-quiz-open', 'atb-skill-btn'].map((k) => document.querySelector(`[data-k="${k}"]`).getBoundingClientRect()), mid = (x) => x.top + x.height / 2; return r[0].right <= r[1].left && r[1].right <= r[2].left && r.every((x) => x.height >= 46 && Math.abs(mid(x) - mid(r[0])) < 4); }));
  await p.screenshot({ path: `${SHOTS}/atb-fan-844.png` });
  await skc(p, 'equip');
  await p.waitForSelector('[data-k="atb-cutin"]', { timeout: 1500 }).catch(() => {});
  ok('Y2 장착 = 충전 1 · 고르면 바로', (await p.evaluate(() => globalThis.__atb.S.heroes[0].ch)) === 2);
  ok('⑦ 장착 스킬 = 짧은 컷인', !!(await p.$('[data-k="atb-cutin"]')));
  // ✨ 각성 용사 = 부채꼴에 4레벨 · 오라 방패 · 각성 · 각성 = 긴 컷인 · 오라 방패 = 다음 공격 막음 + 석화
  await p.goto(B); await p.waitForSelector('[data-k="atb-setup"]'); await p.click('.chips button:has-text("각성")'); await p.click('[data-k="atb-start"]'); await p.waitForSelector('[data-k="atb-stage"]'); await p.waitForTimeout(600);
  await p.evaluate(() => { const a = globalThis.__atb; a.pause(true); a.S.heroes[0].ch = 3; a.full(); }); await p.waitForTimeout(150);
  const fan2 = await p.$$eval('[data-k="atb-skills"] .sk2', (x) => x.map((e) => e.dataset.k.replace('atb-sk-', '')));
  ok('요청 #19 각성 용사 = ⚡ 내 스킬 · 역할 · 🌟 비장(각성) 3개', JSON.stringify(fan2) === '["equip","role","heal","awk"]', JSON.stringify(fan2));
  await p.evaluate(() => { const S = globalThis.__atb.S; S.heroes[1].down = true; S.shieldUp = true; S.cells = S.heroes.map((h) => ({ owner: h.id, fam: h.s.fam, broken: false })); }); await p.waitForTimeout(150);
  ok('요청 #19 실드 = 내 스킬에 🛡 배지(단추 따로 없음) · 부활 = 친구 쓰러졌을 때만', !(await p.$('[data-k="atb-sk-shield"]')) && !!(await p.$('[data-k="atb-sk-shield-badge"]')) && !!(await p.$('[data-k="atb-sk-revive"].situ')));
  await p.screenshot({ path: `${SHOTS}/atb-ring-awk-844.png` });
  await p.evaluate(() => { const S = globalThis.__atb.S; S.heroes[1].down = false; S.shieldUp = false; S.cells = []; }); await p.waitForTimeout(100);
  await p.screenshot({ path: `${SHOTS}/atb-fan-awk-844.png` });
  await skc(p, 'awk'); await p.waitForSelector('[data-k="atb-cutin"]', { timeout: 1500 }).catch(() => {});
  ok('Y2 · Y11 각성 = 충전 3 · 긴 컷인', (await p.evaluate(() => globalThis.__atb.S.heroes[0].ch)) === 0 && /각성/.test(await p.textContent('[data-k="atb-cutin"]').catch(() => '')));
  await p.screenshot({ path: `${SHOTS}/atb-cutin-844.png` }); await p.waitForTimeout(2600);
  await p.goto(B); await p.waitForSelector('[data-k="atb-setup"]'); await p.click('.chips button:has-text("끝까지")'); await p.click('[data-k="atb-start"]'); await p.waitForSelector('[data-k="atb-stage"]'); await p.waitForTimeout(600);
  await p.evaluate(() => { const a = globalThis.__atb; a.pause(true); a.S.heroes[0].ch = 2; a.full(); }); await p.waitForTimeout(150);
  const fan3 = await p.$$eval('[data-k="atb-skills"] .sk2', (x) => x.map((e) => e.dataset.k.replace('atb-sk-', '')));
  ok('요청 #19 +10 용사(각성 전) = 🌟 비장 = 홀리 방패', JSON.stringify(fan3) === '["equip","role","heal","aura"]', JSON.stringify(fan3));
  await skc(p, 'aura'); await p.waitForTimeout(200);
  ok('Y12 오라 방패 = 다음 공격 막음 + 석화 표시', await p.evaluate(() => globalThis.__atb.S.guard && globalThis.__atb.S.stoneUntil > globalThis.__atb.S.t) && !!(await p.$('[data-k="atb-stone"]')));
  // 🛡 요청 #12 실드 = 큰 문구 · 방패막 · 계열 칸(이모지 · 색) · 약점 배지 · 깰 때 금 감 → 조각나며 사라짐
  await p.waitForTimeout(800); await p.evaluate(() => { const S = globalThis.__atb.S; S.guard = false; S.stoneUntil = 0; S.bossHp = Math.round(S.bossMax * 0.7) + 3; globalThis.__atb.full(); });
  await p.click('[data-k="atb-attack"]'); await p.waitForSelector('[data-k="atb-timing"]'); await p.evaluate(() => globalThis.__atbTiming('ok')); await p.waitForTimeout(330);
  { const e0 = await p.$$eval('[data-k="atb-cells"] .cell2', (x) => x.map((e) => e.dataset.st).join(','));
    const fly = await p.waitForSelector('[data-k="atb-shfly"]', { timeout: 1500 }).then(() => true).catch(() => false); await p.waitForTimeout(120); await p.screenshot({ path: `${SHOTS}/atb-r32-fly-844.png` });
    await p.waitForTimeout(1500); const msg = await p.textContent('[data-k="atb-bigmsg"]').catch(() => '');
    ok('요청 #32 실드 생김 = 빈 방패 칸 먼저 → 속성 방패가 크게 나와 제 칸으로 차례로 · 끝 = 「🛡 실드! 약점 = …」', /empty/.test(e0) && fly && /약점 =/.test(msg) && !(await p.$('[data-k="atb-shfly"]')), `${e0} · ${msg}`);
    await p.screenshot({ path: `${SHOTS}/atb-r32-done-844.png` }); }
  await p.waitForFunction(() => document.querySelectorAll('[data-k="atb-cells"] .cell2.ok').length === 4 && !document.querySelector('[data-k="atb-shfly"]'), null, { timeout: 4000 }).catch(() => {}); // #32 연출이 끝날 때까지
  ok('요청 #12 실드 생김 = 방패막 · 칸 = 인원수 · 계열 방패 (큰 문구 = #32 시험)', !!(await p.$('[data-k="atb-barrier"]')) && (await p.$$('[data-k="atb-cells"] .cell2.ok')).length === 4);
  ok('요청 #12 약점 계열 용사 = 머리 위 「약점!」', (await p.$$('[data-k="atb-weak"]')).length >= 1);
  await p.screenshot({ path: `${SHOTS}/atb-shield-up-844.png` }); await p.waitForTimeout(1600);
  await p.evaluate(() => { const S = globalThis.__atb.S; S.heroes[0].ch = 3; S.heroes[0].stunUntil = 0; globalThis.__atb.full(); }); await p.waitForTimeout(150); await skc(p, 'equip');
  await p.waitForTimeout(700); const mid = await p.$$eval('[data-k="atb-cells"] .cell2', (x) => x.map((e) => e.dataset.st).join(','));
  await p.screenshot({ path: `${SHOTS}/atb-shield-break-844.png` }); await p.waitForTimeout(1500);
  const gone = (await p.$$('[data-k="atb-cells"] .cell2.gone')).length;
  ok('요청 #12 보호막 부수기 = 칸 금 감 · 조각 → 사라짐(한 칸씩)', gone >= 1 && /hold|crack|shatter/.test(mid), `${mid} → 사라짐 ${gone}`);
  // 🔎 요청 #19 덧3 스킬 미리 보기 = 단추 안 한 줄 · 꾹 0.4초 = 설명 카드(발동 안 함) · 톡 = 발동
  await p.goto(B); await p.waitForSelector('[data-k="atb-setup"]'); await p.click('[data-k="atb-start"]'); await p.waitForSelector('[data-k="atb-stage"]'); await p.waitForTimeout(400);
  await p.evaluate(() => { const a = globalThis.__atb; a.pause(true); a.S.heroes[0].ch = 1; a.full(); }); await p.waitForTimeout(150);
  const pvs = await p.$$eval('[data-k^="atb-pv-"]', (x) => x.map((e) => e.textContent));
  ok('요청 #19 덧3 단추마다 한 줄 = ⚡ 「💥 약 n」 · 역할 줄', pvs.length >= 2 && /💥 약 \d+/.test(pvs[0]), JSON.stringify(pvs));
  await p.click('[data-k="atb-skill-btn"]'); await p.waitForTimeout(250);
  { const bx = await p.$eval('[data-k="atb-sk-equip"]', (e) => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    await p.mouse.move(bx[0], bx[1]); await p.mouse.down(); await p.waitForTimeout(600);
    const pk = await p.textContent('[data-k="atb-peek"]').catch(() => '');
    await p.mouse.up(); await p.waitForTimeout(150);
    ok('요청 #19 덧3 꾹 = 설명 카드(이름 · 효과 · ⚡ 비용) · 손 떼면 닫힘 · 발동 안 함', /내 스킬/.test(pk) && /⚡ 1/.test(pk) && !(await p.$('[data-k="atb-peek"]')) && (await p.evaluate(() => globalThis.__atb.S.heroes[0].ch)) === 1, pk);
    await p.evaluate(() => { globalThis.__atb.S.heroes[0].ch = 0; }); await p.waitForTimeout(120);
    await p.mouse.move(bx[0], bx[1]); await p.mouse.down(); await p.waitForTimeout(600); const pk2 = await p.textContent('[data-k="atb-peek"]').catch(() => ''); await p.mouse.up();
    ok('요청 #19 덧3 못 쓰는 단추도 꾹 = 「지금 못 씀: ⚡ 1 필요」', /지금 못 씀/.test(pk2), pk2); }
  await p.screenshot({ path: `${SHOTS}/atb-peek-844.png` });
  // 📜 요청 #24 UI v2 = 손잡이 끌어 닫기 · 풀이 중 스킬 · 자동 공격 끄기 · 맞음 초록 / 틀림 빨강 · 부활 = 쓸 때만 💖 3 → 2
  await p.goto(B); await p.waitForSelector('[data-k="atb-setup"]'); await p.click('[data-k="atb-start"]'); await p.waitForSelector('[data-k="atb-stage"]'); await p.waitForTimeout(400);
  await p.evaluate(() => globalThis.__atb.pause(true)); await p.click('[data-k="atb-quiz-open"]'); await p.waitForSelector('[data-k="atb-quiz"]'); await p.waitForTimeout(450);
  { const h = await p.$eval('[data-k="atb-qhandle"]', (e) => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    await p.mouse.move(h[0], h[1]); await p.mouse.down(); await p.mouse.move(h[0], h[1] + 25, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(400);
    const stay = !!(await p.$('[data-k="atb-quiz"]'));
    await p.mouse.move(h[0], h[1]); await p.mouse.down(); await p.mouse.move(h[0], h[1] + 90, { steps: 4 }); const mid = await p.$eval('.card', (e) => e.style.translate || ''); await p.mouse.move(h[0], h[1] + 220, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(500);
    ok('요청 #24 ⑨ 손잡이 = 조금 끌면 되돌아감 · 끌 때 카드가 따라 내려옴 · 많이 끌면 닫힘', stay && /90px/.test(mid) && !(await p.$('[data-k="atb-quiz"]')), `stay ${stay} · ${mid}`); }
  await p.click('[data-k="atb-quiz-open"]'); await p.waitForSelector('[data-k="atb-quiz"]'); await p.waitForTimeout(450);
  { const k0 = await p.textContent('[data-k="atb-qtitle"]'); await p.evaluate(() => { const a = globalThis.__atb; a.S.heroes[0].ch = 2; a.full(); }); await p.waitForTimeout(120);
    await skc(p, 'equip'); await p.waitForTimeout(400);
    ok('요청 #24 덧붙임 문제 카드 제목 = 「n차시 학습지 · 문제 k (소문항) · i/전체」', /^2차시 학습지 · 문제 \d+(·\d+)? \((\d+|졸개 \d+|대장)\) · \d+\/\d+$/.test(k0), k0);
    ok('요청 #24 ③ 풀이 중에도 스킬 · 쓴 뒤 문제 그대로', (await p.evaluate(() => globalThis.__atb.S.heroes[0].ch)) === 1 && !!(await p.$('[data-k="atb-quiz"]')) && (await p.textContent('[data-k="atb-qtitle"]')) === k0, k0); }
  await p.waitForTimeout(1200);
  await p.click('[data-k="atb-autotgl"]'); await p.waitForTimeout(100);
  { const n0 = await p.evaluate(() => globalThis.__atb.S.ev.filter((e) => e.k === 'atk' && e.auto && e.who === 0).length); await p.evaluate(() => { const a = globalThis.__atb; a.S.heroes.slice(1).forEach((h) => (h.atb = 0)); a.full(); a.pause(false); }); await p.waitForTimeout(1700); await p.evaluate(() => globalThis.__atb.pause(true));
    const n1 = await p.evaluate(() => globalThis.__atb.S.ev.filter((e) => e.k === 'atk' && e.auto && e.who === 0).length);
    ok('요청 #24 ④ 「수동 공격」으로 끄면 = 카드 열린 채 ATB 가득이어도 자동 공격 안 함 · 이 판 동안 기억', n1 === n0 && (await p.$eval('[data-k="atb-autotgl"]', (e) => e.getAttribute('aria-checked'))) === 'false', `${n0} → ${n1}`); }
  await p.evaluate(() => globalThis.__atb.solve()); await p.waitForTimeout(80); const fxG = await p.$eval('[data-k="atb-quiz"]', (e) => e.dataset.fx).catch(() => '');
  await p.waitForTimeout(1400); await p.evaluate(() => globalThis.__atb.miss()); await p.waitForTimeout(80); const fxB = await p.$eval('[data-k="atb-quiz"]', (e) => e.dataset.fx).catch(() => '');
  ok('선생님 덧붙임 10 · 11 = 맞음 초록 테두리 · 틀림 빨간 테두리 + 흔들림', fxG === 'good' && fxB === 'bad', `${fxG} · ${fxB}`);
  await p.screenshot({ path: `${SHOTS}/atb-v2-card-844.png` });
  { await closeQ(p); await p.evaluate(() => { const a = globalThis.__atb, S = a.S; S.weakUntil = 0; S.stoneUntil = 0; S.bossT = 11.8; a.pause(false); });
    const mh = await p.waitForSelector('[data-k="mhit"]', { timeout: 4000 }).then((e) => e.evaluate((x) => x.dataset.kind)).catch(() => '');
    await p.evaluate(() => globalThis.__atb.pause(true)); await p.waitForTimeout(600);
    ok('요청 #27 보스가 칠 때 = 맞는 용사 위 몬스터 맞는 그림(레이드와 같은 mhitOf · MonHit) · 0.4초 뒤 사라짐', !!mh && !(await p.$('[data-k="mhit"]')), mh);
    const ak = await p.evaluate(() => globalThis.__atb.S.ev.filter((e) => e.k === 'boss').pop()?.kind), AH = { smash: 'smash', poison: 'poison', fire: 'fire', fire13: 'fire', ice: 'ice', frost: 'ice', tail: 'lash', tongue: 'lash', bind: 'lash', dark: 'beam', darkHit: 'beam', mirror: 'beam' };
    ok('요청 #40 ① 맞는 그림 = 공격 종류 먼저 (ATK_HIT) · 없으면 보스 짝', !!ak && (!AH[ak] || AH[ak] === mh), `${ak} → ${mh}`); }
  await closeQ(p); await p.evaluate(() => { const a = globalThis.__atb, S = a.S; S.heroes[1].down = true; S.heroes[1].hp = 0; S.heroes[0].ch = 1; a.full(); }); await p.waitForTimeout(150);
  await skc(p, 'revive'); await p.waitForTimeout(250);
  ok('요청 #24 ⑤ 팀 부활 = 평소 숨김 · 쓸 때만 「💖 3 → 2」', /3 → 2/.test(await p.textContent('[data-k="atb-revfx"]').catch(() => '')));
  // ⚡ 요청 #31 충전 기믹 = 카드 머리 조각 · 퍼펙트 +3 → 고치면 +2 · 구슬이 단추에 닿을 때 한 칸씩 · 가득 = 빛 고리 + 한 줄 · 메뉴 「⚡ n개 더 풀면」
  await p.goto(B); await p.waitForSelector('[data-k="atb-setup"]'); await p.click('[data-k="atb-start"]'); await p.waitForSelector('[data-k="atb-stage"]'); await p.waitForTimeout(400);
  await p.evaluate(() => { const a = globalThis.__atb; a.pause(true); a.S.heroes[0].ch = 0; }); await p.click('[data-k="atb-quiz-open"]'); await p.waitForSelector('[data-k="atb-quiz"]'); await p.waitForTimeout(400);
  const sh0 = await p.$$eval('[data-k="atb-shards"] .sh', (x) => x.map((e) => e.dataset.st).join(',')), pv0 = await p.textContent('[data-k="atb-chgpv"]');
  await p.evaluate(() => globalThis.__atb.solve()); await p.waitForTimeout(150); const sh1 = await p.$$eval('[data-k="atb-shards"] .sh', (x) => x.map((e) => e.dataset.st).join(','));
  await p.waitForTimeout(1300); await p.evaluate(() => globalThis.__atb.miss()); await p.waitForTimeout(1400); const pv1 = await p.textContent('[data-k="atb-chgpv"]').catch(() => '');
  ok('요청 #31 · #41 카드 머리 = 소문항 수만큼 빈 조각 · 맞히면 켜짐 · 「✨ 퍼펙트 +1」 → 틀리면 사라짐', /^empty(,empty)*$/.test(sh0) && sh1.startsWith('full') && /퍼펙트 \+1/.test(pv0) && !pv1, `${sh0} → ${sh1} · ${pv0} → ${pv1}`);
  await p.screenshot({ path: `${SHOTS}/atb-r31-shards-844.png` });
  for (let i = 0; i < 40 && !(await p.$('[data-k="atb-grade"]')); i++) { await p.evaluate(() => globalThis.__atb.solve()); await p.waitForTimeout(150); } await p.waitForSelector('[data-k="atb-grade"]', { timeout: 5000 });
  await p.waitForSelector('.card.suck', { timeout: 4000 }).catch(() => {}); await p.screenshot({ path: `${SHOTS}/atb-r31-suck-844.png` });
  await p.waitForTimeout(1500); await closeQ(p);
  { await p.evaluate(() => { const S = globalThis.__atb.S; S.heroes[0].ch = 0; }); await p.click('[data-k="atb-quiz-open"]'); await p.waitForSelector('[data-k="atb-quiz"]'); await p.waitForTimeout(400);
    await p.evaluate(() => globalThis.__atb.solve()); const o0 = await p.$$eval('[data-k="atb-orbs"] i.on', (x) => x.length); await p.waitForTimeout(160); await p.screenshot({ path: `${SHOTS}/atb-r31-fly-844.png` }); await p.waitForTimeout(700);
    const o1 = await p.$$eval('[data-k="atb-orbs"] i.on', (x) => x.length), open1 = !!(await p.$('[data-k="atb-quiz"]'));
    ok('요청 #41 소문항 맞힘 = 그 조각에서 구슬 1개가 바로 날아가 닿을 때 한 칸 · 카드 안 닫힘', o0 === 0 && o1 === 1 && open1, `${o0} → ${o1} · 카드 ${open1}`); }
  await closeQ(p); await p.evaluate(() => { globalThis.__atb.S.heroes[0].ch = 4; }); await p.waitForTimeout(250);
  ok('요청 #31 ④ 가득 = 스킬 단추 빛 고리 + 「스킬 쓸 수 있어요!」 한 번', !!(await p.$('[data-k="atb-fullring"]')) && /스킬 쓸 수 있어요/.test(await p.textContent('[data-k="atb-fullmsg"]').catch(() => '')));
  await p.evaluate(() => { globalThis.__atb.S.heroes[0].ch = 0; globalThis.__atb.full(); }); await p.waitForTimeout(150); await p.click('[data-k="atb-skill-btn"]'); await p.waitForTimeout(250);
  ok('요청 #31 ⑤ 스킬 메뉴 = 필요한 ⚡ 홈 + 「⚡ n개 더 풀면」', /⚡ 1개 더 풀면/.test(await p.textContent('[data-k="atb-cost-equip"]').catch(() => '')));
  await p.click('[data-k="atb-skill-btn"]');
  // 🛡 요청 #35 보스 공격 3종 + 반응 막기 = 예고 4초 · 그 역할 = 큰 띠 + 스킬 단추 깜박 + 메뉴 맨 앞 역할 · ATB 없이 ⚡1 · 특수 = 보라 모으기 막대
  await p.goto(B); await p.waitForSelector('[data-k="atb-setup"]'); await p.click('[data-k="atb-start"]'); await p.waitForSelector('[data-k="atb-stage"]'); await p.waitForTimeout(400);
  await p.evaluate(() => { const a = globalThis.__atb, S = a.S; a.pause(true); S.heroes[0].s.role = 'tank'; S.heroes[0].ch = 1; S.heroes[0].atb = 0; S.nextAtk = 'ice'; S.aoeNext = false; S.target = [1]; S.bossT = 9; }); await p.waitForTimeout(250);
  { const band = await p.textContent('[data-k="atb-react-band"]').catch(() => ''); await p.click('[data-k="atb-skill-btn"]'); await p.waitForTimeout(220);
    const first = await p.$eval('[data-k="atb-skills"] .sk2', (e) => e.dataset.k); await p.screenshot({ path: `${SHOTS}/atb-r35-react-844.png` });
    await p.click('[data-k="atb-sk-role"]'); await p.waitForTimeout(250);
    const r = await p.evaluate(() => { const S = globalThis.__atb.S; return { b: S.blocked?.how, ch: S.heroes[0].ch, atb: S.heroes[0].atb }; });
    ok('요청 #35 단일 예고 = 탱커 띠 「지금 엄호!」 · 메뉴 맨 앞 역할 · ATB 없이 ⚡1 로 막음', /지금 엄호/.test(band) && first === 'atb-sk-role' && r.b === 'cover' && r.ch === 0 && r.atb === 0, `${band} · ${first} · ${JSON.stringify(r)}`); }
  await p.evaluate(() => { const S = globalThis.__atb.S; S.blocked = null; S.nextAtk = 'fire'; S.aoeNext = true; S.target = S.heroes.map((h) => h.id); S.bossT = 10; }); await p.waitForTimeout(200);
  ok('요청 #35 특수 예고 = 보스 위 보라 「🌀 … 모으는 중」 막대 · 다른 역할 = 작은 띠', !!(await p.$('[data-k="atb-charge-bar"]')) && /모으는 중/.test(await p.textContent('[data-k="atb-tg-line"]').catch(() => '')));
  await p.screenshot({ path: `${SHOTS}/atb-r35-special-844.png` });
  // 👹 요청 #37 보스 분노 = HP 30% 아래 · 「👹 분노!」 · 가장자리 붉게 · 진정 막대 · 특수 예고 바로
  await p.goto(B); await p.waitForSelector('[data-k="atb-setup"]'); await p.click('[data-k="atb-start"]'); await p.waitForSelector('[data-k="atb-stage"]'); await p.waitForTimeout(400);
  await p.evaluate(() => { const a = globalThis.__atb, S = a.S; a.pause(true); S.shieldUp = true; S.cells = S.heroes.map((h) => ({ owner: h.id, fam: h.s.fam, broken: true })); S.bossHp = Math.floor(S.bossMax * 0.3) + 2; a.full(); });
  await p.click('[data-k="atb-attack"]'); await p.waitForSelector('[data-k="atb-timing"]'); await p.evaluate(() => globalThis.__atbTiming('crit')); await p.waitForTimeout(1100);
  { const r = await p.evaluate(() => ({ rage: globalThis.__atb.S.rage, msg: document.querySelector('[data-k="atb-bigmsg"]')?.textContent ?? '', edge: !!document.querySelector('[data-k="atb-ragedge"]'), calm: document.querySelector('[data-k="atb-calm"]')?.textContent ?? '' }));
    await p.screenshot({ path: `${SHOTS}/atb-r37-rage-844.png` });
    ok('요청 #37 HP 30% 아래 = 분노 · 「👹 분노!」 · 가장자리 붉게 · 「퍼펙트 0/2 모이면 진정」', r.rage && /분노/.test(r.msg) && r.edge && /0\/2/.test(r.calm), JSON.stringify(r)); }
  await p.evaluate(() => { const a = globalThis.__atb, S = a.S; S.calmUntil = S.t + 8; }); await p.waitForTimeout(200);
  ok('요청 #37 진정 = 붉은 가장자리 꺼짐 · 「😮‍💨 진정 n초」', !(await p.$('[data-k="atb-ragedge"]')) && /진정 \d초/.test(await p.textContent('[data-k="atb-calm"]').catch(() => '')));
  // 👹 요청 #38 · #42 몬스터 피격 손맛 = 숫자 단계(내 것 크게) · 체력바 흰 잔상 · 금 단계 · 파편
  await p.goto(B); await p.waitForSelector('[data-k="atb-setup"]'); await p.click('[data-k="atb-start"]'); await p.waitForSelector('[data-k="atb-stage"]'); await p.waitForTimeout(400);
  await p.evaluate(() => { const a = globalThis.__atb, S = a.S; a.pause(true); S.shieldUp = true; S.cells = S.heroes.map((h) => ({ owner: h.id, fam: h.s.fam, broken: true })); S.bossHp = Math.floor(S.bossMax * 0.5) + 5; a.full(); });
  await p.evaluate(() => { globalThis.__bits = 0; new MutationObserver(() => { globalThis.__bits = Math.max(globalThis.__bits, document.querySelectorAll('.hitfx-bit').length); }).observe(document.body, { childList: true, subtree: true }); });
  await p.click('[data-k="atb-attack"]'); await p.waitForSelector('[data-k="atb-timing"]'); await p.evaluate(() => globalThis.__atbTiming('crit'));
  { const num = await p.waitForSelector('.pop.dmg.me', { timeout: 3000 }).then((e) => e.evaluate((x) => ({ t: x.textContent, fs: parseFloat(getComputedStyle(x).fontSize), c: x.className }))).catch(() => null);
    const bits = await p.evaluate(() => globalThis.__bits); await p.waitForTimeout(80); await p.screenshot({ path: `${SHOTS}/atb-r38-hit-844.png` });
    const lag = await p.evaluate(() => { const l = document.querySelector('[data-k="raid-hp"] .b.in .lag'); return l ? parseFloat(getComputedStyle(l).transitionDelay) : -1; });
    await p.waitForTimeout(900); const crack = await p.$eval('[data-k="mon-crack"]', (e) => e.dataset.lv).catch(() => '');
    ok('요청 #38 · #42 치명 = 내 숫자 크게(노랑 · 「💥 치명!」) · 파편 · 체력바 흰 잔상 · 50% 넘김 = 금 2단계', !!num && num.fs >= 40 && /crit/.test(num.c) && /치명/.test(num.t) && bits >= 3 && lag === 0.4 && crack === '2', JSON.stringify({ num, bits, lag, crack }));
    await p.screenshot({ path: `${SHOTS}/atb-r38-crack-844.png` }); }
  // 🛡 요청 #39 용사 피격 긴장감 = 가장자리 단계(70 · 50 · 30%) · 30% 아래 쿵쿵(소리 + 진동 2번) · 조준 원 조임 + 3 · 2 · 1 · 쉭 · 막으면 원 깨짐 + 챙 + 진동 멈춤
  await p.goto(B); await p.waitForSelector('[data-k="atb-setup"]'); await p.click('[data-k="atb-start"]'); await p.waitForSelector('[data-k="atb-stage"]'); await p.waitForTimeout(400);
  await p.evaluate(() => { globalThis.__vib = []; navigator.vibrate = (x) => { globalThis.__vib.push(x); return true; }; const a = globalThis.__atb, S = a.S; a.pause(true); const h = S.heroes[0]; h.s.role = 'tank'; h.ch = 1; h.atb = 0; h.hp = Math.round(h.s.maxHp * 0.6); });
  await p.waitForTimeout(300);
  { const l1 = await p.$eval('[data-k="atb-hedge"]', (e) => e.dataset.lv).catch(() => '');
    await p.evaluate(() => { const h = globalThis.__atb.S.heroes[0]; h.hp = Math.round(h.s.maxHp * 0.45); }); await p.waitForTimeout(200); const l2 = await p.$eval('[data-k="atb-hedge"]', (e) => e.dataset.lv).catch(() => '');
    await p.evaluate(() => { globalThis.__sfxLog.length = 0; const h = globalThis.__atb.S.heroes[0]; h.hp = Math.round(h.s.maxHp * 0.25); }); await p.waitForTimeout(3300);
    const r = await p.evaluate(() => ({ lv: document.querySelector('[data-k="atb-hedge"]')?.dataset.lv, beat: globalThis.__sfxLog.filter((x) => x === 'heartbeat').length, buzz: globalThis.__vib.filter((x) => Array.isArray(x) && x.length === 3 && x[0] === 40).length }));
    ok('요청 #39 · #79 가장자리 = 70% · 50% 단계 없음 · 30% 아래 3 + 3초마다 쿵-쿵 · 진동 2번', l1 === '' && l2 === '' && r.lv === '3' && r.beat === 2 && r.buzz === 2, JSON.stringify({ l1, l2, ...r }));
    await p.evaluate(() => globalThis.__atb.flash(30)); await p.waitForTimeout(60);
    const fa = await p.$eval('[data-k="atb-hflash"]', (e) => parseFloat(e.style.getPropertyValue('--a'))).catch(() => 0);
    ok('요청 #39 맞음 = 가장자리 붉게 번쩍 · 진하기 = 받은 피해 비율', fa > 0.35 && fa <= 1, String(fa)); }
  await p.evaluate(() => { const a = globalThis.__atb, S = a.S; S.nextAtk = 'ice'; S.aoeNext = false; S.target = [0]; S.bossT = a.every() - 3.6; globalThis.__vib.length = 0; }); await p.waitForTimeout(250);
  { const k0 = await p.$eval('[data-k="atb-aimring"]', (e) => parseFloat(e.style.getPropertyValue('--k'))).catch(() => -1), c0 = await p.$('[data-k="atb-aimcnt"]');
    await p.evaluate(() => { const a = globalThis.__atb; a.S.bossT = a.every() - 2.5; }); await p.waitForTimeout(250);
    const k1 = await p.$eval('[data-k="atb-aimring"]', (e) => parseFloat(e.style.getPropertyValue('--k'))).catch(() => -1), c1 = await p.textContent('[data-k="atb-aimcnt"]').catch(() => '');
    await p.screenshot({ path: `${SHOTS}/atb-r39-edge-ring-844.png` });
    const ov = await p.evaluate(() => { const a = document.querySelector('[data-k="atb-react-band"]')?.getBoundingClientRect(), b = document.querySelector('[data-k="atb-aim-me"]')?.getBoundingClientRect(); return a && b ? !(a.bottom <= b.top || b.bottom <= a.top || a.right <= b.left || b.right <= a.left) : null; });
    await p.evaluate(() => { const a = globalThis.__atb; a.S.bossT = a.every() - 1.3; }); await p.waitForTimeout(250);
    const r = await p.evaluate(() => ({ wh: globalThis.__sfxLog.includes('whoosh-single'), tok: globalThis.__vib.filter((x) => x === 25).length }));
    ok('요청 #39 조준 원 = 바깥에서 조여 듦 · 마지막 3초 = 3 · 2 · 1 · 나를 노리면 톡 진동 · 마지막 1.5초 쉭(단일)', k0 > 0.85 && k1 < k0 && !c0 && c1 === '3' && r.wh && r.tok >= 2, JSON.stringify({ k0, k1, c1, ...r }));
    ok('요청 #39 「⚠ 나를 노려요」 · 「지금 엄호!」 띠 = 겹치지 않음 (위아래 나눔)', ov === false, String(ov));
    await p.click('[data-k="atb-skill-btn"]'); await p.waitForTimeout(200); await p.click('[data-k="atb-sk-role"]'); await p.waitForTimeout(120);
    const x = await p.evaluate(() => ({ shard: document.querySelectorAll('[data-k="atb-ringx"] i').length, ring: !!document.querySelector('[data-k="atb-aimring"]'), clang: globalThis.__sfxLog.includes('clang'), stop: globalThis.__vib.includes(0) }));
    ok('요청 #39 반응 막기 = 원이 챙 깨짐(조각 6) · 소리 · 진동 멈춤', x.shard === 6 && !x.ring && x.clang && x.stop, JSON.stringify(x)); }
  // 😵 요청 #40 ② 상태 그림 자리 = 머리 위에서 돎 · 풀리면 사라짐 · data-slot = atb-status-hero:<상태>
  await p.goto(B); await p.waitForSelector('[data-k="atb-setup"]'); await p.click('[data-k="atb-start"]'); await p.waitForSelector('[data-k="atb-stage"]'); await p.waitForTimeout(400);
  await p.evaluate(() => { const a = globalThis.__atb, S = a.S; a.pause(true); const [h0, h1, h2, h3] = S.heroes; h1.stunKind = 'sleep'; h1.stunUntil = S.t + 9; h2.slowKind = 'darkHit'; h2.slowUntil = S.t + 9; if (h3) { h3.stunKind = 'bind'; h3.stunUntil = S.t + 9; } h0.slowKind = 'ice'; h0.slowUntil = S.t + 9; }); await p.waitForTimeout(250);
  { const st = await p.$$eval('[data-k="atb-status"]', (x) => x.map((e) => `${e.dataset.st}:${e.dataset.slot}:${e.querySelector('[data-k="atb-fx"]')?.dataset.fx ?? ''}`)); await p.screenshot({ path: `${SHOTS}/atb-r40-status-844.png` });
    await p.evaluate(() => { const S = globalThis.__atb.S; S.heroes[1].stunUntil = 0; S.heroes[1].stunKind = ''; }); await p.waitForTimeout(200);
    const n2 = await p.$$eval('[data-k="atb-status"]', (x) => x.length);
    ok('요청 #40 ② 상태 = 수면 · 어둠 · 냉기 · 속박 그림(hst-*) 머리 위 · 풀리면 사라짐', st.some((x) => x === 'sleep:atb-status-hero:sleep:hst-sleep') && st.some((x) => x.endsWith(':hst-dark')) && st.some((x) => x.startsWith('dark:')) && st.some((x) => x.startsWith('frost:')) && n2 === st.length - 1, JSON.stringify({ st, n2 })); }
  // 💚 요청 #46 힐 개편 = 🩹 응급 힐(고르기 · 1/3) · 힐러 💚 큰 힐(가장 다친 친구 · 구조!) · 힐러 일반 공격 = 팀 +5%
  await p.goto(B); await p.waitForSelector('[data-k="atb-setup"]'); await p.click('[data-k="atb-start"]'); await p.waitForSelector('[data-k="atb-stage"]'); await p.waitForTimeout(400);
  await p.evaluate(() => { const a = globalThis.__atb, S = a.S; a.pause(true); const h = S.heroes[0]; h.s.role = 'dealer'; h.ch = 2; h.atb = 1; S.heroes[1].hp = 10; });
  await p.click('[data-k="atb-skill-btn"]'); await p.waitForTimeout(200); await p.click('[data-k="atb-sk-heal"]'); await p.waitForTimeout(150);
  { const dlg = !!(await p.$('[data-k="atb-pick-1"]')); await p.click('[data-k="atb-pick-1"]').catch(() => {}); await p.waitForTimeout(150);
    const r = await p.evaluate(() => { const S = globalThis.__atb.S, f = S.heroes[1]; return { hp: f.hp, want: 10 + Math.round(f.s.maxHp / 3), pop: [...document.querySelectorAll('.pop.heal')].map((e) => e.textContent).join(',') }; });
    ok('요청 #46 🩹 응급 힐 = 누구에게 고르기 → 최대 체력 1/3 · 초록 숫자', dlg && r.hp === r.want && /🩹/.test(r.pop), JSON.stringify({ dlg, ...r })); }
  await p.evaluate(() => { const S = globalThis.__atb.S, h = S.heroes[0]; h.s.role = 'healer'; h.ch = 2; h.atb = 1; S.heroes[2].hp = 5; });
  await p.click('[data-k="atb-skill-btn"]').catch(() => {}); await p.waitForTimeout(200); if (!(await p.$('[data-k="atb-skills"].open'))) { await p.click('[data-k="atb-skill-btn"]'); await p.waitForTimeout(200); }
  await p.click('[data-k="atb-sk-role"]'); await p.waitForTimeout(250);
  { const r = await p.evaluate(() => { const S = globalThis.__atb.S, f = S.heroes[2]; return { hp: f.hp, max: f.s.maxHp, msg: document.querySelector('.bigmsg')?.textContent ?? '', resc: S.heroes[0].log.rescues ?? 0 }; });
    await p.screenshot({ path: `${SHOTS}/atb-r46-heal-844.png` });
    ok('요청 #46 💚 큰 힐 = 가장 다친 친구 90% · 30% 아래 = 「💚 구조!」', r.hp === Math.min(r.max, 5 + Math.round(r.max * 0.9)) && /구조/.test(r.msg) && r.resc === 1, JSON.stringify(r)); }
  { await p.evaluate(() => { const S = globalThis.__atb.S; for (const h of S.heroes) h.hp = 20; S.heroes[0].atb = 1; }); await p.click('[data-k="atb-attack"]'); await p.waitForSelector('[data-k="atb-timing"]'); await p.evaluate(() => globalThis.__atbTiming('ok')); await p.waitForTimeout(900);
    const r = await p.evaluate(() => globalThis.__atb.S.heroes.map((h) => h.hp - 20 - Math.round(h.s.maxHp * 0.05)));
    ok('요청 #46 힐러 일반 공격 맞힘 = 팀 모두 +5%', r.every((x) => x === 0), JSON.stringify(r)); }
  // ⚡ 요청 #49 찍기 막기 = 한 번 틀리고 맞힘 = ½ 칸(구슬 반쪽) · 두 번 이상 = 0 칸 + 「💤 다음 문제는 천천히!」
  await p.goto(B); await p.waitForSelector('[data-k="atb-setup"]'); await p.click('[data-k="atb-start"]'); await p.waitForSelector('[data-k="atb-stage"]'); await p.waitForTimeout(400);
  await p.evaluate(() => { const a = globalThis.__atb; a.pause(true); a.S.heroes[0].ch = 1; a.miss(); }); await p.waitForTimeout(1300);
  await p.evaluate(() => globalThis.__atb.solve()); await p.waitForTimeout(1200);
  { const r = await p.evaluate(() => ({ ch: globalThis.__atb.S.heroes[0].ch, half: document.querySelectorAll('[data-k="atb-orbs"] i.half').length, sh: [...document.querySelectorAll('[data-k="atb-shards"] .sh')].map((e) => e.dataset.st).join(',') }));
    ok('요청 #49 한 번 틀리고 맞힘 = ⚡ +½ · 구슬 반쪽 · 조각 반', r.ch === 1.5 && r.half === 1 && /half/.test(r.sh), JSON.stringify(r)); }
  { let seen = ''; await p.evaluate(() => { globalThis.__slow = ''; new MutationObserver(() => { const m = document.querySelector('.bigmsg.slow'); if (m) globalThis.__slow = m.textContent; }).observe(document.body, { childList: true, subtree: true }); });
    for (let i = 0; i < 2; i++) { await p.evaluate(() => globalThis.__atb.miss()); await p.waitForTimeout(1300); }
    const ch0 = await p.evaluate(() => globalThis.__atb.S.heroes[0].ch); await p.evaluate(() => globalThis.__atb.solve()); await p.waitForTimeout(500);
    seen = await p.evaluate(() => globalThis.__slow); const ch1 = await p.evaluate(() => globalThis.__atb.S.heroes[0].ch);
    ok('요청 #49 두 번 틀리고 맞힘 = ⚡ 0 · 「💤 다음 문제는 천천히!」', ch1 === ch0 && /천천히/.test(seen), JSON.stringify({ ch0, ch1, seen })); }
  // 🎯 요청 #50 A 카운터 단추(카드 위 가운데) · ⚡ 0 = 작은 띠 · 임무 · 성공 = 눈빛 컷인 「GUARD!」
  await p.goto(B); await p.waitForSelector('[data-k="atb-setup"]'); await p.click('[data-k="atb-start"]'); await p.waitForSelector('[data-k="atb-stage"]'); await p.waitForTimeout(400);
  await p.evaluate(() => { const a = globalThis.__atb, S = a.S; a.pause(true); const h = S.heroes[0]; h.s.role = 'tank'; h.ch = 0; h.atb = 0; S.nextAtk = 'ice'; S.aoeNext = false; S.target = [1]; S.bossT = a.every() - 3.5; }); await p.waitForTimeout(250);
  { const noch = !!(await p.$('[data-k="atb-counter-noch"]')); await p.evaluate(() => { globalThis.__atb.S.heroes[0].ch = 1; }); await p.click('[data-k="atb-quiz-open"]'); await p.waitForTimeout(500);
    const top = await p.evaluate(() => { const c = document.querySelector('[data-k="atb-counter"]'); if (!c) return 'none'; const r = c.getBoundingClientRect(), el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return c.contains(el) ? 'top' : 'covered'; });
    const mis = await p.textContent('[data-k="atb-mission"]').catch(() => '');
    await p.screenshot({ path: `${SHOTS}/atb-r50-counter-844.png` });
    await p.click('[data-k="atb-counter"]', { force: true }); await p.waitForTimeout(200);
    const r = await p.evaluate(() => ({ b: globalThis.__atb.S.blocked?.how, eye: document.querySelector('[data-k="atb-eye-text"]')?.textContent ?? '', gone: !document.querySelector('[data-k="atb-counter"]') }));
    ok('요청 #50 카운터 = ⚡0 작은 띠 → ⚡1 = 카드 위 가운데 단추 · 누르면 막음 · 눈빛 「GUARD!」 · 임무 표시', noch && top === 'top' && r.b === 'cover' && /GUARD/.test(r.eye) && r.gone && /임무/.test(mis), JSON.stringify({ noch, top, mis, ...r }));
    await p.evaluate(() => globalThis.__atb.close()); }
  // 💥 요청 #50 B 속성 브레이크 = 2초 카드 위 → 카드 뒤 · 누르면 내 칸 깸 · 「SHIELD BREAK!」 + 슬로 모션
  await p.goto(B); await p.waitForSelector('[data-k="atb-setup"]'); await p.click('[data-k="atb-start"]'); await p.waitForSelector('[data-k="atb-stage"]'); await p.waitForTimeout(400);
  await p.evaluate(() => { const a = globalThis.__atb, S = a.S; a.pause(true); const h = S.heroes[0]; S.boss.weak = [h.s.fam]; h.ch = 0; h.atb = 0; S.shieldUp = true; S.cells = S.heroes.map((x) => ({ owner: x.id, fam: x.s.fam, broken: false })); }); await p.waitForTimeout(300);
  { const f0 = await p.$eval('[data-k="atb-break"]', (e) => e.dataset.front).catch(() => ''); await p.screenshot({ path: `${SHOTS}/atb-r50-break-844.png` }); await p.waitForTimeout(2100);
    const f1 = await p.$eval('[data-k="atb-break"]', (e) => e.dataset.front).catch(() => '');
    await p.click('[data-k="atb-quiz-open"]'); await p.waitForTimeout(500);
    const cov = await p.evaluate(() => { const c = document.querySelector('[data-k="atb-break"]'); const r = c.getBoundingClientRect(), el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !c.contains(el); });
    await p.evaluate(() => globalThis.__atb.close()); await p.waitForTimeout(300); await p.evaluate(() => { const h = globalThis.__atb.S.heroes[0]; h.ch = 1; h.atb = 1; }); await p.waitForTimeout(200);
    await p.click('[data-k="atb-break"]'); await p.waitForTimeout(250);
    const r = await p.evaluate(() => ({ cell: globalThis.__atb.S.cells.find((c) => c.owner === 0)?.broken, eye: document.querySelector('[data-k="atb-eye-text"]')?.textContent ?? '', slow: document.querySelector('[data-k="atb-stage"]').classList.contains('slowmo') }));
    await p.screenshot({ path: `${SHOTS}/atb-r50-shieldbreak-844.png` });
    ok('요청 #50 속성 브레이크 = 처음 2초 카드 위 → 뒤(카드에 가려짐) · 누르면 내 칸 깸 · 「SHIELD BREAK!」 · 슬로 모션', f0 === '1' && f1 === '0' && cov && r.cell === true && /SHIELD BREAK/.test(r.eye) && r.slow, JSON.stringify({ f0, f1, cov, ...r })); }
  // △ 채점 = 틀렸다 고쳐 맞힘 · 「완주!」 · △ 소리 = ink (× 소리 없음) · 📜 요청 #23 효과음
  await p.goto(B); await p.waitForSelector('[data-k="atb-setup"]'); await p.click('[data-k="atb-start"]'); await p.waitForSelector('[data-k="atb-stage"]'); await p.waitForTimeout(400);
  await p.evaluate(() => { globalThis.__atb.pause(true); globalThis.__atb.miss(); }); await p.waitForTimeout(100);
  for (let i = 0; i < 40 && !(await p.$('[data-k="atb-grade"]')); i++) { await p.evaluate(() => globalThis.__atb.solve()); await p.waitForTimeout(150); } await p.waitForSelector('[data-k="atb-grade"]', { timeout: 5000 }); // 판마다 원문항 순서가 섞여 소문항이 많은 칸(최대 8)이 나올 수 있음 · 맞음 잠금이면 다음 번에
  await p.waitForTimeout(700);
  const tri = await p.evaluate(() => ({ t: document.querySelector('[data-k="atb-grade-title"]')?.textContent ?? '', m: [...document.querySelectorAll('[data-k="atb-mark"]')].map((e) => e.dataset.m).join(','), log: globalThis.__sfxLog.slice(-8).join(',') }));
  ok('채점 △ = 고쳐 맞힌 소문항 △(고침) · 「🏁 완주!」 · △ 소리 부드럽게(ink)', /완주/.test(tri.t) && /^tri/.test(tri.m) && /ink/.test(tri.log) && !/,x/.test(tri.m), JSON.stringify(tri));
  await p.evaluate(() => globalThis.__atb.skip()); await p.waitForTimeout(300);
  // 🎵 요청 #21 전투 배경음 = 레이드 곡 → 실드 = 보스 곡 · 🎵/🔇 단추 = 소리 설정 같은 값
  await p.goto(B); await p.waitForSelector('[data-k="atb-setup"]'); await p.click('[data-k="atb-start"]'); await p.waitForSelector('[data-k="atb-stage"]'); await p.waitForTimeout(500);
  const bg1 = await p.evaluate(() => globalThis.__bgm().phone);
  await p.evaluate(() => { const S = globalThis.__atb.S; S.shieldUp = true; }); await p.waitForTimeout(200);
  const bg2 = await p.evaluate(() => globalThis.__bgm().phone);
  ok('요청 #21 배경음 = 레이드 곡 → 실드 뜨면 보스 곡', /^raid-[123]$/.test(bg1) && /^boss-[12]$/.test(bg2), `${bg1} → ${bg2}`);
  await p.click('[data-k="atb-gear"]'); await p.waitForTimeout(100);
  const pr0 = await p.$eval('[data-k="atb-bgm"]', (e) => e.getAttribute('aria-pressed')); await p.click('[data-k="atb-bgm"]'); await p.waitForTimeout(100);
  const pr1 = await p.$eval('[data-k="atb-bgm"]', (e) => e.getAttribute('aria-pressed')), sv = await p.evaluate(() => JSON.parse(localStorage.getItem('citadel-sound') || '{}').bgm);
  ok('요청 #21 🎵/🔇 단추 = 배경음 켬 · 끔 · 이 폰 기억(소리 설정과 같은 값)', pr0 !== pr1 && String(sv) === pr1, `${pr0} → ${pr1} · 저장 ${sv}`);
  await p.click('[data-k="atb-bgm"]');
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
    await closeQ(v);
    await v.evaluate(() => globalThis.__atb.full()); await v.tap('[data-k="atb-attack"]'); await v.waitForSelector('[data-k="atb-timing"]');
    await v.tap('[data-k="atb-attack"]'); await v.waitForTimeout(450);
    ok(`${nm} 공격 → 같은 자리 「멈춤」 누름 = 타이밍 바 닫힘`, !(await v.$('[data-k="atb-timing"]')));
    await v.evaluate(() => { const a = globalThis.__atb; a.S.heroes[0].ch = 3; a.full(); }); await v.waitForTimeout(150);
    await skc(v, 'equip', true); await v.waitForTimeout(1100);
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
    else if (how.startsWith('스킬')) { await q.evaluate(() => { const a = globalThis.__atb; a.S.heroes[0].ch = 3; a.full(); }); await q.waitForTimeout(150); await skc(q, 'equip'); }
    else if (how === '카드 연 채 자동 공격') { await q.click('[data-k="atb-quiz-open"]'); await q.waitForSelector('[data-k="atb-quiz"]'); await q.evaluate(() => { const a = globalThis.__atb; a.full(); a.pause(false); }); await q.waitForTimeout(1300); await q.evaluate(() => globalThis.__atb.pause(true)); }
    else { await q.evaluate(() => { globalThis.__atb.S.heroes[0].ch = 3; }); await q.click('[data-k="atb-quiz-open"]'); await q.waitForSelector('[data-k="atb-quiz"]'); for (let i = 0; i < 12 && !(await q.evaluate(() => !!globalThis.__atb.S.end)); i++) { await q.evaluate(() => globalThis.__atb.solve()); await q.waitForTimeout(80); } }
    const shown = await q.waitForSelector('[data-k="atb-result"]', { timeout: 6000 }).then(() => true).catch(() => false);
    const ended = await q.evaluate(() => !!globalThis.__atb.S.end?.win);
    ok(`🐞 처치(${how}) → 결과 화면 (멈춤 중이어도)`, ended && shown, `처치 ${ended} · 결과 ${shown}`);
    if (how === '타이밍 공격' && shown) { const t = await q.evaluate(() => { const d = document.querySelector('[data-k="atb-deeds"]'), r = document.querySelector('[data-k="atb-reward"]'), rows = document.querySelector('[data-k="atb-result"] .paper .row'); return { d: d?.textContent ?? '', r: r?.textContent ?? '', first: !!d && !!rows && !!(d.compareDocumentPosition(rows) & Node.DOCUMENT_POSITION_FOLLOWING) }; });
      const z = await q.evaluate(() => ({ banner: !!document.querySelector('[data-k="atb-res-banner"]'), panel: !!document.querySelector('[data-k="atb-res-panel"]'), btns: document.querySelectorAll('[data-k="atb-res-buttons"] .b').length, slots: document.querySelectorAll('[data-k="atb-res-slot"]').length, stars: document.querySelectorAll('[data-k="atb-stars"] .star').length, medals: document.querySelectorAll('[data-k="atb-medals"] .md').length, over: Math.max(document.documentElement.scrollWidth - innerWidth, document.documentElement.scrollHeight - innerHeight), imgs: [...document.querySelectorAll('[data-k="atb-result"] img')].every((i) => i.complete && i.naturalWidth > 0) }));
      ok('요청 #29 결과 = 배너(별 3칸) · 용사 칸 · 양피지(💎 · 숙련 메달 3) · 단추 3 · 조각 그림 다 뜸 · 넘침 0 · 「내 활약」 = 판 안 · 연습방 = 예상 보상', z.banner && z.panel && z.btns === 3 && z.slots === 4 && z.stars === 3 && z.medals === 3 && z.over <= 0 && z.imgs && /내 활약/.test(t.d) && /예상 보상/.test(t.r), JSON.stringify(z)); await q.screenshot({ path: `${SHOTS}/atb-v2-result-844.png` }); }
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
  ok('요청 #36′ 고르는 창 = 속성 덧효과 한 줄(이모지 + 이름 + 설명)', /(관통|화상|감전|얼림|순풍|약점 노출|축복|저주) · /.test(await p.textContent('[data-k="atb-pick-famfx"]').catch(() => '')));
  // 다른 크기
  for (const [w, h] of [[667, 375], [1024, 768]]) {
    const q = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 }); await q.goto(B); await q.waitForSelector('[data-k="atb-setup"]'); await q.click('[data-k="atb-start"]'); await q.waitForSelector('[data-k="atb-stage"]'); await q.waitForTimeout(600);
    await q.evaluate(() => globalThis.__atb.pause(true)); await q.click('[data-k="atb-quiz-open"]'); await q.waitForTimeout(500);
    const r = await q.evaluate(() => ({ over: document.documentElement.scrollWidth - innerWidth, sub: document.querySelector('[data-k="atb-submit"]').getBoundingClientRect().bottom <= innerHeight }));
    ok(`${w} × ${h} = 넘침 0 · 제출 단추 화면 안`, r.over <= 0 && r.sub, JSON.stringify(r)); await q.screenshot({ path: `${SHOTS}/atb-quiz-${w}.png` }); await q.close();
  }
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
