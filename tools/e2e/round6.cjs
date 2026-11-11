// b4 한 판: 🧪 테스트 모드 · 종합실 1 + 학생 2 (360px) · 6차시 처음부터 형성평가까지 · 캡처 4장(문제 · 정찰 · 소레이드 · 틀렸을 때)
// 사용: npm run build → npx vite preview --port 4173 → node tools/e2e/round6.cjs <그림 저장 폴더> (playwright 필요)
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
const base = 'http://localhost:4173/';
const A = {
  m1: [{ chips: ['5', '6'] }, { chips: ['5', '6'] }, { chips: ['1', '2', '4', '5', '6'] }, { chips: ['1', '2', '4', '5', '6'] }],
  m2: [{ rune: '18' }, { rune: '7' }, { rune: '8' }],
  m3: [{ rune: '25' }, { rune: '15' }],
  u4: [{ groups: [['1', '2', '4', '8'], ['4', '8', '12', '16', '20']] }, { choice: 'X ⊂ B 이고 X 와 A 는 서로소' }, { chips: ['12', '16', '20'] }, { rune: '8' }],
  u5: [{ choice: 'B ⊂ A' }, { chips: ['x = 4', 'x = x² + 2x'] }, { chips: ['−1', '0'] }, { chips: ['−1', '0', '4'] }],
  u6: [{ choice: 'B ⊂ A' }, { rune: '21' }, { choice: 'A ∪ B = U (곧 n(A ∪ B) = 40)' }, { rune: '9' }],
  u7: [{ rune: '99' }, { choice: '(A ∩ B)ᶜ' }, { rune: '28' }, { choice: '35' }, { rune: '96' }],
  boss: [{ choice: '∩' }, { rune: '13' }, { rune: '11' }, { chips: ['9'] }, { chips: ['∅', '{3}', '{5}', '{3, 5}'] }, { rune: '20' }],
};
const log = (...a) => console.log(...a);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 760 }, deviceScaleFactor: 2 });
  const errs = [];
  const open = async (url) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); await p.goto(base + url); return p; };
  const hall = await open('?role=hall&mode=test&room=B4');
  await hall.setViewportSize({ width: 1000, height: 900 });
  await hall.waitForSelector('.next');
  const st = [await open('?role=student&room=B4'), await open('?role=student&room=B4')];
  await hall.waitForTimeout(1200);
  const shot = async (p, name) => { await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(150); await p.screenshot({ path: `${SHOTS}/${name}` }); };
  const overflow = async (p, where) => { const o = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (o > 0) errs.push(`가로 넘침 ${o}px · ${where}`); };
  // 누르는 칸 48px (스킬 5절 3): 보이는 단추 · 칩 높이 · 단계 점(.dots)은 보이는 28 + 투명 여백(::before)으로 48 — 1-1절 히트박스
  const taps = async (p, where) => { const small = await p.$$eval('.bcard button, .act .btn, .chip, .rune, .opt', (bs) => bs.filter((x) => x.offsetParent && !x.closest('.dots') && x.getBoundingClientRect().height < 44).map((x) => `${x.className}:${Math.round(x.getBoundingClientRect().height)}`)); if (small.length) errs.push(`누름 칸 작음 ${where}: ${small.slice(0, 3).join(' ')}`); };
  const next = async () => { await hall.click('.next'); await hall.waitForTimeout(250); };
  const appear = async () => { const b2 = await hall.$('.scout button'); if (b2) await b2.click(); await hall.waitForTimeout(250); };
  const mainBtn = (p) => p.$('.act .btn');
  const waitMain = (p) => p.waitForFunction(() => { const g = document.querySelector('.act .btn'); return g && !g.disabled; }, null, { timeout: 9000 });
  async function answer(item, a) {
    if (a.rune) for (const d of a.rune) await (await item.$(`.rune[aria-label="룬 ${d}"]`)).click();
    if (a.chips) for (const c of await item.$$('.chip')) if (a.chips.includes((await c.textContent()).trim())) await c.click();
    if (a.choice) for (const c of await item.$$('.opt')) if ((await c.textContent()).trim() === a.choice) await c.click();
    if (a.groups) { const gs = await item.$$('.grp'); for (let g = 0; g < gs.length; g++) for (const c of await gs[g].$$('.chip')) if (a.groups[g].includes((await c.textContent()).trim())) await c.click(); }
  }
  // 일반 몬스터: 소문제 하나씩 (다음 소문제 ▶ → 마지막에 공격)
  async function solveMonster(p, ans, wrongAt = -1) {
    for (let i = 0; i < ans.length; i++) {
      await p.click(`.dots button:nth-child(${i + 1})`).catch(() => {});
      const item = await p.$('.bcard .item');
      if (i === wrongAt) { const c = await item.$('.chip'); await c.click(); } else await answer(item, ans[i]);
    }
    await waitMain(p); await (await mainBtn(p)).click(); await p.waitForTimeout(250);
  }
  let mi = 0;
  await next();
  for (let guard = 0; guard < 20; guard++) {
    const title = (await hall.textContent('h1')).trim();
    if (/승리|수업 끝/.test(title)) break;
    if (/개념/.test(title)) { await next(); continue; }
    const id = title.startsWith('👑') ? 'boss' : ['m1', 'm2', 'm3', 'u4', 'u5', 'u6', 'u7'][mi++];
    log(`— ${title} (${id})`);
    if (id === 'm1') { // 정찰 카드 · 준비 완료
      await st[0].waitForSelector('.bcard'); await shot(st[0], 'b4-scout-360.png'); await overflow(st[0], '정찰'); await taps(st[0], '정찰');
      await (await mainBtn(st[0])).click(); await hall.waitForTimeout(300);
      log('  정찰:', (await st[0].textContent('.bcard .lab')).trim(), '· 준비 완료 뒤 단추', (await st[0].textContent('.act .btn')).trim());
    }
    await appear();
    if (id === 'boss') {
      for (const [k, p] of st.entries()) {
        for (let i = 0; i < 6; i++) {
          if (await hall.$('.ko')) break;
          await p.click(`.dots button:nth-child(${i + 1})`); await p.waitForTimeout(100);
          const item = await p.$('.bcard .item'); if (!item) continue;
          if (k === 0 && i === 1) {
            for (const d of '99') await (await item.$(`.rune[aria-label="룬 ${d}"]`)).click();
            await waitMain(p); await (await mainBtn(p)).click(); await p.waitForTimeout(200);
            log('  학생1 2번 틀림:', (await p.textContent('.bad b')).trim(), '| 단추', (await p.textContent('.act .btn')).trim());
            await p.waitForTimeout(5300);
            const t = (await p.textContent('.bcard .item')), m = /n\(U\) = (\d+), n\(([A-Z])\) = (\d+)/.exec(t);
            const it2 = await p.$('.bcard .item'); for (const d of String(Number(m[1]) - Number(m[3]))) await (await it2.$(`.rune[aria-label="룬 ${d}"]`)).click();
          } else await answer(item, A.boss[i]);
          await waitMain(p); await (await mainBtn(p)).click(); await p.waitForTimeout(150);
        }
        log(`  학생${k + 1} 도달:`, (await p.$$eval('.dots button', (bs) => bs.filter((x) => x.textContent.trim() === '✓').length)), '/ 6 · 종합실', (await hall.textContent('.bar span')).trim());
      }
      await overflow(st[0], '형성평가'); await taps(st[0], '형성평가');
      log('  보스:', (await hall.$('.ko')) ? (await hall.textContent('.ko')).trim() : '아직');
      await next(); continue;
    }
    if (id.startsWith('u')) {
      for (const [k, p] of st.entries()) {
        await p.waitForSelector('.steps');
        for (let s = 0; s < A[id].length; s++) {
          if (k === 0 && s === 0 && id === 'u4') {
            await answer(await p.$('.bcard .item'), { groups: [['1', '2', '4'], []] }); await waitMain(p); await (await mainBtn(p)).click(); await p.waitForTimeout(250);
            log('  학생1 졸개① 틀림:', (await p.textContent('.bad b')).trim(), '| 하트', await p.$eval('.bh', (x) => x.getAttribute('aria-label')));
          }
          if (k === 0 && s === 2 && id === 'u4') { await answer(await p.$('.bcard .item'), { chips: ['12'] }); await shot(p, 'b4-soraid-360.png'); await overflow(p, '소레이드'); await taps(p, '소레이드'); await answer(await p.$('.bcard .item'), { chips: ['16', '20'] }); }
          else await answer(await p.$('.bcard .item'), A[id][s]);
          await waitMain(p); await (await mainBtn(p)).click(); await p.waitForTimeout(150);
        }
        log(`  학생${k + 1}:`, (await p.textContent('.okline b')).trim(), '| 나의 풀이 줄', (await p.$$('.story li')).length);
        await overflow(p, `${id} 끝`);
      }
      if (id === 'u4') { const p = st[1]; await p.waitForTimeout(1600); await (await mainBtn(p)).click(); await p.waitForSelector('.steps'); log('  한 판 더: 📜 원문', !!(await p.$('details.story')), '|', (await p.textContent('.bcard .lab.acc')).trim()); }
      log('  쓰러짐:', !!(await hall.$('.ko')));
      await next(); continue;
    }
    // 일반 몬스터
    if (id === 'm1') {
      const p = st[0]; await p.waitForSelector('.bcard .item');
      await answer(await p.$('.bcard .item'), A.m1[0]); await shot(p, 'b4-problem-360.png'); await overflow(p, '문제'); await taps(p, '문제');
      await solveMonster(p, [{}, ...A.m1.slice(1)], 2); // 소문제 1 은 위에서 · 소문제 3 틀림
      await shot(p, 'b4-wrong-360.png'); await overflow(p, '틀렸을 때');
      log('  학생1 틀림:', (await p.textContent('.bad b')).trim(), '| 지난 답 칸', (await p.textContent('.ans small')).trim(), '| 단추', (await p.textContent('.act .btn')).trim());
      await waitMain(p); // 생각 시간 뒤
      await p.click('.dots button:nth-child(3)'); const it = await p.$('.bcard .item'); for (const c of await it.$$('.chip.on')) await c.click(); await answer(it, A.m1[2]);
      await waitMain(p); await (await mainBtn(p)).click(); await p.waitForTimeout(250);
      log('  학생1 다시:', (await p.textContent('.okline b')).trim());
      await solveMonster(st[1], A.m1);
    } else if (id === 'm2') { // 다시 그려도 입력 · 스크롤 그대로
      const p = st[0]; await p.waitForSelector('.bcard .item');
      await (await (await p.$('.bcard .item')).$('.rune[aria-label="룬 1"]')).click();
      await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); const y0 = await p.evaluate(() => window.scrollY);
      await solveMonster(st[1], A.m2); await p.waitForTimeout(1500);
      const kept = (await p.textContent('.bcard .rune-slot')).trim(), y1 = await p.evaluate(() => window.scrollY);
      log('  다시 그림 뒤: 입력', kept === '1' ? '그대로(1)' : `날아감(${kept})`, '| 스크롤', y0 === y1 ? `그대로(${y1})` : `${y0} → ${y1}`);
      if (kept !== '1' || y0 !== y1) errs.push('다시 그릴 때 입력 · 스크롤이 바뀜');
      await (await (await p.$('.bcard .item')).$('.rune[aria-label="룬 8"]')).click();
      await solveMonster(p, [{}, A.m2[1], A.m2[2]]);
    } else { for (const p of st) await solveMonster(p, A[id]); }
    for (const [k, p] of st.entries()) log(`  학생${k + 1}:`, (await p.textContent('.okline b').catch(() => '?')).trim());
    log('  쓰러짐:', !!(await hall.$('.ko')));
    await next();
  }
  await hall.waitForTimeout(400);
  log('끝 종합실:', (await hall.textContent('h1')).trim(), '| 학생1:', (await st[0].textContent('.big')).trim(), '| 학생2:', (await st[1].textContent('.big')).trim());
  await overflow(st[0], '결과');
  log('오류', errs);
  await b.close();
})();
