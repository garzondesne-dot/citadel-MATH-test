// 📄 차시 준비 「학습지 PDF · 한 번에 넣기」 (📜 2026-11-14 「전부 진행해」) + 🎬 영상 n편 목록
//   사용: NODE_PATH=$(npm root -g) node tools/e2e/pdffill.cjs <폴더> <차시id=학습지.pdf> …   (학습지 PDF 는 저장소에 넣지 않음)
//   차시마다: 고르기 → 한 줄 결과 → 저장 → 「단계별 그림 k / n」 · 자른 칸 그림을 <폴더>/fill-<차시>-<칸>.webp 로 (눈 확인용)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const [SHOTS = '.', ...pairs] = process.argv.slice(2), B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], out = [], table = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const p = await (await b.newContext({ viewport: { width: 400, height: 900 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + '?role=teacher'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.tabs');
  await p.click('.tabs button:has-text("준비")'); await p.waitForTimeout(300);
  for (const pr of pairs) {
    const [id, pdf] = pr.split('=');
    await p.selectOption('.lsel select', id); await p.click('.seg3 button:has-text("차시 준비")').catch(() => {}); await p.waitForTimeout(400);
    const before = (await p.textContent('[data-k="stepimgs"]')).trim();
    await p.click('[data-k="pdffill-go"]'); await p.waitForSelector('[data-k="pdffill"]');
    await p.setInputFiles('[data-k="fillpdf"]', pdf);
    await p.waitForFunction(() => /잘랐어요|못 찾았|읽지 못했|글자가 없/.test(document.querySelector('[data-k="fillnote"]')?.textContent || ''), null, { timeout: 60000 });
    const note = (await p.textContent('[data-k="fillnote"]')).trim(), how = await p.evaluate(() => window.__fillHow);
    const cut = await p.evaluate(() => window.__fillCut || {});
    for (const [c, u] of Object.entries(cut)) fs.writeFileSync(path.join(SHOTS, `fill-${id}-${c}.webp`), Buffer.from(String(u).split(',')[1], 'base64'));
    await p.screenshot({ path: path.join(SHOTS, `fill-${id}-sheet.png`) });
    await p.click('.sheet .btn.pmain'); await p.waitForFunction(() => /저장했어요/.test(document.querySelector('[data-k="pdffill"] .ok')?.textContent || ''), null, { timeout: 15000 }).catch(() => {});
    await p.click('.sheet .bar .x').catch(() => {});
    await p.waitForTimeout(1200);
    const after = (await p.textContent('[data-k="stepimgs"]')).trim();
    table.push(`${id} | ${path.basename(pdf)} | ${note.replace(/^✂ \S+ 에서 /, '').replace(/ — 칸마다.*$/, '')} | ${how ? (how.useCrops ? '칸 위치' : '글자') : '-'} (${how?.agree}/${how?.both}) | ${before} → ${after}`);
    const m = /(\d+) \/ (\d+)/.exec(after);
    ok(`${id} 저장 → 단계별 그림`, !!m && Object.keys(cut).length > 0 && Number(m[1]) >= Object.keys(cut).length - 1, after);
  }
  // 🎬 영상 n편 = 실제 연결 수 · 누르면 칸별 목록 · 재생 칸
  await p.selectOption('.lsel select', 'set-03'); await p.waitForTimeout(300);
  const vb = (await p.textContent('[data-k="vid-go"]')).trim(); ok('3차시 「영상 n편」 = 실제 수', /영상 \d+편/.test(vb) && !(await p.isDisabled('[data-k="vid-go"]')), vb);
  await p.click('[data-k="vid-go"]'); await p.waitForSelector('[data-k="vidlist"]');
  const rows = await p.$$eval('[data-k="vidlist"] .row', (xs) => xs.map((x) => x.textContent.trim()));
  await p.click('[data-k="vidlist"] .row'); await p.waitForSelector('[data-k="prepvid"]', { timeout: 5000 }).catch(() => {});
  const src = await p.$eval('[data-k="prepvid"]', (v) => v.getAttribute('src')).catch(() => '');
  ok('🎬 목록 · 누르면 재생 칸(video)', rows.length > 0 && /\.mp4$/.test(src), `${rows.length}칸 · ${src.replace(/^.*\//, '')}`);
  await p.screenshot({ path: path.join(SHOTS, 'vidlist.png') });
  console.log(table.join('\n')); console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
