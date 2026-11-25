// 💡 실마리 말풍선 (📜 11/25 · DECISIONS a9ef715) — 🧪 테스트 방 · 폰 375 · 15차시 v9 팩
//   ① 몬스터 1: 소문제 1 을 1번 틀림 = 말풍선 없음 → 2번 틀림 = 💡 빛 + 「막히면 눌러 봐」 → 💡 누름 = 사라짐
//   ② 새로 고침 · 몬스터 3(소레이드): 같은 단계 2번 틀려도 다시 안 뜸(이 기기에서 써 봄)
//   ③ 새 기기(저장 비움) · 몬스터 3: 졸개 ① 2번 틀림 = 말풍선
//   NODE_PATH=$(npm root -g) node tools/e2e/hintnudge1125.cjs <그림 폴더> <팩 json>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', PACK = process.argv[3], B = 'http://localhost:4173/';
const P = require(PACK);
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext(), t = await ctx.newPage(); await t.setViewportSize({ width: 400, height: 860 }); t.on('pageerror', (e) => errs.push('리모컨 ' + e));
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tabs');
  await t.click('.tabs button:has-text("차시 팩")'); await t.click('[data-k="packup-go"]'); await t.setInputFiles('[data-k="packfile"]', PACK); await t.waitForSelector('[data-k="packsum"]'); await t.waitForTimeout(800);
  await t.click('.sheet .btn.pmain'); await t.waitForTimeout(1200);
  await t.click('.tabs button:has-text("수업")'); await t.click('[data-k="cls-test"]'); await t.click(`.pk3 [data-no="${P.no}"]`); await t.click('[data-mode="remote"]');
  await t.click('[data-k="open-go"]'); await t.click('[data-k="open-yes"]'); await t.waitForSelector('.tact .btn', { timeout: 15000 });
  const code = await t.evaluate(() => window.__dbGet('school/live').code);
  const stepNow = () => t.evaluate(() => { const L = window.__dbGet('school/live'); return window.__dbGet(`rooms/${L.code}`).state.step; });
  const goTo = async (id) => { const i = P.steps.findIndex((x) => x.id === id); for (let g = 0; g < 25; g++) { if ((await stepNow()) === i) break; await t.click('.tact .btn'); await t.waitForTimeout(350); } if (/지금 등장/.test(await t.textContent('.tact .btn'))) await t.click('.tact .btn'); };
  const phone = async (n) => { const s = await ctx.newPage(); await s.setViewportSize({ width: 375, height: 667 }); s.on('pageerror', (e) => errs.push('폰 ' + e)); await s.goto(`${B}?role=student&room=${code}&as=test:${n}`); await s.waitForTimeout(2500); return s; };
  const nudge = (s) => s.$('[data-k="hint-nudge"]').then((x) => !!x);
  const pick = async (s, i) => { await s.locator('.opt, .chip').nth(i).click({ timeout: 3000 }).catch(() => {}); await s.waitForTimeout(120); };
  const go = (s) => s.click('.line .pmain:not([disabled]), button.pmain:not([disabled])', { timeout: 4000 }).catch(() => {});
  // ① 몬스터 1 (일반 · 소문제 4)
  const s = await phone(3);
  await goTo('m1'); await s.waitForSelector('.q2', { timeout: 15000 });
  const m1 = P.monsters.m1.first, wrongOf = (q) => (q.answerIndex === 0 ? 1 : 0);
  // 지금 소문제 번호(머리 「소문제 k / n」)를 읽어 고르고 · 공격 단추가 켜지면 누름 (고르면 저절로 다음 소문제)
  const round = async (bad) => {
    for (let g = 0; g < 20; g++) {
      if (await s.$('[data-k="ready-yes"]')) { await s.click('[data-k="ready-yes"]').catch(() => {}); await s.waitForTimeout(800); continue; } // 정찰 「준비됐어?」
      const btn = s.locator('button.pmain:not([disabled])').first(), bt = await btn.textContent({ timeout: 1500 }).catch(() => '');
      if (/공격/.test(bt)) { await btn.click({ timeout: 3000 }).catch(() => {}); await s.waitForTimeout(1800); return; }
      const lab = await s.textContent('.bcard .lab').catch(() => ''), k = +((lab.match(/소문제 (\d+) \//) || [])[1] || 0) - 1;
      if (k < 0) { if (bt) await btn.click({ timeout: 3000 }).catch(() => {}); await s.waitForTimeout(500); continue; }
      await pick(s, bad.includes(k) ? wrongOf(m1[k]) : m1[k].answerIndex); await s.waitForTimeout(350);
      const nx = s.locator('button.pmain:not([disabled])').first(), nt = await nx.textContent({ timeout: 1500 }).catch(() => '');
      if (/다음 소문제/.test(nt)) { await nx.click({ timeout: 3000 }).catch(() => {}); await s.waitForTimeout(350); }
    }
  };
  await round([0]);
  ok('① 1번 틀림 = 말풍선 없음', !(await nudge(s)));
  await round([0]);
  // 채점표 → 생각 3초 → 「다음 틀린 문제 ▶」 = 다시 푸는 칸(💡 단추 있음)
  for (let g = 0; g < 12 && !(await s.$('[data-k="hint"]')); g++) { await s.waitForTimeout(800); await s.locator('button.pmain:not([disabled])').first().click({ timeout: 1500 }).catch(() => {}); }
  await s.waitForTimeout(500);
  ok('① 같은 소문제 2번 틀림 = 「막히면 눌러 봐」', await nudge(s));
  ok('① 💡 단추 빛남', await s.$('[data-k="hint"].nudge').then((x) => !!x));
  await s.screenshot({ path: `${SHOTS}/nudge-m1.png` });
  await s.screenshot({ path: `${SHOTS}/nudge-m1b.png` }); await s.click('[data-k="hint"]', { timeout: 5000 }).catch(() => {}); await s.waitForTimeout(600);
  await s.keyboard.press('Escape').catch(() => {}); await s.mouse.click(5, 5).catch(() => {}); await s.waitForTimeout(400);
  ok('① 💡 누르면 말풍선 사라짐', !(await nudge(s)));
  // ② 새로 고침 뒤 몬스터 3 = 다시 안 뜸
  await goTo('m3'); await s.reload(); await s.waitForTimeout(3000); await s.waitForSelector('.q2', { timeout: 15000 });
  // 소레이드 졸개 ① 을 틀리게(첫 단계 정답이 아닌 보기) 2번 공격
  const st0 = P.monsters.m3.first[0], bad0 = st0.type === 'choice' ? (st0.answerIndex === 0 ? 1 : 0) : 0;
  const chainWrong2 = async (p) => {
    for (let k = 0, g = 0; k < 2 && g < 20; g++) {
      if (await p.$('[data-k="ready-yes"]')) { await p.click('[data-k="ready-yes"]').catch(() => {}); await p.waitForTimeout(800); continue; }
      if (!(await p.$('.opt, .chip'))) { await p.waitForTimeout(800); continue; }
      await pick(p, bad0); await p.locator('button.pmain:not([disabled])').first().click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(1800); k++;
    }
    for (let g = 0; g < 8 && !(await p.$('[data-k="hint"]')); g++) await p.waitForTimeout(600);
  };
  await chainWrong2(s);
  ok('② 써 본 기기 = 같은 단계 2번 틀려도 안 뜸', !(await nudge(s)));
  // ③ 다른 학생 폰(같은 서버 · 💡 기억만 지움) · 몬스터 3
  const s3 = await phone(4); await s3.evaluate(() => localStorage.removeItem('citadel-hint-used')); await s3.reload(); await s3.waitForTimeout(3000);
  await chainWrong2(s3);
  ok('③ 새 기기 · 소레이드 같은 단계 2번 틀림 = 말풍선', await nudge(s3));
  await s3.screenshot({ path: `${SHOTS}/nudge-m3.png` });
  ok('가로 넘침 0', await s3.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await b.close(); console.log(errs.length ? `❌ ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); process.exit(errs.length ? 1 : 0);
})();
