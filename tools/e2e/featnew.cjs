// ⚙ 🧩 수업 기능 스위치 7개 (📜 2026-11-16 머리 🔨 · DECISIONS 「⚙ 새 수업 기능」): 교사 「나」 → ⚙ 우리 학교 기능 = 「🧩 수업 기능」 7개 · 처음 = 모두 켬
//   끄면: 리모컨 ✅ 도장 숨김 · 학생 칼 → 「남은 기회 n번」 · 도장 다시 켜면 보임   (이 기기 저장만)
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/', DB = 'citadel-v1-test-db';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('리모컨 ' + e));
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tp');
  await t.click('.tabs button:has-text("나")'); await t.click('[data-k="feat"]'); await t.waitForTimeout(500);
  const txt = (await t.textContent('.sheet')) || '';
  const names = ['칼 모양', '도움 3단', '익명 풀이', '개념 체크', '선제 공격', '도장', '문제 칸 양피지 기본'];
  ok('⚙ 「🧩 수업 기능」 묶음 · 7개', /🧩 수업 기능/.test(txt) && names.every((n) => txt.includes(n)), names.filter((n) => !txt.includes(n)).join(',') || '모두 있음');
  ok('🤝 · 🧱 스위치 없음', !/손 놓은|막힘 알림/.test(txt));
  await t.locator('text=🧩 수업 기능').first().scrollIntoViewIfNeeded(); await t.screenshot({ path: `${SHOTS}/feat-settings.png` });
  await t.keyboard.press('Escape'); const x = await t.$('.sheet .x'); if (x) await x.click().catch(() => {});
  // 수업 열기 → 학생 칸 → 도장 보임 → 끄면 숨김
  await t.click('.tabs button:has-text("학생")').catch(() => {}); await t.goto(B + '?role=teacher'); await t.waitForSelector('.tp');
  if (await t.$('[data-cls="1-3"]')) await t.click('[data-cls="1-3"]'); else { await t.click('text=다른 반'); await t.click('.sheet .pk:has-text("1-3반")'); }
  await t.click('.pk:has-text("6차시")'); await t.click('.tact .btn'); await t.waitForSelector('.nums');
  const code = await t.evaluate((k) => JSON.parse(localStorage.getItem(`${k}|school/live`)).code, DB);
  const s = await ctx.newPage(); await s.goto(`${B}?role=student&room=${code}&as=1-3:2`); await s.waitForTimeout(1500);
  await t.bringToFront(); await t.click('.tact .btn'); await t.waitForTimeout(500); await t.click('.tact .btn'); await t.waitForTimeout(500); if (await t.$('.badge.sc')) await t.click('.tact .btn'); await t.waitForTimeout(800);
  await t.click('.n[data-n="2"]'); await t.waitForTimeout(400); ok('켬 = 리모컨 ✅ 도장 보임', !!(await t.$('[data-k="stamp"]')));
  await s.bringToFront(); await s.waitForTimeout(400); await s.locator('text=④').first().click().catch(() => {}); await s.waitForTimeout(600); ok('켬 = 학생 칼 모양(공격 단추 칼 · 숫자 줄 없음)', !(await s.$('[data-k="left"]')) && !!(await s.$('.hearts, [data-k="hearts"], svg')));
  await t.evaluate(() => window.__featSet({ bundle: 'full', on: { stamp: false, sword: false } })); await t.waitForTimeout(800);
  await t.bringToFront(); ok('끔 = 리모컨 ✅ 도장 숨김', !(await t.$('[data-k="stamp"]')));
  await s.bringToFront(); await s.waitForTimeout(500); for (const c of ['①', '②', '③', '④']) { await s.locator(`text=${c}`).first().click().catch(() => {}); await s.waitForTimeout(250); await s.getByRole('button', { name: '1', exact: true }).first().click().catch(() => {}); await s.waitForTimeout(250); } await s.waitForTimeout(600); const lt = (await s.textContent('[data-k="left"]').catch(() => '')) || ''; ok('끔 = 학생 「남은 기회 n번」', /남은 기회 \d+번/.test(lt), lt);
  await s.screenshot({ path: `${SHOTS}/feat-sword-off.png` });
  await t.evaluate(() => window.__featSet(null)); await t.waitForTimeout(600); await t.bringToFront(); ok('다시 켬(설정 없음 = 처음 값) = 도장 보임', !!(await t.$('[data-k="stamp"]')));
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
