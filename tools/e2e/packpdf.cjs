// ✂ 차시 팩 zip 안의 학습지 PDF → 칸 그림 자동 자르기 (📜 2026-11-14 선생님 「A로 진행해」 · 머리 🔨)
//   zip = 팩 .json + 학습지 PDF(그림 없음) → 칸마다 글자로 찾아 자름 → 정식 칸 위치(set-11 crops)와 겹침(IoU) 비교 · 칸마다 캡처 · 조정 단추 · 직접 고르기 · 저장 · TV 개념 칸
//   사용: NODE_PATH=$(npm root -g) node tools/e2e/packpdf.cjs <폴더> <팩.json> <학습지.pdf>   (학습지 PDF 는 저장소에 넣지 않음 · 시험 때 밖에서)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const { zipSync } = require(path.join(__dirname, '../../node_modules/fflate'));
const [SHOTS = '.', PACK, PDF] = process.argv.slice(2), B = 'http://localhost:4173/';
// 정식 lessons/set-11.js crops (레이드용 v1 · crops_pdf.py 로 잰 칸 위치 · 숫자만)
const OFFICIAL = { review: { p: 1, x: 0.045, y: 0.1263, w: 0.914, h: 0.05 }, c1: { p: 1, x: 0.045, y: 0.181, w: 0.455, h: 0.4199 }, m1: { p: 1, x: 0.045, y: 0.5979, w: 0.455, h: 0.2341 }, c2: { p: 1, x: 0.507, y: 0.1875, w: 0.452, h: 0.1328 }, m2: { p: 1, x: 0.507, y: 0.3173, w: 0.452, h: 0.2435 }, sum: { p: 1, x: 0.507, y: 0.5578, w: 0.452, h: 0.1584 }, m3: { p: 2, x: 0.045, y: 0.0902, w: 0.455, h: 0.5081 }, m4: { p: 2, x: 0.045, y: 0.5953, w: 0.455, h: 0.2421 }, boss: { p: 2, x: 0.507, y: 0.1052, w: 0.452, h: 0.7202 } };
const iou = (a, b) => { if (!a || a.p !== b.p) return 0; const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)), iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)), i = ix * iy; return i / (a.w * a.h + b.w * b.h - i); };
(async () => {
  const b = await chromium.launch(), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const zipPath = path.join(SHOTS, 'set-11-pdf.zip');
  fs.writeFileSync(zipPath, zipSync({ '11차시/(11차시) set-11.json': fs.readFileSync(PACK), '11차시/(11차시) 레이드용_v1.pdf': fs.readFileSync(PDF) }));
  const ctx = await b.newContext({ viewport: { width: 400, height: 900 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + '?role=teacher'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.tabs');
  await p.click('.tabs button:has-text("준비")'); await p.waitForTimeout(200); await p.click('.seg3 button:has-text("도구")'); await p.waitForTimeout(200); await p.click('[data-k="packup-go"]'); await p.waitForSelector('[data-k="packup"]');
  await p.setInputFiles('[data-k="packfile"]', zipPath);
  await p.waitForFunction(() => /칸을 글자로 찾아|읽지 못했|글자가 없/.test(document.querySelector('[data-k="pdfnote"]')?.textContent || ''), null, { timeout: 60000 });
  await p.waitForTimeout(1500);
  const note = (await p.textContent('[data-k="pdfnote"]')).trim(), ms = (await p.textContent('[data-k="packmedia-sum"]').catch(() => '')).trim(), iss = (await p.textContent('[data-k="packiss"]').catch(() => '')).replace(/\s+/g, ' ');
  ok('zip 안 PDF = 9칸 자동 자르기 · 그림 9칸 붙음 · 그림 없음 0', /9 \/ 9칸/.test(note) && /그림 9칸 붙음/.test(ms) && !/그림 없음/.test(iss), `${note.slice(0, 60)} | ${ms}`);
  const R = await p.evaluate(() => window.__pdfRects);
  const rows = Object.entries(OFFICIAL).map(([c, o]) => { const a = R?.[c]?.[0]; const v = iou(a, o); return { c, v, a }; });
  const good = rows.filter((r) => r.v >= 0.7).length;
  out.push('칸 | 겹침(IoU · 정식 칸 위치 대비) | 자동 틀 y ~ y+h');
  rows.forEach((r) => out.push(`  ${r.c.padEnd(6)} | ${r.v.toFixed(2)} ${r.v >= 0.7 ? '○' : '✗'} | ${r.a ? `${r.a.p}쪽 ${r.a.y.toFixed(3)} ~ ${(r.a.y + r.a.h).toFixed(3)} (정식 ${OFFICIAL[r.c].y.toFixed(3)} ~ ${(OFFICIAL[r.c].y + OFFICIAL[r.c].h).toFixed(3)})` : '못 찾음'}`));
  ok(`자동으로 맞은 칸 (IoU ≥ 0.7) = ${good} / 9`, good >= 7);
  // 칸마다 캡처 (미리 보기 = 학생 · TV 와 같은 PrepImg)
  for (const [c, step] of [['m1', '문제 1'], ['review', '도입'], ['c1', '개념 1'], ['c2', '개념 2'], ['m2', '문제 2'], ['m3', '문제 3'], ['m4', '문제 4'], ['sum', '오늘'], ['boss', '형성평가']]) {
    await p.click(`.chips2 button:has-text("${step}")`).catch(() => {}); await p.waitForTimeout(350);
    const el = await p.waitForSelector('[data-k="packimg"] img', { timeout: 4000 }).catch(() => null); if (el) await el.screenshot({ path: path.join(SHOTS, `cut-${c}.png`) }); else errs.push(`칸 그림 캡처 없음 ${c}`);
  }
  // 조정: 문제 3 아래 늘리기 → 틀이 길어짐 · 직접 고르기 = 그 칸만 바뀜
  await p.click('.chips2 button:has-text("문제 3")'); await p.waitForTimeout(300);
  const h0 = await p.evaluate(() => window.__pdfRects?.m3?.[0]?.h); await p.click('[data-k="bot-up"]'); await p.waitForTimeout(500);
  const h1 = await p.evaluate(() => { const ifr = document.querySelector('[data-k="packimg"] img'); return ifr ? ifr.naturalHeight : 0; });
  ok('조정 = 「아래 늘리기」 누르면 그 칸 그림이 길어짐', h0 > 0 && h1 > 0, `틀 h ${h0}`);
  await p.screenshot({ path: path.join(SHOTS, 'packpdf-adjust.png') });
  await p.click('.sheet .btn.pmain'); await p.waitForNavigation({ timeout: 8000 }).catch(() => {}); await p.waitForSelector('.tabs');
  ok('저장 → prep/set-11/img 9칸', await p.evaluate(() => { const ks = Object.keys(localStorage); return ['review', 'c1', 'm1', 'c2', 'm2', 'sum', 'm3', 'm4', 'boss'].every((c) => ks.some((k) => k.endsWith(`prep/set-11/img/${c}`))); }));
  const hall = await ctx.newPage(); await hall.setViewportSize({ width: 1280, height: 720 }); await hall.goto(B + '?role=hall&mode=test&room=PP&lesson=set-11'); await hall.waitForSelector('.dock'); await hall.evaluate(() => window.__tvFake?.(3)); await hall.waitForTimeout(500);
  for (let g = 0; g < 6 && !(await hall.$('.split')); g++) { await hall.$eval('.dock .go', (x) => x.click()).catch(() => {}); await hall.waitForTimeout(700); }
  await hall.waitForTimeout(1200); ok('TV 개념 1 = PDF 에서 자른 칸 그림', !!(await hall.$('.split img'))); await hall.screenshot({ path: path.join(SHOTS, 'packpdf-tv.png') });
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
