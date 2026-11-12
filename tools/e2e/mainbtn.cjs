// #151 🟡 주요 단추 = 모든 화면 한 자리 + 💥 피격 때 레이아웃 0 (이 기기 · 에뮬레이터 없이)
//   학생 화면마다 맨 위에 보이는 노란 주요 단추(.pmain) rect: 높이 56 · 바닥(안전 영역 위)에서 20 · 폭 = 기둥(최대 430) − 32 · 왼쪽 16
//   교사 폰 = 높이 68 · 바닥 75 그대로 · 크기 3개(360 × 640 · 390 × 844 · 펼친 화면 830 × 900)
//   피격: 공격 전후 문제 카드 · 주요 단추 rect 같음 · 장면 띠 안 「💥 몬스터 공격!」 · 덮개 「잠깐! 막는 중」 · 주요 단추 「⏳ 막는 중…」 · 고른 답 그대로
// 사용: npm run build → npx vite preview --port 4173 → NODE_PATH=$(npm root -g) node tools/e2e/mainbtn.cjs <그림 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
const B = 'http://localhost:4173/';
const SIZES = [[360, 640], [390, 844], [830, 900]];
const log = (...a) => console.log(...a);
// 맨 위에 보이는 주요 단추 하나의 rect (덮개 아래 깔린 것은 뺌)
const MEASURE = () => {
  const xs = [...document.querySelectorAll('.pmain')].filter((x) => { const r = x.getBoundingClientRect(); if (!r.width || !r.height) return false; const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return e && (e === x || x.contains(e)); });
  if (!xs.length) return null;
  const x = xs[xs.length - 1], r = x.getBoundingClientRect(), col = Math.min(innerWidth, 430);
  return { h: Math.round(r.height), bot: Math.round(innerHeight - r.bottom), w: Math.round(r.width), want: col - 32, left: Math.round(r.left - (innerWidth - col) / 2), t: x.textContent.trim().slice(0, 18) };
};
const TMEASURE = () => { const x = document.querySelector('.tp .tact .btn'); if (!x) return null; const r = x.getBoundingClientRect(); return { h: Math.round(r.height), bot: +(innerHeight - r.bottom).toFixed(1), t: x.textContent.trim().slice(0, 14) }; };
const RECTS = () => {
  const r = (q) => { const x = document.querySelector(q); if (!x) return null; const b = x.getBoundingClientRect(); return `${Math.round(b.top)}/${Math.round(b.height)}`; };
  return { card: r('.qwrap .bcard'), row: r('.qwrap .row'), main: r('.pmain'), sel: document.querySelectorAll('.qwrap .on, .qwrap [aria-pressed="true"]').length };
};
(async () => {
  const b = await chromium.launch(), errs = [], rows = [];
  for (const [W, H] of SIZES) {
    const ctx = await b.newContext({ viewport: { width: W, height: H } });
    const open = async (u) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e))); await p.goto(B + u); return p; };
    const chk = async (p, name) => {
      await p.waitForTimeout(350); const m = await p.evaluate(MEASURE);
      if (!m) { errs.push(`${W}×${H} ${name}: 주요 단추 없음`); rows.push(`${W} ${name}: ✗ 없음`); return; }
      const ok = m.h === 56 && m.bot === 20 && m.w === m.want && m.left === 16;
      rows.push(`${W} ${name}: ${m.h}/${m.bot}/${m.w}${ok ? '' : ' ✗'} 「${m.t}」`);
      if (!ok) errs.push(`${W}×${H} ${name}: 높이 ${m.h} · 바닥 ${m.bot} · 폭 ${m.w}(기대 ${m.want}) · 왼쪽 ${m.left}`);
      if (W === 360) await p.screenshot({ path: `${SHOTS}/b38-${name}.png` });
    };
    // 첫 화면 (로그인)
    const t0 = await open('?'); await t0.waitForSelector('.title'); await chk(t0, '첫화면'); await t0.close();
    // 캠프 · 시트 · 내 용사 · 모루 · 게시판
    const c = await open(`?role=camp&room=MB${W}`); await c.waitForSelector('.stage'); await chk(c, '캠프');
    await c.click('button[aria-label="성채"]'); await c.waitForSelector('.sheet'); await chk(c, '시트-성채'); await c.click('.sheet .pmain'); await c.waitForTimeout(200);
    await c.click('button[aria-label="우편함"]'); await c.waitForSelector('.sheet'); await chk(c, '시트-우편함'); await c.click('.sheet .pmain'); await c.waitForTimeout(200);
    await c.click('button[aria-label="내 용사 보기"]'); await c.waitForSelector('.mh'); await chk(c, '내용사');
    await c.click('.mh .back'); await c.waitForTimeout(250);
    await c.click('button[aria-label="모루"]'); await c.waitForSelector('.fg .stage'); await chk(c, '모루');
    await c.click('.row2 .btn2 >> nth=0'); await c.waitForSelector('.hr'); await chk(c, '모루-목록'); await c.click('.fg .pmain'); await c.waitForTimeout(200);
    await c.click('.row2 .btn2 >> nth=1'); await c.waitForSelector('.book'); await chk(c, '모루-도감'); await c.click('.fg .pmain');
    await c.reload(); await c.waitForSelector('.stage');
    await c.click('button[aria-label="📋 게시판"]'); await c.waitForSelector('.bd'); await chk(c, '게시판');
    await c.click('.bd .pmain'); await c.waitForSelector('.sheet'); await chk(c, '게시판-차시시트');
    await c.close();
    // 수업: 종합실 테스트 모드 + 학생 1
    const hall = await open(`?role=hall&mode=test&room=MS${W}`); await hall.setViewportSize({ width: 1000, height: 900 }); await hall.waitForSelector('.dock');
    const s = await open(`?role=student&room=MS${W}`); await s.waitForSelector('.body'); await hall.waitForTimeout(1000);
    await chk(s, '대기실');
    const next = async () => { await hall.mouse.move(500, 400); await hall.click('.dock .go'); await hall.waitForTimeout(500); };
    await next(); await next(); // 교사 캠프 → 입장 → 시작
    let sawConcept = false;
    for (let g = 0; g < 10; g++) { const tx = await s.textContent('.body'); if (/정찰/.test(tx)) break; if (/설명/.test(tx) && !sawConcept) { sawConcept = true; await chk(s, '개념'); } await next(); }
    await chk(s, '정찰');
    await s.waitForFunction(() => !/정찰/.test(document.querySelector('.body').textContent), null, { timeout: 15000 }); await s.waitForTimeout(400);
    await chk(s, '문제');
    // 💥 피격: 답 하나 고른 뒤 공격 → 전후 rect
    const pick = await s.$('.qwrap .bcard .chip, .qwrap .bcard .opt'); if (pick) await pick.click();
    const before = await s.evaluate(RECTS);
    await s.evaluate(() => window.__strike(2500)); await s.waitForTimeout(150);
    const during = await s.evaluate(RECTS);
    const hitTag = await s.$eval('.edge .hitTag', (x) => x.textContent.trim()).catch(() => ''), cover = await s.$eval('.qwrap .block b', (x) => x.textContent.trim()).catch(() => '');
    const mtxt = await s.$eval('.pmain', (x) => x.textContent.trim()), mdis = await s.$eval('.pmain', (x) => x.disabled);
    if (W === 360) await s.screenshot({ path: `${SHOTS}/b38-피격.png` });
    await chk(s, '피격중');
    await s.waitForTimeout(2800); const after = await s.evaluate(RECTS);
    log(`${W} 💥 피격: 꼬리표 「${hitTag}」 · 덮개 「${cover}」 · 단추 「${mtxt}」${mdis ? '(흐림)' : ''} · 전 ${JSON.stringify(before)} · 중 ${JSON.stringify(during)} · 뒤 ${JSON.stringify(after)}`);
    if (!/몬스터 공격/.test(hitTag) || !/막는 중/.test(cover) || !/막는 중/.test(mtxt) || !mdis) errs.push(`${W} 피격 표시`);
    if (before.card !== during.card || before.main !== during.main || before.row !== during.row || before.card !== after.card || before.main !== after.main) errs.push(`${W} 피격 때 움직임`);
    if (before.sel !== during.sel || before.sel !== after.sel || (pick && !before.sel)) errs.push(`${W} 고른 답 바뀜`);
    await s.close(); await hall.close();
    // 교사 폰 = 68 · 바닥 75
    const tp = await open('?role=teacher'); await tp.waitForTimeout(900); const tm = await tp.evaluate(TMEASURE);
    rows.push(`${W} 교사 폰: ${tm ? `${tm.h}/${tm.bot} 「${tm.t}」` : '없음'}`); if (!tm || tm.h !== 68 || Math.abs(tm.bot - 75) > 1) errs.push(`${W} 교사 폰 ${JSON.stringify(tm)}`);
    await ctx.close();
  }
  log('주요 단추 (높이/바닥/폭):'); rows.forEach((r) => log('  ' + r));
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0');
  await b.close();
})();
