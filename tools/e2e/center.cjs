// 🎯 캐릭터 정중앙 시험 (#121): 칸 안 도트의 「보이는 부분」 가운데 = 칸 가운데 ±2px · 발(아래) = 칸 아래 ±2px
//   곳: 캠프 정보판 · 내 용사 맨 위 카드 · 강화 칸 · 용사 바꾸기 상세 · 격자 31칸(모든 용사) · 몬스터(전투 장면)
//   재는 법(알파 > 40 = 도구 make-sprite-bbox.py 와 같은 기준): 바탕 · 빛(오라) · 글자를 지운 뒤 그 칸만 투명 배경으로 찍고, 서 있는 줄 4칸을 모두 찍어 합친 상자를 잼
// 사용: npm run build → npx vite preview --port 4173 → NODE_PATH=$(npm root -g) node tools/e2e/center.cjs
const { chromium } = require('playwright');
const base = 'http://localhost:4173/';
const CLEAN = `*{background-color:transparent!important;box-shadow:none!important;border-color:transparent!important;color:transparent!important;text-shadow:none!important}
.hs i{animation:none!important;filter:none!important} .hs::after{display:none!important} b,small,em,svg{visibility:hidden!important} .hs b{visibility:hidden!important}
.bg,.stage,.edge{background-image:none!important} img,.prop,.sp,.zone{visibility:hidden!important}`; // 뒤에 깔린 캠프 그림(텐트 · 성채 · 소품)이 비치지 않게
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 760 } });
  const p = await ctx.newPage();
  const errs = [], rows = [];
  // 그 칸(span.hs) 하나: 4 프레임 합친 보이는 상자 → 칸 기준 가운데 · 아래 어긋남
  async function measure(el, name, extra = "") {
    const box = await el.boundingBox(); if (!box) return;
    const handle = await p.addStyleTag({ content: CLEAN + extra });
    let u = null;
    for (const f of [0, 1, 2, 3]) {
      await el.evaluate((e, k) => { const i = e.querySelector('i'); i.style.backgroundPositionX = `${(k / 3) * 100}%`; }, f);
      const png = await el.screenshot({ omitBackground: true }); // 그 칸만 (옆 글자의 이모지가 섞이지 않게)
      const bb = await p.evaluate(async (b64) => {
        const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data; let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
        for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 40) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
        return x1 < 0 ? null : [x0, y0, x1 + 1, y1 + 1];
      }, png.toString('base64'));
      if (bb) u = u ? [Math.min(u[0], bb[0]), Math.min(u[1], bb[1]), Math.max(u[2], bb[2]), Math.max(u[3], bb[3])] : bb;
    }
    await el.evaluate((e) => { e.querySelector('i').style.backgroundPositionX = ''; });
    await handle.evaluate((s) => s.remove());
    if (!u) { errs.push(`${name}: 그림 없음`); return; }
    const dx = (u[0] + u[2]) / 2 - box.width / 2, dy = u[3] - box.height;
    rows.push(`${name} ${dx.toFixed(1)}/${dy.toFixed(1)}`);
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) errs.push(`${name}: 가운데 ${dx.toFixed(1)}px · 아래 ${dy.toFixed(1)}px`);
  }
  await p.goto(base + '?role=camp&room=CT'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.stage');
  await measure(await p.$('.hero-card .pic .hs'), '캠프 정보판');
  await p.click('button[aria-label="내 용사 보기"]'); await p.waitForSelector('.mh'); await p.waitForTimeout(500); // 들어오는 움직임이 끝난 뒤
  await measure(await p.$('.mh .top .pic .hs'), '내 용사 카드');
  await measure(await p.$('.esp .hs'), '강화 칸');
  await p.click('.mh .top'); await p.waitForSelector('.hsw'); await p.waitForTimeout(200);
  const UNDER = '.mh .body,.camp .hs{visibility:hidden!important}'; // 시트 밑에 깔린 내 용사 화면 · 캠프 정보판 그림이 비치지 않게
  await measure(await p.$('.swbig .hs'), '용사 바꾸기 상세', UNDER);
  const cells = await p.$$('.swc');
  for (const c of cells) { await c.scrollIntoViewIfNeeded(); await p.waitForTimeout(60); await measure(await c.$('.hs'), `격자 ${(await c.getAttribute('aria-label')).split(' · ')[0]}`, UNDER + '.swd{visibility:hidden!important}'); }
  console.log(rows.join(' | '));
  console.log('잰 칸', rows.length, '· 오류', errs);
  await b.close();
})();
