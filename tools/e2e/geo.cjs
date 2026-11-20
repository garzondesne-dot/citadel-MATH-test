// 📈 그래프 글 늘리기 (📜 2026-11-20 머리 🔨 · 기하 단원 대비): 눈금 숫자 · 점 이름 · 선분 · 다각형 · 부등식 영역 · 이동 화살표 — 이 기기 저장 · 미리 보기 서버 4173
//   ① 교사 폰 360: 예시 팩(tools/pack-upload/example-geo.json · 91차시) 검사 통과 · 미리 보기 = 학생과 같은 그림 · 그림마다 이름표 · 숫자 서로 안 겹침
//   ② 학생 폰(시험 TV 방 · ?lesson=ex-geo) 360 · 768: 문제 1 · 2 그림 · 겹침 0 · 가로 넘침 0
const { chromium } = require('playwright');
const path = require('path');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/', DIR = path.join(__dirname, '../pack-upload');
// 그림 안 글자(이름표 · 눈금 숫자 · O · x · y) 상자끼리 겹침 수 (화면 좌표 · 1px 여유)
const overlaps = (pg, sel) => pg.$$eval(sel, (svgs) => svgs.map((s) => { const r = [...s.querySelectorAll('.lab text, .axis text')].map((t) => t.getBoundingClientRect()).filter((b) => b.width > 0); let n = 0; for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) { const a = r[i], b = r[j]; if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) n++; } return n; }));
(async () => {
  const b = await chromium.launch(), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const ctx = await b.newContext({ viewport: { width: 360, height: 760 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B + '?role=teacher'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.tabs');
  await p.click('.tabs button:has-text("차시 팩")'); await p.waitForTimeout(300); await p.click('[data-k="packup-go"]'); await p.waitForSelector('[data-k="packup"]');
  await p.setInputFiles('[data-k="packfile"]', path.join(DIR, 'example-geo.json')); await p.waitForSelector('[data-k="packsum"]'); await p.waitForTimeout(600);
  ok('① 예시 팩 = 검사 통과', /검사 통과/.test(await p.textContent('[data-k="packsum"]')));
  let all = [];
  for (const [tab, vers] of [['문제 1', [0, 1]], ['문제 2', [0, 1]], ['형성평가', [0, 1]]]) for (const v of vers) {
    await p.click(`.chips2 button:has-text("${tab}")`); await p.waitForTimeout(200); await p.click(`.chips2.vers button:has-text("버전 ${v}")`).catch(() => {}); await p.waitForTimeout(250);
    all = all.concat(await overlaps(p, '[data-k="packprev"] svg[data-k="graph"]'));
  }
  ok('① 미리 보기 그림 전부 = 이름표 · 숫자 겹침 0', all.length >= 14 && all.every((n) => n === 0), `그림 ${all.length} · ${JSON.stringify(all)}`);
  const aria = await p.$$eval('[data-k="packprev"] svg[data-k="graph"]', (xs) => xs.map((x) => x.getAttribute('aria-label')));
  ok('① 읽어 주기에 이름', aria.some((a) => /선분|다각형|점 A|영역|이동 화살표/.test(a || '')), aria[0]);
  await p.click('.sheet .btn.pmain'); await p.waitForNavigation({ timeout: 6000 }).catch(() => {}); await p.waitForSelector('.tabs');
  // ② 학생 폰
  const hall = await ctx.newPage(); await hall.setViewportSize({ width: 1000, height: 800 }); await hall.goto(B + '?role=hall&mode=test&room=GEO&lesson=ex-geo'); await hall.waitForSelector('.dock');
  const s = await ctx.newPage(); s.on('pageerror', (e) => errs.push(String(e))); await s.goto(B + '?role=student&room=GEO'); await hall.waitForTimeout(1200);
  const next = async () => { await hall.$eval('.dock .go', (x) => x.click()).catch(() => {}); await hall.waitForTimeout(400); };
  const goTo = async (re) => { for (let k = 0; k < 10; k++) { const t = await hall.$eval('.fs.now em', (x) => x.textContent).catch(() => ''); if (re.test(t)) break; await next(); } await hall.waitForFunction(() => !document.querySelector('.sc'), null, { timeout: 12000 }).catch(() => {}); await s.waitForTimeout(900); };
  for (const [re, nm] of [[/문제 1/, 'p1'], [/문제 2/, 'p2']]) {
    await goTo(re);
    for (const w of [360, 768]) {
      await s.setViewportSize({ width: w, height: w === 360 ? 760 : 1024 }); await s.waitForTimeout(300);
      const o = await overlaps(s, '.bcard svg[data-k="graph"]'), over = await s.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      ok(`② 학생 ${nm} · ${w} = 그림 ${o.length} · 겹침 0 · 가로 넘침 0`, o.length > 0 && o.every((n) => n === 0) && over <= 0, `${JSON.stringify(o)} · ${over}`);
      await s.screenshot({ path: `${SHOTS}/geo-student-${nm}-${w}.png`, fullPage: true });
    }
    await s.setViewportSize({ width: 360, height: 760 });
  }
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
