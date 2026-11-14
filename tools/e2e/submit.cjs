// 📝 제출 모드 v2 (📜 2026-11-14 머리 🔨 · DECISIONS 「📝 제출 모드 v2」 · 시안 ①~⑦): 🧪 테스트 모드 · 종합실 1 + 학생 1 (360 × 760)
//   게임 ↔ 제출 오가기 리허설: 위 막대 「게임 | 제출」 · ⚙ 테마 줄 「제출」 · 진행 · 💎 · EXP 그대로 · 360 가로 넘침 0 · 그림 · 이모지 0 · 캡처 7장
//   NODE_PATH=$(npm root -g) node tools/e2e/submit.cjs <폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], out = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const ctx = await b.newContext({ viewport: { width: 360, height: 760 }, deviceScaleFactor: 2 });
  const open = async (u) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e))); await p.goto(B + u); return p; };
  const hall = await open('?role=hall&mode=test&room=SUB'); await hall.setViewportSize({ width: 1000, height: 800 }); await hall.waitForSelector('.dock');
  const s = await open('?role=student&room=SUB'); await hall.waitForTimeout(1200);
  const next = async () => { await hall.$eval('.dock .go', (x) => x.click()).catch(() => {}); await hall.waitForTimeout(400); };
  const shot = async (n) => { await s.evaluate(() => window.scrollTo(0, 0)); await s.waitForTimeout(200); await s.screenshot({ path: `${SHOTS}/submit-${n}.png` }); };
  // 학생 화면 검사: 가로 넘침 · 보이는 그림 · 글자 속 이모지
  const paper = (where) => s.evaluate(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
    const imgs = [...document.querySelectorAll('img, canvas')].filter(vis).filter((e) => !e.closest('.vq, .pimg')).map((e) => e.className || e.tagName);
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const emo = []; let n;
    while ((n = tw.nextNode())) { const el = n.parentElement; if (!el || !vis(el)) continue; for (const c of n.data) { const cp = c.codePointAt(0); if (/\p{Extended_Pictographic}/u.test(c) && !(cp >= 0x2190 && cp <= 0x22ff) && !(cp >= 0x2713 && cp <= 0x2717) && cp !== 0x25cb) emo.push(c); } }
    return { sub: document.documentElement.dataset.submit === '1', over: document.documentElement.scrollWidth - innerWidth, imgs, emo: [...new Set(emo)].join('') };
  }).then((r) => { ok(`${where}: 학습지 꼴 · 넘침 0 · 그림 0 · 이모지 0`, r.sub && r.over <= 0 && !r.imgs.length && !r.emo, `넘침 ${r.over} · 그림 ${r.imgs.join(',') || 0} · 이모지 「${r.emo}」`); return r; });
  const me = () => s.evaluate(() => { for (const k of Object.keys(localStorage)) { try { const j = JSON.parse(localStorage.getItem(k)); if (j && j.wallet && typeof j.wallet.gem === 'number') return { gem: j.wallet.gem, xp: j.xp }; } catch {} } return null; });
  // ── 게임 모드로 시작 → 위 막대 「제출」
  await next(); await next(); // 캠프 → 던전 입장 → 수업 시작
  for (let g = 0; g < 4 && (await hall.$('.split')); g++) await next(); // 개념 건너뛰기 → 문제 1 정찰
  await s.waitForSelector('[data-k="modesw"]', { timeout: 9000 });
  const w0 = await me();
  await s.click('[data-k="modesw"] button:has-text("제출")'); await s.waitForTimeout(400);
  await paper('② 정찰'); await shot('2-scout');
  ok('② 정찰 = 두 줄 + 준비 완료', /준비 완료/.test(await s.textContent('body')));
  await s.click('.act .btn').catch(() => {});
  await hall.waitForFunction(() => !document.querySelector('.sc'), null, { timeout: 12000 }).catch(() => {}); await s.waitForTimeout(800);
  await paper('① 문제'); await shot('1-problem');
  // ⑤ 채점: 칸마다 첫 칩(또는 룬 하나)만 골라 공격
  const n = (await s.$$('.row .cell')).length;
  for (let i = 0; i < n; i++) { await s.click(`.row .cell:nth-child(${i + 1})`).catch(() => {}); await s.waitForTimeout(80); const it = await s.$('.bcard .item'); const c = it && (await it.$('.chip, .opt, .rune')); if (c) await c.click(); }
  await s.waitForFunction(() => { const g = document.querySelector('.act .btn'); return g && !g.disabled; }, null, { timeout: 9000 }).catch(() => {});
  await s.click('.act .btn'); await s.waitForTimeout(2600);
  await paper('⑤ 채점'); await shot('5-grade');
  ok('⑤ 빨간 펜 점수', !!(await s.$('[data-k="pscore"]')), await s.$eval('[data-k="pscore"]', (x) => x.textContent).catch(() => '없음'));
  ok('④ 기회 = 「남은 기회 n번」', /남은 기회 \d번/.test(await s.textContent('body')));
  // 게임 모드로 잠깐 → 진행 그대로
  const rowOf = () => s.$$eval('.row .cell', (cs) => cs.map((c) => c.className.replace(/svelte-\S+/g, '').trim()).join('|')).catch(() => '');
  const row0 = await rowOf();
  await s.click('[data-k="modesw"] button:has-text("게임")'); await s.waitForTimeout(500);
  const gameOk = await s.evaluate(() => !document.documentElement.dataset.submit && !!document.querySelector('.edge'));
  const row1 = await rowOf();
  ok('↔ 게임 모드로 = 장면 돌아옴 · 답안 줄 그대로', gameOk && row0 === row1, row1); await s.screenshot({ path: `${SHOTS}/submit-0-game.png` });
  await s.click('[data-k="modesw"] button:has-text("제출")'); await s.waitForTimeout(400);
  const w1 = await me(); ok('💎 · EXP 그대로 쌓임', !w0 || !w1 || (w1.gem >= w0.gem && w1.xp >= w0.xp), `${JSON.stringify(w0)} → ${JSON.stringify(w1)}`);
  ok('⑤ 틀린 것만 「(n) 다시 풀기」', /\(\d\) 다시 풀기/.test(await s.textContent('.act .btn').catch(() => '')), (await s.textContent('.act .btn').catch(() => '')).trim());
  // ⑥ 다 맞힘 = 두 번째 학생(같은 기기 = 제출 모드 기억)이 바로 맞힘
  const s2 = await open('?role=student&room=SUB'); await s2.waitForSelector('.row .cell', { timeout: 12000 });
  ok('기억: 새 화면도 제출 모드', await s2.evaluate(() => document.documentElement.dataset.submit === '1'));
  const A1 = [['5', '6'], ['5', '6'], ['1', '2', '4', '5', '6'], ['1', '2', '4', '5', '6']];
  for (let i = 0; i < A1.length; i++) { await s2.click(`.row .cell:nth-child(${i + 1})`); await s2.waitForTimeout(80); for (const c of await s2.$$('.bcard .item .chip')) if (A1[i].includes((await c.textContent()).trim())) await c.click(); }
  ok('① 단추 = 「제출」', /^제출/.test((await s2.textContent('.act .btn')).trim()), (await s2.textContent('.act .btn')).trim());
  await s2.click('.act .btn'); await s2.waitForTimeout(3200);
  const sh2 = async (n) => { await s2.evaluate(() => window.scrollTo(0, 0)); await s2.waitForTimeout(200); await s2.screenshot({ path: `${SHOTS}/submit-${n}.png` }); };
  { const t = await s2.textContent('body'); ok('⑥ 다 맞힘 = 「더 해 볼 것」 두 줄 · 기술 카드 · 보상 없음', !!(await s2.$('[data-k="more"]')) && (await s2.$$('[data-k="more"] button')).length === 2 && !(await s2.$('.cards .card')) && !/데미지|EXP|전리품/.test(t), (await s2.textContent('[data-k="more"]').catch(() => '없음')).replace(/\s+/g, ' ')); }
  const paper2 = (where) => s2.evaluate(() => { const r = document.documentElement; return { sub: r.dataset.submit === '1', over: r.scrollWidth - innerWidth }; }).then((r) => ok(`${where}: 학습지 꼴 · 넘침 0`, r.sub && r.over <= 0, `넘침 ${r.over}`));
  await paper2('⑥ 다 맞힘'); await sh2('6-done');
  // ④ 형성평가 = 종합실이 넘김 (6차시 문제 4~7 = 「다음 판」 칸이라 흐름에 없음 → ③ 소레이드는 아래 게시판 던전 7차시)
  const stepNow = () => hall.$eval('.fs.now em', (x) => x.textContent).catch(() => '');
  for (let g = 0; g < 12; g++) { const t = await stepNow(); if (/형성평가/.test(t)) break; await next(); }
  await hall.waitForFunction(() => !document.querySelector('.sc'), null, { timeout: 12000 }).catch(() => {}); await s2.waitForTimeout(1200);
  { const n4 = (await s2.$$('.row .cell')).length; for (let i = 0; i < n4; i++) { await s2.click(`.row .cell:nth-child(${i + 1})`).catch(() => {}); await s2.waitForTimeout(80); const it = await s2.$('.bcard .item'); const c = it && (await it.$('.chip, .opt, .rune[aria-label^="룬"]')); if (c) await c.click(); }
    ok('④ 형성평가 단추 = 「모두 제출」', /모두 제출/.test(await s2.textContent('.act .btn').catch(() => '')), (await s2.textContent('.act .btn').catch(() => '')).trim()); }
  await paper2('④ 형성평가'); await sh2('4-boss');
  // ③ 소레이드 = 게시판 던전 7차시 첫 단계(u4) · 게임 모드 캠프에서 들어가 위 막대 「제출」
  { const ctx3 = await b.newContext({ viewport: { width: 360, height: 760 }, deviceScaleFactor: 2 }), p = await ctx3.newPage(); p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(B + '?role=camp&room=SUBR'); await p.waitForSelector('.stage');
    await p.click('button[aria-label="📋 게시판"]'); await p.waitForSelector('.bd');
    await p.click('.bd .chips button:has-text("7")'); await p.click('.bd .pmain'); await p.waitForSelector('.lgrid');
    await p.click('.lg:has-text("7")'); await p.click('.sheet .pmain'); await p.waitForSelector('.minions', { timeout: 15000 }); await p.waitForTimeout(500);
    await p.click('[data-k="modesw"] button:has-text("제출")'); await p.waitForTimeout(500);
    const lab = await p.textContent('.bcard .lab').catch(() => ''), body = await p.textContent('body'), btn = (await p.$$eval('.act .btn', (xs) => xs.map((x) => x.textContent.trim()).join(' | ')).catch(() => ''));
    ok('③ 소레이드 = 「단계 k / m」 · 졸개 · 대장 없음 · 단추 제출', /단계 1 \/ \d/.test(lab) && !/졸개|대장/.test(body) && /제출/.test(btn), `${lab.trim()} · ${btn}`);
    const r = await p.evaluate(() => ({ sub: document.documentElement.dataset.submit === '1', over: document.documentElement.scrollWidth - innerWidth, edge: !!document.querySelector('.edge') && getComputedStyle(document.querySelector('.edge')).display !== 'none' }));
    ok('③ 소레이드: 학습지 꼴 · 넘침 0 · 장면 없음', r.sub && r.over <= 0 && !r.edge, JSON.stringify(r));
    await p.evaluate(() => window.scrollTo(0, 0)); await p.screenshot({ path: `${SHOTS}/submit-3-soraid.png` }); await ctx3.close(); }
  // ⑦ 수업 밖 = 오늘 할 일 · ⚙ 설정 → 테마 줄 「제출」
  const c = await open('?role=camp&room=SUB'); await c.waitForSelector('[data-k="todo"]', { timeout: 9000 }).catch(() => {});
  { const t = await c.textContent('[data-k="todo"]').catch(() => ''); ok('⑦ 오늘 할 일 · 학습 이름 (통일 용어)', /차시 수업/.test(t) && /선생님 소식 \(우편함\)/.test(t), t.replace(/\s+/g, ' ').slice(0, 160)); }
  await c.screenshot({ path: `${SHOTS}/submit-7-todo.png` });
  ok('⑦ 캠프 그림 없음 · 넘침 0', await c.evaluate(() => !document.querySelector('.stage') && document.documentElement.scrollWidth <= innerWidth));
  await c.click('.pset'); await c.waitForTimeout(400);
  const thSub = await c.$('[data-k="th-submit"]'); const msw = await c.$('.sheet [data-k="modesw"], [role="dialog"] [data-k="modesw"]');
  ok('⚙ 설정 = 테마 줄 「제출」(또는 테마가 잠기면 게임 | 제출)', !!thSub || !!msw);
  await c.screenshot({ path: `${SHOTS}/submit-8-settings.png` });
  if (thSub) { await c.click('.th[data-th="gold"]').catch(() => {}); await c.waitForTimeout(300); ok('⚙ 다른 테마 고르면 게임 모드', await c.evaluate(() => !document.documentElement.dataset.submit)); await c.click('[data-k="th-submit"]'); await c.waitForTimeout(300); ok('⚙ 「제출」 고르면 제출 모드', await c.evaluate(() => document.documentElement.dataset.submit === '1')); }
  // 교사 폰 · TV 는 언제나 게임 꼴
  ok('📺 TV = 게임 꼴 그대로', await hall.evaluate(() => !document.documentElement.dataset.submit));
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
