// 💡 📜 #132 게시판 「정답 까닭 한 줄」 — 미리 보기 서버 4173 · 가로 폰 844 × 390 · 태블릿 1024 × 768
//   ① 한 번에 맞힘 · 틀린 순간 = 까닭 안 보임 ② 틀렸다가 맞힘 = 「💡 왜 맞았나」 한 줄 · 카드 안 스크롤 없이 · 1.5초 뒤 사라짐
//   ③ 3번 틀림 → ⏭ 넘기기 = 정답 + 「💡 까닭」 ④ 소레이드 단계도 같음 (9차시 문제 5)
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
(async () => {
  const out = [], errs = [], ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const b = await chromium.launch();
  for (const [W, H] of [[844, 390], [1024, 768]]) {
    const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: W === 844 ? 2 : 1 });
    await p.addInitScript(() => { try { localStorage.setItem('atb-e2e-nointro', '1'); globalThis.__atbNoAutoQ = true; } catch { /* 무시 */ } });
    p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto('http://localhost:4173/?role=atb'); await p.waitForSelector('[data-k="atb-setup"]');
    await p.click('button[data-no="9"]'); await p.click('[data-k="atb-start"]'); await p.waitForSelector('[data-k="atb-stage"]'); await p.waitForTimeout(800);
    await p.evaluate(() => globalThis.__atb.pause(true));
    const ev = (f, a) => p.evaluate(f, a), wait = (ms) => p.waitForTimeout(ms), T = `${W}×${H}`, has = (k) => p.$(`[data-k="${k}"]`).then((x) => !!x);
    const vis = (k) => ev((k) => { const e = document.querySelector(`[data-k="${k}"]`), bd = document.querySelector('[data-k="atb-quiz"] .body'); if (!e || !bd) return false; const r = e.getBoundingClientRect(), B = bd.getBoundingClientRect(); return r.top >= B.top - 1 && r.bottom <= B.bottom + 1 && r.height > 10; }, k);
    // ① ②
    await ev(() => globalThis.__atb.show('m3', 1, 0)); await wait(300);
    await ev(() => globalThis.__atb.solve()); await wait(200);
    const a1 = await has('atb-fixwhy');
    await wait(700); await ev(() => globalThis.__atb.miss()); await wait(200);
    const a2 = await has('atb-fixwhy');
    ok(`① ${T} 한 번에 맞힘 · 틀린 순간 = 까닭 안 보임`, !a1 && !a2, `${a1} ${a2}`);
    await wait(500); await ev(() => globalThis.__atb.solve()); await wait(250);
    const w = await ev(() => document.querySelector('[data-k="atb-fixwhy"]')?.textContent ?? '');
    const v = await vis('atb-fixwhy');
    if (W === 844) await p.screenshot({ path: `${SHOTS}/atb132-fixwhy.png` });
    ok(`② ${T} 틀렸다가 맞힘 = 「💡 왜 맞았나」 + 까닭 · 스크롤 없이 보임`, /왜 맞았나/.test(w) && w.length > 12 && v, w.slice(0, 40));
    await wait(1500);
    ok(`② ${T} 1.5초 뒤 사라짐`, !(await has('atb-fixwhy')));
    // ③ 넘기기 (새 원문항 · 같은 원문항 오답 4번째 = 새 숫자 판이라)
    await ev(() => globalThis.__atb.show('m2', 1, 0)); await wait(300);
    await ev(() => { const a = globalThis.__atb; a.miss(); }); await wait(250); await ev(() => globalThis.__atb.miss()); await wait(250); await ev(() => globalThis.__atb.miss()); await wait(350);
    if (await has('atb-pass')) { await p.click('[data-k="atb-pass"]'); await wait(300); }
    const r = await ev(() => document.querySelector('[data-k="atb-reveal-sol"]')?.textContent ?? '');
    const rv = await vis('atb-reveal-sol');
    if (W === 844) await p.screenshot({ path: `${SHOTS}/atb132-pass.png` });
    ok(`③ ${T} ⏭ 넘기기 = 정답 + 「💡 까닭」 · 보임`, /까닭/.test(r) && r.length > 8 && rv, r.slice(0, 40));
    // ④ 소레이드
    await ev(() => globalThis.__atb.show('m5', 1, 1)); await wait(300);
    await ev(() => globalThis.__atb.miss()); await wait(700); await ev(() => globalThis.__atb.solve()); await wait(250);
    const c = await ev(() => document.querySelector('[data-k="atb-fixwhy"]')?.textContent ?? '');
    const cv = await vis('atb-fixwhy');
    if (W === 844) await p.screenshot({ path: `${SHOTS}/atb132-chain.png` });
    ok(`④ ${T} 소레이드 단계 틀렸다 맞힘 = 왜 맞았나(단계 근거) · 보임`, /왜 맞았나/.test(c) && cv, c.slice(0, 40));
    await p.close();
  }
  ok('오류 0', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(out.join('\n')); await b.close(); process.exit(errs.length ? 1 : 0);
})();
