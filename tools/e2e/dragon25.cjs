// 🐉 쉼터 놀이 「용이 잠든 사이」 (📜 2026-11-17 #25) — 이 기기 저장 · 🧪 테스트 리모컨 + 🤖 5 + 학생 폰 1 + 종합실
//   리모컨 🏕 → 🐉 고르기 → ▶ 시작 → 안내 → 1판(폰 두 단추 번갈아 = 칸 오름 · 같은 단추 = 그대로) → ⏭ → 결과 → … → 시상(💎) · TV 길 · 용 · 용사 걷기
//   NODE_PATH=$(npm root -g) node tools/e2e/dragon25.cjs <폴더> [주소]
const { chromium } = require('playwright');
const { testOpen } = require('./_cls.cjs');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('리모컨 ' + e));
  const txt = async (p, s) => ((await p.textContent(s).catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tp'); await t.evaluate(() => { window.__botSpeed = 4; });
  await testOpen(t, { no: 6, mode: 'remote', bots: 5 }); await t.waitForSelector('[data-k="bots"]');
  const live = await t.evaluate(() => window.__dbGet('school/live'));
  const s = await ctx.newPage(); s.on('pageerror', (e) => errs.push('폰 ' + e)); await s.goto(`${B}?role=student&room=${live.code}&as=${live.cls === 'test' ? 'test' : live.cls}:3`); await s.waitForTimeout(2500);
  const tv = await ctx.newPage(); await tv.setViewportSize({ width: 1280, height: 720 }); tv.on('pageerror', (e) => errs.push('TV ' + e));
  await t.bringToFront(); await t.click('.tact .btn'); await t.waitForTimeout(800); // 수업 시작
  await t.click('[data-slot="rest"]'); await t.waitForSelector('.game');
  ok('🏕 놀이 목록에 🐉 용이 잠든 사이', /용이 잠든 사이/.test(await txt(t, '.games')), await txt(t, '.games'));
  await t.click('.game:has-text("용이 잠든 사이")'); await t.click('.rbig'); await t.waitForTimeout(800);
  const f0 = await t.evaluate((c) => window.__dbGet(`rooms/${c}/fun`), live.code);
  ok('▶ 시작 = 안내 · 학생 6명(🤖 5 + 폰 1)', f0?.kind === 'drg' && f0.phase === 'intro' && Object.keys(f0.alive || {}).length >= 2, `${f0?.kind} ${f0?.phase} ${Object.keys(f0?.alive || {}).length}`);
  const nxt = async () => { if (!(await t.$('[data-k="drg-next"]'))) await t.click('[data-slot="rest"]'); await t.click('[data-k="drg-next"]', { timeout: 3000 }); }; // ⏭ = 🏕 놀이 창 안(디펜스 단추와 같은 자리)
  await nxt(); await t.waitForTimeout(600); // 안내 → 1판
  await s.bringToFront(); await s.waitForSelector('[data-k="drg-L"]', { timeout: 8000 });
  // 용이 잘 때까지 기다렸다가 번갈아 20번
  for (let i = 0; i < 40 && !/자는 중/.test(await txt(s, '[data-k="drg-band"]')); i++) await s.waitForTimeout(150);
  const p0 = Number((await txt(s, '[data-k="drg-pos"]')).split('/')[0]);
  for (let i = 0; i < 6; i++) { await s.click(i % 2 ? '[data-k="drg-R"]' : '[data-k="drg-L"]'); await s.waitForTimeout(140); }
  const p1 = Number((await txt(s, '[data-k="drg-pos"]')).split('/')[0]);
  for (let i = 0; i < 3; i++) { await s.click('[data-k="drg-L"]'); await s.waitForTimeout(140); }
  const p2 = Number((await txt(s, '[data-k="drg-pos"]')).split('/')[0]);
  ok('👣 번갈아 = 칸 오름 · 같은 단추 거듭 = 그대로', p1 > p0 && p2 <= p1 + 1, `${p0} → ${p1} → ${p2}`);
  await s.screenshot({ path: `${SHOTS}/drg-phone.png` });
  await tv.goto(`${B}?role=hall&room=${live.code}`); await tv.waitForTimeout(3000);
  ok('종합실 = 길 · 용 · 용사', !!(await tv.$('[data-k="drg-tv"]')) && (await tv.$$('[data-k="drg-tv"] .runner')).length >= 2, `${(await tv.$$('[data-k="drg-tv"] .runner')).length}명`);
  await tv.screenshot({ path: `${SHOTS}/drg-tv.png` });
  await t.bringToFront();
  for (let i = 0; i < 40; i++) { const mx = await t.evaluate((c) => { const f = window.__dbGet(`rooms/${c}/fun`), g = window.__dbGet(`rooms/${c}/dg/${f.g}/${f.round}`) || {}; return Math.max(0, ...Object.values(g).map((x) => Number(x.p) || 0)); }, live.code); if (mx >= 30) break; await t.waitForTimeout(300); } // 🤖 가 반쯤 갈 때까지
  for (let k = 0; k < 6; k++) { await nxt().catch(() => {}); await t.waitForTimeout(700); } // 1판 끝 → … → 시상
  const f1 = await t.evaluate((c) => window.__dbGet(`rooms/${c}/fun`), live.code);
  ok('⏭ 로 세 판 → 시상 · 1~3등', f1?.phase === 'end' && (f1.win || []).length >= 1, `${f1?.phase} win ${(f1?.win || []).length}`);
  await s.bringToFront(); await s.waitForTimeout(1200);
  ok('폰 = 내 등수 · 점수', /등 · \d+점/.test(await txt(s, '[data-k="drg-myrank"]')), await txt(s, '[data-k="drg-myrank"]'));
  await s.screenshot({ path: `${SHOTS}/drg-end.png` });
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
