// 🎞 용사 모션 점검 (📜 2026-11-14 머리 🔨 「용사 공격할 때 공격 모션으로 안 나가 · 모션 전부 점검」)
//   ① 학생 폰 = 공격 갤러리(교사 「나」 → 💥 갤러리 = 같은 학생 화면) 360 × 640: 대기 · 공격(걷기 → 공격 4칸) · 틀림(맞음) · 다 맞힘(기쁨) · 힐 받음 · 힐 주기 · 몬스터 공격(맞음 → 헐떡) · ❤0 잠김(쓰러짐)
//   ② TV 1280 × 720 (Pixi · ?dom): 공격 대역 걷기 → 공격 4칸 · 맞음 · 헐떡 · 힐 받음 · 힐 주기 · 기쁨 · 쓰러짐 · 생각
//   줄이 실제로 바뀌는지 = 폰은 그림 칸 배경 위치(세로 = 줄 · 가로 = 칸) · TV Pixi 는 __tvPoses · 캡처 = 사건 × 화면
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
const ROW = { idle: 0, walk: 1, attack: 2, hit: 3, win: 4, fall: 5, heal: 6, portal: 7, sit: 8, healed: 9, think: 10, pant: 11 };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), errs = [], table = [];
  // ── ① 학생 폰 (공격 갤러리) ──
  const s = await (await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 1 })).newPage(); s.on('pageerror', (e) => errs.push(String(e)));
  await s.goto(B + '?role=atk'); await s.waitForSelector('.qwrap .bcard'); await s.waitForTimeout(600);
  const clip = async (name) => { const r = await s.$eval('.edge', (x) => { const q = x.getBoundingClientRect(); return { x: q.left, y: q.top, width: q.width, height: Math.min(q.height, 300) }; }); await s.screenshot({ path: `${SHOTS}/motion-phone-${name}.png`, clip: r }); };
  const st = () => s.$eval('.edge .hero', (h) => { const cs = getComputedStyle(h), hh = parseFloat(cs.height), ww = parseFloat(cs.width); return { pose: h.dataset.pose, row: Math.round(-parseFloat(cs.backgroundPositionY) / hh), col: Math.round(-parseFloat(cs.backgroundPositionX) / ww) }; });
  // 사건 동안 30ms 마다 줄 · 칸 모으기
  const watch = async (ms) => { const seen = []; const t0 = Date.now(); while (Date.now() - t0 < ms) { seen.push(await st()); await s.waitForTimeout(30); } return seen; };
  const poses = (xs) => [...new Set(xs.map((x) => x.pose))], cols = (xs, p) => new Set(xs.filter((x) => x.pose === p).map((x) => x.col)).size;
  const rowsOk = (xs) => xs.every((x) => x.row === ROW[x.pose]);
  const check = (ev, xs, want, cap) => { const ps = poses(xs), ok = want.every((w) => ps.includes(w)) && rowsOk(xs); table.push(`📱 ${ev}: ${ps.join(' → ')}${cap ? ` · ${cap}` : ''} ${ok ? '✅' : '❌'}`); if (!ok) errs.push(`폰 ${ev}: ${ps.join(',')} (줄 맞음 ${rowsOk(xs)})`); };
  let xs = await watch(1400); check('대기', xs, ['idle'], `칸 ${cols(xs, 'idle')}개 돌림`); if (cols(xs, 'idle') < 3) errs.push('대기 칸이 안 돎'); await clip('0-idle');
  await s.click('.tabs2 button:nth-child(2)'); await s.waitForTimeout(300);
  await s.click('.a[data-h="hit"]'); xs = await watch(1600); check('⚔ 공격(맞힘)', xs, ['walk', 'attack'], `공격 칸 ${cols(xs, 'attack')}개`); if (cols(xs, 'attack') < 3) errs.push(`공격 4칸 안 나옴 (${cols(xs, 'attack')})`);
  await s.click('.a[data-h="hit"]'); await s.waitForTimeout(330); await clip('1-attack'); await s.waitForTimeout(1500);
  await s.click('.a[data-h="miss"]'); xs = await watch(1900); check('✖ 틀림', xs, ['attack', 'hit']); await s.waitForTimeout(300);
  await s.click('.a[data-h="miss"]'); for (let k = 0; k < 60 && (await st()).pose !== 'hit'; k++) await s.waitForTimeout(30); await clip('2-miss');
  await s.waitForTimeout(800);
  await s.click('.a[data-h="healed"]'); xs = await watch(900); check('💚 힐 받음', xs, ['healed']); await clip('3-healed'); await s.waitForTimeout(1000);
  await s.click('.a[data-h="heal"]'); xs = await watch(700); check('✨ 힐 주기', xs, ['heal']); await clip('4-heal'); await s.waitForTimeout(1000);
  await s.click('.a[data-h="clear"]'); xs = await watch(2600); check('😊 다 맞힘(처치)', xs, ['win']); await s.waitForTimeout(200);
  // 몬스터 공격 = 💥 탭 · 멈춤
  await s.click('.tabs2 button:nth-child(1)'); await s.waitForTimeout(300);
  await s.click('.ids .a[data-id="pause"]'); xs = await watch(1200); check('💥 공격 받음', xs, ['hit', 'pant']); await clip('5-pant'); await s.waitForTimeout(2600);
  // ❤0 잠김 = 새 방(졸개 끔 상태 그대로) · 틀린 답 4번
  await s.goto(B + '?role=atk'); await s.waitForSelector('.qwrap .bcard'); await s.waitForTimeout(500);
  await s.click('.tabs2 button:nth-child(2)'); await s.waitForTimeout(200); await s.click('.a[data-h="lockme"]'); xs = await watch(2600); check('😞 ❤0 잠김', xs, ['fall']); await clip('6-fall');
  const last = xs[xs.length - 1]; if (!last || last.pose !== 'fall' || last.col !== 1) errs.push(`쓰러짐 = 마지막 칸에서 멈춤 (${JSON.stringify(last)})`);
  await s.close();

  // ── ② TV (Pixi · DOM) ──
  for (const dom of [false, true]) {
    const W = 1280, H = 720, hall = await (await b.newContext({ viewport: { width: W, height: H } })).newPage(); hall.on('pageerror', (e) => errs.push(String(e)));
    await hall.goto(B + `?role=hall&mode=test&room=MO${dom ? 'D' : 'P'}${dom ? '&dom' : ''}`); await hall.waitForSelector('.dock');
    await hall.evaluate(() => window.__tvFake(1)); await hall.waitForTimeout(700);
    const next = async () => { await hall.mouse.move(W / 2, H / 2); await hall.click('.dock .go'); await hall.waitForTimeout(500); };
    await next(); await next(); for (let g = 0; g < 8 && !(await hall.$('.arena2')); g++) await next();
    await hall.waitForFunction(() => !document.querySelector('.sc'), null, { timeout: 12000 }).catch(() => {});
    await hall.evaluate(() => window.__tvFake(6)); await hall.waitForTimeout(2600);
    const tag = dom ? '📺 DOM' : '📺 Pixi', u0 = await hall.evaluate(() => Object.keys(window.__tvPoses())[0]);
    // ⚔ 공격 = 대역(DOM 층 · .tvh .art) 또는 DOM 장면 그림 칸
    // 화면 안에서 매 프레임(rAF) 재기 · 2초
    const samp = hall.evaluate(() => new Promise((ok) => { const out = [], t0 = performance.now(); const f = () => { const el = document.querySelector('.tvh .art') || [...document.querySelectorAll('.hr .hs > i')].find((i) => i.dataset.pose && i.dataset.pose !== 'idle'); if (el) { const cs = getComputedStyle(el); out.push({ pose: el.dataset.pose, x: cs.backgroundPositionX, t: Math.round(performance.now() - t0) }); } if (performance.now() - t0 < 2000) requestAnimationFrame(f); else ok(out); }; requestAnimationFrame(f); }));
    await hall.evaluate(() => window.__tvAtk(0, 'hit', 2, 'slash', false, true)); await hall.waitForTimeout(420); await hall.screenshot({ path: `${SHOTS}/motion-tv-${dom ? 'dom' : 'pixi'}-1-attack.png` });
    const seen = await samp; const at = seen.filter((x) => x.pose === 'attack'); console.log(`${dom ? 'DOM' : 'Pixi'} 공격 줄 ${at.length ? at[at.length - 1].t - at[0].t : 0}ms · 표본 ${seen.length}`);
    const aps = [...new Set(seen.map((x) => x.pose))], acol = new Set(seen.filter((x) => x.pose === 'attack').map((x) => x.x)).size;
    const aok = aps.includes('walk') && aps.includes('attack') && acol >= 3; table.push(`${tag} ⚔ 공격: ${aps.join(' → ')} · 공격 칸 ${acol}개 ${aok ? '✅' : '❌'}`); if (!aok) errs.push(`${tag} 공격 줄 (${aps} · ${acol})`);
    await hall.waitForTimeout(1500);
    for (const [ev, p, ms] of [['💥 공격 받음', 'hit', 400], ['🫨 헐떡', 'pant', 1500], ['💚 힐 받음', 'healed', 1600], ['✨ 힐 주기', 'heal', 1400], ['😊 기쁨', 'win', 1400], ['😞 쓰러짐', 'fall', 1500], ['🤔 생각', 'think', 1500]]) {
      let now = '';
      for (let t = 0; t < 3; t++) { // 진짜 몬스터 공격(맞음 · 헐떡)이 겹치면 끝난 뒤 다시
        await hall.evaluate(([u, p2, m]) => window.__tvPose(u, p2, m), [u0, p, ms]); await hall.waitForTimeout(250);
        now = await hall.evaluate((u) => window.__tvPoses()[u], u0); if (now === p || !['hit', 'pant'].includes(now)) break; await hall.waitForTimeout(4200);
      }
      let col = 'pixi'; if (dom) col = await hall.evaluate((u) => { const el = document.querySelector(`.hr[data-u="${CSS.escape(u)}"] .hs > i`); return el ? `${el.dataset.pose}` : ''; }, u0);
      const ok = now === p && (!dom || col === p); table.push(`${tag} ${ev}: ${now}${dom ? ` (그림 ${col})` : ''} ${ok ? '✅' : '❌'}`); if (!ok) errs.push(`${tag} ${ev}: ${now} ${col}`);
      if (p === 'pant' || p === 'healed' || p === 'fall') await hall.screenshot({ path: `${SHOTS}/motion-tv-${dom ? 'dom' : 'pixi'}-${p}.png` });
      await hall.waitForTimeout(ms);
    }
    await hall.close();
  }
  console.log(table.join('\n'));
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
