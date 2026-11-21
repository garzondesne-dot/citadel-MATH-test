// 👩‍🏫 시연 선생님 용사 = 교사 계정 「내 용사」 (📜 2026-11-14 🐞 「교사 모습이랑 실제 시연할 때 캐릭터랑 안 맞음」)
//   ① 교사 폰 「나」 내 용사 바꿈 → 서버 school/tlook ② 교실 TV 🎮 시연 창 = 같은 용사 · 같은 스킬 · 필살기 잠김 = 교사 스킬 기준
//   ③ 수업 중 교사 폰이 다시 바꿈(서버 값 바뀜) → TV F5 없이 따라감 (수업 중엔 교사 「나」 탭이 숨어서 서버 칸을 직접 바꿔 흉내)
//   사용: NODE_PATH=$(npm root -g) node tools/e2e/tlook.cjs <폴더>
const { chromium } = require('playwright'); const path = require('path');
const [SHOTS = '.'] = process.argv.slice(2), B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const ctx = await b.newContext(), t = await ctx.newPage(); await t.setViewportSize({ width: 390, height: 844 });
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tabs');
  ok('처음 = 서버 값 없음', !(await t.evaluate(() => window.__dbGet('school/tlook'))));
  // ① 교사 폰 「나」 → 내 용사 → 「공식」
  await t.click('.tabs button:has-text("나")'); await t.waitForTimeout(300); await t.click('.hc'); await t.waitForSelector('button.top[aria-label="용사 바꾸기"]');
  await t.click('button.top[aria-label="용사 바꾸기"]'); await t.waitForSelector('.hsw .swc'); await t.click('.hsw .swc:has-text("공식")'); await t.waitForTimeout(200); await t.click('.hsw .pmain'); await t.waitForTimeout(300); await t.click('button:has-text("💾 저장")'); await t.waitForTimeout(600);
  const srv = await t.evaluate(() => window.__dbGet('school/tlook')); ok('교사 폰 저장 → 서버 school/tlook', !!srv && srv.hero !== 7, JSON.stringify(srv && { hero: srv.hero, fx: srv.fx }));
  // 수업 열기 + 학생 1 + 몬스터 단계
  await t.goto(B + '?role=teacher'); await t.waitForSelector('.tabs'); await t.click('[data-cls="1-3"]'); await t.click('.pk3 [data-no="2"]'); await t.click('[data-k="open-go"]'); await t.click('[data-k="open-yes"]'); await t.waitForSelector('.tact .btn', { timeout: 15000 }); // 📦 #21 수업 탭 = 반 → 차시 → 열기 (옛 「준비」 → 차시 고르기 대신)
  const code = await t.evaluate(() => window.__dbGet('school/live').code);
  const s = await ctx.newPage(); await s.setViewportSize({ width: 390, height: 844 }); await s.goto(`${B}?role=student&room=${code}&as=1-1:3`); await s.waitForTimeout(2500);
  await t.waitForFunction(() => !document.querySelector('.tact .btn')?.disabled, null, { timeout: 15000 });
  for (let g = 0; g < 12; g++) { const st = await t.evaluate(() => { const L = window.__dbGet('school/live'); return window.__dbGet(`rooms/${L.code}`).state.step; }); if (st === 2) break; await t.click('.tact .btn'); await t.waitForTimeout(300); }
  if (/지금 등장/.test(await t.textContent('.tact .btn'))) await t.click('.tact .btn');
  // ② 다른 기기 TV (TV 기기 자기 칸에 다른 용사를 넣어 둠 = 이 값을 쓰면 안 됨)
  const tv = await ctx.newPage(); await tv.setViewportSize({ width: 1920, height: 1080 });
  const hk = await t.evaluate((c) => window.__dbGet(`secrets/${c}/hallKey`), code); await tv.goto(`${B}?role=hall&code=${code}&key=${hk}`); // 🔑 #59 종합실 입장 열쇠 await tv.waitForSelector('nav.dock', { timeout: 20000 }); await tv.waitForTimeout(1000);
  await tv.mouse.move(960, 540); await tv.click('nav.dock .t:has-text("시연")'); await tv.waitForSelector('.dpane .dp', { timeout: 15000 });
  const d1 = await tv.$eval('.dpane .dp', (e) => ({ hero: e.dataset.thero, fx: e.dataset.tfx, ult: e.dataset.tult }));
  ok('TV 시연 = 교사 폰 「내 용사」 같은 용사 · 같은 스킬', d1.hero === String(srv.hero) && d1.fx === srv.fx, JSON.stringify(d1));
  ok('필살기 잠김 = 교사 스킬 기준 (Ⅰ 만 = 잠김)', d1.ult === 'false', `ult ${d1.ult}`);
  // ③ 교사 폰이 다시 바꿈 → F5 없이
  await t.evaluate(() => window.__dbSet('school/tlook', { hero: 3, enh: 2, fx: 'twin', socket: { 3: 'twin' }, title: 'none', nick: '선생님', at: Date.now() }));
  await tv.waitForTimeout(1500);
  const d2 = await tv.$eval('.dpane .dp', (e) => ({ hero: e.dataset.thero, fx: e.dataset.tfx, ult: e.dataset.tult }));
  ok('수업 중 바꿈 → TV F5 없이 따라감 · Ⅳ = 필살기 열림', d2.hero === '3' && d2.fx === 'twin' && d2.ult === 'true', JSON.stringify(d2));
  await tv.screenshot({ path: path.join(SHOTS, 'tlook-tv.png') });
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}` : '✅ 오류 0'); await b.close();
})();
