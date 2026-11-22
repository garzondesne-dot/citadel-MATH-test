// 📋 📜 #135 게시판 출정 UI 정리 + 🧙 용사 확인 시트 — 미리 보기 서버 4173 · 체험판(봇 · 체험 차시) · 세로 390 × 844 · 360 × 640
//   ① 출정 탭 = 지도 · 출정 카드 하나(보스 · 차시 · 약점 · 내 용사 줄 + 「🧙 바꾸기」 48) · 「균열 n곳」 글 없음 · 모집 = 빈 상태 한 줄 · 기사단 막대 · 남은 오답 · 수업 중 카드 없음
//   ② 아래 「⚔ n차시 출정」 56 · 짧은 폰에서도 화면 안 ③ 「🧙 바꾸기」 · 「⚔ 출정」 = 시트(약점 · 큰 그림 · 스킬 Ⅰ ~ Ⅳ 한 줄 48 · 효과 한 줄 · 거름 칩 · 격자 4칸 · 주요 단추 56 화면 안)
//   ④ 시트 「⚔ 이 용사로 출발」 = 전투 시작 · 가로 넘침 0
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
(async () => {
  const out = [], errs = [], ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const b = await chromium.launch();
  for (const [W, H] of [[390, 844], [360, 640]]) {
    const T = `${W}×${H}`, p = await (await b.newContext({ viewport: { width: W, height: H } })).newPage();
    await p.addInitScript(() => { try { localStorage.setItem('atb-e2e-nointro', '1'); } catch { /* 무시 */ } });
    p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto('http://localhost:4173/trial/'); await p.fill('[data-k="trial-name"]', '체험'); await p.click('[data-k="trial-stu"]'); await p.waitForTimeout(800);
    if (await p.$('text=첫 용사 고르기')) { await p.click('button:has-text("시작")'); await p.waitForTimeout(600); }
    await p.waitForSelector('[data-k="trial-atb"]', { timeout: 10000 }); await p.click('[data-k="trial-atb"]');
    await p.waitForSelector('[data-k="board-map"]', { timeout: 15000 }); await p.waitForTimeout(500);
    if (await p.$('[data-k="board-story"]')) { await p.click('[data-k="board-story"]'); await p.waitForTimeout(300); }
    const nos = await p.$$eval('[data-map]:not(.lockd)', (x) => x.map((e) => e.dataset.map)); await p.click(`[data-map="${nos[0]}"]`); await p.waitForTimeout(300);
    const go = await p.evaluate(() => { const q = (s) => document.querySelector(s); const chg = q('[data-k="board-hero"]')?.getBoundingClientRect(); return { card: !!q('[data-k="board-pick"] .bimg') && !!q('[data-k="board-weak"]') && !!q('[data-k="board-hero-row"]'), chg: chg ? Math.round(chg.height) : 0, rift: !!q('[data-k="board-rifts"]'), war: !!q('[data-k="war-chip"]'), note: !!q('[data-k="board-note"]'), none: !!q('[data-k="board-recruit-none"]'), glow: !!q('[data-map].left') }; });
    ok(`① ${T} 출정 카드(보스 · 약점 · 내 용사 줄) · 바꾸기 48 · 균열 글 · 기사단 막대 · 남은 오답 없음 · 모집 빈 줄 · 금빛 칸`, go.card && go.chg >= 48 && !go.rift && !go.war && !go.note && go.none && go.glow, JSON.stringify(go));
    const main = await p.evaluate(() => { const m = [...document.querySelectorAll('button')].find((x) => /차시 출정$/.test(x.textContent.trim())); if (!m) return null; const r = m.getBoundingClientRect(); return { h: Math.round(r.height), in: r.bottom <= innerHeight && r.top >= 0, over: document.documentElement.scrollWidth - innerWidth }; });
    ok(`② ${T} 「⚔ n차시 출정」 56 · 화면 안 · 가로 넘침 0`, !!main && main.h >= 56 && main.in && main.over <= 0, JSON.stringify(main));
    await p.click('[data-k="board-hero"]'); await p.waitForSelector('[data-k="hero-sheet"]'); await p.waitForTimeout(350);
    const sh = await p.evaluate(() => { const q = (s) => document.querySelector(s), g = q('[data-k="hero-sheet-go"]').getBoundingClientRect(), sk = [...document.querySelectorAll('[data-k="hero-sheet-skills"] .s')].map((e) => e.getBoundingClientRect()); const c = [...document.querySelectorAll('[data-k="hero-sheet"] .cell')].map((e) => e.getBoundingClientRect()); return { weak: !!q('[data-k="hero-sheet-weak"] .fam'), sk: sk.length, skRow: sk.length === 4 && new Set(sk.map((r) => Math.round(r.top))).size === 1 && sk.every((r) => r.height >= 48), eff: /스킬 2/.test(q('[data-k="hero-sheet-eff"]')?.textContent ?? ''), flt: document.querySelectorAll('[data-k="hero-sheet"] .flt button').length, cols: new Set(c.slice(0, 4).map((r) => Math.round(r.top))).size === 1 && c.length >= 4, cell: Math.round(c[0]?.height ?? 0), go: Math.round(g.height), goIn: g.bottom <= innerHeight }; });
    ok(`③ ${T} 시트 = 약점 · 스킬 Ⅰ ~ Ⅳ 한 줄 48 · 효과 한 줄 · 거름 칩 3 · 격자 4칸 · 주요 단추 56 화면 안`, sh.weak && sh.skRow && sh.eff && sh.flt === 3 && sh.cols && sh.cell >= 48 && sh.go >= 56 && sh.goIn, JSON.stringify(sh));
    if (W === 390) await p.screenshot({ path: `${SHOTS}/board135-sheet.png` });
    await p.click('[data-k="hero-sheet-x"]'); await p.waitForTimeout(250);
    await p.click('.bd .act .btn'); const s2 = await p.waitForSelector('[data-k="hero-sheet"]', { timeout: 3000 }).catch(() => null);
    const t2 = s2 ? await p.textContent('[data-k="hero-sheet-go"]') : '';
    ok(`③ ${T} 「⚔ 출정」 = 늘 시트 거침 · 「⚔ 이 용사로 출발」`, !!s2 && /이 용사로 출발/.test(t2 ?? ''), t2 ?? '');
    if (s2) { await p.click('[data-k="hero-sheet-go"]'); const st = await p.waitForSelector('[data-k="atb-stage"]', { timeout: 15000 }).catch(() => null); ok(`④ ${T} 출발 = 전투 시작`, !!st); }
    await p.close();
  }
  ok('오류 0', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(out.join('\n')); await b.close(); process.exit(errs.length ? 1 : 0);
})();
