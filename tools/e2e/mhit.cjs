// 👹 #26 몬스터 맞는 그림 (📜 2026-11-20 「초안 그대로 넣기」) — 이 기기 · 종합실 테스트 모드 + 학생 1
//   학생 폰: 몬스터 공격(__strike) = 내 용사 위 맞는 그림 1장(짝 표 종류) · 0.5초 안에 사라짐 · 문제 카드 · 주요 단추 자리 그대로
//   TV: 공격(__tvMhit) = 용사마다 맞는 그림 · 사라짐
//   사용: 빌드 · vite preview → NODE_PATH=$(npm root -g) node tools/e2e/mhit.cjs <폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const hall = await ctx.newPage(); hall.on('pageerror', (e) => errs.push(String(e)));
  await hall.setViewportSize({ width: 1280, height: 720 }); await hall.goto(B + '?role=hall&mode=test&room=MH1'); await hall.waitForSelector('.dock');
  const s = await ctx.newPage(); s.on('pageerror', (e) => errs.push(String(e)));
  await s.goto(B + '?role=student&room=MH1'); await s.waitForSelector('.body'); await hall.waitForTimeout(800);
  const next = async () => { await hall.mouse.move(500, 400); await hall.click('.dock .go'); await hall.waitForTimeout(500); };
  await next(); await next();
  for (let g = 0; g < 8; g++) { if (/정찰/.test(await s.textContent('.body'))) break; await next(); }
  await s.waitForFunction(() => !/정찰/.test(document.querySelector('.body').textContent), null, { timeout: 15000 }); await s.waitForTimeout(400);
  const rect = () => s.evaluate(() => { const r = (q) => { const x = document.querySelector(q); if (!x) return ''; const b = x.getBoundingClientRect(); return `${Math.round(b.top)}/${Math.round(b.height)}`; }; return `${r('.qwrap .bcard')}|${r('.pmain')}`; });
  const r0 = await rect();
  await s.evaluate(() => window.__strike(2400, 'pause')); await s.waitForTimeout(120);
  const ph = await s.$$eval('[data-k="mhit"]', (xs) => xs.map((x) => ({ kind: x.dataset.kind, bg: getComputedStyle(x).backgroundImage, w: x.getBoundingClientRect().width })));
  ok('폰 · 공격 = 내 용사 위 맞는 그림 1장', ph.length === 1 && /mhit-\w+-v1\.webp/.test(ph[0]?.bg || ''), JSON.stringify(ph));
  ok('폰 · 그림 파일 받아짐', await s.evaluate(async () => { const u = getComputedStyle(document.querySelector('[data-k="mhit"]')).backgroundImage.slice(5, -2); const r = await fetch(u); return r.ok; }).catch(() => false));
  await s.screenshot({ path: `${SHOTS}/mhit-phone.png` });
  await s.waitForTimeout(600);
  ok('폰 · 0.5초 안에 사라짐', (await s.$$('[data-k="mhit"]')).length === 0);
  ok('폰 · 문제 카드 · 주요 단추 자리 그대로', (await rect()) === r0, `${r0} → ${await rect()}`);
  await hall.evaluate(() => window.__tvMhit()); await hall.waitForTimeout(120);
  const tv = await hall.$$eval('[data-k="mhit"]', (xs) => xs.map((x) => x.dataset.kind));
  const heroes = await hall.evaluate(() => (window.__arena?.party || []).length);
  ok('TV · 용사마다 맞는 그림', tv.length > 0 && tv.length === heroes, `${tv.length} / 용사 ${heroes} · ${tv[0]}`);
  await hall.screenshot({ path: `${SHOTS}/mhit-tv.png` });
  await hall.waitForTimeout(600);
  ok('TV · 사라짐', (await hall.$$('[data-k="mhit"]')).length === 0);
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
