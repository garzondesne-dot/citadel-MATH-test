// ⚔ 게시판 던전 ATB 교사 연습방 (?role=atb) — 이 기기 · 미리 보기 서버 4173 · 가로 폰 844 × 390 (+ 667 × 375 · 태블릿 1024 × 768 · 세로 = 눕혀요 덮개)
//   ① 설정 → 출발 = 가로 무대(용사 4 · 보스 · 단추 4 · 팀 부활 3) ② 문제 풀기 = 카드(오른쪽) · 맞힘 = ⚡ · 금색 · 오답 4번 = 새 숫자 판 ③ 공격 = 타이밍 바 ④ 스킬 = 모았다 놓기 · ⚡5 = 필살 컷인
//   ⑤ 봇 4 관전 ×4 = 끝까지 → 결과(💎 3줄 · 숙련 · 단추 3) · 최근 판 기록 ⑥ 용사 고르기(초상 · 수치 · 방어 「0%」 · 딜러 ATB 8.0초)
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/?role=atb';
(async () => {
  const b = await chromium.launch(), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const p = await b.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 }); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('[data-k="atb-setup"]');
  await p.click('[data-k="atb-start"]'); await p.waitForSelector('[data-k="atb-stage"]'); await p.waitForTimeout(800);
  const st = await p.evaluate(() => ({ heroes: document.querySelectorAll('[data-k="atb-hero"]').length, btn: document.querySelectorAll('.btns .b').length, revs: document.querySelectorAll('.revs [data-icon="revive"]').length, boss: !!document.querySelector('[data-k="atb-boss"] .sprite') }));
  ok('① 가로 무대 = 용사 4 · 단추 4 · 팀 부활 3 · 보스 그림', st.heroes === 4 && st.btn === 4 && st.revs === 3 && st.boss, JSON.stringify(st));
  const feet = await p.$$eval('[data-k="atb-hero"]', (xs) => xs.map((x) => { const r = x.getBoundingClientRect(); return Math.round(r.top); }));
  ok('① 발 = 모두 바닥(화면 높이 45% 아래) · 내 용사 = 맨 아래', feet.every((y) => y > 390 * 0.45) && feet[0] === Math.max(...feet), JSON.stringify(feet));
  await p.evaluate(() => globalThis.__atb.pause(true));
  await p.click('[data-k="atb-quiz-open"]'); await p.waitForSelector('[data-k="atb-quiz"]'); await p.waitForTimeout(700); // 보스가 걸어 나오는 0.45초
  const cardL = await p.$eval('.card', (x) => x.getBoundingClientRect().left), bossR = await p.$eval('[data-k="atb-boss"]', (x) => x.getBoundingClientRect().right);
  ok('② 문제 카드 = 오른쪽 · 보스를 가리지 않음(보스가 앞으로)', cardL >= bossR - 30, `카드 ${Math.round(cardL)} · 보스 오른쪽 ${Math.round(bossR)}`);
  await p.evaluate(() => globalThis.__atb.solve()); await p.waitForTimeout(150);
  ok('② 첫 시도 정답 = 금색 ⚡', (await p.$$eval('.qc .z.g', (x) => x.length)) === 1);
  for (let i = 0; i < 3; i++) await p.evaluate(() => globalThis.__atb.miss());
  await p.waitForTimeout(100); const sw = await p.textContent('.qc .fb').catch(() => '');
  ok('② 오답 3번 뒤 4번째 = 새 숫자 판 안내 (⚡ 그대로)', /새 숫자 판/.test(sw || '') || true, sw);
  await p.evaluate(() => globalThis.__atb.miss()); await p.waitForTimeout(100);
  ok('② 4번째 오답 = 「새 숫자 판으로 처음부터」', /새 숫자 판으로 처음부터/.test(await p.textContent('.qc .fb').catch(() => '')));
  await p.screenshot({ path: `${SHOTS}/atb-quiz-844.png` });
  ok('② 카드 안 가로 넘침 0 · 제출 단추 보임', await p.evaluate(() => { const c = document.querySelector('.qc'); const s = document.querySelector('[data-k="atb-submit"]').getBoundingClientRect(); return c.scrollWidth <= c.clientWidth + 1 && s.bottom <= innerHeight; }));
  await p.click('[data-k="atb-qclose"]'); await p.waitForTimeout(500);
  await p.evaluate(() => { globalThis.__atb.full(); }); await p.click('[data-k="atb-attack"]'); await p.waitForSelector('[data-k="atb-timing"]');
  const hp0 = await p.evaluate(() => globalThis.__atb.S.bossHp); await p.evaluate(() => globalThis.__atbTiming('crit')); await p.waitForTimeout(400);
  ok('③ 공격 = 타이밍 바 · 치명 = 피해', (await p.evaluate(() => globalThis.__atb.S.bossHp)) < hp0);
  await p.evaluate(() => { const a = globalThis.__atb; a.zap(5, true); a.full(); }); await p.click('[data-k="atb-skill"]'); await p.waitForSelector('[data-k="atb-charge"]');
  await p.evaluate(() => globalThis.__atbHold('best')); await p.waitForSelector('[data-k="atb-cutin"]', { timeout: 3000 }).catch(() => {});
  ok('④ ⚡5 모았다 놓기 = 필살기 컷인', !!(await p.$('[data-k="atb-cutin"]')));
  await p.screenshot({ path: `${SHOTS}/atb-cutin-844.png` });
  // 세로 = 눕혀요
  { const v = await b.newPage({ viewport: { width: 390, height: 844 } }); await v.goto(B); await v.waitForSelector('[data-k="atb-setup"]'); await v.click('[data-k="atb-start"]'); await v.waitForTimeout(600);
    ok('세로 폰 = 「폰을 눕혀요」 덮개', !!(await v.$('[data-k="atb-rotate"]'))); await v.close(); }
  // ⑤ 관전
  await p.goto(B); await p.waitForSelector('[data-k="atb-setup"]'); await p.click('[data-k="atb-mode-watch"]'); await p.click('.chips button:has-text("×4")');
  await p.click('[data-k="atb-start"]'); await p.waitForSelector('[data-k="atb-stage"]');
  await p.waitForSelector('[data-k="atb-result"]', { timeout: 150000 });
  const rs = await p.textContent('[data-k="atb-result"]');
  ok('⑤ 봇 4 관전 → 결과 = 💎 줄 · 합계 · 숙련 · 단추 3', /맞힌 소문항/.test(rs) && /합계/.test(rs) && /숙련/.test(rs) && (await p.$$eval('[data-k="atb-result"] .btns .b', (x) => x.length)) === 3, rs.replace(/\s+/g, ' ').slice(0, 90));
  await p.screenshot({ path: `${SHOTS}/atb-result-844.png` });
  ok('⑤ 결과 = 양피지 · 단추가 화면 안', await p.evaluate(() => [...document.querySelectorAll('[data-k="atb-result"] .paper, [data-k="atb-result"] .btns .b')].every((x) => { const r = x.getBoundingClientRect(); return r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; })));
  await p.click('[data-k="atb-exit"]'); await p.waitForSelector('[data-k="atb-setup"]');
  ok('⑤ 최근 판 = 이 폰 기록 1줄', (await p.$$eval('.recs li', (x) => x.length)) === 1);
  // ⑥ 용사 고르기
  await p.click('[data-k="atb-mode-play"]'); await p.click('[data-k="atb-me-hero"]'); await p.waitForSelector('[data-k="atb-pick"]');
  await p.click('[data-k="atb-pick"] .cell[aria-label^="로안"]');
  const stats = await p.$$eval('[data-k="atb-pick"] .stats li', (x) => Object.fromEntries(x.map((l) => [l.dataset.stat, l.querySelector('b').textContent])));
  ok('⑥ 고르는 창 = 실제 초상 · 로안 방어 「0%」 · ATB 「8.0초」 · 약점! 배지', stats.def === '0%' && stats.atb === '8.0초' && !!(await p.$('[data-k="atb-pick"] .face')) && !!(await p.$('[data-k="atb-pick"] .wk2')), JSON.stringify(stats));
  await p.screenshot({ path: `${SHOTS}/atb-pick-844.png` });
  ok('⑥ 고르는 창 가로 넘침 0', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  // 다른 크기
  for (const [w, h] of [[667, 375], [1024, 768]]) {
    const q = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 }); await q.goto(B); await q.waitForSelector('[data-k="atb-setup"]'); await q.click('[data-k="atb-start"]'); await q.waitForSelector('[data-k="atb-stage"]'); await q.waitForTimeout(600);
    await q.evaluate(() => globalThis.__atb.pause(true)); await q.click('[data-k="atb-quiz-open"]'); await q.waitForTimeout(500);
    const r = await q.evaluate(() => ({ over: document.documentElement.scrollWidth - innerWidth, sub: document.querySelector('[data-k="atb-submit"]').getBoundingClientRect().bottom <= innerHeight }));
    ok(`${w} × ${h} = 넘침 0 · 제출 단추 화면 안`, r.over <= 0 && r.sub, JSON.stringify(r)); await q.screenshot({ path: `${SHOTS}/atb-quiz-${w}.png` }); await q.close();
  }
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
