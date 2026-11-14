// 📦 「이 차시 팩 내려받기 (zip)」 왕복 (📜 2026-11-14): 내려받은 zip 을 「📦 차시 팩 올리기」에 그대로 → 같은 팩(단계 · 몬스터 · 형성평가 같음) · 칸 그림 · 영상 같은 수
//   ① 앱 차시 set-10 (칸 그림 2장을 넣어 둠) → ex-10 ② 올린 팩 ex-v (zip 영상 2편 · 서버 영상) → 같은 id 로 다시
//   사용: NODE_PATH=$(npm root -g) node tools/e2e/packdl.cjs <폴더>
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const { unzipSync, zipSync, strToU8, strFromU8 } = require(path.join(__dirname, '../../node_modules/fflate'));
const [SHOTS = '.'] = process.argv.slice(2), B = 'http://localhost:4173/', ROOT = path.join(__dirname, '../..');
(async () => {
  const b = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } }), errs = [], out = []; // 한글 파일 이름 = UTF-8 로캘 (컨테이너 기본 로캘이면 「download」로 바뀜)
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const ctx = await b.newContext({ viewport: { width: 400, height: 900 }, acceptDownloads: true }), p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + '?role=teacher'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.tabs');
  const png = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'tools/pack-upload/img/c1.png')).toString('base64');
  const go = async (id) => { await p.click('.tabs button:has-text("준비")'); await p.waitForTimeout(300); await p.click('.seg3 button:has-text("차시 준비")').catch(() => {}); await p.selectOption('.lsel select', id); await p.waitForTimeout(500); };
  const dl = async (id) => { await go(id); const [d] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('[data-k="pack-dl"]')]); const f = path.join(SHOTS, d.suggestedFilename()); await d.saveAs(f); await p.waitForTimeout(300); return { f, name: d.suggestedFilename(), note: (await p.textContent('[data-k="pack-dl"] small')).trim() }; };
  const up = async (f) => { await p.click('.tabs button:has-text("준비")'); await p.click('.seg3 button:has-text("도구")'); await p.click('[data-k="packup-go"]'); await p.setInputFiles('[data-k="packfile"]', f); await p.waitForSelector('[data-k="packsum"]'); await p.waitForTimeout(1500); const sum = (await p.textContent('[data-k="packsum"]')).trim(), ms = (await p.textContent('[data-k="packmedia-sum"]').catch(() => '')).trim(); await p.click('.sheet .btn.pmain'); await p.waitForNavigation({ timeout: 30000 }).catch(() => {}); await p.waitForSelector('.tabs'); return { sum, ms }; };
  const strip = (x) => JSON.stringify({ steps: x.steps, monsters: x.monsters, boss: x.boss, no: x.no, title: x.title });
  // ① 앱 차시 set-10 + 칸 그림 2장
  await p.evaluate((u) => { window.__dbSet('prep/set-10/img/c1', u); window.__dbSet('prep/set-10/img/m1', u); }, png); await p.reload(); await p.waitForSelector('.tabs');
  const a = await dl('set-10'); const z = unzipSync(fs.readFileSync(a.f)), names = Object.keys(z);
  ok('① 파일 이름 = (10차시) 차시팩_YYYYMMDD.zip', /^\(10차시\) 차시팩_\d{8}\.zip$/.test(a.name), a.name);
  ok('① zip = ex-10.json + c1 · m1.webp + README', names.includes('ex-10.json') && names.includes('c1.webp') && names.includes('m1.webp') && names.includes('README.txt'), names.join(' · '));
  const J = JSON.parse(strFromU8(z['ex-10.json'])), S10 = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/subjects/common-math2/lessons/set-10.json'), 'utf8'));
  ok('① JSON = 생성기 이름 그대로 · 단계 · 몬스터 같음', strip(J) === strip(S10) && JSON.stringify(J.monsters).includes('"gen"'), `id ${J.id}`);
  out.push(`ℹ ① 줄: ${a.note}`);
  const r1 = await up(a.f); ok('① 다시 올리기 = 검사 통과 · 그림 2칸', /검사 통과/.test(r1.sum) && /그림 2칸/.test(r1.ms), `${r1.sum.slice(0, 40)} | ${r1.ms}`);
  const P1 = await p.evaluate(() => window.__dbGet('prep/packs/ex-10')); ok('① 올린 ex-10 = 같은 단계 · 몬스터 · 형성평가', P1 && strip(P1) === strip(S10));
  await go('ex-10'); const lab1 = (await p.textContent('[data-k="stepimgs"]')).trim(); ok('① ex-10 차시 준비 그림 2장', /^단계별 그림 2 \//.test(lab1), lab1);
  // ② 올린 팩 ex-v (zip 영상 2편)
  const pack = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/pack-upload/example-ex-11.json'), 'utf8')); pack.id = 'ex-v'; pack.no = 12; pack.title = '영상 시험'; pack.video = [{ file: 'v99-01', at: ['c1', 'm1', 'sum'] }]; delete pack.img;
  const v1 = fs.readFileSync(path.join(ROOT, 'public/video/v11-49.mp4')), v2 = fs.readFileSync(path.join(ROOT, 'public/video/v11-50.mp4'));
  const zp = path.join(SHOTS, 'ex-v-src.zip'); fs.writeFileSync(zp, zipSync({ 'ex-v.json': strToU8(JSON.stringify(pack)), '(11차시) 01_v99-01.mp4': v1, '도입_intro.mp4': v2, 'c1.png': fs.readFileSync(path.join(ROOT, 'tools/pack-upload/img/c1.png')) }, { level: 0 }));
  await up(zp); const before = await p.evaluate(() => window.__dbGet('prep/packs/ex-v'));
  const b2 = await dl('ex-v'); const z2 = unzipSync(fs.readFileSync(b2.f)), n2 = Object.keys(z2);
  const mp4s = n2.filter((x) => /\.mp4$/.test(x)); ok('② zip = ex-v.json + c1.webp + 영상 2편', n2.includes('ex-v.json') && n2.includes('c1.webp') && mp4s.length === 2, n2.join(' · '));
  ok('② 영상 바이트 그대로', mp4s.map((x) => z2[x].length).sort().join(',') === [v1.length, v2.length].sort().join(','));
  out.push(`ℹ ② 줄: ${b2.note}`);
  await p.evaluate(() => { for (const k of Object.keys(localStorage)) if (/\|prep\/(packs\/ex-v|ex-v)/.test(k)) localStorage.removeItem(k); }); await p.reload(); await p.waitForSelector('.tabs');
  const r2 = await up(b2.f); ok('② 다시 올리기 = 검사 통과 · zip 영상 2편 · 그림 1칸', /검사 통과/.test(r2.sum) && /zip 영상 2편/.test(r2.ms) && /그림 1칸/.test(r2.ms), r2.ms);
  const after = await p.evaluate(() => window.__dbGet('prep/packs/ex-v'));
  ok('② 같은 팩 (단계 · 몬스터 · 형성평가 · 영상 칸)', after && strip(after) === strip(before) && Object.keys(after.videos || {}).sort().join() === Object.keys(before.videos || {}).sort().join(), Object.keys(after?.videos || {}).join(' '));
  await go('ex-v'); await p.click('[data-k="vid-go"]'); await p.waitForSelector('[data-k="vidlist"]'); await p.click('[data-k="vidlist"] .row'); await p.waitForSelector('[data-k="prepvid"]', { timeout: 15000 }).catch(() => {});
  const sz = await p.evaluate(async () => { const v = document.querySelector('[data-k="prepvid"]'); return v ? (await (await fetch(v.src)).blob()).size : 0; }); ok('② 다시 올린 영상 재생', sz === v1.length || sz === v2.length, String(sz));
  // 20MB 넘음 = 큰 영상부터 뺌 (단위 시험 대신 화면 한 줄): 크기 기준은 packExport ZIP_MAX
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
