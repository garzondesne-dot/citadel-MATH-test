// 📄 차시 준비 「학습지 · 영상 한 번에 넣기 (PDF · zip)」 (📜 2026-11-14 「PDF 만 고를 수 있고 zip 은 못 고름」)
//   선생님이 쓴 zip 꼴 = ex-NN.json(무시) + 레이드용 학습지 PDF + mp4(차시 영상 파일 이름 끝맞춤) + 칸 그림(…_c1.png = PDF 자른 것보다 이김)
//   차시마다: 결과 줄 「✂ 그림 n / n칸 · 🎬 영상 2편」 · JSON 무시 줄 · 저장 → 「단계별 그림」 · 🎬 목록에 zip 영상 → 새로 고침 뒤에도 (prep/vids)
//   사용: NODE_PATH=$(npm root -g) node tools/e2e/pdffillzip.cjs <폴더> <차시id=학습지.pdf> … [emu]   (학습지 PDF 는 저장소에 넣지 않음)
//   이 기기 모드 = 브라우저 저장 공간(약 5MB)이라 차시마다 비우고 시험 · emu = 시험 서버(에뮬레이터) 길
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const { zipSync, strToU8 } = require(path.join(__dirname, '../../node_modules/fflate'));
const argv = process.argv.slice(2), EMU = argv.includes('emu'), [SHOTS = '.', ...pairs] = argv.filter((x) => x !== 'emu'), E = EMU ? '&emu=127.0.0.1' : '', emu = EMU ? require('./_emu.cjs') : null, B = 'http://localhost:4173/', ROOT = path.join(__dirname, '../..');
(async () => {
  const b = await chromium.launch(), errs = [], out = [], table = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const v1 = fs.readFileSync(path.join(ROOT, 'public/video/v11-49.mp4')), v2 = fs.readFileSync(path.join(ROOT, 'public/video/v11-50.mp4')), png = fs.readFileSync(path.join(ROOT, 'tools/pack-upload/img/c1.png'));
  const p = await (await b.newContext({ viewport: { width: 400, height: 900 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  const fresh = async () => { await p.goto(B + '?role=teacher' + E); await p.evaluate(() => localStorage.clear()); await p.reload(); if (EMU) { await p.waitForSelector('.tabs, .tgate', { timeout: 20000 }); await emu.asAdmin(p, '.tabs'); } else await p.waitForSelector('.tabs'); };
  if (EMU) { await emu.rest('prep/vids', 'DELETE'); for (const pr of pairs) await emu.rest(`prep/${pr.split('=')[0]}`, 'DELETE'); }
  await fresh();
  const go = async (id) => { await p.click('.tabs button:has-text("준비")'); await p.waitForTimeout(300); await p.selectOption('.lsel select', id); await p.click('.seg3 button:has-text("차시 준비")').catch(() => {}); await p.waitForTimeout(400); };
  for (const pr of pairs) {
    const [id, pdf] = pr.split('='), nn = id.replace(/\D/g, '').padStart(2, '0');
    const L = JSON.parse(fs.readFileSync(path.join(ROOT, `src/subjects/common-math2/lessons/${id}.json`), 'utf8'));
    const files = [...new Set(Object.values(L.videos || {}).map((u) => u.replace(/^.*\//, '').replace(/\.mp4$/, '')))];
    const zp = path.join(SHOTS, `fill-${id}.zip`);
    fs.writeFileSync(zp, zipSync({ [`ex-${nn}.json`]: strToU8(JSON.stringify({ id: `ex-${nn}`, no: Number(nn), title: 'x', steps: [] })), [`(${nn}차시) 레이드용_v1.pdf`]: fs.readFileSync(pdf), [`mp4/(${nn}차시) 1_${files[0]}.mp4`]: v1, [`mp4/(${nn}차시) 2_${files[1]}.mp4`]: v2, [`(${nn}차시) 칸그림_c1.png`]: png }, { level: 0 }));
    if (!EMU) await fresh();
    await go(id); const vb0 = (await p.textContent('[data-k="vid-go"]')).trim();
    await p.click('[data-k="pdffill-go"]'); await p.waitForSelector('[data-k="pdffill"]');
    await p.setInputFiles('[data-k="fillpdf"]', zp);
    await p.waitForFunction(() => /잘랐어요|못 찾았|읽지 못했|글자가 없/.test(document.querySelector('[data-k="fillnote"]')?.textContent || ''), null, { timeout: 60000 });
    const sum = (await p.textContent('[data-k="fillsum"]')).trim(), zi = (await p.textContent('[data-k="fillzip"]').catch(() => '')).trim(), note = (await p.textContent('[data-k="fillnote"]')).trim();
    const m = /그림 (\d+) \/ (\d+)칸 · 🎬 영상 (\d+)편/.exec(sum);
    ok(`${id} 결과 줄 = 그림 n / n · 영상 2편`, !!m && m[1] === m[2] && m[3] === '2', sum);
    ok(`${id} 팩 JSON 무시 줄`, /팩 JSON 은 무시했어요/.test(zi), zi.split('\n')[0]);
    await p.click('[data-k="pdffill"] .chips2 button:has-text("개념 1")'); await p.waitForTimeout(200);
    const src1 = (await p.textContent('[data-k="pdffill"] .cell small')).trim(); ok(`${id} 개념 1 = zip 그림이 PDF 자른 것보다 이김`, /zip 안 그림/.test(src1), src1);
    await p.click('.sheet .btn.pmain'); await p.waitForFunction(() => /저장했어요/.test(document.querySelector('[data-k="pdffill"] .ok')?.textContent || ''), null, { timeout: 30000 }).catch(() => {});
    const sv = (await p.textContent('[data-k="pdffill"] .ok').catch(() => '(저장 안 됨)')).trim();
    await p.click('.sheet .bar .x').catch(() => {}); await p.waitForTimeout(1200);
    const lab = (await p.textContent('[data-k="stepimgs"]')).trim(), vb = (await p.textContent('[data-k="vid-go"]')).trim();
    await p.click('[data-k="vid-go"]'); await p.waitForSelector('[data-k="vidlist"]');
    const zipRows = await p.$$eval('[data-k="vidlist"] .row', (xs) => xs.filter((x) => /팩 zip/.test(x.textContent)).length);
    await p.click('.sheet .bar .x').catch(() => {});
    table.push(`${id} | ${sum} | ${sv} | ${lab} | ${vb0.replace(/\s+/g, ' ')} → ${vb.replace(/\s+/g, ' ')} | zip 영상 칸 ${zipRows}`);
    ok(`${id} 저장 → 단계별 그림 n / n · 🎬 목록에 zip 영상`, /(\d+) \/ \1/.test(lab) && zipRows > 0, `${lab} · zip 칸 ${zipRows}`);
    await p.screenshot({ path: path.join(SHOTS, `fillzip-${id}.png`) });
    // 새로 고침 뒤 (서버 prep/vids → 차시 videos 덮어씀)
    await p.reload(); await p.waitForSelector('.tabs', { timeout: 20000 }); await go(id); await p.click('[data-k="vid-go"]'); await p.waitForSelector('[data-k="vidlist"]');
    const zn = await p.$$eval('[data-k="vidlist"] .row', (xs) => xs.filter((x) => /팩 zip/.test(x.textContent)).length); await p.click('[data-k="vidlist"] .row:has-text("팩 zip")'); await p.waitForSelector('[data-k="prepvid"]', { timeout: 15000 }).catch(() => {});
    const rb = await p.evaluate(async () => { const v = document.querySelector('[data-k="prepvid"]'); if (!v) return null; return (await (await fetch(v.src)).blob()).size; });
    ok(`${id} 새로 고침 뒤 zip 영상 칸 · 재생`, zn > 0 && (rb === v1.length || rb === v2.length), `칸 ${zn} · ${rb} 바이트`); await p.click('.sheet .bar .x').catch(() => {});
  }
  console.log(table.join('\n')); console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); if (EMU) { await emu.rest('prep/vids', 'DELETE'); for (const pr of pairs) await emu.rest(`prep/${pr.split('=')[0]}`, 'DELETE'); } await b.close();
})();
