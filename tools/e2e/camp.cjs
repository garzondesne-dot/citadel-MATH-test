// b6 캠프 한 바퀴 (360px): 처음 온 학생(흰 이름표 · 차시 던전 열림 금빛) · 익숙한 학생(써 본 물건 숨김 · 빈 땅 2초) · 성채 시트 · 입장 → 전투
// 사용: npm run build → npx vite preview --port 4173 → node tools/e2e/camp.cjs <그림 저장 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
const base = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 760 }, deviceScaleFactor: 2 });
  const errs = [];
  const open = async (u) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); await p.goto(base + u); return p; };
  const over = async (p, w) => { const o = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 0) errs.push(`가로 넘침 ${o}px · ${w}`); };
  const labels = (p) => p.$$eval('.label', (ls) => ls.map((l) => `${l.textContent.trim()}[${[...l.classList].filter((c) => !/svelte|label/.test(c)).join('')}]`).join(' · '));
  // 닫힌 캠프 (종합실 없음)
  const c0 = await open('?role=camp&room=CP'); await c0.waitForSelector('.stage'); await c0.waitForTimeout(400);
  log('닫힘:', await labels(c0), '| 단추', (await c0.textContent('.act .btn')).trim(), '|', (await c0.textContent('.act .why')).trim());
  // 수업 열기
  const hall = await open('?role=hall&mode=test&room=CP'); await hall.waitForSelector('.dock'); await c0.waitForTimeout(500);
  log('열림:', await labels(c0), '| 단추', (await c0.textContent('.act .btn')).trim());
  await c0.screenshot({ path: `${SHOTS}/b6-camp-first-360.png` }); await over(c0, '처음');
  log('정보판:', (await c0.textContent('.hero-card')).replace(/\s+/g, ' ').trim(), '| 사다리', await c0.$$eval('.rung', (rs) => rs.map((r) => `${r.textContent.replace(/\s+/g, ' ').trim()}[${[...r.classList].filter((c) => !/svelte|rung/.test(c)).join('')}]`).join(' / ')), '|', (await c0.textContent('.next')).trim());
  // 성채 시트
  await c0.click('button[aria-label="성채"]'); await c0.waitForSelector('.sheet'); await c0.waitForTimeout(250);
  await c0.screenshot({ path: `${SHOTS}/b6-castle-sheet-360.png` }); await over(c0, '성채 시트');
  log('성채 시트:', (await c0.textContent('.sheet')).replace(/\s+/g, ' ').slice(0, 140));
  await c0.click('.sheet .btn');
  // 다른 물건 다 눌러 봄 → 익숙한 학생
  for (const n of ['출제 공방', '모루', '우편함']) { /* 📋 게시판(#143) = 따로 화면 · board.cjs */ await c0.click(`button[aria-label="${n}"]`); await c0.waitForSelector('.sheet'); await c0.click('.sheet .btn'); await c0.waitForTimeout(100); }
  await c0.click('button[aria-label="내 용사 보기"]'); await c0.waitForSelector('.mh'); log('내 용사 시트(b7):', (await c0.textContent('.mh .top')).replace(/\s+/g, ' ').trim()); await c0.click('.mh .back');
  await c0.reload(); await c0.waitForSelector('.stage'); await c0.waitForTimeout(400);
  log('익숙함:', await labels(c0));
  await c0.screenshot({ path: `${SHOTS}/b6-camp-familiar-360.png` }); await over(c0, '익숙함');
  await c0.mouse.click(180, 300); await c0.waitForTimeout(200); log('빈 땅 누름:', await labels(c0)); await c0.waitForTimeout(2200); log('2초 뒤:', await labels(c0));
  const small = await c0.$$eval('.zone, .prop, .rung, .act .btn, .hero-card', (bs) => bs.filter((x) => { const r = x.getBoundingClientRect(); return r.height < 44 || r.width < 44; }).map((x) => `${x.getAttribute('aria-label')}:${Math.round(x.getBoundingClientRect().width)}x${Math.round(x.getBoundingClientRect().height)}`)); if (small.length) log('작은 누름 칸(투명 여백 6px 포함 전):', small.join(' '));
  // 입장
  await c0.click('.act .btn'); await c0.waitForURL(/role=student/); await c0.waitForSelector('.body'); log('입장 → 전투 화면:', c0.url().replace(base, ''));
  log('오류', errs);
  await b.close();
  function log(...a) { console.log(...a); }
})();
