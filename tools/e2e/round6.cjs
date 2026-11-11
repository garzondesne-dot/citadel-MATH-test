// b3 한 판: 🧪 테스트 모드 · 종합실 1 + 학생 2 (360px) · 6차시 처음부터 형성평가까지
// 사용: npm run build → npx vite preview --port 4173 → node tools/e2e/round6.cjs <그림 저장 폴더> (playwright 필요)
const { chromium } = require('playwright');
const SHOTS = process.argv[2];
const base = 'http://localhost:4173/';
const A = {
  m1: [{ chips: ['5', '6'] }, { chips: ['5', '6'] }, { chips: ['1', '2', '4', '5', '6'] }, { chips: ['1', '2', '4', '5', '6'] }],
  m2: [{ rune: '18' }, { rune: '7' }, { rune: '8' }],
  m3: [{ rune: '25' }, { rune: '15' }],
  u4: [{ groups: [['1', '2', '4', '8'], ['4', '8', '12', '16', '20']] }, { choice: 'X ⊂ B 이고 X 와 A 는 서로소' }, { chips: ['12', '16', '20'] }, { rune: '8' }],
  u5: [{ choice: 'B ⊂ A' }, { chips: ['x = 4', 'x = x² + 2x'] }, { chips: ['−1', '0'] }, { chips: ['−1', '0', '4'] }],
  u6: [{ choice: 'B ⊂ A' }, { rune: '21' }, { choice: 'A ∪ B = U (곧 n(A ∪ B) = 40)' }, { rune: '9' }],
  u7: [{ rune: '99' }, { choice: '(A ∩ B)ᶜ' }, { rune: '28' }, { choice: '35' }, { rune: '96' }],
  boss: [{ choice: '∩' }, { rune: '13' }, { rune: '11' }, { chips: ['9'] }, { subsetsChips: ['∅', '{3}', '{5}', '{3, 5}'] }, { rune: '20' }],
};
const log = (...a) => console.log(...a);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2 });
  const errs = [];
  const open = async (url) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); await p.goto(base + url); return p; };
  const hall = await open('?role=hall&mode=test&room=B3');
  await hall.setViewportSize({ width: 1000, height: 900 });
  await hall.waitForSelector('.next');
  const st = [await open('?role=student&room=B3'), await open('?role=student&room=B3')];
  await hall.waitForTimeout(1200);
  const overflow = async (p, where) => { const o = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (o > 0) errs.push(`가로 넘침 ${o}px · ${where}`); return o; };
  const next = async () => { await hall.click('.next'); await hall.waitForTimeout(250); };
  const appear = async () => { const b2 = await hall.$('.scout button'); if (b2) await b2.click(); await hall.waitForTimeout(200); };
  // 문항 하나 답하기 (item = .item 요소)
  async function answer(p, item, a) {
    if (a.rune) for (const d of a.rune) await (await item.$(`.rune[aria-label="룬 ${d}"]`)).click();
    if (a.chips) for (const c of await item.$$('.chip')) if (a.chips.includes((await c.textContent()).trim())) await c.click();
    if (a.choice) for (const c of await item.$$('.opt')) if ((await c.textContent()).trim() === a.choice) await c.click();
    if (a.groups) { const gs = await item.$$('.grp'); for (let g = 0; g < gs.length; g++) for (const c of await gs[g].$$('.chip')) if (a.groups[g].includes((await c.textContent()).trim())) await c.click(); }
    if (a.subsetsChips) for (const c of await item.$$('.chip')) if (a.subsetsChips.includes((await c.textContent()).trim())) await c.click();
  }
  const waitGo = (p) => p.waitForFunction(() => { const g = document.querySelector('.dock .go'); return g && !g.disabled; }, null, { timeout: 8000 }).catch(async (e) => { await p.screenshot({ path: (SHOTS || '.') + '/fail.png', fullPage: true }); console.log('DBG', await p.evaluate(() => [document.querySelector('.dock')?.textContent, document.querySelector('.paper .qt')?.textContent, document.querySelector('.rune-slot')?.textContent, document.querySelector('.rune')?.disabled].join(' | '))); throw e; });
  let mi = 0;
  await next();
  for (let guard = 0; guard < 20; guard++) {
    const title = (await hall.textContent('h1')).trim();
    if (/승리|수업 끝/.test(title)) break;
    if (/개념/.test(title)) { await next(); continue; }
    await appear();
    const id = title.startsWith('👑') ? 'boss' : ['m1', 'm2', 'm3', 'u4', 'u5', 'u6', 'u7'][mi++];
    log(`— ${title} (${id})`);
    if (id === 'boss') {
      for (const [k, p] of st.entries()) {
        for (let i = 0; i < 6; i++) {
          if (await hall.$('.ko')) break;
          await p.click(`.tab:nth-child(${i + 1})`);
          const item = await p.$('.paper .item'); if (!item) continue;
          if (k === 0 && i === 1) { // 학생1: 2번 한 번 틀림 → 생각 시간 → 숫자 바뀐 문제
            for (const d of '99') await (await item.$(`.rune[aria-label="룬 ${d}"]`)).click();
            await waitGo(p); await p.click('.dock .go'); await p.waitForTimeout(200);
            log('  학생1 2번 틀림:', (await p.textContent('.toast')).trim().slice(0, 40), '| 단추:', (await p.textContent('.dock .go')).trim());
            await p.waitForFunction(() => !document.querySelector('.dock .go').disabled || false, null, { timeout: 8000 }).catch(() => {});
            await p.waitForTimeout(5200);
            log('  재도전 머리말:', (await p.textContent('.paper-h small')).trim());
            const q2 = (await p.textContent('.paper .qt')).trim(), m = /n\(U\) = (\d+), n\(([A-Z])\) = (\d+)/.exec(q2);
            console.log('  재도전 문제:', q2.slice(0, 50), '→ 답', Number(m[1]) - Number(m[3])); const item2 = await p.$('.paper .item'); for (const d of String(Number(m[1]) - Number(m[3]))) await (await item2.$(`.rune[aria-label="룬 ${d}"]`)).click();
          } else await answer(p, item, A.boss[i]);
          await waitGo(p); await p.click('.dock .go'); await p.waitForTimeout(150);
        }
        log(`  학생${k + 1} 도달:`, (await p.$$('.tab.ok')).length, '/ 6 · 종합실', (await hall.textContent('.bar span')).trim());
      }
      await overflow(st[0], '형성평가');
      log('  보스:', (await hall.$('.ko')) ? (await hall.textContent('.ko')).trim() : '아직');
      // 보스를 이긴 뒤 남은 문항 (정식 = 계속 풀 수 있음)
      const left = await st[1].$$eval('.tab', (ts) => ts.filter((t) => !t.classList.contains('ok')).length);
      log('  이긴 뒤 학생2 남은 문항', left, '· 내기 단추 보임:', !!(await st[1].$('.dock .go')) || left === 0);
      await next(); continue;
    }
    if (id.startsWith('u')) {
      if (id === 'u4') {
        // 🎮 시연 (같은 부품 · 기록 없음)
        await hall.click('text=🎮 시연'); await hall.waitForSelector('.demo');
        const before = await hall.evaluate(() => JSON.stringify((JSON.parse(localStorage.getItem('citadel-v1-test-db') || '{}').rooms || {}).B3?.chain || null));
        await hall.click('.demo >> text=💡 정답 펼치기');
        log('  시연: 단계 칩', (await hall.$$eval('.demo .cr-chips .chip', (c) => c.map((x) => x.textContent.trim()).join(' '))), '| 정답 펼침:', (await hall.textContent('.demo .reveal')).trim().slice(0, 40));
        await answer(hall, await hall.$('.demo .item'), A.u4[0]); await hall.click('.demo .go'); await hall.waitForTimeout(150);
        log('  시연 공격:', (await hall.textContent('.demo .msg')).trim(), '| 기록 그대로:', before === (await hall.evaluate(() => JSON.stringify((JSON.parse(localStorage.getItem('citadel-v1-test-db') || '{}').rooms || {}).B3?.chain || null))));
        await hall.click('.demo >> text=✕ 닫기');
      }
      for (const [k, p] of st.entries()) {
        await p.waitForSelector('.cr-chips');
        for (let s = 0; s < A[id].length; s++) {
          if (k === 0 && s === 0 && id === 'u4') { // 학생1: 졸개① 한 번 틀림 → 같은 문제 · −½
            const it0 = await p.$('.paper .item'); await answer(p, it0, { groups: [['1', '2', '4'], []] }); await waitGo(p); await p.click('.dock .go'); await p.waitForTimeout(200);
            log('  학생1 졸개① 틀림:', (await p.textContent('.toast')).trim(), '| 지난 표시:', !!(await p.$('.was')), '| 기회', (await p.textContent('.slots')).trim());
            if (SHOTS) { await p.evaluate(() => window.scrollTo(0, 0)); await p.screenshot({ path: `${SHOTS}/b3-soraid-360.png`, fullPage: true }); }
            await overflow(p, 'u4 졸개①');
          }
          const it = await p.$('.paper .item');
          await answer(p, it, A[id][s]); await waitGo(p); await p.click('.dock .go'); await p.waitForTimeout(150);
        }
        log(`  학생${k + 1}:`, (await p.textContent('.big')).trim(), '| 나의 풀이 줄', (await p.$$('.story li')).length);
        await overflow(p, `${id} 끝`);
      }
      if (id === 'u4') { // 🔥 한 판 더: 1.5초 잠금 → 연습 판 📜 원문
        const p = st[1]; await p.waitForTimeout(1600); await p.click('.dock .go'); await p.waitForSelector('.cr-chips');
        log('  한 판 더: 📜 원문', !!(await p.$('details.prob')), '| 머리말', (await p.textContent('.paper-h small')).trim(), '| 기회', (await p.textContent('.slots')).trim());
      }
      log('  쓰러짐:', !!(await hall.$('.ko')), '| 종합실 졸개', (await hall.textContent('.mins')).trim());
      await next(); continue;
    }
    // 일반 몬스터
    for (const [k, p] of st.entries()) {
      if (id === 'm2' && k === 1) continue; // 학생2 는 위에서 이미 냄
      await p.waitForSelector('.item');
      if (id === 'm2' && k === 0) { // 다시 그려도 입력 · 스크롤 그대로 (정식 paint 원칙)
        const items = await p.$$('.paper .item');
        await (await items[0].$('.rune[aria-label="룬 1"]')).click();
        await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); const y0 = await p.evaluate(() => window.scrollY);
        // 다른 학생이 내고 시계가 돌아 방이 여러 번 바뀜
        await answer(st[1], (await st[1].$$('.paper .item'))[0], A.m2[0]); await answer(st[1], (await st[1].$$('.paper .item'))[1], A.m2[1]); await answer(st[1], (await st[1].$$('.paper .item'))[2], A.m2[2]);
        await waitGo(st[1]); await st[1].click('.dock .go'); await p.waitForTimeout(1500);
        const kept = (await p.textContent('.paper .item .rune-slot')).trim(), y1 = await p.evaluate(() => window.scrollY);
        log('  다시 그림 뒤: 입력', kept === '1' ? '그대로(1)' : `날아감(${kept})`, '| 스크롤', y0 === y1 ? `그대로(${y1})` : `${y0} → ${y1}`);
        if (kept !== '1' || y0 !== y1) errs.push('다시 그릴 때 입력 · 스크롤이 바뀜');
        await (await items[0].$('.rune[aria-label="룬 8"]')).click();
        if (SHOTS) { await p.evaluate(() => window.scrollTo(0, 0)); await p.screenshot({ path: `${SHOTS}/b3-rune-360.png` }); }
        await answer(p, items[1], A.m2[1]); await answer(p, items[2], A.m2[2]);
        await waitGo(p); await p.click('.dock .go'); await p.waitForTimeout(200);
        log('  학생1:', (await p.textContent('.paper-h small')).trim());
        await overflow(p, 'm2'); continue;
      }
      if (id === 'm2' && k === 1) continue;
      if (id === 'm1' && k === 0) { // 틀림 → 지난 답 채워짐 · ✘ 지난번 · 생각 시간
        const items = await p.$$('.paper .item'); await answer(p, items[0], A.m1[0]); for (const it of items.slice(1)) await (await it.$('.chip')).click();
        await waitGo(p); await p.click('.dock .go'); await p.waitForTimeout(200);
        log('  학생1 틀림:', (await p.textContent('.paper-h small')).trim(), '| 단추', (await p.textContent('.dock .go')).trim());
        await p.waitForFunction(() => !document.querySelector('.dock .go').disabled, null, { timeout: 8000 }); await p.click('.dock .go');
        log('  같은 문제 다시: 지난 답 채움', (await p.$$('.chip.on')).length, '칩 · ✘ 지난번', (await p.$$('.was')).length);
        const its = await p.$$('.paper .item'); for (const it of its.slice(1)) for (const c of await it.$$('.chip.on')) await c.click();
        for (let i = 1; i < its.length; i++) await answer(p, its[i], A.m1[i]);
      } else { const items = await p.$$('.paper .item'); for (let i = 0; i < items.length; i++) await answer(p, items[i], A[id][i]); }
      await waitGo(p); await p.click('.dock .go'); await p.waitForTimeout(200);
      log(`  학생${k + 1}:`, (await p.textContent('.paper-h small')).trim());
      await overflow(p, id);
    }
    log('  쓰러짐:', !!(await hall.$('.ko')));
    await next();
  }
  await hall.waitForTimeout(400);
  log('끝 종합실:', (await hall.textContent('h1')).trim(), '| 학생1:', (await st[0].textContent('.big')).trim(), '| 학생2:', (await st[1].textContent('.big')).trim());
  await overflow(st[0], '결과');
  log('오류', errs);
  await b.close();
})();
