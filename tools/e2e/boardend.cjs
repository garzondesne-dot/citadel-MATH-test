// 🐞 게시판 던전 결과가 너무 빨리 지나감 (📜 2026-11-14): 끝 신호 → 「⚔ 처치!」 2초(누르면 바로) → 결과 = 등급 도장 → 💎 올라감 → 다 보임(단계마다 2초 · 누르면 다음) → 단추 누를 때까지 그대로
//   사용: NODE_PATH=$(npm root -g) node tools/e2e/boardend.cjs <폴더>
const { chromium } = require('playwright');
const [SHOTS = '.'] = process.argv.slice(2), B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const p = await (await b.newContext({ viewport: { width: 360, height: 640 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  const start = async () => { await p.click('.bd .chips button:has-text("6")'); await p.click('.bd .act .btn'); await p.waitForSelector('.lgrid'); await p.click('.sheet .act .btn'); await p.waitForSelector('.run'); await p.waitForTimeout(1500); };
  const solveAll = async () => { for (let k = 0; k < 20; k++) { if (await p.$('[data-k="board-endov"]')) return; await p.evaluate(() => window.__board?.solve()); await p.waitForTimeout(700); } };
  await p.goto(B + '?role=camp&room=BE1'); await p.waitForSelector('.stage');
  await p.click('button[aria-label="게시판"]'); await p.waitForSelector('.bd');
  // ① 끝 = ⚔ 처치! 2초 → 결과
  await start(); await solveAll();
  const t0 = Date.now(); const ov = await p.textContent('[data-k="board-endov"]').catch(() => ''); ok('① 끝 = 「⚔ 처치!」 장면', /처치/.test(ov), ov.trim());
  await p.screenshot({ path: `${SHOTS}/boardend-kill.png` });
  await p.waitForSelector('[data-k="board-res"]', { timeout: 6000 }); const dt = Date.now() - t0; ok('① 처치 장면 ≥ 2초 뒤 결과', dt >= 1800 && dt < 4000, `${dt}ms`);
  // ② 단계 = 0 등급 → 1 💎 → 2 다 보임 · 단계마다 ≥ 2초
  const st = () => p.$eval('[data-k="board-res"]', (x) => Number(x.dataset.stage)); const s0 = await st();
  ok('② 결과 처음 = 등급 도장만(💎 · 순위 아직)', s0 === 0 && !(await p.$('.bd .rw')), `stage ${s0}`);
  await p.screenshot({ path: `${SHOTS}/boardend-s0.png` });
  await p.waitForTimeout(1500); ok('② 1.5초 = 아직 등급 단계', (await st()) === 0);
  await p.waitForTimeout(900); ok('② 2초 넘으면 💎 단계', (await st()) === 1 && !!(await p.$('.bd .rw')));
  await p.waitForTimeout(1500); const g = await p.textContent('[data-k="board-gem"]'); ok('② 💎 올라감 끝 = 받은 💎', /^\d+/.test(g.trim()), g.trim());
  await p.screenshot({ path: `${SHOTS}/boardend-s1.png` });
  await p.waitForTimeout(800); ok('② 다음 2초 뒤 다 보임', (await st()) === 2);
  // ③ 저절로 안 넘어감 (8초 기다려도 결과 그대로)
  await p.waitForTimeout(8000); ok('③ 8초 뒤에도 결과 그대로 · 단추 둘', !!(await p.$('[data-k="board-res"]')) && !!(await p.$('[data-k="board-again"]')) && !!(await p.$('[data-k="board-back"]')));
  await p.screenshot({ path: `${SHOTS}/boardend-s2.png` });
  // ④ 누르면 건너뛰기: 다시 한 판 → 처치 장면 누름 → 바로 결과 · 결과 누름 → 다음 단계
  await p.click('[data-k="board-back"]'); await p.waitForTimeout(300); await start(); await solveAll();
  const t1 = Date.now(); await p.click('[data-k="board-endov"]'); await p.waitForSelector('[data-k="board-res"]', { timeout: 3000 }); ok('④ 처치 장면 누르면 바로 결과', Date.now() - t1 < 1200, `${Date.now() - t1}ms`);
  await p.click('[data-k="board-res"]', { position: { x: 20, y: 20 } }); await p.waitForTimeout(150); const a = await st();
  await p.click('[data-k="board-res"]', { position: { x: 20, y: 20 } }); await p.waitForTimeout(150); const c = await st();
  ok('④ 결과 누르면 단계 넘김 0 → 1 → 2', a === 1 && c === 2, `${a} → ${c}`);
  const o = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); ok('360 가로 넘침 0', o <= 0, String(o));
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
