// 📚 준비 탭 차시 고르기 시트 (📜 2026-11-14 「기본값을 최근 값으로 · 목록이 좌르르 나와 불편」)
//   360 × 640: 넘침 0 · 시트 = 최근 3칸 + 번호 격자 4칸 · 칸 높이 ≥ 56 · 스크롤 없이 한 화면 · 칸 누르면 바로 고르고 닫힘 · 새로 고침해도 그 차시 · 최근 순서
//   사용: NODE_PATH=$(npm root -g) node tools/e2e/lpick.cjs <폴더>
const { chromium } = require('playwright');
const path = require('path');
const [SHOTS = '.'] = process.argv.slice(2), B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const p = await (await b.newContext({ viewport: { width: 360, height: 640 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + '?role=teacher'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.tabs');
  const prep = async () => { await p.click('.tabs button:has-text("준비")'); await p.waitForSelector('[data-k="lpick-go"]'); };
  const lab = async () => (await p.textContent('[data-k="lpick-go"] b')).trim();
  await prep(); out.push(`ℹ 기억 없음 처음 값 = ${await lab()}`);
  await p.click('[data-k="lpick-go"]'); await p.waitForSelector('[data-k="lpick"]');
  const m = await p.evaluate(() => { const g = document.querySelector('[data-k="lp-grid"]'), cs = [...g.querySelectorAll('.c')], lp = document.querySelector('[data-k="lpick"]'); const cols = new Set(cs.map((c) => Math.round(c.getBoundingClientRect().left))).size; return { n: cs.length, cols, minH: Math.min(...cs.map((c) => c.getBoundingClientRect().height)), over: document.documentElement.scrollWidth - innerWidth, scroll: lp.scrollHeight - lp.clientHeight, bottom: Math.max(...cs.map((c) => c.getBoundingClientRect().bottom)) }; });
  ok('360 폭 넘침 0', m.over <= 0, String(m.over));
  ok('격자 한 줄 4칸 · 칸 높이 56 이상', m.cols === 4 && m.minH >= 56, `${m.cols}칸 · ${m.minH}px · ${m.n}개`);
  ok('2 ~ 12차시가 시트 안 스크롤 없이 한 화면', m.scroll <= 0 && m.bottom <= 640, `안 스크롤 ${m.scroll} · 아래끝 ${Math.round(m.bottom)}`);
  await p.screenshot({ path: path.join(SHOTS, 'lpick-sheet.png') });
  await p.click('[data-k="lp-grid"] [data-id="set-09"]'); await p.waitForTimeout(300);
  ok('칸 누르면 바로 고르고 닫힘', !(await p.$('[data-k="lpick"]')) && (await lab()) === '9차시', await lab());
  for (const id of ['set-03', 'set-10']) { await p.click('[data-k="lpick-go"]'); await p.click(`[data-k="lp-grid"] [data-id="${id}"]`); await p.waitForTimeout(200); }
  await p.click('[data-k="lpick-go"]'); const rec = await p.$$eval('[data-k="lp-rec"] .c', (xs) => xs.map((x) => x.dataset.id)); ok('최근 3칸 순서 = 10 · 3 · 9', rec.join() === 'set-10,set-03,set-09', rec.join());
  const on = await p.$$eval('[data-k="lp-grid"] .c.on', (xs) => xs.map((x) => x.dataset.id + (x.textContent.includes('✓') ? '✓' : ''))); ok('지금 고른 칸 = 금빛 테두리 ✓', on.join() === 'set-10✓', on.join());
  await p.screenshot({ path: path.join(SHOTS, 'lpick-recent.png') });
  await p.mouse.click(180, 30); await p.waitForTimeout(300); ok('바깥 누르면 닫힘', !(await p.$('[data-k="lpick"]')));
  await p.reload(); await p.waitForSelector('.tabs'); await prep(); ok('새로 고침해도 그 차시 (10차시)', (await lab()) === '10차시', await lab());
  // 기억이 없으면 가장 최근에 연 수업 차시
  await p.evaluate(() => { localStorage.removeItem('ds.recentLessons'); window.__dbSet('school/last/1-3', { lesson: 'set-05', no: 5, at: Date.now(), done: false, code: '1' }); }); await p.reload(); await p.waitForSelector('.tabs'); await prep();
  ok('기억 없음 → 가장 최근에 연 수업 차시 (5차시)', (await lab()) === '5차시', await lab());
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
