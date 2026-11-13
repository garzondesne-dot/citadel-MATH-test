// #152 💥 몬스터 공격 6종 + ▢ 도전 칸 (이 기기 · 종합실 테스트 모드 + 학생 1 · 360 × 640)
//   공격마다: 장면 띠 꼬리표 · 효과 · 문제 카드 · 주요 단추 rect 그대로 · 고른 답 그대로 · 끝나면 원래대로 · 손풀기(얼음 4번 · 화염 꾹 · 안개 문지르기)로 일찍 풀림
//   파지직: 효과 중 문제 글자가 잠깐 바뀌었다가 원래 글자로 돌아옴 · 도전 칸: 낸 차례마다 ✔ · 노랑 · −
// 사용: npm run build → npx vite preview --port 4173 → NODE_PATH=$(npm root -g) node tools/e2e/attack.cjs <그림 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
const B = 'http://localhost:4173/';
const log = (...a) => console.log(...a);
const KINDS = ['pause', 'glitch', 'fog', 'ice', 'fire', 'smash'];
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 } });
  const hall = await ctx.newPage(); hall.on('pageerror', (e) => errs.push(String(e)));
  await hall.setViewportSize({ width: 1000, height: 800 }); await hall.goto(B + '?role=hall&mode=test&room=AT1'); await hall.waitForSelector('.dock');
  const s = await ctx.newPage(); s.on('pageerror', (e) => errs.push(String(e)));
  await s.goto(B + '?role=student&room=AT1'); await s.waitForSelector('.body'); await hall.waitForTimeout(800);
  const next = async () => { await hall.mouse.move(500, 400); await hall.click('.dock .go'); await hall.waitForTimeout(500); };
  await next(); await next();
  for (let g = 0; g < 8; g++) { if (/정찰/.test(await s.textContent('.body'))) break; await next(); }
  await s.waitForFunction(() => !/정찰/.test(document.querySelector('.body').textContent), null, { timeout: 15000 }); await s.waitForTimeout(400);
  const chip = await s.$('.qwrap .bcard .chip'); if (chip) await chip.click();
  const R = () => s.evaluate(() => { const r = (q) => { const x = document.querySelector(q); if (!x) return null; const b = x.getBoundingClientRect(); return `${Math.round(b.top)}/${Math.round(b.height)}`; }; return { card: (() => { const x = document.querySelector('.qwrap .bcard'); return x ? `${x.offsetTop}/${x.offsetHeight}` : null; })(), main: r('.pmain'), sel: document.querySelectorAll('.qwrap .on, .qwrap [aria-pressed="true"]').length, q: [...document.querySelectorAll('.qwrap .bcard p, .qwrap .bcard .qt')].map((x) => x.textContent).join('|') }; });
  const rows = [];
  for (const k of KINDS) {
    const before = await R();
    await s.evaluate((k) => window.__strike(2400, k), k); await s.waitForTimeout(k === 'glitch' ? 60 : 160);
    const mid = await R();
    const tag = await s.$eval('.edge .hitTag', (x) => x.textContent.trim()).catch(() => '');
    const fxOn = await s.evaluate((k) => (k === 'ice' ? !!document.querySelector('.pmain.ice') : k === 'fire' ? !!document.querySelector('.pmain.fire') && !!document.querySelector('.afx.fire') : !!document.querySelector(`.afx.${k}`)), k);
    await s.screenshot({ path: `${SHOTS}/b41-attack-${k}.png` });
    let early = '';
    if (k === 'ice') { for (let i = 0; i < 4; i++) await s.click('.pmain.ice'); await s.waitForTimeout(150); early = (await s.$('.pmain.ice')) ? '안 풀림' : '톡톡 4번 → 풀림'; }
    if (k === 'fire') { const bx = await (await s.$('.pmain.fire')).boundingBox(); await s.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await s.mouse.down(); await s.waitForTimeout(1150); await s.mouse.up(); await s.waitForTimeout(150); early = (await s.$('.pmain.fire')) ? '안 꺼짐' : '꾹 1초 → 꺼짐'; }
    if (k === 'fog') { const c = await (await s.$('.afx.fog canvas')).boundingBox(); await s.mouse.move(c.x + 10, c.y + 10); await s.mouse.down(); for (let y = 10; y < c.height; y += 30) for (let x = 10; x < c.width; x += 40) await s.mouse.move(c.x + x, c.y + y); await s.mouse.up(); await s.waitForTimeout(150); early = (await s.$('.afx.fog')) ? '덜 닦임' : '문지름 → 걷힘'; }
    await s.waitForTimeout(2500); const after = await R();
    // 그 사이 진짜 공격(20 ~ 45초마다)이 올 수 있어 이 종류만 봄
    const gone = await s.evaluate((k) => !document.querySelector(k === 'ice' ? '.pmain.ice' : k === 'fire' ? '.pmain.fire' : `.afx.${k}`), k);
    const moved = before.card !== mid.card || before.main !== mid.main || before.card !== after.card || before.main !== after.main;
    const qBack = before.q === after.q, glitched = k === 'glitch' ? mid.q !== before.q : null;
    rows.push(`${k.padEnd(6)} 꼬리표 「${tag}」 · 효과 ${fxOn ? '○' : '✗'} · 움직임 ${moved ? '✗' : '0'} · 고른 답 ${before.sel === after.sel ? '그대로' : '✗'} · 글 ${qBack ? '원래대로' : '✗'}${glitched != null ? ` · 효과 중 글 바뀜 ${glitched ? '○' : '✗'}` : ''}${early ? ` · ${early}` : ''} · 끝 ${gone ? '○' : '✗'}`);
    if (!tag || !fxOn || moved || before.sel !== after.sel || !qBack || glitched === false || !gone || /안 |덜/.test(early)) errs.push(`공격 ${k}`);
  }
  log('💥 공격 6종:'); rows.forEach((r) => log('  ' + r));
  // ▢ 도전 칸: 틀린 답으로 한 번 공격 → 첫 칸 = − 또는 노랑
  await s.waitForFunction(() => !document.querySelector('.afx'), null, { timeout: 8000 }).catch(() => {});
  log('▢ 도전 칸 (내기 전):', await s.$$eval('.sl i', (xs) => xs.map((x) => x.className.replace(/svelte-\S+/g, '').trim()).join(' ')));
  const cells = await s.$$('.qwrap .row .cell');
  for (let i = 0; i < cells.length; i++) { await s.click(`.qwrap .row .cell:nth-child(${i + 1})`).catch(() => {}); await s.waitForTimeout(80); if (!(await s.$('.qwrap .bcard .chip.on'))) { const c = await s.$('.qwrap .bcard .chip'); if (c) await c.click(); } }
  await s.waitForTimeout(200); log('   주요 단추:', (await s.$eval('.pmain', (x) => x.outerHTML.replace(/ class="[^"]*svelte[^"]*"/g, '').slice(0, 300))), '| 칸 안 고름 표시', await s.$$eval('.qwrap .bcard .chip', (xs) => xs.slice(0, 3).map((x) => x.className.replace(/svelte-\S+/g, '').trim()).join(',')));
  const pm = await s.$('.pmain:not([disabled])'); if (pm) { await pm.click(); await s.waitForTimeout(1600); }
  // 채점표 → 「다음 틀린 문제 ▶」 → 틀린 칸을 다시 채우면 「다시 공격」 단추에 도전 칸이 다시 보임
  for (let g = 0; g < 3 && !(await s.$('.pmain .sl, .pmain .hs')); g++) { const b2 = await s.$('.pmain:not([disabled])'); if (b2) await b2.click(); await s.waitForTimeout(300); for (let i = 0; i < cells.length; i++) { await s.click(`.qwrap .row .cell:nth-child(${i + 1})`).catch(() => {}); await s.waitForTimeout(60); if (!(await s.$('.qwrap .bcard .chip.on'))) { const c = await s.$('.qwrap .bcard .chip'); if (c) await c.click(); } } }
  // ❤ v4 (📜 2026-11-13 밤): 「도전 칸」 → ❤ 4 · 한 번 틀리면 ❤ 하나 빔(빈 하트 = 테두리)
  const sl = await s.$$eval('.pmain .hs svg', (xs) => xs.map((x) => x.getAttribute('class')).join(' '));
  log('❤ 하트 (한 번 낸 뒤):', sl); if ((sl.match(/full/g) || []).length !== 3 || (sl.match(/empty/g) || []).length !== 1) errs.push('하트 3 + 빈 1 아님');
  await s.screenshot({ path: `${SHOTS}/b41-slots.png` });
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0');
  await b.close();
})();
