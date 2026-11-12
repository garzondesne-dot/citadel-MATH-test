// #132 정식에서 옮긴 차시 팩 한 판씩 (360 × 640) — ⑫ 차시 칸 = 정상 칸(점선 아님) → 🧪 테스트로 열기 → 학생 한 명 → 대기실 → 모든 단계 → 형성평가 → 마무리
//   단계마다 학생 폰: 몬스터 = 문제 카드(정찰이면 「⚔ 지금 등장」) · 벤 그림 · 형성평가 문항 · 오류 0 · 마무리에서 끝
// 사용: npm run build → npx vite preview --port 4173 → NODE_PATH=$(npm root -g) node tools/e2e/packs.cjs <그림 폴더> [2,3,4,5]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', NOS = (process.argv[3] || '2,3,4,5').split(',').map(Number);
const B = 'http://localhost:4173/', DB = 'citadel-v1-test-db';
(async () => {
  const b = await chromium.launch(); const errs = [], log = (...a) => console.log(...a);
  for (const no of NOS) {
    const ctx = await b.newContext({ viewport: { width: 360, height: 640 } });
    const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push(`${no}차시 교사: ${e}`));
    await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tabs');
    const cell = t.locator('.pk3 .pk', { hasText: `${no}차시` }).first();
    const cls = await cell.getAttribute('class'); if (/\badd\b/.test(cls)) errs.push(`${no}차시: ⑫ 칸이 아직 「준비 안 됨」`);
    await cell.click(); await t.click('.sub2 button:has-text("테스트")'); await t.waitForTimeout(300);
    const flow = (await t.textContent('.mid')).replace(/\s+/g, ' ');
    const lv = await t.evaluate((k) => JSON.parse(localStorage.getItem(`${k}|school/live`)), DB);
    const s = await ctx.newPage(); s.on('pageerror', (e) => errs.push(`${no}차시 학생: ${e}`)); s.on('console', (m) => { if (m.type() === 'error') errs.push(`${no}차시 학생 콘솔: ${m.text()}`); });
    await s.goto(`${B}?role=student&room=${lv.code}&as=1-1:1`); await s.waitForTimeout(500); await t.bringToFront();
    log(`${no}차시 · 대기실 흐름: ${(/약 \d+분/.exec(flow) || ['?'])[0]} · 끝 예상 ${(/끝 예상 [\d:]+/.exec(flow) || ['?'])[0]}`);
    await t.waitForSelector('.tact .btn:not([disabled])'); await t.click('.tact .btn'); await t.waitForTimeout(300);
    const seen = [];
    for (let k = 0; k < 40; k++) {
      const main = (await t.textContent('.tact .btn')).trim();
      if (main.includes('지금 등장')) { await t.click('.tact .btn'); await t.waitForTimeout(250); continue; }
      const now = ((await t.textContent('.mid')).match(/지금 · ([^🌫\d]+)/)?.[1] ?? '').trim();
      await s.waitForTimeout(350);
      const q = await s.$$eval('.qt, .q2', (es) => es.map((e) => e.textContent.trim()).filter(Boolean)[0] ?? '');
      const venn = (await s.$$('svg.venn')).length;
      seen.push(`${now}${q ? ' ✎' : ''}${venn ? ` 🟣${venn}` : ''}`);
      if (venn && !(await s.$(`.venn-shot-${no}`))) { await s.screenshot({ path: `${SHOTS}/b17-${no}-venn.png` }); await s.evaluate((n) => document.body.classList.add(`venn-shot-${n}`), no); }
      if (/^문제|^보강|^복습|형성평가/.test(now) && !q) errs.push(`${no}차시 ${now}: 학생 문제 글 없음`);
      if (main.includes('수업 닫기')) break;
      await t.click('.tact .btn'); await t.waitForTimeout(300);
    }
    await s.screenshot({ path: `${SHOTS}/b17-${no}-end.png` });
    log(`${no}차시 · 단계: ${seen.join(' → ')}`);
    await ctx.close();
  }
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0');
  await b.close();
})();
