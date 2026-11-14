// 🐞 b121 「zip(팩 + 학습지 PDF) 올렸는데 차시 준비 단계별 그림 0 / 9」 재현 · 고침 확인 (2026-11-14 · 머리 🔨)
//   팩 = img 목록 없음 · 영상 없음 · 단계 id 가 다름(오늘 정리 = recap · 형성평가 = sum) → 단계 종류 · 제목으로 9칸 자름 → 저장 prep/ex-11/img 9장 → 차시 준비 「단계별 그림 9 / 9」
//   사용: NODE_PATH=$(npm root -g) node tools/e2e/packpdf-ids.cjs <폴더> <팩.json> <학습지.pdf>   (학습지 PDF 는 저장소에 넣지 않음)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const { zipSync } = require(path.join(__dirname, '../../node_modules/fflate'));
const [SHOTS = '.', PACK, PDF] = process.argv.slice(2), B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const zipPath = path.join(SHOTS, 'ex-11-pdf.zip'); fs.writeFileSync(zipPath, zipSync({ 'ex-11-1.json': fs.readFileSync(PACK), '(11차시) 레이드용_v1.pdf': fs.readFileSync(PDF) }));
  const p = await (await b.newContext({ viewport: { width: 400, height: 900 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + '?role=teacher'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.tabs');
  await p.click('.tabs button:has-text("준비")'); await p.click('.seg3 button:has-text("도구")'); await p.click('[data-k="packup-go"]'); await p.waitForSelector('[data-k="packup"]');
  await p.setInputFiles('[data-k="packfile"]', zipPath);
  await p.waitForFunction(() => /칸을 글자로|못 찾았|읽지 못했|자를 칸이 없|글자가 없/.test(document.querySelector('[data-k="pdfnote"]')?.textContent || ''), null, { timeout: 60000 }); await p.waitForTimeout(1200);
  const note = (await p.textContent('[data-k="pdfnote"]')).trim(), ms = (await p.textContent('[data-k="packmedia-sum"]').catch(() => '')).trim();
  ok('img 목록 없는 팩 · 단계 id 다름 = 9 / 9칸 자름 · 그림 9칸 붙음', /9 \/ 9칸/.test(note) && /그림 9칸 붙음/.test(ms), `${note.slice(0, 50)} | ${ms}`);
  const R = await p.evaluate(() => Object.keys(window.__pdfRects || {}).sort().join(' ')); ok('칸 = review · c1 · m1 · c2 · m2 · m3 · m4 · recap · sum', R === 'c1 c2 m1 m2 m3 m4 recap review sum', R);
  await p.click('.sheet .btn.pmain'); await p.waitForNavigation({ timeout: 8000 }).catch(() => {}); await p.waitForSelector('.tabs');
  const n = await p.evaluate(() => Object.keys(localStorage).filter((k) => /prep\/ex-11\/img\//.test(k)).length); ok('저장 → prep/ex-11/img 9장', n === 9, String(n));
  await p.click('.tabs button:has-text("준비")'); await p.waitForTimeout(300); await p.selectOption('.lsel select', 'ex-11').catch(() => {}); await p.click('.seg3 button:has-text("차시 준비")').catch(() => {}); await p.waitForTimeout(1500);
  const lab = (await p.textContent('[data-k="stepimgs"]').catch(() => '')).trim(); ok('차시 준비 「단계별 그림 9 / 9」', /9 \/ 9/.test(lab), lab);
  await p.screenshot({ path: path.join(SHOTS, 'prep-stepimgs.png'), fullPage: false });
  // 옛 폰 브라우저 흉내 (Promise.withResolvers 없음) + 확장자 없는 zip (폰 파일 고르기) = 그래도 9 / 9칸 · 실패면 이유 한 줄
  { const c2 = await b.newContext({ viewport: { width: 400, height: 900 } }); await c2.addInitScript(() => { delete Promise.withResolvers; }); const q = await c2.newPage(); q.on('pageerror', (e) => errs.push(String(e)));
    const noExt = path.join(SHOTS, 'ex-11-pdf'); fs.copyFileSync(zipPath, noExt);
    await q.goto(B + '?role=teacher'); await q.waitForSelector('.tabs'); await q.click('.tabs button:has-text("준비")'); await q.click('.seg3 button:has-text("도구")'); await q.click('[data-k="packup-go"]'); await q.waitForSelector('[data-k="packup"]');
    await q.setInputFiles('[data-k="packfile"]', noExt);
    await q.waitForFunction(() => /칸을 글자로|못 찾았|읽지 못했|자를 칸이 없|글자가 없|PDF 도/.test(document.querySelector('[data-k="pdfnote"]')?.textContent || ''), null, { timeout: 60000 }).catch(() => {});
    const n2 = (await q.textContent('[data-k="pdfnote"]').catch(() => '(줄 없음)')).trim();
    ok('옛 브라우저(withResolvers 없음) + 확장자 없는 zip = 9 / 9칸', /9 \/ 9칸/.test(n2), n2.slice(0, 70)); await c2.close(); }
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
