// 🏕 캠프 자리표 하나 (🔨 2026-11-13 밤 「캠프라는 캠프는 모두 지침대로」): 학생 캠프 · 교사 「나」 내 캠프 · TV 교사 캠프가 같은 표(manifest CAMP_PROPS)
//   시험 = 물건마다 캠프 그림 안 %(왼쪽 · 아래 · 폭)가 화면마다 같은지 비교 · 🎯 허수아비 = 모루와 출제 공방 사이 · 물건끼리 · 포털 겹침 0 · 이름표가 물건을 덮지 않음
//   + 게시판 포털: 평소 0.15 · 모집 글 있음 0.6 · 열림 1.0 · 캡처(평소 · 모집 · 열림 · TV)
//   NODE_PATH=$(npm root -g) node tools/e2e/campmap.cjs <폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a);
  const meas = (pg, stageSel, propSel) => pg.evaluate(([ss, ps]) => {
    const st = document.querySelector(ss).getBoundingClientRect(), o = {};
    for (const e of document.querySelectorAll(ps)) { const r = e.getBoundingClientRect(), k = e.dataset.prop; const cut = k === 'anvil' ? 59 / 362 : 0; o[k] = { l: +((r.left - st.left) / st.width * 100).toFixed(1), b: +((st.bottom - r.bottom) / st.height * 100).toFixed(1), w: +(r.width / st.width * 100).toFixed(1), box: [r.left, r.top + r.height * cut, r.right, r.bottom] }; // 그림 속 빈 여백(모루 위 16%)은 물건 아님
      const lab = e.querySelector('.label, .ob'); if (lab) o[k].lab = (() => { const q = lab.getBoundingClientRect(); return [q.left, q.top, q.right, q.bottom]; })(); }
    const pt = document.querySelector('.portal'); if (pt) { const r = pt.getBoundingClientRect(); o.portal = { box: [r.left, r.top, r.right, r.bottom], s: getComputedStyle(pt).getPropertyValue('--s').trim() }; }
    return o;
  }, [stageSel, propSel]);
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + '?role=camp&room=CM1'); await p.waitForSelector('.stage .prop'); await p.waitForTimeout(600);
  const cs = await meas(p, '.stage', '.stage .prop'); await p.screenshot({ path: `${SHOTS}/campmap-student-idle.png` });
  log('학생 캠프:', Object.entries(cs).filter(([k]) => k !== 'portal').map(([k, v]) => `${k} ${v.l}/${v.b}/${v.w}`).join(' · '), '| 포털', cs.portal?.s);
  // 겹침 검사 (물건끼리 · 포털 포함 · 이름표가 다른 물건을 덮지 않음)
  const ov = (a, c) => Math.max(0, Math.min(a[2], c[2]) - Math.max(a[0], c[0])) * Math.max(0, Math.min(a[3], c[3]) - Math.max(a[1], c[1]));
  const ks = ['anvil', 'scare', 'dummy', 'mail'];
  for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) { const A = cs[ks[i]], C = cs[ks[j]]; if (A && C && ov(A.box, C.box) > 40) errs.push(`물건 겹침 ${ks[i]} · ${ks[j]} ${ov(A.box, C.box).toFixed(0)}`); }
  const pFull = await p.evaluate(() => { const e = document.querySelector('.portal .pimg'); const r = e.parentElement.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; });
  for (const k of ks) { if (k === 'dummy' || !cs[k]) continue; if (ov(pFull, cs[k].box) > 40) errs.push(`포털(열림 크기) ↔ ${k} 겹침`); }
  for (const k of ks) for (const k2 of ks) { if (k === k2 || !cs[k]?.lab || !cs[k2]) continue; { const a = ov(cs[k].lab, cs[k2].box); if (a > 60) errs.push(`이름표 ${k} 가 ${k2} 를 덮음 ${a.toFixed(0)}px² · 이름표 ${cs[k].lab.map(Math.round)} · 물건 ${cs[k2].box.map(Math.round)}`); }; }
  for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) { const A = cs[ks[i]]?.lab, C = cs[ks[j]]?.lab; if (A && C && ov(A, C) > 20) errs.push(`이름표끼리 겹침 ${ks[i]} · ${ks[j]}`); }
  const sc = cs.scare, an = cs.anvil; const tent = await p.evaluate(() => { const st = document.querySelector('.stage').getBoundingClientRect(), r = document.querySelector('.zone[aria-label="출제 공방"]')?.getBoundingClientRect(); return r ? { b: +((st.bottom - r.bottom) / st.height * 100).toFixed(1) } : null; });
  log('🎯 허수아비 아래', sc.b, '· 모루 위', +(an.b + (an.box[3] - an.box[1]) / (await p.evaluate(() => document.querySelector('.stage').getBoundingClientRect().height)) * 100).toFixed(1), '· 출제 공방 아래', tent?.b);
  if (tent && !(sc.b >= an.b && sc.b < tent.b)) errs.push('허수아비가 모루 ↔ 출제 공방 사이가 아님');
  // 모집 글 → 포털 0.6
  await p.evaluate(() => localStorage.setItem('citadel-v1-test-db|school/board/posts', JSON.stringify({ p1: { pid: 'p1', lesson: 'set-06', no: 6, at: Date.now(), host: 'x', phase: 'wait', mem: { x: { uid: 'x', cls: '1-3', num: 1, nick: 'a', hero: 0, role: 'c' } } } })));
  await p.reload(); await p.waitForSelector('.stage .prop'); await p.waitForTimeout(800);
  const ph1 = await p.$eval('.portal', (e) => e.dataset.phase).catch(() => '없음'); log('모집 글 있음 → 포털', ph1); if (ph1 !== 'recruit') errs.push('모집 = recruit 아님');
  await p.screenshot({ path: `${SHOTS}/campmap-student-recruit.png` });
  await p.evaluate(() => window.__portalBurst?.()); await p.waitForTimeout(450); const ph2 = await p.$eval('.portal', (e) => e.dataset.phase); log('출발 → 포털', ph2); if (ph2 !== 'open') errs.push('열림 아님');
  await p.screenshot({ path: `${SHOTS}/campmap-student-open.png` });
  // 교사 「나」 내 캠프 = 같은 자리
  await p.goto(B + '?role=camp&from=me'); await p.waitForSelector('.stage .prop'); await p.waitForTimeout(500); const ts = await meas(p, '.stage', '.stage .prop');
  // TV 교사 캠프
  const t = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage(); t.on('pageerror', (e) => errs.push(String(e)));
  await t.goto(B + '?role=hall&mode=test&room=CM2'); await t.waitForSelector('.campv .tprop', { timeout: 15000 }); await t.waitForTimeout(800);
  const tv = await meas(t, '.campv', '.campv .tprop'); await t.screenshot({ path: `${SHOTS}/campmap-tv.png` });
  for (const k of ks) { const a = cs[k], c = ts[k], d = tv[k]; if (!a || !c || !d) { errs.push(`${k} 없음 (학생 ${!!a} · 교사 ${!!c} · TV ${!!d})`); continue; }
    const same = (x, y) => Math.abs(x.l - y.l) <= 0.3 && Math.abs(x.b - y.b) <= 0.3 && Math.abs(x.w - y.w) <= 0.3; log(`${k}: 학생 ${a.l}/${a.b}/${a.w} · 교사 ${c.l}/${c.b}/${c.w} · TV ${d.l}/${d.b}/${d.w}`);
    if (!same(a, c) || !same(a, d)) errs.push(`${k} 자리 다름`); }
  const tvLabs = await t.$$eval('.campv .ob b', (x) => x.map((e) => e.textContent.trim())); log('TV 이름표:', tvLabs.join(' · '));
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
