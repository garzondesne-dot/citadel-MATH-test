// 🗜 차시 팩 zip 하나로 올리기 (📜 2026-11-14 · 머리 🔨): 정식 11차시 팩(official/set-11.json) + 드라이브 02 「(11차시) 칸그림_{칸}.webp」 9장 zip
//   → 그림 9칸 붙음 · 저장 · TV 개념 칸 = 그 그림 · json 2개 zip = 오류 한 줄 · 기존 길(.json 따로)은 packup.cjs
//   사용: NODE_PATH=$(npm root -g) node tools/e2e/packzip.cjs <폴더> [드라이브 zip]  — zip 을 안 주면 예시 그림(tools/pack-upload/img)으로 같은 꼴 zip 을 만듦
//   (학습지 칸 그림은 저장소에 넣지 않음 → 드라이브 zip 은 시험 때만 밖에서 받아 씀)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const { zipSync } = require(path.join(__dirname, '../../node_modules/fflate'));
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/', DIR = path.join(__dirname, '../pack-upload');
const CELLS = ['review', 'c1', 'm1', 'c2', 'm2', 'sum', 'm3', 'm4', 'boss'];
let ZIP = process.argv[3];
if (!ZIP) { // 드라이브와 같은 꼴: 폴더 · 접두어 「(11차시) 칸그림_」
  const png = fs.readFileSync(path.join(DIR, 'img/c1.png'));
  ZIP = path.join(SHOTS, 'set-11-sample.zip');
  fs.writeFileSync(ZIP, zipSync({ '11차시/(11차시) set-11.json': fs.readFileSync(path.join(DIR, 'official/set-11.json')), ...Object.fromEntries(CELLS.map((c) => [`11차시/(11차시) 칸그림_${c}.png`, png])) }));
}
(async () => {
  const b = await chromium.launch(), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const ctx = await b.newContext({ viewport: { width: 360, height: 760 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + '?role=teacher'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.tabs');
  const openUp = async () => { await p.click('.tabs button:has-text("준비")'); await p.waitForTimeout(200); await p.click('.seg3 button:has-text("도구")'); await p.waitForTimeout(200); await p.click('[data-k="packup-go"]'); await p.waitForSelector('[data-k="packup"]'); };
  await openUp();
  // json 2개 zip = 오류 한 줄
  const bad = path.join(SHOTS, 'two-json.zip'); fs.writeFileSync(bad, zipSync({ 'a.json': Buffer.from('{}'), 'b/c.json': Buffer.from('{}') }));
  await p.setInputFiles('[data-k="packfile"]', bad); await p.waitForSelector('[data-k="packsum"]');
  ok('json 2개 zip = 오류 한 줄 · 저장 못 함', /\.json 이 2개/.test(await p.textContent('[data-k="packiss"]')) && (await p.$eval('.sheet .btn.pmain', (x) => x.disabled)));
  // 드라이브 zip
  await p.setInputFiles('[data-k="packfile"]', ZIP); await p.waitForSelector('[data-k="packsum"]'); await p.waitForTimeout(2500);
  const sum = (await p.textContent('[data-k="packsum"]')).trim(), ms = (await p.textContent('[data-k="packmedia-sum"]').catch(() => '')).trim(), iss = (await p.textContent('[data-k="packiss"]').catch(() => '')).replace(/\s+/g, ' ');
  ok('zip = 팩 검사 통과 · 그림 9칸 붙음 · 그림 없음 없음 · 영상 3편', /검사 통과/.test(sum) && /그림 9칸 붙음/.test(ms) && !/그림 없음/.test(iss) && /영상 3편 연결/.test(ms), `${sum} | ${ms}`);
  await p.click('.chips2 button:has-text("개념 1")'); await p.waitForTimeout(400);
  ok('미리 보기 개념 1 = zip 그림', !!(await p.$('[data-k="packimg"] img')));
  await p.screenshot({ path: `${SHOTS}/packzip-1-preview.png` });
  await p.click('.sheet .btn.pmain'); await p.waitForNavigation({ timeout: 6000 }).catch(() => {}); await p.waitForSelector('.tabs');
  ok('저장 → prep/set-11/img 9칸', await p.evaluate((cells) => { const ks = Object.keys(localStorage); return cells.every((c) => { const k = ks.find((x) => x.endsWith(`prep/set-11/img/${c}`)); return k && /^"data:image\/webp/.test(localStorage.getItem(k) || ''); }); }, CELLS));
  // TV(교실) 개념 1 = 칸 그림 (학생 · TV 같은 PrepImg)
  const hall = await ctx.newPage(); await hall.setViewportSize({ width: 1280, height: 720 }); await hall.goto(B + '?role=hall&mode=test&room=PZ&lesson=set-11'); await hall.waitForSelector('.dock'); await hall.evaluate(() => window.__tvFake?.(3)); await hall.waitForTimeout(500);
  for (let g = 0; g < 6 && !(await hall.$('.split')); g++) { await hall.$eval('.dock .go', (x) => x.click()).catch(() => {}); await hall.waitForTimeout(700); }
  await hall.waitForTimeout(1200);
  ok('TV 개념 1 = 학습지 칸 그림', !!(await hall.$('.split img')), await hall.$eval('.split', (x) => x.innerText.slice(0, 40)).catch(() => ''));
  await hall.screenshot({ path: `${SHOTS}/packzip-2-tv.png` });
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
