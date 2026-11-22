// 📸 11/21 게시판 던전 새 전투 UI 캡처 한 벌 (이 기기 · 서버 안 씀 · 고치지 않음) — 메인 머리 요청
//   캠프 → 게시판 → 2차시 혼자 도전(나 + 봇 3) · 장면이 처음 보일 때 찍음(자연 발생) · 체력 · 쓰러짐 · 분노 · 결과는 판 상태를 바꿔 만듦
//   node tools/e2e/uishots.cjs <폴더> [390x844 | 844x390]
const { chromium } = require('playwright');
const OUT = process.argv[2] || '.', [W, H] = (process.argv[3] || '844x390').split('x').map(Number), TAG = `${W}x${H}`, B = 'http://localhost:4173/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(), got = new Map(), notes = [];
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { try { localStorage.setItem('citadel-wake-tip', '1'); } catch { /* */ } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 140)));
  const shot = async (id, name, force = false) => { if (got.has(id) && !force) return false; const f = `${id}-${name}-${TAG}.png`; await p.screenshot({ path: `${OUT}/${f}` }); got.set(id, f); console.log('📸', f); return true; };
  const has = (k) => p.$(`[data-k="${k}"]`).then(Boolean).catch(() => false);
  const ev = (fn, a) => p.evaluate(fn, a).catch(() => null);
  // 캠프 → 게시판
  await p.goto(`${B}?role=camp&mode=test&room=SHOT`); await p.waitForSelector('.stage', { timeout: 20000 }); await wait(1000);
  await p.$eval('[data-prop="dummy"]', (e) => e.click()); await wait(2500);
  for (let i = 0; i < 12 && (await p.$('[data-k="board-story"]')); i++) { if (i === 0) await shot('00', '게시판스토리'); await p.click('[data-k="board-story"]').catch(() => {}); await wait(700); }
  // 2차시 고르기 (지도 칸)
  await p.click('.mp:has-text("2")').catch(() => p.click('button:has-text("2차시")').catch(() => notes.push('2차시 칸 못 누름')));
  await wait(800);
  // 01 대기실 = 팀 모집 시트
  const team = await p.$('button:has-text("팀 모집")');
  if (team) { await team.click(); await wait(1500); await shot('01', '대기실'); await p.click('button:has-text("모집 글 내리기")').catch(() => notes.push('모집 글 내리기 못 누름')); await wait(1500); for (let i = 0; i < 6 && (await p.$('[data-k="board-story"]')); i++) { await p.click('[data-k="board-story"]').catch(() => {}); await wait(600); } }
  // 혼자 도전
  await p.click('button:has-text("혼자 도전")');
  for (let i = 0; i < 120; i++) {
    if (await has('atb-intro-line') && !(await has('atb-scout'))) await shot('02', '조우');
    if (await has('atb-scout')) await shot('03', '정찰');
    if (await has('atb-intro-count')) await shot('04', '321');
    if (await has('atb-stage') && !(await has('atb-intro'))) break;
    await wait(200);
  }
  await wait(1200); await shot('05', '전투기본');
  // 06 문제 카드 (2차시 첫 원문항) + 다른 원문항 1개
  await p.click('[data-k="atb-quiz-open"]').catch(() => {}); await wait(900); await shot('06a', '문제카드');
  const os = (await ev(() => globalThis.__atb?.origins?.())) || [];
  if (os.length > 1) { await ev((m) => globalThis.__atb.show(m, 1, 0), os[os.length - 1]); await wait(800); await shot('06b', '문제카드-다른문항'); }
  await ev(() => globalThis.__atb.close()); await wait(500);
  // 07 스킬 메뉴 · 08 충전 가득
  await ev(() => { globalThis.__atb.charge(4); globalThis.__atb.full(); }); await wait(900); await shot('08', '충전가득');
  await p.click('[data-k="atb-skill-btn"]').catch(() => {}); await wait(700); await shot('07', '스킬메뉴');
  // 📜 #102 ⑤ 스킬 1 = 컷인 없음 (22 컷인 = 스킬 2 실드 깨기에서) · 메뉴 닫기
  await p.click('[data-k="atb-skill-btn"]').catch(() => {});
  await wait(1500);
  // 자연 장면 기다리기 (예고 · 반응 · 실드 · 덧효과 · 결계)
  const t0 = Date.now();
  while (Date.now() - t0 < 150000) {
    await ev(() => { const a = globalThis.__atb; const S = a?.S; if (!S || S.end) return; const me = S.heroes[0]; if (me) { me.hp = Math.max(me.hp, me.s.maxHp * 0.6); } S.heroes.forEach((h) => { if (!h.down && h.hp < h.s.maxHp * 0.35) h.hp = Math.round(h.s.maxHp * 0.6); }); if (S.bossHp < S.bossMax * 0.4) S.bossHp = Math.round(S.bossMax * 0.45); }); // 끝까지 안 죽게 · 보스도 안 죽게
    const st = await ev(() => { const S = globalThis.__atb?.S; return S ? { tgt: !!S.target, aoe: S.aoeNext, nx: S.nextAtk, sh: S.shieldUp, hp: S.bossHp / S.bossMax, weak: S.t < S.weakUntil, rage: !!S.rage } : null; });
    if (!st) break;
    if (await has('atb-aoe-floor')) await shot('10', '광역예고');
    else if (await has('atb-aim')) await shot('09', '단일예고');
    if (await has('atb-tele') && !(await has('atb-aim')) && !(await has('atb-aoe-floor'))) await shot('11', '특수예고');
    if (await has('atb-counter')) { await shot('12a', '반응단추'); await p.click('[data-k="atb-counter"]', { force: true, timeout: 1500 }).catch(() => {}); await wait(500); await shot('12b', '반응제자리'); }
    if (st.sh && await has('atb-cells')) await shot('13', '실드펼침');
    if (await has('atb-break')) { await shot('14', '실드깨기단추'); await ev(() => { globalThis.__atb.charge(4); globalThis.__atb.full(); }); await p.click('[data-k="atb-break"]', { force: true }).catch(() => {}); for (let i = 0; i < 20; i++) { if (await has('atb-cutin') || await has('atb-eye')) { await shot('22', '스킬2컷인'); break; } await wait(80); } await wait(400); await shot('14b', '속성브레이크'); }
    if (await has('atb-shards')) await shot('15a', '실드파괴');
    if (st.weak) await shot('15', '약점시간');
    if (await has('atb-status') || await has('atb-stone')) await shot('17', '덧효과');
    if (await has('atb-dome') || await has('atb-barrier') || await has('atb-tbarrier')) await shot('18', '결계돔');
    if (st.sh && !st.weak) { await ev(() => { globalThis.__atb.charge(4); globalThis.__atb.full(); }); } // 내 칸 깨기 기회
    if (!st.sh && st.hp > 0.62 && !st.weak) await ev(() => { const S = globalThis.__atb.S; S.bossHp = Math.round(Math.max(S.bossMax * 0.61, S.bossHp - S.bossMax * 0.03)); }); // 실드 나오는 곳까지 당김
    if (['09', '10', '11', '13', '15', '17'].every((k) => got.has(k)) && Date.now() - t0 > 60000) break;
    await wait(200);
  }
  const heal = () => ev(() => { const S = globalThis.__atb?.S; if (!S || S.end) return; S.heroes.forEach((h) => { h.down = false; h.hp = h.s.maxHp; }); S.revives = Math.max(S.revives, 2); S.bossHp = Math.max(S.bossHp, Math.round(S.bossMax * 0.2)); });
  await heal();
  // 자연으로 못 본 장면 = 판 상태를 맞춰 만듦 (atb.cjs 요청 #35 · #40 · #50 과 같은 방법)
  const tele = async (o) => ev((o) => { const a = globalThis.__atb, S = a.S; S.blocked = null; S.nextAtk = o.k; S.aoeNext = o.aoe; S.target = o.aoe ? S.heroes.filter((h) => !h.down).map((h) => h.id) : [o.to]; S.bossT = a.every() - 3.5; }, o);
  if (!got.has('09')) { await ev(() => globalThis.__atb.pause(true)); await tele({ k: 'ice', aoe: false, to: 0 }); await wait(500); await shot('09', '단일예고'); await ev(() => globalThis.__atb.pause(false)); await wait(4500); }
  if (!got.has('11')) { await ev(() => globalThis.__atb.pause(true)); await tele({ k: 'fire', aoe: true }); await wait(500); await shot('11', '특수예고'); await ev(() => globalThis.__atb.pause(false)); await wait(4500); }
  if (!got.has('12')) {
    await ev(() => globalThis.__atb.pause(true)); await ev(() => { const h = globalThis.__atb.S.heroes[0]; h.s.role = 'tank'; h.ch = 2; h.atb = 0; }); await tele({ k: 'ice', aoe: false, to: 1 }); await wait(400);
    if (await has('atb-counter')) { await shot('12a', '반응단추'); await ev(() => globalThis.__atb.pause(false)); await p.click('[data-k="atb-counter"]', { force: true, timeout: 1500 }).catch(() => {}); await wait(500); await shot('12b', '반응제자리'); /* 📜 #102 ⑤ 역할 스킬 = 컷인 없이 제자리 */ } else notes.push('12 카운터 단추가 안 뜸');
    await ev(() => globalThis.__atb.pause(false)); await wait(3000);
  }
  if (!got.has('17')) { await ev(() => { const a = globalThis.__atb, S = a.S; a.pause(true); const [h0, h1, h2, h3] = S.heroes; if (h1) { h1.stunKind = 'sleep'; h1.stunUntil = S.t + 9; } if (h2) { h2.slowKind = 'darkHit'; h2.slowUntil = S.t + 9; } if (h3) { h3.stunKind = 'bind'; h3.stunUntil = S.t + 9; } h0.slowKind = 'ice'; h0.slowUntil = S.t + 9; S.stoneUntil = S.t + 6; }); await wait(600); await shot('17', '덧효과-상태-석화'); await ev(() => globalThis.__atb.pause(false)); await wait(2500); }
  // 16 분노 = 보스 30% 아래
  await ev(() => { const S = globalThis.__atb.S; S.shieldUp = false; S.cells.forEach((c) => { c.broken = true; }); S.bossHp = Math.round(S.bossMax * 0.29); });
  for (let i = 0; i < 40; i++) { await heal(); if (await has('atb-rageburst') || await has('atb-ragedge')) { await shot('16a', '분노진입'); break; } await wait(150); }
  for (let i = 0; i < 10; i++) { await heal(); await wait(250); } await shot('16', '분노중');
  // 19 내 체력 30% · 15% 아래
  await heal(); await ev(() => globalThis.__atb.pause(true));
  await ev(() => { const h = globalThis.__atb.S.heroes[0]; h.hp = Math.floor(h.s.maxHp * 0.25); }); await wait(1200); await shot('19a', '내체력30');
  await ev(() => { const h = globalThis.__atb.S.heroes[0]; h.hp = Math.floor(h.s.maxHp * 0.12); globalThis.__atb.flash(30); }); await wait(900); await shot('19b', '내체력15');
  await ev(() => { const h = globalThis.__atb.S.heroes[0]; h.hp = h.s.maxHp; }); await ev(() => globalThis.__atb.pause(false));
  // 20 친구 쓰러짐 · 부활
  await heal();
  await ev(() => { const S = globalThis.__atb.S; const f = S.heroes[1]; f.hp = 0; f.down = true; S.ev.push({ k: 'down', t: S.t, who: 1, n: ++S.evN }); }); await wait(1200); await shot('20a', '친구쓰러짐');
  await ev(() => { const S = globalThis.__atb.S; S.revives = 1; globalThis.__atb.charge(4); globalThis.__atb.full(); });
  if (!(await p.$('[data-k="atb-skills"].open'))) await p.click('[data-k="atb-skill-btn"]').catch(() => {});
  await wait(600); await shot('20c', '부활메뉴');
  const rv = await p.$('[data-k="atb-sk-revive"]');
  if (rv) { await rv.click().catch(() => {}); await wait(500); await shot('20b', '부활'); for (let i = 0; i < 25; i++) { if (await has('atb-rev0')) { await wait(600); await shot('21', '팀부활0'); break; } await wait(150); } } else notes.push('부활 단추(atb-sk-revive) 없음');
  // 🛡 #103 도와줘 = 친구가 수호자(도전자 카드 「💡 도와줘」 · 기다림 · 받은 힌트) → 내가 수호자(스킬 단추 「💡 ○○ 도와줘!」)
  await ev(() => { const a = globalThis.__atb, S = a.S; a.pause(true); S.heroes.forEach((h) => { h.down = false; h.hp = h.s.maxHp; }); S.heroes[1].gd = true; S.asks = {}; S.target = null; S.nextAtk = null; }); await wait(400);
  if (await has('atb-quiz-open')) await p.click('[data-k="atb-quiz-open"]', { force: true }).catch(() => {}); await wait(700);
  if (await has('atb-help')) { await shot('26a', '도와줘단추'); await p.click('[data-k="atb-help"]').catch(() => {}); await wait(500); await shot('26b', '도와줘기다림');
    await ev(() => { const S = globalThis.__atb.S; if (S.asks?.[0]) S.asks[0].by = 1; }); await wait(600); await shot('26c', '받은힌트'); } else notes.push('26 도와줘 단추(atb-help) 없음');
  await ev(() => globalThis.__atb.close()); await wait(500);
  await ev(() => { const S = globalThis.__atb.S; S.heroes[1].gd = false; S.heroes[0].gd = true; S.asks = { 2: { by: -1, t: S.t } }; }); await wait(600);
  if (await has('atb-aid')) await shot('26d', '수호자도와줘'); else notes.push('26d 수호자 단추(atb-aid) 없음');
  await ev(() => { const S = globalThis.__atb.S; S.asks = {}; S.heroes[0].gd = false; globalThis.__atb.pause(false); }); await wait(300);
  // 24 패배 (이 판) → 다시 23 승리는 새 판
  await ev(() => { const S = globalThis.__atb.S; S.revives = 0; S.heroes.forEach((h) => { h.hp = 0; h.down = true; }); });
  for (let i = 0; i < 60; i++) { if (await has('atb-result')) break; await wait(250); }
  await wait(2500); await shot('24', '결과패배');
  await p.click('[data-k="atb-to-board"]').catch(() => {}); await wait(2500); await shot('25', '게시판으로');
  // 23 승리 = 다시 혼자 도전 → 보스 0
  await p.click('button:has-text("혼자 도전")').catch(() => {}); for (let i = 0; i < 100 && !(await has('atb-stage') && !(await has('atb-intro'))); i++) await wait(200);
  await ev(() => { const H = globalThis.__atb?.S?.heroes; if (!H) return; H[0].log.right = 6; H[0].log.aids = 1; H[1].log.right = 4; H[1].log.heals = 3; H[2].log.right = 5; H[2].log.covers = 2; H[3].log.right = 3; H[3].log.cuts = 1; H[3].log.blocks = 1; }); /* 📜 #102 ⑨ 공적 칩 · 👑 MVP 보이게 */
  for (let i = 0; i < 30 && !(await has('atb-result')); i++) { await ev(() => globalThis.__atb?.win?.()); await wait(400); } /* __atb.win() = 엔진 끝 판정 (fa8548e) */
  await wait(2500); await shot('23', '결과승리');
  const want = ['01', '02', '03', '04', '05', '06a', '07', '08', '09', '10', '11', '12a', '13', '14', '15', '16', '17', '18', '19a', '19b', '20a', '20b', '22', '23', '24', '25', '26a', '26b', '26c', '26d'];
  console.log('못 찍음:', want.filter((k) => !got.has(k)).join(' ') || '없음');
  console.log('메모:', notes.join(' · ') || '없음', '· 오류:', errs.join(' | ') || 0);
  await b.close();
})();
