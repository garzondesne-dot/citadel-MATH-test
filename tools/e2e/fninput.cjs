// 🏹 📈 함수 입력 꼴 (📜 2026-11-20 머리 🔨 · 14차시~): 대응 화살표 잇기 · 그래프 고르기 — 이 기기 저장 · 미리 보기 서버 4173
//   ① 교사 폰 360 × 760: 예시 팩(tools/pack-upload/example-fn.json) 올림 = 검사 통과 · 미리 보기(학생과 같은 QItem) = 화살표 칸 · 그래프 칸 · 버전 1 = 다른 대응 → 저장
//   ② 학생 폰(시험 TV 방 · ?lesson=ex-fn): 문제 1 = 화살표 잇기(누름 · 다시 이으면 지움 · 내 답 줄) · 문제 2 = 그래프 보기(①②) · 360 · 768 가로 넘침 0
const { chromium } = require('playwright');
const path = require('path');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/', DIR = path.join(__dirname, '../pack-upload');
(async () => {
  const b = await chromium.launch(), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const ctx = await b.newContext({ viewport: { width: 360, height: 760 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + '?role=teacher'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.tabs');
  await p.click('.tabs button:has-text("차시 팩")'); await p.waitForTimeout(300); await p.click('[data-k="packup-go"]'); await p.waitForSelector('[data-k="packup"]');
  await p.setInputFiles('[data-k="packfile"]', path.join(DIR, 'example-fn.json')); await p.waitForSelector('[data-k="packsum"]'); await p.waitForTimeout(800);
  const sum = (await p.textContent('[data-k="packsum"]')).trim();
  ok('① 예시 팩 = 검사 통과', /검사 통과/.test(sum), sum);
  await p.click('.chips2 button:has-text("문제 1")'); await p.waitForTimeout(300);
  const m = await p.$$eval('[data-k="packprev"] [data-k="match"]', (xs) => xs.map((x) => ({ els: x.querySelectorAll('.el').length, ar: x.querySelectorAll('line.ar').length })));
  ok('① 미리 보기 문제 1 = 화살표 칸 2개 · 정답 화살표 펼침(3 · 3)', m.length === 2 && m[0].els === 7 && m[0].ar === 3 && m[1].ar === 3, JSON.stringify(m));
  await p.screenshot({ path: `${SHOTS}/fn-1-teacher-match.png`, fullPage: true });
  await p.click('.chips2.vers button:has-text("버전 1")'); await p.waitForTimeout(200);
  const v1 = await p.$eval('[data-k="packprev"] [data-k="match"]', (x) => [...x.querySelectorAll('.el')].map((e) => e.textContent).join(' '));
  ok('① 버전 1 = 다른 대응 (0 1 2 → 2 3 4 5)', v1 === '0 1 2 2 3 4 5', v1);
  await p.click('.chips2 button:has-text("문제 2")'); await p.waitForTimeout(300); await p.click('.chips2.vers button:has-text("버전 0")').catch(() => {}); await p.waitForTimeout(200);
  const g = await p.$$eval('[data-k="packprev"] svg[data-k="graph"]', (xs) => xs.map((x) => x.querySelectorAll('.pl path, .pl ellipse').length));
  ok('① 미리 보기 문제 2 = 그래프 그림 7장(4 + 3) · 선이 있음', g.length === 7 && g.every((n) => n > 0), JSON.stringify(g));
  await p.screenshot({ path: `${SHOTS}/fn-2-teacher-graph.png`, fullPage: true });
  await p.click('.sheet .btn.pmain'); await p.waitForNavigation({ timeout: 6000 }).catch(() => {}); await p.waitForSelector('.tabs');
  // ② 학생 폰
  const hall = await ctx.newPage(); await hall.setViewportSize({ width: 1000, height: 800 }); await hall.goto(B + '?role=hall&mode=test&room=FNI&lesson=ex-fn'); await hall.waitForSelector('.dock');
  const s = await ctx.newPage(); s.on('pageerror', (e) => errs.push(String(e))); await s.goto(B + '?role=student&room=FNI'); await hall.waitForTimeout(1200);
  const next = async () => { await hall.$eval('.dock .go', (x) => x.click()).catch(() => {}); await hall.waitForTimeout(400); };
  const goTo = async (re) => { for (let k = 0; k < 10; k++) { const t = await hall.$eval('.fs.now em', (x) => x.textContent).catch(() => ''); if (re.test(t)) break; await next(); } await hall.waitForFunction(() => !document.querySelector('.sc'), null, { timeout: 12000 }).catch(() => {}); await s.waitForTimeout(900); };
  await goTo(/문제 1/);
  const W = '.bcard [data-k="match"]';
  ok('② 학생 문제 1 = 화살표 칸', !!(await s.$(W)), (await s.textContent('.bcard .item').catch(() => '')).replace(/\s+/g, ' ').slice(0, 60));
  const tap = async (k) => { await s.locator(`${W} >> nth=0`).locator('.el').nth(k).click(); await s.waitForTimeout(120); };
  await tap(0); await tap(3); await tap(1); await tap(4); await tap(2); await tap(5);
  const ar = await s.$$eval(`${W} line.ar`, (xs) => xs.length).catch(() => 0), line = (await s.textContent('.bcard .item .ans').catch(() => '')).replace(/\s+/g, ' ');
  ok('② 화살표 3개 · 내 답 줄 = 1→1, 2→3, 3→5', ar === 3 && /1→1, 2→3, 3→5/.test(line), `${ar} · ${line}`);
  await tap(2); await tap(5); // 같은 화살표 다시 = 지움
  ok('② 같은 화살표를 다시 이으면 지움', (await s.$$eval(`${W} line.ar`, (xs) => xs.length)) === 2);
  await tap(2); await tap(6); await tap(2); await tap(5); // 한 원소에서 두 개 (함수 아닌 대응도 그림)
  ok('② 한 원소에서 화살표 두 개 = 막지 않음', (await s.$$eval(`${W} line.ar`, (xs) => xs.length)) === 4);
  await s.screenshot({ path: `${SHOTS}/fn-3-student-match-360.png`, fullPage: true });
  ok('② 360 가로 넘침 0 (문제 1)', (await s.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
  await s.setViewportSize({ width: 768, height: 1024 }); await s.waitForTimeout(300);
  await s.screenshot({ path: `${SHOTS}/fn-4-student-match-768.png` });
  ok('② 768 가로 넘침 0 (문제 1)', (await s.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
  await s.setViewportSize({ width: 360, height: 760 });
  await goTo(/문제 2/);
  const gs = await s.$$eval('.bcard svg[data-k="graph"]', (xs) => xs.length).catch(() => 0);
  ok('② 학생 문제 2 = 그래프 보기', gs >= 4, String(gs));
  await s.locator('.bcard .chips.figs .chip').nth(0).click(); await s.locator('.bcard .chips.figs .chip').nth(3).click(); await s.waitForTimeout(150);
  const l2 = (await s.textContent('.bcard .item .ans').catch(() => '')).replace(/\s+/g, ' ');
  ok('② 그래프 고르기 내 답 줄 = ①, ④', /①, ④/.test(l2), l2);
  await s.screenshot({ path: `${SHOTS}/fn-5-student-graph-360.png`, fullPage: true });
  ok('② 360 가로 넘침 0 (문제 2)', (await s.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
