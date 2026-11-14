// 🎮 시연 중 TV 실제 전투 멈춤 (📜 2026-11-14 선생님 「멈춤」 · DECISIONS 「🧾 답 4개」 3)
//   수업 중 TV 시연 열기 → 「🎮 시연 중 · 전투 잠시 멈춤」 · 정찰 남은 시간 멈춤 · 학생 폰 몬스터 공격 0 · 학생 제출은 그대로 기록 → 닫기 → 남은 시간 그대로 이어서 줄어듦 · 공격 다시 옴
//   사용: NODE_PATH=$(npm root -g) node tools/e2e/demopause.cjs <폴더>
const { chromium } = require('playwright'); const path = require('path');
const [SHOTS = '.'] = process.argv.slice(2), B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const ctx = await b.newContext(), t = await ctx.newPage(); await t.setViewportSize({ width: 400, height: 860 });
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tabs');
  await t.click('.tabs button:has-text("준비")'); await t.click('[data-k="lpick-go"]'); await t.click('[data-k="lpick"] .grid [data-id="set-02"]'); await t.click('.tact .btn'); await t.waitForSelector('.att');
  const code = await t.evaluate(() => window.__dbGet('school/live').code);
  const s = await ctx.newPage(); await s.setViewportSize({ width: 390, height: 844 }); await s.goto(`${B}?role=student&room=${code}&as=1-1:3`); await s.waitForTimeout(2500);
  await t.waitForFunction(() => !document.querySelector('.tact .btn')?.disabled, null, { timeout: 15000 });
  for (let g = 0; g < 12; g++) { const st = await t.evaluate(() => { const L = window.__dbGet('school/live'); return window.__dbGet(`rooms/${L.code}`).state.step; }); if (st === 2) break; await t.click('.tact .btn'); await t.waitForTimeout(300); }
  // 정찰 중(60초)에 TV 시연 열기
  const tv = await ctx.newPage(); await tv.setViewportSize({ width: 1920, height: 1080 }); await tv.goto(`${B}?role=hall&room=${code}`); await tv.waitForSelector('nav.dock', { timeout: 20000 }); await tv.waitForTimeout(800);
  const scout = () => t.evaluate(() => { const L = window.__dbGet('school/live'), R = window.__dbGet(`rooms/${L.code}`); return R.state; });
  await tv.mouse.move(960, 540); await tv.click('nav.dock .t:has-text("시연")'); await tv.waitForSelector('.dpane .dp', { timeout: 15000 }); await tv.waitForTimeout(600);
  const st1 = await scout(); ok('시연 열면 서버에 멈춤 표시(demoAt)', st1.demoAt != null);
  ok('TV 「🎮 시연 중 · 전투 잠시 멈춤」', !!(await tv.$('[data-k="demo-ban"]')));
  const left = async () => tv.evaluate(() => (document.querySelector('.scout, [data-k="scout"]')?.textContent || '').replace(/\s+/g, ' '));
  const lsc = () => s.evaluate(() => { const m = /(\d+)\s*초/.exec(document.body.innerText); return m ? Number(m[1]) : null; });
  const a0 = await lsc(); await t.waitForTimeout(6000); const a1 = await lsc();
  ok('시연 중 정찰 남은 시간 멈춤 (학생 폰)', a0 != null && a0 === a1, `${a0} → ${a1}`);
  // 정찰 건너뛰고(지금 등장) 몬스터 공격 시계도 멈춤인지: 리모컨 「지금 등장」
  if (/지금 등장/.test(await t.textContent('.tact .btn'))) await t.click('.tact .btn');
  await s.waitForTimeout(1500);
  // 학생 제출은 그대로 (답 하나 고르고 내기 · 기록 늘어남)
  const subs0 = await t.evaluate(() => { const L = window.__dbGet('school/live'), R = window.__dbGet(`rooms/${L.code}`); return JSON.stringify(R.subs || {}).length; });
  for (let k = 0; k < 10; k++) { const rn = await s.$('.runepad button:has-text("6"), .rune:has-text("6")'); if (rn) await rn.click().catch(() => {}); else { const o = await s.$('.opt, .chip'); if (o) await o.click().catch(() => {}); } await s.waitForTimeout(150); const pm = await s.$('.act .pmain:not([disabled])'); if (pm) { await pm.click().catch(() => {}); await s.waitForTimeout(400); } }
  await s.waitForTimeout(1200);
  await s.screenshot({ path: path.join(SHOTS, 'demopause-stu.png') });
  const subs1 = await t.evaluate(() => { const L = window.__dbGet('school/live'), R = window.__dbGet(`rooms/${L.code}`); return JSON.stringify(R.subs || {}).length; });
  ok('시연 중에도 학생 제출 · 기록', subs1 > subs0, `${subs0} → ${subs1}`);
  let fx = 0; for (let k = 0; k < 18; k++) { await s.waitForTimeout(1500); fx += await s.locator('.afx').count(); }
  ok('시연 중 학생 폰 몬스터 공격 0 (27초 · 주기 20초)', fx === 0, `효과 ${fx}`);
  await tv.screenshot({ path: path.join(SHOTS, 'demopause-tv.png') });
  // 닫기 → 이어짐
  await tv.click('.dpane .dp button:has-text("닫기"), .dpane [aria-label="닫기"]').catch(async () => { await tv.click('nav.dock .t:has-text("시연")'); });
  await tv.waitForTimeout(800);
  const st2 = await scout(); ok('닫으면 멈춤 풀림 · 멈춘 시간 저장', st2.demoAt == null && Number(st2.demoMs) > 20000, `demoMs ${st2.demoMs}`);
  ok('TV 띠 사라짐', !(await tv.$('[data-k="demo-ban"]')));
  let fx2 = 0; for (let k = 0; k < 20 && !fx2; k++) { await s.waitForTimeout(1500); fx2 += await s.locator('.afx').count(); }
  ok('닫은 뒤 몬스터 공격 다시 옴', fx2 > 0, `효과 ${fx2}`);
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}` : '✅ 오류 0'); await b.close();
})();
