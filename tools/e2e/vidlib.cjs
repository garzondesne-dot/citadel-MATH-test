// 📚 차시 팩 영상 = 이름만 → 영상 서고 (📜 2026-11-14 「이름만 적기로 진행해」)
//   ① 11차시 팩(v11-49 · 50 · 51) = 베타 앱 video/ 에서 3편 ② 12차시 팩 = 정식 사이트(시험에서는 가짜 응답: v12-52 · v12-53 과 v12-53-v2 → 꼬리 최신 v2 · v12-54 없음) → 「영상 없음 — v12-54」 한 줄
//   사용: NODE_PATH=$(npm root -g) node tools/e2e/vidlib.cjs <폴더>
const { chromium } = require('playwright');
const path = require('path');
const [SHOTS = '.'] = process.argv.slice(2), B = 'http://localhost:4173/', ROOT = path.join(__dirname, '../..');
(async () => {
  const b = await chromium.launch(), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const ctx = await b.newContext({ viewport: { width: 400, height: 900 } });
  const have = new Set(['v12-52', 'v12-53', 'v12-53-v2']);
  await ctx.route('https://garzondesne-dot.github.io/Citadel-MATH/assets/video/**', (r) => { const n = r.request().url().replace(/^.*\//, '').replace(/\.mp4$/, ''); return have.has(n) ? r.fulfill({ status: 200, contentType: 'video/mp4', body: '' }) : r.fulfill({ status: 404, body: '' }); });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + '?role=teacher'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.tabs');
  const up = async (f) => { await p.click('.tabs button:has-text("준비")'); await p.click('.seg3 button:has-text("도구")'); await p.click('[data-k="packup-go"]'); await p.setInputFiles('[data-k="packfile"]', f); await p.waitForSelector('[data-k="packsum"]'); await p.waitForTimeout(2500); const ms = (await p.textContent('[data-k="packmedia-sum"]').catch(() => '')).trim(), miss = (await p.textContent('[data-k="vidmiss"]').catch(() => '')).trim(); await p.click('.sheet .btn.pmain'); await p.waitForNavigation({ timeout: 10000 }).catch(() => {}); await p.waitForSelector('.tabs'); return { ms, miss }; };
  const a = await up(path.join(ROOT, 'tools/pack-upload/official/set-11.json'));
  ok('① 11차시 = 앱 서고에서 3편', /영상 3편 연결/.test(a.ms) && /서고에서 3편/.test(a.ms) && !a.miss, a.ms);
  const s11 = await p.evaluate(() => window.__dbGet('prep/packs/set-11')?.videos); ok('① 저장 = 이름 · 주소만 (video/v11-49.mp4 …)', s11 && s11.c1 === 'video/v11-49.mp4' && s11.m4 === 'video/v11-51.mp4', JSON.stringify(s11).slice(0, 80));
  const c = await up(path.join(ROOT, 'tools/pack-upload/official/set-12.json'));
  ok('② 12차시 = 정식 사이트에서 2편 · 꼬리 최신 · 없는 이름 한 줄', /영상 2편 연결/.test(c.ms) && /서고에서 2편/.test(c.ms) && /영상 없음 — v12-54/.test(c.miss) && /한 번에 넣기/.test(c.miss), `${c.ms} | ${c.miss}`);
  const s12 = await p.evaluate(() => window.__dbGet('prep/packs/set-12')?.videos); ok('② 저장 = 정식 주소 · v12-53 → v12-53-v2 · v12-54 칸은 빠짐', s12 && /Citadel-MATH\/assets\/video\/v12-52\.mp4$/.test(s12.c1) && /v12-53-v2\.mp4$/.test(s12.c2) && !s12.m3, JSON.stringify(s12).slice(0, 160));
  await p.click('.tabs button:has-text("준비")'); await p.click('[data-k="lpick-go"]'); await p.click('[data-k="lpick"] .grid [data-id="set-11"]'); await p.click('[data-k="vid-go"]'); await p.click('[data-k="vidlist"] .row');
  await p.waitForSelector('[data-k="prepvid"]', { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(1500);
  const v = await p.$eval('[data-k="prepvid"]', (x) => ({ src: x.getAttribute('src'), rs: x.readyState })).catch(() => null); ok('11차시 🎬 재생 (앱 영상)', v && /v11-49\.mp4$/.test(v.src) && v.rs >= 1, JSON.stringify(v));
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
