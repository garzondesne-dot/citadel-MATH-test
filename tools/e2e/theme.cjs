// #144 🎨 테마 11개 × 캠프 · 전투 · 교사 리모컨 (360 × 640 · 이 기기 저장) · 🏛 클래식 네 상태 · 클래식 안 고른 폰 = 클래식 그림 · 글꼴 요청 0
// 사용: npm run build → npx vite preview --port 4173 → NODE_PATH=$(npm root -g) node tools/e2e/theme.cjs <그림 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
const B = 'http://localhost:4173/';
const IDS = ['gold', 'navy', 'cloud', 'classic', 'lava', 'star', 'sakura', 'sand', 'deep', 'porcelain', 'parchment'];
const log = (...a) => console.log(...a);
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 } });
  const open = async (u, vp) => { const p = await ctx.newPage(); if (vp) await p.setViewportSize(vp); p.on('pageerror', (e) => errs.push(`${u}: ${e}`)); await p.goto(B + u); return p; };
  // 수업 하나 (TV 🧪) → 학생 전투 화면까지
  const hall = await open('?role=hall&mode=test&room=TH', { width: 1000, height: 800 }); await hall.waitForSelector('.dock');
  const st = await open('?role=student&room=TH'); await st.waitForTimeout(1200);
  for (let k = 0; k < 4 && !(await st.$('.scene, .sc, [class*="scene"]')); k++) { await hall.mouse.move(500, 400 + k); await hall.click('.dock .go'); await st.waitForTimeout(700); }
  const camp = await open('?role=camp&room=TH'); await camp.waitForSelector('.stage');
  const tp = await open('?role=teacher'); await tp.waitForSelector('.tabs', { timeout: 15000 });
  await tp.evaluate(() => { const w = {}; for (let d = 1; d <= 5; d++) { w[d] = {}; for (let q = 1; q <= 7; q++) w[d][q] = '1-3'; } localStorage.setItem('citadel-v1-test-db|school/sched', JSON.stringify(w)); });
  const set = async (p, t) => { await p.evaluate((t) => localStorage.setItem('citadel-v1-theme', t), t); await p.reload(); await p.waitForTimeout(900); };
  const over = (p) => p.evaluate(() => ({ x: document.documentElement.scrollWidth - innerWidth, th: document.documentElement.dataset.theme }));
  const rows = [];
  for (const t of IDS) {
    const r = [];
    for (const [nm, p] of [['캠프', camp], ['전투', st], ['교사', tp]]) { await set(p, t); const o = await over(p); r.push(`${nm} ${o.x}`); if (o.x > 0) errs.push(`${t} ${nm} 가로 넘침 ${o.x}`); if (o.th !== t) errs.push(`${t} ${nm} 테마 안 켜짐(${o.th})`); }
    rows.push(`${t}: ${r.join(' · ')}`);
    if (['gold', 'cloud', 'classic', 'parchment'].includes(t)) { await camp.screenshot({ path: `${SHOTS}/b27-camp-${t}.png` }); await st.screenshot({ path: `${SHOTS}/b27-battle-${t}.png` }); }
  }
  log('넘침(px):\n  ' + rows.join('\n  '));
  // 교사 리모컨 = 🧪 수업 열기 (이 기기) · 테마마다 가로 넘침 · 세로 스크롤
  await set(tp, 'gold'); { const c = await tp.$('.tt:not([disabled])'); if (c) await c.click(); else { await tp.click('.tlink:has-text("다른 반")'); await tp.click('.grid4 .pk:has-text("1-3")'); } await tp.waitForTimeout(150); } await tp.click('.pk3 .pk >> nth=0'); await tp.click('.sub2 button:has-text("테스트")'); await tp.waitForTimeout(1200);
  const rem = [];
  for (const t of IDS) { await set(tp, t); const o = await tp.evaluate(() => ({ x: document.documentElement.scrollWidth - innerWidth, y: document.documentElement.scrollHeight - innerHeight })); rem.push(`${t} ${o.x}/${o.y}`); if (o.x > 0 || o.y > 0) errs.push(`${t} 리모컨 넘침 ${o.x}/${o.y}`); }
  log('리모컨 넘침(가로/세로):', rem.join(' · '));
  await tp.screenshot({ path: `${SHOTS}/b27-remote-classic.png` });
  // 🏛 클래식 네 상태 (캠프 입장 단추 · ⚙ 테마 칸)
  await set(camp, 'classic'); await camp.waitForTimeout(600);
  const src = (p, sel) => p.$eval(sel, (x) => (getComputedStyle(x).borderImageSource.match(/ui-[a-z-]+v1/) || ['없음'])[0]);
  const main = '.act .btn';
  const s1 = await src(camp, main), dis = await camp.$eval(main, (x) => x.disabled);
  const box = await camp.$eval(main, (x) => { const r = x.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await camp.mouse.move(box.x, box.y); await camp.mouse.down(); await camp.waitForTimeout(100); const s2 = await src(camp, main); await camp.mouse.move(box.x, 10); await camp.mouse.up(); await camp.waitForTimeout(300);
  await camp.click('button[aria-label="설정"]'); await camp.waitForSelector('.tgrid'); await camp.waitForTimeout(300);
  const s3 = await src(camp, '.sheet .act .btn'), font = await camp.$eval('.sheet .act .btn', (x) => getComputedStyle(x).fontFamily);
  const sel = await camp.$eval('.th.on', (x) => x.textContent.trim()), locked = await camp.$$eval('.th:disabled', (xs) => xs.length);
  await camp.screenshot({ path: `${SHOTS}/b27-classic-settings.png` });
  log(`클래식 네 상태: 입장 단추(${dis ? '흐림' : '기본'}) ${s1} · 누름 ${s2} · 시트 주요 ${s3} · 고른 칸 「${sel}」 · 잠긴 칸 ${locked} · 단추 글꼴 ${font.split(',')[0]}`);
  if (!/off|gold/.test(s1) || (!dis && !/gold-press/.test(s2)) || !/gold/.test(s3) || !/Galmuri/.test(font)) errs.push('클래식 상태 그림');
  // 클래식 안 고른 폰 = 요청 0 → ⚙ 에서 클래식 고르면 받음
  const c2 = await b.newContext({ viewport: { width: 360, height: 640 } }), reqs = [];
  const p2 = await c2.newPage(); p2.on('request', (r) => { if (/classic|Galmuri|ui-btn|ui-panel|menu-bg/.test(r.url())) reqs.push(r.url().replace(/.*\//, '')); });
  await p2.goto(B + '?role=camp&room=TH2'); await p2.waitForSelector('.stage'); await p2.waitForTimeout(1500);
  const before = reqs.length;
  await p2.click('button[aria-label="설정"]'); await p2.click('.th[data-th="classic"]'); await p2.waitForTimeout(1500);
  log('클래식 안 고른 폰 요청:', before, '| 고른 뒤:', reqs.length, reqs.slice(0, 6).join(' '));
  if (before !== 0 || reqs.length === 0) errs.push('클래식 지연 로드');
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0');
  await b.close();
})();
