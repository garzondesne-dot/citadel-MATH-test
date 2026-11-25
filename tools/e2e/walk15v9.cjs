// 🚶 (📜 11/25 머리 🔨 · 15차시 v9) 🧪 테스트 방에서 차시 팩을 처음부터 끝까지 — 몬스터마다 정답을 눌러 처치 · 칸 그림 · 오류 0
//   폰 375 × 667 · 이 기기 저장 · 미리 보기 서버 4173
//   NODE_PATH=$(npm root -g) node tools/e2e/walk15v9.cjs <그림 폴더> <팩 json>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', PACK = process.argv[3], B = 'http://localhost:4173/';
const P = require(PACK);
const norm = (s) => String(s || '').replace(/\[\[[^\]]*\]\]/g, '').replace(/xyO/g, '').replace(/\s+/g, '').replace(/[−–]/g, '-');
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext(), t = await ctx.newPage(); await t.setViewportSize({ width: 400, height: 860 }); t.on('pageerror', (e) => errs.push('리모컨 ' + e));
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tabs');
  await t.click('.tabs button:has-text("차시 팩")'); await t.click('[data-k="packup-go"]'); await t.setInputFiles('[data-k="packfile"]', PACK); await t.waitForSelector('[data-k="packsum"]'); await t.waitForTimeout(800);
  await t.click('.sheet .btn.pmain'); await t.waitForTimeout(1200);
  await t.click('.tabs button:has-text("수업")'); await t.click('[data-k="cls-test"]'); await t.click(`.pk3 [data-no="${P.no}"]`); await t.click('[data-mode="remote"]');
  await t.click('[data-k="open-go"]'); await t.click('[data-k="open-yes"]'); await t.waitForSelector('.tact .btn', { timeout: 15000 });
  const code = await t.evaluate(() => window.__dbGet('school/live').code);
  const s = await ctx.newPage(); await s.setViewportSize({ width: 375, height: 667 }); s.on('pageerror', (e) => errs.push('폰 ' + e)); await s.goto(`${B}?role=student&room=${code}&as=test:3`); await s.waitForTimeout(2500);
  const stepNow = () => t.evaluate(() => { const L = window.__dbGet('school/live'); return window.__dbGet(`rooms/${L.code}`).state.step; });
  const room = () => t.evaluate(() => { const L = window.__dbGet('school/live'); return window.__dbGet(`rooms/${L.code}`); });
  const goTo = async (i) => { for (let g = 0; g < 25; g++) { if ((await stepNow()) === i) break; await t.click('.tact .btn'); await t.waitForTimeout(350); } if (/지금 등장/.test(await t.textContent('.tact .btn'))) { await t.click('.tact .btn'); } await s.waitForTimeout(2200); };
  // 모든 문제 (첫 판 · 소레이드 단계) 를 한 줄로
  const allQs = (m) => { const out = []; const add = (q) => { if (Array.isArray(q)) q.forEach(add); else if (q && typeof q === 'object' && q.type) out.push(q); else if (q && typeof q === 'object') Object.values(q).forEach(add); }; add(m); return out; };
  const answer = async (qs, tag) => {
    let n = 0; await s.waitForSelector('.q2, .qt', { timeout: 15000 }).catch(() => {});
    for (let k = 0; k < 40; k++) {
      const pass = await s.$('button:has-text("사진 통과로 보기")'); if (pass) { await pass.click(); await s.waitForTimeout(1200); n++; continue; }
      const qt = await s.$$eval('.qitem .q1, .qitem .q2, .q1, .q2, .qt', (es) => es.map((e) => e.textContent).join(' ')).catch(() => '');
      if (process.env.DBG) console.log('  dbg', k, JSON.stringify(qt.slice(0, 50)), await s.$$eval('button.pmain', (es) => es.map((e) => e.textContent.trim().slice(0, 20) + (e.disabled ? '(x)' : ''))));
      if (!qt) { const go = await s.$('button.pmain:visible:not([disabled])'); const gt = go ? (await go.textContent()).trim() : ''; if (go && /다음|공격|시작|도전|계속/.test(gt) && !/한 판 더/.test(gt)) { await go.click({ timeout: 3000 }).catch(() => {}); await s.waitForTimeout(800); continue; } if (await s.$('button.pmain:visible[disabled]') && k < 30) { await s.waitForTimeout(1000); continue; } break; }
      const nq = norm(qt);
      const q = qs.find((x) => nq.includes(norm(x.question))) || qs.find((x) => { const a = norm(x.question).slice(0, 40); return a && nq.includes(a); });
      if (!q) { ok(`${tag} 문제 찾기`, false, qt.slice(0, 80)); break; }
      // 보기 = 팩 순서 그대로(①②③ 번호 = 자리) → 자리로 누름 (그래프 그림 보기도)
      if (q.type === 'match') {
        for (const [a, c] of q.answer) { await s.click(`[data-k="match"] button.el[aria-label="${q.xn}의 ${q.xs[a]}"]`, { timeout: 3000 }).catch(() => {}); await s.waitForTimeout(100); await s.click(`[data-k="match"] button.el[aria-label="${q.yn}의 ${q.ys[c]}"]`, { timeout: 3000 }).catch(() => {}); await s.waitForTimeout(100); }
        await s.click('.line .pmain:not([disabled]), button.pmain:not([disabled])', { timeout: 3000 }).catch(() => {}); await s.waitForTimeout(700); n++; continue;
      }
      const idx = q.type === 'choice' ? [q.answerIndex] : q.answer;
      const pool = await s.$$('.opt, .chip');
      for (const i of idx) { if (!pool[i]) { ok(`${tag} 보기 ${i} 없음`, false, qt.slice(0, 50)); break; } await pool[i].click({ timeout: 3000 }).catch(() => {}); await s.waitForTimeout(120); }
      await s.click('.line .pmain:not([disabled]), button.pmain:not([disabled])', { timeout: 3000 }).catch(() => {}); await s.waitForTimeout(700); n++;
    }
    return n;
  };
  for (let i = 0; i < P.steps.length; i++) {
    const st = P.steps[i]; await goTo(i);
    if (st.kind === 'monster' || st.kind === 'boss') {
      const m = st.kind === 'boss' ? P.boss : P.monsters[st.id];
      const n = await answer(allQs(m), st.id);
      await s.waitForTimeout(1500);
      const R = await room(); const hp = R.state && R.state.hp; const rec = R.recs || R.rec || null;
      await s.screenshot({ path: `${SHOTS}/w15-${st.id}.png`, fullPage: true });
      ok(`${st.id} ${st.title} · 답한 칸 ${n}`, n > 0, JSON.stringify(hp || '').slice(0, 80));
    } else await s.screenshot({ path: `${SHOTS}/w15-${st.id}.png` });
  }
  ok('가로 넘침 0', await s.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await b.close(); console.log(errs.length ? `❌ 실패 ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); process.exit(errs.length ? 1 : 0);
})();
