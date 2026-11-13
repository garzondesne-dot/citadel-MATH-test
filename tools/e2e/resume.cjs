// #133 ⏯ 이어서 = 실제 단추로 (교사 폰 360 × 640) — 수업 열기 · 🧪 테스트로 열기 두 길
//   반 고름(시간표 칸) → 차시 → 열기 → 학생 한 명 → 시작 → 다음 ▶ 문제 1 → 「수업 닫기」 → 정말? → 같은 반 다시 고름
//   → ⏯ 「6차시 · 문제 1부터 이어서」(새로 고침 뒤도) → 누름 → 대기실 → 시작 → 지금 = 문제 1 (숫자 바꾼 판)
// 사용: npm run build → npx vite preview --port 4173 → NODE_PATH=$(npm root -g) node tools/e2e/resume.cjs
const { chromium } = require('playwright');
const B = 'http://localhost:4173/', DB = 'citadel-v1-test-db';
(async () => {
  const b = await chromium.launch(); const errs = [], log = (...a) => console.log(...a);
  for (const test of [false, true]) {
    const name = test ? '🧪 테스트로 열기' : '수업 열기';
    const ctx = await b.newContext({ viewport: { width: 360, height: 640 } });
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(`${name}: ${e}`));
    await p.goto(B + '?role=teacher');
    await p.evaluate((k) => { localStorage.clear(); const w = {}; for (let d = 1; d <= 5; d++) { w[d] = {}; for (let q = 1; q <= 7; q++) w[d][q] = '1-3'; } localStorage.setItem(`${k}|school/sched`, JSON.stringify(w)); }, DB);
    await p.reload(); await p.waitForSelector('.tabs');
    const pick = async () => { const c = await p.$('[data-cls="1-3"]'); if (c) await c.click(); else { await p.click('.tlink:has-text("다른 반")'); await p.click('.grid4 .pk:has-text("1-3")'); } await p.waitForTimeout(150); };
    const openAndStart = async (how) => {
      await how(); await p.waitForTimeout(300);
      const lv = await p.evaluate((k) => JSON.parse(localStorage.getItem(`${k}|school/live`)), DB);
      if (lv.cls !== '1-3') errs.push(`${name}: 연 반 ${lv.cls}`);
      const s = await ctx.newPage(); await s.goto(`${B}?role=student&room=${lv.code}&as=1-3:1`); await s.waitForTimeout(400); await p.bringToFront();
      await p.waitForSelector('.tact .btn:not([disabled])'); await p.click('.tact .btn'); await p.waitForTimeout(300);
      return lv;
    };
    const now = async () => ((await p.textContent('.mid')).match(/지금 · ([^🌫]+?)(?:🌫|\d+\s*\/|$)/)?.[1] ?? '').trim();
    // ① 처음 열기 → 문제 1 까지
    await pick(); await p.click('.pk3 .pk:not(.add)');
    const lv1 = await openAndStart(() => p.click(test ? '.sub2 button:has-text("테스트")' : '.tact .btn'));
    for (let i = 0; i < 8 && !(await now()).startsWith('문제 1'); i++) { await p.click('.tact .btn'); await p.waitForTimeout(250); }
    log(`${name} · 닫기 전 지금:`, await now());
    // ② 수업 닫기 (실제 단추 · 정말?)
    await p.click('.lbar button:has-text("수업 닫기")'); await p.click('.ask .btn'); await p.waitForTimeout(300);
    const stop = await p.evaluate(([k, c]) => JSON.parse(localStorage.getItem(`${k}|rooms/${c}/state`) || 'null')?.stop, [DB, lv1.code]);
    // ③ 같은 반 다시 · 새로 고침 뒤도
    await pick(); const it1 = (await p.textContent('.mid .item')).replace(/\s+/g, ' ').trim();
    await p.reload(); await p.waitForSelector('.tabs'); await pick(); const it2 = (await p.textContent('.mid .item')).replace(/\s+/g, ' ').trim();
    log(`${name} · 닫힌 자리 ${JSON.stringify(stop)} · ⏯ 「${it1}」 · 새로 고침 뒤 「${it2}」`);
    if (!it1.includes('문제 1부터 이어서') || !it2.includes('문제 1부터 이어서')) errs.push(`${name}: ⏯ 이어서 안 뜸`);
    // ④ ⏯ 누름 → 대기실 → 시작 → 문제 1 (숫자 바꾼 판)
    const lv2 = await openAndStart(() => p.click('.mid .item'));
    const fresh = await p.evaluate(([k, c]) => Object.keys(localStorage).filter((x) => x.startsWith(`${k}|rooms/${c}/meta/fresh`)).map((x) => x.split('/').pop()), [DB, lv2.code]);
    const at = await now(); log(`${name} · 이어서 연 수업 지금: ${at} · 숫자 바꾼 판 ${JSON.stringify(fresh)} · 테스트 ${!!lv2.test}`);
    if (!at.startsWith('문제 1') || !fresh.includes('m1') || lv2.code === lv1.code || !!lv2.test !== test) errs.push(`${name}: 이어서 연 자리 ${at}`);
    await ctx.close();
  }
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0');
  await b.close();
})();
