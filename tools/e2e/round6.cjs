// b5 한 판 (b4 + 답안 줄 · 채점 연출): 🧪 테스트 모드 · 종합실 1 + 학생 2 (360px) · 6차시 처음부터 형성평가까지 · 캡처 4장(문제 · 정찰 · 소레이드 · 틀렸을 때)
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
  // 누르는 칸 48px (스킬 5절 3): 보이는 단추 · 칩 · 답안 줄 칸 높이
  const taps = async (p, where) => { const small = await p.$$eval('.bcard button, .act .btn, .chip, .rune, .opt, .row .cell', (bs) => bs.filter((x) => x.offsetParent && x.getBoundingClientRect().height < 44).map((x) => `${x.className}:${Math.round(x.getBoundingClientRect().height)}`)); if (small.length) errs.push(`누름 칸 작음 ${where}: ${small.slice(0, 3).join(' ')}`); };
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
      await p.click(`.row .cell:nth-child(${i + 1})`).catch(() => {});
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
          await p.click(`.row .cell:nth-child(${i + 1})`); await p.waitForTimeout(100);
          const item = await p.$('.bcard .item'); if (!item) continue;
          if (k === 0 && i === 1) {
            for (const d of '99') await (await item.$(`.rune[aria-label="룬 ${d}"]`)).click();
            await waitMain(p); await (await mainBtn(p)).click(); await p.waitForTimeout(200);
            log('  학생1 2번 틀림:', (await p.textContent('.bad b')).trim(), '| 단추', (await p.textContent('.act .btn')).trim());
            await p.waitForTimeout(5300);
            const bc = await p.$$eval('.row .cell', (cs) => cs.map((c) => `${c.querySelector('b').textContent}${c.className.replace(/svelte-\S+/g, '').replace('cell', '').replace(/\bs-/g, '').trim()}${c.disabled ? '·잠김' : ''}:${c.querySelector('.tx').textContent}`).join(' | '));
            log('  형성평가 재도전(#116):', bc);
            if (!/1번ok·잠김/.test(bc) || !/2번oldbad\s*now:＿/.test(bc)) errs.push('형성평가 ✔ 잠김 · ✘ 빈칸 아님');
            await shot(p, 'r116-boss-retry-360.png'); await overflow(p, '형성평가 재도전');
            const t = (await p.textContent('.bcard .item')), m = /n\(U\) = (\d+), n\(([A-Z])\) = (\d+)/.exec(t);
            const it2 = await p.$('.bcard .item'); for (const d of String(Number(m[1]) - Number(m[3]))) await (await it2.$(`.rune[aria-label="룬 ${d}"]`)).click();
          } else if (k === 1 && i === 0) { await answer(item, { choice: '∪' }); await waitMain(p); await (await mainBtn(p)).click(); await p.waitForTimeout(800); log('  학생2 1번 틀림 → 그대로 두고 다음:', (await p.$eval('.row .cell:nth-child(1)', (c) => c.className.replace(/svelte-\S+/g, '').trim()))); continue; }
          else await answer(item, A.boss[i]);
          await waitMain(p); await (await mainBtn(p)).click(); await p.waitForTimeout(150);
        }
        if (k === 0) { await p.waitForSelector('.gt .r'); await p.waitForTimeout(200); log('  학생1 채점표:', await p.$$eval('.gt .r', (rs) => rs.map((r) => `${r.querySelector('.n').textContent}${r.className.replace(/svelte-\S+/g, '').replace(/\br\b/, '').replace(/\bg-/g, '').trim()} ${r.querySelector('.a').textContent}`).join(' | ')), '|', (await p.textContent('.bcard .lab')).trim()); await shot(p, 'r116-boss-table-360.png'); await overflow(p, '형성평가 채점표'); log('  학생1 도달: 6 / 6 · 종합실', (await hall.textContent('.bar span')).trim()); continue; }
        log(`  학생${k + 1} 도달:`, (await p.$$eval('.row .cell.s-ok', (bs) => bs.length)), '/ 6 · 종합실', (await hall.textContent('.bar span')).trim());
      }
      await overflow(st[0], '형성평가'); await taps(st[0], '형성평가');
      log('  보스:', (await hall.$('.ko')) ? (await hall.textContent('.ko')).trim() : '아직');
      await next(); continue;
    }
    if (id.startsWith('u')) {
      for (const [k, p] of st.entries()) {
        await p.waitForSelector('.row .cell');
        for (let s = 0; s < A[id].length; s++) {
          if (k === 0 && s === 0 && id === 'u4') {
            await answer(await p.$('.bcard .item'), { groups: [['1', '2', '4'], []] }); await waitMain(p); await (await mainBtn(p)).click(); await p.waitForTimeout(250);
            const fl = await p.$eval('.row .cell:nth-child(1)', (c) => c.className.replace(/svelte-\S+/g, '').trim()); await p.waitForTimeout(700);
            log('  학생1 졸개① 틀림:', (await p.textContent('.bad b')).trim(), '| 하트', await p.$eval('.bh', (x) => x.getAttribute('aria-label')), '| 뒤집힘', fl, '→', await p.$eval('.row .cell:nth-child(1)', (c) => `${c.className.replace(/svelte-\S+/g, '').trim()}:${c.querySelector('.tx').textContent}`), '| 고른 칩', (await p.$$('.bcard .chip.on')).length);
            if ((await p.$$('.bcard .chip.on')).length) errs.push('소레이드 ✘ 단계에 지난 선택이 남음');
            await shot(p, 'r116-soraid-retry-360.png'); await overflow(p, '소레이드 재도전');
          }
          if (k === 0 && s === 2 && id === 'u4') { await answer(await p.$('.bcard .item'), { chips: ['12'] }); await shot(p, 'b4-soraid-360.png'); await overflow(p, '소레이드'); await taps(p, '소레이드'); await answer(await p.$('.bcard .item'), { chips: ['16', '20'] }); }
          else await answer(await p.$('.bcard .item'), A[id][s]);
          await waitMain(p); await (await mainBtn(p)).click(); await p.waitForTimeout(150);
        }
        log(`  학생${k + 1}:`, (await p.textContent('.okline b')).trim(), '| 나의 풀이 줄', (await p.$$('.story li')).length);
        await overflow(p, `${id} 끝`);
      }
      if (id === 'u4') { const p = st[1]; await p.waitForTimeout(1600); await (await mainBtn(p)).click(); await p.waitForSelector('.row .cell'); log('  한 판 더: 📜 원문', !!(await p.$('details.story')), '|', (await p.textContent('.bcard .lab.acc')).trim(), '|', (await p.textContent('.bad b')).trim(), '| 칸', await p.$$eval('.row .cell', (cs) => cs.map((c) => c.querySelector('.tx').textContent).join(' '))); }
      log('  쓰러짐:', !!(await hall.$('.ko')));
      await next(); continue;
    }
    // 일반 몬스터
    if (id === 'm1') {
      const p = st[0]; await p.waitForSelector('.bcard .item');
      await answer(await p.$('.bcard .item'), A.m1[0]); await shot(p, 'b4-problem-360.png'); await overflow(p, '문제'); await taps(p, '문제');
      // 답안 줄 채우는 중 (소문제 1 · 2 채움)
      await p.click('.row .cell:nth-child(2)'); await answer(await p.$('.bcard .item'), A.m1[1]); await shot(p, 'b5-answer-row-360.png');
      log('  답안 줄:', (await p.$$eval('.row .cell', (cs) => cs.map((c) => c.textContent.trim()).join(' | '))));
      for (let i = 2; i < 4; i++) { await p.click(`.row .cell:nth-child(${i + 1})`); const it = await p.$('.bcard .item'); if (i === 2) { for (const c of await it.$$('.chip')) await c.click(); } else await answer(it, A.m1[i]); } // ③ = 칩 모두(긴 오답)
      await waitMain(p); await (await mainBtn(p)).click(); await p.waitForTimeout(380);
      await p.screenshot({ path: `${SHOTS}/b5-grading-360.png` });
      const rows = (pp) => pp.$$eval('.gt .r', (cs) => cs.map((c) => `${c.querySelector('.n').textContent}${c.className.replace(/svelte-\S+/g, '').replace(/\br\b/, '').replace(/\bg-/g, '').trim()}`).join(' | '));
      log('  채점 중(채점표):', await rows(p), '| 단추', (await p.textContent('.act .why')).trim());
      await p.waitForTimeout(1400);
      await shot(p, 'r113-table-360.png'); await overflow(p, '채점표 결과');
      log('  채점표 결과:', await rows(p), '|', (await p.textContent('.bcard .lab.acc')).trim(), '| 내 답 전체', await p.$$eval('.gt .r .a', (as) => as.map((a) => a.textContent).join(' / ')));
      await waitMain(p); // 생각 시간 뒤 「다음 틀린 문제 ▶」
      log('  단추:', (await p.textContent('.act .btn')).trim()); await (await mainBtn(p)).click(); await p.waitForSelector('.row .cell');
      await shot(p, 'r113-retry-blank-360.png'); await overflow(p, '재도전 빈칸');
      const cellInfo = await p.$$eval('.row .cell', (cs) => cs.map((c) => `${c.querySelector('b').textContent}${c.className.replace(/svelte-\S+/g, '').replace('cell', '').replace(/\bs-/g, '').trim()}${c.disabled ? '·잠김' : ''}:${c.querySelector('.tx').textContent}`).join(' | '));
      const it0 = await p.$('.bcard .item'), on0 = (await it0.$$('.chip.on')).length;
      log('  재도전:', (await p.textContent('.bad b')).trim(), '| 답안 칸', cellInfo, '| 지금', (await p.textContent('.bcard .lab.acc')).trim(), '| 선택된 칩', on0, '| 단추', (await p.textContent('.act .btn')).trim());
      if (on0) errs.push('재도전 ✘ 소문제에 지난 선택이 남음');
      if (!(await p.$('.row .cell:disabled'))) errs.push('✔ 칸이 잠기지 않음');
      await answer(it0, A.m1[2]);
      await waitMain(p); log('  고친 뒤 단추:', (await p.textContent('.act .btn')).trim()); await (await mainBtn(p)).click(); await p.waitForTimeout(200);
      log('  재채점(고친 줄만):', await rows(p));
      await p.waitForTimeout(1200);
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
