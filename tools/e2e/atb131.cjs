// 🧹 📜 #131 게시판 전투 화면 정리 — 미리 보기 서버 4173 · 가로 폰 844 × 390 · 태블릿 1024 × 768
//   ① 구슬 가득 빛 = CSS 테(그림 칸 없음 · 구슬 줄 테두리에 딱) ② 홀리 방패 = 파티 덮는 금빛 반구 하나(바닥 막 없음) · 칩 · 문양
//   ③ 막대 눈금 글자 없음 ④ 보스 이름 · 체력 · 예고 막대 · 실드 칸 자리 고정(상황 줄이 떠도 안 움직임) ⑤ 예고 칸 아이콘 4종 + 남은 초 + 짝 단추 ⑥ 정찰 👹 줄 · 첫 판 이름
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
(async () => {
  const out = [], errs = [], ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const b = await chromium.launch();
  for (const [W, H] of [[844, 390], [1024, 768]]) {
    const p = await b.newPage({ viewport: { width: W, height: H } });
    await p.addInitScript(() => { try { localStorage.setItem('atb-e2e-nointro', '1'); globalThis.__atbNoAutoQ = true; } catch { /* 무시 */ } });
    p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto('http://localhost:4173/?role=atb'); await p.waitForSelector('[data-k="atb-setup"]');
    await p.click('[data-k="atb-start"]'); await p.waitForSelector('[data-k="atb-stage"]'); await p.waitForTimeout(3600);
    const ev = (f, a) => p.evaluate(f, a), wait = (ms) => p.waitForTimeout(ms), T = `${W}×${H}`;
    await ev(() => { const a = globalThis.__atb; a.pause(true); a.S.heroes[0].ch = 4; }); await wait(400);
    const ring = await ev(() => { const r = document.querySelector('[data-k="atb-fullring"]'), o = document.querySelector('[data-k="atb-quiz-open"] [data-k="atb-orbs"]'); if (!r || !o) return null; const A = r.getBoundingClientRect(), B = o.getBoundingClientRect(); return { bg: getComputedStyle(r).backgroundImage, d: Math.max(Math.abs(A.left - B.left), Math.abs(A.right - B.right), Math.abs(A.top - B.top), Math.abs(A.bottom - B.bottom)) }; });
    ok(`① ${T} 구슬 가득 빛 = CSS 테 · 구슬 줄에 딱(±4px)`, !!ring && ring.bg === 'none' && ring.d <= 4, JSON.stringify(ring));
    ok(`③ ${T} 보스 막대 눈금만 (글자 없음)`, !!(await p.$('[data-k="hp-mark-shield"]')) && !(await p.$('[data-k="atb-tele-g"] small.ml')));
    // ④ 자리 고정
    const pos = () => ev(() => ['[data-k="atb-tele-g"]', '[data-k="atk-gauge"]'].map((s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top) : -1; }).join(','));
    const p0 = await pos();
    await ev(() => { const S = globalThis.__atb.S; S.rage = true; S.ragePerf = 0; S.breathWarn = null; }); await wait(300);
    const p1 = await pos();
    await ev(() => { const S = globalThis.__atb.S; S.nextAtk = 'poison'; S.target = [0, 1, 2, 3]; S.aoeNext = true; S.bossT = 8; }); await wait(300);
    const p2 = await pos();
    ok(`④ ${T} 상황 줄 · 예고가 떠도 이름 · 체력 · 예고 막대 안 움직임`, p0 === p1 && p1 === p2, `${p0} | ${p1} | ${p2}`);
    // ⑤ 예고 칸
    const slot = await ev(() => { const e = document.querySelector('[data-k="atb-tgslot"]'); return e ? { k: e.dataset.kind, ic: e.querySelector('.ti [data-ic]')?.dataset.ic ?? e.querySelector('.ti')?.textContent, st: e.querySelector('.tst [data-ic]')?.dataset.ic ?? e.querySelector('.tst')?.textContent ?? '', sec: e.querySelector('.tsec')?.textContent } : null; });
    ok(`⑤ ${T} 광역 예고 = 💥 + 상태 ☠ + 남은 초`, !!slot && slot.k === 'aoe' && slot.ic === 'aoe' && slot.st === 'poison' && /^\d+$/.test(slot.sec ?? ''), JSON.stringify(slot));
    ok(`⑤ ${T} 글 배너(예고 띠) 없음`, !(await p.$('[data-k="atb-tg-line"]')));
    const kinds = [];
    for (const [k, set] of [['single', () => { const S = globalThis.__atb.S; S.rage = false; S.nextAtk = 'smash'; S.target = [1]; S.aoeNext = false; }], ['special', () => { const S = globalThis.__atb.S; S.nextAtk = 'pounce'; S.target = [2]; S.aoeNext = false; }], ['rage', () => { const S = globalThis.__atb.S; S.rage = true; S.nextAtk = S.boss.rageSpecial ?? S.boss.cycle.find((x) => ['fire', 'sleep', 'bind', 'mirror', 'confuse', 'pounce', 'swallow', 'falseHyp', 'reverse', 'breathAtk'].includes(x)) ?? 'aoe'; S.target = [0]; }]]) {
      await ev(set); await wait(250); kinds.push(await ev(() => document.querySelector('[data-k="atb-tgslot"]')?.dataset.kind ?? '-')); if (W === 844) await p.screenshot({ path: `${SHOTS}/atb131-tele-${k}.png` });
    }
    ok(`⑤ ${T} 🎯 단일 · 🌀 모으기 · 👹 분노 아이콘`, kinds.join() === 'single,special,rage', kinds.join());
    // 짝 단추 (내가 서포터 = 광역 · 격려)
    await ev(() => { const S = globalThis.__atb.S, me = S.heroes[0]; S.rage = false; S.heroes.forEach((h, i) => { if (i && h.s.role === 'support') h.s = { ...h.s, role: 'dealer' }; }); me.s = { ...me.s, role: 'support' }; me.ch = 4; S.nextAtk = 'poison'; S.target = [0, 1, 2, 3]; S.aoeNext = true; S.bossT = 8; S.blocked = null; }); await wait(300);
    ok(`⑤ ${T} 막는 단추에 같은 아이콘(💥 → 🎵 격려)`, (await ev(() => { const e = document.querySelector('[data-k="atb-morph-tg"]'); return e?.querySelector('[data-ic]')?.dataset.ic ?? e?.textContent; })) === 'aoe'); /* 📜 #145 ui-ic16 그림 */
    await ev(() => { const S = globalThis.__atb.S; S.target = null; S.nextAtk = null; S.aoeNext = false; }); await wait(300);
    // ② 홀리 방패
    await ev(() => { const S = globalThis.__atb.S; S.guard = true; S.stoneUntil = S.t + 6; S.evN++; S.ev.push({ k: 'aura', t: S.t, who: 0, stone: 6, n: S.evN }); }); await wait(200);
    if (W === 844) await p.screenshot({ path: `${SHOTS}/atb131-holy.png` });
    const holy = await ev(() => { const d = [...document.querySelectorAll('[data-k="atb-dome"]')], hs = [...document.querySelectorAll('[data-k="atb-hero"]')].map((h) => h.getBoundingClientRect()); if (d.length !== 1) return { n: d.length }; const R = d[0].getBoundingClientRect(); return { n: 1, kind: d[0].dataset.kind, chip: !!d[0].querySelector('[data-k="atb-holy-chip"]'), cover: hs.every((h) => h.left + h.width / 2 >= R.left && h.left + h.width / 2 <= R.right && h.bottom >= R.top), floor: !!document.querySelector('[data-k="atb-tbarrier"]') }; });
    ok(`② ${T} 홀리 방패 = 금빛 반구 하나 · 4명 덮음 · 칩 · 바닥 막 없음`, holy.n === 1 && holy.kind === 'aura' && holy.chip && holy.cover && !holy.floor, JSON.stringify(holy));
    await ev(() => { const S = globalThis.__atb.S; S.guard = false; S.stoneUntil = 0; }); await wait(200);
    await p.close();
  }
  // ⑥ 정찰 · 첫 판 이름
  { const p = await b.newPage({ viewport: { width: 844, height: 390 } }); p.on('pageerror', (e) => errs.push(String(e)));
    await p.addInitScript(() => { try { if (!sessionStorage.getItem('x')) { localStorage.clear(); sessionStorage.setItem('x', '1'); } globalThis.__atbNoAutoQ = true; } catch { /* 무시 */ } });
    await p.goto('http://localhost:4173/?role=atb'); await p.waitForSelector('[data-k="atb-setup"]'); await p.click('[data-k="atb-start"]');
    await p.waitForSelector('[data-k="atb-scout-atks"]', { timeout: 8000 }).catch(() => {});
    const sc = await p.evaluate(() => ({ rows: [...document.querySelectorAll('[data-k="atb-scout-atks"] tr')].map((r) => r.textContent.trim().slice(0, 2)), rage: /퍼펙트로 진정/.test(document.querySelector('[data-k="atb-scout-rage"]')?.textContent ?? '') }));
    ok('⑥ 정찰 카드 = 아이콘 줄 + 👹 분노 「퍼펙트로 진정」', sc.rage && sc.rows.length >= 2, JSON.stringify(sc));
    await p.screenshot({ path: `${SHOTS}/atb131-scout.png` });
    await p.waitForSelector('[data-k="atb-stage"]', { timeout: 20000 }); await p.waitForFunction(() => !document.querySelector('[data-k="atb-scout-atks"]'), null, { timeout: 20000 }).catch(() => {});
    await p.evaluate(() => { const a = globalThis.__atb; a.pause(true); const S = a.S; S.nextAtk = 'smash'; S.target = [1]; S.aoeNext = false; S.bossT = 8; }); await p.waitForTimeout(250);
    const nm1 = !!(await p.$('[data-k="atb-tgname"]')); await p.waitForTimeout(900); const nm2 = !!(await p.$('[data-k="atb-tgname"]'));
    ok('⑥ 첫 판 = 예고 이름 0.8초 뒤 사라짐', nm1 && !nm2, `${nm1} → ${nm2}`);
    await p.evaluate(() => localStorage.setItem('atb-tg-learned', '1')); await p.close(); }
  ok('오류 0', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(out.join('\n')); await b.close(); process.exit(errs.length ? 1 : 0);
})();
