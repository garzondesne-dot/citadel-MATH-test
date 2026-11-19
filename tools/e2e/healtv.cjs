// 💚 TV 힐 모션 (📜 11/20 머리 🔨 「전투 중 종합실에서 힐 줄 때 모션이 안 나옴」): 학생 폰 healAuto 와 같은 칸 heals/{몬스터}/{주는}/{k} = 받는 uid
//   → TV 주는 쪽 'heal' · 받는 쪽 'healed' (Pixi · DOM) · 받을 친구 없음 '_' = 주는 쪽만 · 👑 형성평가에서도
//   NODE_PATH=$(npm root -g) node tools/e2e/healtv.cjs <폴더> [주소]  (🧪 테스트 모드 · 이 기기 저장만)
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  for (const dom of [false, true]) {
    const tag = dom ? 'DOM' : 'Pixi', R = 'HT' + (dom ? 'D' : 'P') + (Date.now() % 10000), t = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
    t.on('pageerror', (e) => errs.push(`${tag} ${e}`));
    await t.goto(`${B}?role=hall&mode=test&lesson=set-08&room=${R}${dom ? '&dom' : ''}`); await t.waitForSelector('.dock', { timeout: 20000 });
    await t.evaluate(() => window.__tvFake(3)); await t.waitForTimeout(800);
    const go = async () => { await t.mouse.move(640, 360); await t.waitForTimeout(120); const g = t.locator('.dock .go').first(); if (await g.isVisible().catch(() => false)) await g.click(); await t.waitForTimeout(600); };
    const kind = () => t.evaluate((r) => { const s = window.__dbGet(`rooms/${r}/state`) || {}; return s.step; }, R);
    for (let i = 0; i < 12 && !(await t.$('.arena2')); i++) await go();
    await t.waitForTimeout(6500); // 정찰 5초
    const watch = async (us, ms) => { const seen = Object.fromEntries(us.map((u) => [u, new Set()])), end = Date.now() + ms; while (Date.now() < end) { const p = await t.evaluate(() => window.__tvPoses()); for (const u of us) seen[u].add(p[u]); await t.waitForTimeout(60); } return Object.fromEntries(us.map((u) => [u, [...seen[u]]])); };
    const heal = async (label, from, to, k) => {
      await t.evaluate(([r, f, tt, kk]) => { for (const m of ['m1', 'm2', 'm3', 'm4', 'boss']) window.__dbSet(`rooms/${r}/heals/${m}/${f}/${kk}`, tt); }, [R, from, to, k]);
      const s = await watch(to === '_' ? [from] : [from, to], 1000);
      const pops = dom ? await t.$$eval('.pop.exp.heal', (x) => x.map((e) => e.textContent.trim())) : [];
      const giveOk = s[from].includes('heal'), getOk = to === '_' || s[to].includes('healed'), popOk = !dom || (pops.includes('💚 응원') && (to === '_' || pops.includes('💚 +1')));
      ok(`${tag} ${label}: 주는 쪽 ${s[from].join('/')} · 받는 쪽 ${to === '_' ? '(없음)' : s[to].join('/')}${dom ? ` · 글자 ${pops.join(',')}` : ''}`, giveOk && getOk && popOk);
      await t.waitForTimeout(1600);
    };
    await heal('몬스터 💚 힐', 'fake0', 'fake1', 0);
    await t.screenshot({ path: `${SHOTS}/healtv-${tag}-mon.png` });
    await heal('몬스터 응원(받을 친구 없음)', 'fake2', '_', 0);
    // 👑 형성평가까지
    for (let i = 0; i < 20; i++) { const st = await t.evaluate((r) => window.__dbGet(`rooms/${r}/state/step`), R); const n = await t.evaluate(() => document.querySelector('.tflow .fs.now em')?.textContent || ''); if (/형성평가/.test(n)) break; await go(); }
    await t.waitForTimeout(6500);
    await heal('👑 형성평가 💚 힐', 'fake0', 'fake1', 1);
    await t.close();
  }
  console.log(errs.length ? `❌ ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close(); process.exit(errs.length ? 1 : 0);
})();
