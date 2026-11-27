// 📸 학생 화면 미리 보기 묶음 (📜 11/27 머리 🔨 · 차시팩 구조 개선 C · DECISIONS 3187d93)
//   팩 하나 → 🧪 테스트 방(이 기기 저장 · 서버에 안 씀)에서 학생 폰 375 × 667 그대로 처음부터 끝까지
//   단계마다 · 문제가 바뀔 때마다(몬스터 첫 판 · 소레이드 단계 · 👑 형성평가 첫 판 문항) 정답을 누르기 「전」 화면을 찍음 → 그림 목록 + PDF 한 묶음
//   칸 그림 = 서버에서 받아 둔 폴더(<칸>.json = 서버 값 그대로)를 이 기기 저장에 넣어 학생 폰과 같은 그림으로 · 없는 칸은 표에 ❌
//   npx vite build && npx vite preview --port 4173 → NODE_PATH=$(npm root -g) node tools/preview/packshots.cjs <팩 json> <내보낼 폴더> [칸 그림 폴더]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const PACK = path.resolve(process.argv[2]), OUT = path.resolve(process.argv[3] || '.'), IMG = process.argv[4] ? path.resolve(process.argv[4]) : null, B = 'http://localhost:4173/';
const P = JSON.parse(fs.readFileSync(PACK, 'utf8'));
fs.mkdirSync(OUT, { recursive: true });
const norm = (s) => String(s || '').replace(/\[\[[^\]]*\]\]/g, '').replace(/xyO/g, '').replace(/\s+/g, '').replace(/[−–]/g, '-');
const allQs = (m) => { const out = []; const add = (q) => { if (Array.isArray(q)) q.forEach(add); else if (q && typeof q === 'object' && q.type) out.push(q); else if (q && typeof q === 'object') Object.values(q).forEach(add); }; add(m); return out; };
(async () => {
  const cells = P.imgCells || [], src = P.imgOf || P.partOf || P.id;
  const imgs = {}, missing = [];
  for (const c of cells) { const f = IMG && path.join(IMG, `${c}.json`); const v = f && fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; if (typeof v === 'string' && v.startsWith('data:image')) imgs[c] = v; else missing.push(c); }
  const b = await chromium.launch(), errs = [], shots = [];
  const ctx = await b.newContext();
  await ctx.addInitScript(([s, im]) => { try { localStorage.setItem('citadel-wake-tip', '1'); for (const [c, v] of Object.entries(im)) localStorage.setItem(`citadel-v1-test-db|prep/${s}/img/${c}`, JSON.stringify(v)); } catch {} }, [src, imgs]);
  const t = await ctx.newPage(); await t.setViewportSize({ width: 400, height: 860 }); t.on('pageerror', (e) => errs.push('리모컨 ' + e));
  await t.goto(B + '?role=teacher'); await t.evaluate(() => { const keep = Object.keys(localStorage).filter((k) => /\|prep\/[^/]+\/img\//.test(k) || k === 'citadel-wake-tip'); for (const k of Object.keys(localStorage)) if (!keep.includes(k)) localStorage.removeItem(k); }); await t.reload(); await t.waitForSelector('.tabs');
  // 📦 팩 올리기 = 교사 화면 「차시 팩」 그대로 (서버 대신 이 기기)
  await t.click('.tabs button:has-text("차시 팩")'); await t.click('[data-k="packup-go"]'); await t.setInputFiles('[data-k="packfile"]', PACK); await t.waitForSelector('[data-k="packsum"]'); await t.waitForTimeout(800);
  await t.click('.sheet .btn.pmain'); await t.waitForTimeout(1200);
  await t.click('.tabs button:has-text("수업")'); await t.click('[data-k="cls-test"]'); await t.click(`.pk3 [data-no="${P.no}"]`); await t.click('[data-mode="remote"]');
  await t.click('[data-k="open-go"]'); await t.click('[data-k="open-yes"]'); await t.waitForSelector('.tact .btn', { timeout: 15000 });
  const code = await t.evaluate(() => window.__dbGet('school/live').code);
  const s = await ctx.newPage(); await s.setViewportSize({ width: 375, height: 667 }); s.on('pageerror', (e) => errs.push('폰 ' + e)); await s.goto(`${B}?role=student&room=${code}&as=test:3`); await s.waitForTimeout(2500);
  const stepNow = () => t.evaluate(() => { const L = window.__dbGet('school/live'); return window.__dbGet(`rooms/${L.code}`).state.step; });
  const goTo = async (i) => { for (let g = 0; g < 25; g++) { if ((await stepNow()) === i) break; await t.click('.tact .btn'); await t.waitForTimeout(350); } if (/지금 등장/.test(await t.textContent('.tact .btn'))) { await t.click('.tact .btn'); } await s.waitForTimeout(2200); };
  let seq = 0;
  const snap = async (tag, cap) => { seq++; const f = `${String(seq).padStart(3, '0')}-${tag}.png`.replace(/[^\w.-]/g, '_'); await s.screenshot({ path: path.join(OUT, f), fullPage: true }); shots.push({ f, cap }); };
  const answer = async (qs, st) => {
    let n = 0, last = ''; await s.waitForSelector('.q2, .qt', { timeout: 15000 }).catch(() => {});
    for (let k = 0; k < 40; k++) {
      const pass = await s.$('button:has-text("사진 통과로 보기")');
      if (pass) { await snap(`${st.id}-photo`, `${st.title} · ✍ 서술형 📸 (사진 창)`); await pass.click(); await s.waitForTimeout(1200); n++; continue; }
      const qt = await s.$$eval('.qitem .q1, .qitem .q2, .q1, .q2, .qt', (es) => es.map((e) => e.textContent).join(' ')).catch(() => '');
      if (!qt) { const go = await s.$('button.pmain:visible:not([disabled])'); const gt = go ? (await go.textContent()).trim() : ''; if (go && /다음|공격|시작|도전|계속/.test(gt) && !/한 판 더/.test(gt)) { await go.click({ timeout: 3000 }).catch(() => {}); await s.waitForTimeout(800); continue; } break; }
      const nq = norm(qt);
      const q = qs.find((x) => nq.includes(norm(x.question))) || qs.find((x) => { const a = norm(x.question).slice(0, 40); return a && nq.includes(a); });
      if (!q) { errs.push(`${st.id} 문제를 팩에서 못 찾음: ${qt.slice(0, 60)}`); await snap(`${st.id}-unknown`, `${st.title} · ⚠ 팩에서 못 찾은 화면`); break; }
      if (nq !== last) { await snap(`${st.id}-q${n + 1}`, `${st.title} · 문제 ${n + 1} (${q.type})`); last = nq; }
      if (q.type === 'match') {
        for (const [a, c] of q.answer) { await s.click(`[data-k="match"] button.el[aria-label="${q.xn}의 ${q.xs[a]}"]`, { timeout: 3000 }).catch(() => {}); await s.waitForTimeout(100); await s.click(`[data-k="match"] button.el[aria-label="${q.yn}의 ${q.ys[c]}"]`, { timeout: 3000 }).catch(() => {}); await s.waitForTimeout(100); }
      } else {
        const idx = q.type === 'choice' ? [q.answerIndex] : q.answer, pool = await s.$$('.opt, .chip');
        for (const i of idx || []) { if (!pool[i]) { errs.push(`${st.id} 보기 ${i} 없음`); break; } await pool[i].click({ timeout: 3000 }).catch(() => {}); await s.waitForTimeout(120); }
      }
      await s.click('.line .pmain:not([disabled]), button.pmain:not([disabled])', { timeout: 3000 }).catch(() => {}); await s.waitForTimeout(700); n++;
    }
    return n;
  };
  for (let i = 0; i < P.steps.length; i++) {
    const st = P.steps[i]; await goTo(i);
    if (st.kind === 'monster' || st.kind === 'boss') {
      const m = st.kind === 'boss' ? P.boss : P.monsters[st.id];
      const n = await answer(allQs(m), st);
      await s.waitForTimeout(1200); await snap(`${st.id}-end`, `${st.title} · 끝 화면`);
      const wr = await s.$('button:has-text("서술형"):visible'); // ✍ 서술형 📸 (끝 화면 단추) → 사진 창 · 테스트 통과로 닫음 (이 기기)
      if (wr) { await wr.click().catch(() => {}); await s.waitForTimeout(1200); await snap(`${st.id}-write`, `${st.title} · ✍ 서술형 📸 창`); const ps = await s.$('button:has-text("사진 통과로 보기")'); if (ps) { await ps.click().catch(() => {}); await s.waitForTimeout(1200); } else await s.keyboard.press('Escape'); }
      if (!n) errs.push(`${st.id} 답한 칸 0`);
    } else await snap(st.id, `${st.title || st.id} (${st.kind})`);
  }
  const wide = await s.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  // 📄 한 묶음 PDF (A4 세로 · 한 쪽에 3장)
  const rows = shots.map((x) => `<figure><img src="data:image/png;base64,${fs.readFileSync(path.join(OUT, x.f)).toString('base64')}"><figcaption>${x.f.slice(0, 3)} · ${x.cap}</figcaption></figure>`).join('');
  const head = `<h1>${P.no}차시 · ${P.title || P.id} · 학생 폰 미리 보기 (375 × 667 · 🧪 테스트 방)</h1><p>찍은 화면 ${shots.length}장 · 칸 그림 ${cells.length - missing.length}/${cells.length}${missing.length ? ` · ❌ 서버에 없음: ${missing.join(', ')}` : ' · 모두 있음'} · 가로 넘침 ${wide ? '0' : '있음'} · 오류 ${errs.length}</p>`;
  const pg = await b.newPage();
  await pg.setContent(`<html><head><meta charset="utf-8"><style>body{font-family:'Noto Sans CJK KR',sans-serif;margin:10mm}h1{font-size:14pt;margin:0 0 4px}p{font-size:10pt;margin:0 0 8px}main{display:flex;flex-wrap:wrap;gap:6mm}figure{margin:0;width:58mm;break-inside:avoid}img{width:58mm;border:1px solid #999}figcaption{font-size:8pt}</style></head><body>${head}<main>${rows}</main></body></html>`, { waitUntil: 'load' });
  await pg.pdf({ path: path.join(OUT, `pack-${P.id}-preview.pdf`), format: 'A4', printBackground: true });
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify({ pack: P.id, no: P.no, shots, cells, missing, wide, errs }, null, 1));
  console.log(`📸 ${shots.length}장 · 그림 ${cells.length - missing.length}/${cells.length}${missing.length ? ` (없음 ${missing.join(',')})` : ''} · 가로 넘침 ${wide ? 0 : '있음'} · 오류 ${errs.length}`); if (errs.length) console.log(errs.join('\n'));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
