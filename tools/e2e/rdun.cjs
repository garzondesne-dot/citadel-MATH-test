// 🎲 랜덤 던전 (머리 🎨 2026-11-14): ① 폰 공격 갤러리 d01~d09 = 5칸 시트 · 숨쉬기 · 몸 룬 · 몬스터 공격 = 공격 칸
//   ② 교실 TV 1920 × 1080 (Pixi): 방 meta.rdun = d01 → 정찰 · 문제 풀이(숨쉬기 · 룬 · 공격 · 맞음) · ⚔ 소레이드 대장 · 👑 보스 한 판 · 이끼 미믹(원래 그림)과 나란히
//   ③ 확대 품질 비교: 원본 그대로(nearest) ↔ 도트 전용 2배 구운 것(?rdx2 · Scale2x + 부드러운 축소) · 몬스터 · 보스 부분 확대 캡처
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  // ① 폰
  const s = await (await b.newContext({ viewport: { width: 360, height: 640 } })).newPage(); s.on('pageerror', (e) => errs.push(String(e)));
  for (const d of ['d01', 'd02', 'd03', 'd04', 'd05', 'd06', 'd07', 'd08', 'd09', 'd10', 'd11', 'd12']) {
    await s.goto(B + '?role=atk&rdun=' + d); await s.waitForSelector('.qwrap .bcard'); await s.waitForTimeout(600);
    const st = () => s.$eval('.edge .mon', (m) => ({ pose: m.dataset.pose, breath: m.classList.contains('breath'), rune: m.querySelector('.rune')?.textContent || '', src: getComputedStyle(m).backgroundImage }));
    const a = await st(); await s.click('.ids .a[data-id="pause"]'); await s.waitForTimeout(150); const c = await st();
    ok(`📱 ${d} 숨쉬기 · 룬 · 공격 칸`, a.breath && !!a.rune && /rdun/.test(a.src) && c.pose === 'attack', `룬 ${a.rune}`);
    const r = await s.$eval('.edge', (x) => { const q = x.getBoundingClientRect(); return { x: q.left, y: q.top, width: q.width, height: Math.min(q.height, 280) }; }); await s.screenshot({ path: `${SHOTS}/rdun-phone-${d}.png`, clip: r });
  }
  await s.close();
  // ② · ③ TV
  for (const [tag, q] of [['native', ''], ['x2', '&rdx2']]) {
    for (const rd of ['d01', 'd03', 'd08', 'd11', '']) { // 보스 = 한 장 안(d01) · 묶음 g1(d03) · g2(d08 · 별 표지) · g3(d11)
      if (!rd && tag === 'x2') continue;
      const W = 1920, H = 1080, room = `RD${tag === 'x2' ? 'X' : 'N'}${rd || 'M'}`, hall = await (await b.newContext({ viewport: { width: W, height: H } })).newPage(); hall.on('pageerror', (e) => errs.push(String(e)));
      await hall.goto(B + `?role=hall&mode=test&room=${room}${q}${rd ? `&rdun=${rd}` : ''}`); // 🎲 시험 TV = 방을 열 때 던전을 적음 await hall.waitForSelector('.dock');
      await hall.evaluate(() => window.__tvFake(5)); await hall.waitForTimeout(700);
      const go = async () => { await hall.mouse.move(W / 2, H / 2); await hall.waitForTimeout(150); const g = await hall.$('.dock .go'); if (!g) return false; await g.click().catch(() => {}); await hall.waitForTimeout(600); return true; };
      await go();
      await go(); for (let g = 0; g < 6 && !(await hall.$('.arena2')); g++) await go();
      await hall.waitForTimeout(600);
      const name = `${rd || 'mimic'}-${tag}`;
      if (rd && tag === 'native') { await hall.screenshot({ path: `${SHOTS}/rdun-tv-${name}-scout.png` }); }
      await hall.waitForFunction(() => !document.querySelector('.sc'), null, { timeout: 12000 }).catch(() => {}); await hall.waitForTimeout(800);
      const nm = await hall.evaluate(() => window.__arena?.hpName ?? '');
      if (rd) ok(`📺 ${name} 몬스터 이름`, !/^문제/.test(nm), nm);
      // 숨쉬기 · 공격 · 맞음
      const seen = new Set(); for (let k = 0; k < 10; k++) { seen.add(await hall.evaluate(() => window.__tvMonNow?.() ?? '')); await hall.waitForTimeout(150); }
      await hall.evaluate(() => window.__tvMon('attack', 800)); for (let k = 0; k < 8; k++) { seen.add(await hall.evaluate(() => window.__tvMonNow?.() ?? '')); await hall.waitForTimeout(50); }
      await hall.waitForTimeout(900); await hall.evaluate(() => window.__tvAtk(0, 'hit', 2, 'slash', false, true)); for (let k = 0; k < 30; k++) { seen.add(await hall.evaluate(() => window.__tvMonNow?.() ?? '')); await hall.waitForTimeout(40); }
      if (rd) ok(`📺 ${name} 칸 (숨쉬기 · 공격 · 맞음)`, ['idle', 'idleB', 'attack', 'hit'].every((p) => seen.has(p)), [...seen].join(' '));
      await hall.waitForTimeout(1600); await hall.screenshot({ path: `${SHOTS}/rdun-tv-${name}-mon.png` });
      // 소레이드 대장 (d01 native 만) · 보스 = 「앞으로」 를 눌러 그 단계까지
      const stepTo = async (lab) => { for (let g = 0; g < 14; g++) { // 6차시 문제 4~7 = 「다음 판」 칸(흐름 막대에 없음) → 소레이드 대장은 폰 갤러리 ⚔ 졸개에서 확인
        const now = await hall.$eval('.tflow .fs.now em', (x) => x.textContent).catch(() => ''); if (now.includes(lab)) break; if (!(await go())) break; } await hall.waitForFunction(() => !document.querySelector('.sc'), null, { timeout: 12000 }).catch(() => {}); await hall.waitForTimeout(1500); };
      await stepTo('형성평가');
      await hall.screenshot({ path: `${SHOTS}/rdun-tv-${name}-boss.png` });
      if (rd) ok(`📺 ${name} 보스 이름`, true, await hall.evaluate(() => window.__arena?.hpName ?? ''));
      await hall.close();
    }
  }
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
