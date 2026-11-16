// 👥 리모컨 학생판 · 🙋 순서 줄 · 두 줄 고정 막대 (📜 2026-11-17 #24 · 시안 WvA9oZWgb2oo45P8AfRmGG ①~⑦) — 이 기기 저장
//   ⑧ 대기실 = 같은 칸(들어옴 · 🔑 주황 점선 · 안 들어옴) · 안 들어온 학생 창 = 맨 위 큰 🔑 0000 → 확인 한 번 → 「학생에게 0000 으로 …」
//   ⑤ 정찰 = 📝 준비 완료 n / N · 칸 금테 ① 칸 = 번호 · 이름 · ⚔ 4칸 · 진행 ③ 숫자 줄 · 지금 / 오늘 / 막힌 순 ④ 🙋 줄 3칸 · 기다린 시간 · +n
//   ⑦ 막대 2 × 5 고정 · 꺼짐 점선 · 🙋① ⚔ 보급 · 360 · 412 · 태블릿 폭
//   NODE_PATH=$(npm root -g) node tools/e2e/board24.cjs <폴더> [주소]
const { chromium } = require('playwright');
const { testOpen } = require('./_cls.cjs');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], log = (...a) => console.log(...a), ok = (t, c, d = '') => { log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), t = await ctx.newPage(); t.on('pageerror', (e) => errs.push(String(e)));
  const txt = async (s) => ((await t.textContent(s).catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  const txts = async (s) => (await t.$$eval(s, (xs) => xs.map((x) => x.textContent.replace(/\s+/g, ' ').trim()).join(' | ')).catch(() => ''));
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tp');
  await t.evaluate(() => { window.__botSpeed = 4; });
  // ── ⑧ 대기실 (실제 반 1-3) ──
  if (await t.$('[data-cls="1-3"]')) await t.click('[data-cls="1-3"]'); else { await t.click('text=다른 반'); await t.click('.sheet .pk:has-text("1-3반")'); }
  await t.evaluate(() => { const n = Date.now(); window.__dbSet('accounts/1-3/5', { pw: '1234', at: 1 }); window.__dbSet(`loginFail/1-3/5/${n - 1000}`, n - 1000); window.__dbSet(`loginFail/1-3/5/${n}`, n); });
  await t.click('.pk:has-text("6차시")'); await t.click('[data-k="open-go"]'); await t.click('[data-k="open-yes"]'); await t.waitForSelector('.nums');
  await t.waitForTimeout(400);
  ok('⑧ 대기실 학생판 = 숫자 줄(들어옴 · 🔑 로그인 실패 · 안 들어옴 · 결)', /들어옴 \d+\s*🔑 로그인 실패 1\s*안 들어옴 \d+\s*결 0/.test(await txt('[data-k="sums"]')), await txt('[data-k="sums"]'));
  ok('⑧ 🔑 학생 칸 = 주황 점선 + 🔑2', await t.$eval('.n[data-n="5"]', (e) => e.classList.contains('lf') && /🔑2/.test(e.textContent)).catch(() => false));
  const rows = await t.$eval('.nums', (e) => getComputedStyle(e).gridTemplateRows.split(' ').length);
  ok('② 늘 4줄', rows === 4, `${rows}`);
  await t.screenshot({ path: `${SHOTS}/b24-1-lobby.png` });
  await t.click('.n[data-n="5"]'); await t.waitForSelector('[data-k="pw0"]');
  ok('⑥ 안 들어온 학생 = 맨 위 큰 🔑 단추', await t.$eval('[data-k="pw0"]', (e) => e.classList.contains('pwbig')));
  await t.click('[data-k="pw0"]'); await t.click('[data-k="pwgo"]'); await t.waitForTimeout(300);
  ok('⑥ 확인 한 번 → 0000 · 「학생에게 0000 으로 들어오라고 말해 주세요」', (await t.evaluate(() => window.__dbGet('accounts/1-3/5/pw'))) === '0000' && /학생에게 0000 으로 들어오라고/.test(await txt('[data-k="pw-done"]')));
  await t.screenshot({ path: `${SHOTS}/b24-2-pw.png` });
  await t.keyboard.press('Escape'); await t.click('.sheet .btn:has-text("닫기")').catch(() => {});
  await t.click('.lbar button:has-text("수업 닫기")'); await t.click('.ask .btn'); await t.waitForTimeout(500);
  // ── 🧪 테스트 리모컨 + 🤖 12명 ──
  await t.goto(B + '?role=teacher'); await t.waitForSelector('.tp'); await t.evaluate(() => { window.__botSpeed = 4; window.__botAcc = 0.5; });
  await t.click('.pk:has-text("6차시")').catch(() => {});
  await testOpen(t, { no: 6, mode: 'remote', bots: 5 }); await t.waitForSelector('[data-k="bots"]');
  for (let i = 0; i < 7; i++) await t.click('[aria-label="한 명 늘리기"]');
  await t.waitForFunction(() => Number(document.querySelector('.att .cnt')?.firstChild?.textContent) >= 12, null, { timeout: 15000 }).catch(() => {});
  const code = await t.evaluate(() => window.__dbGet('school/live').code);
  await t.click('.tact .btn'); await t.waitForTimeout(500);
  // 첫 몬스터까지 다음 ▶
  for (let i = 0; i < 12 && !(await t.$('[data-k="ready-n"]')); i++) { await t.click('.tact .btn'); await t.waitForTimeout(500); }
  const mid = await t.$eval('[data-k="board"]', (e) => e.dataset.mid || null).catch(() => null);
  if (await t.$('[data-k="ready-n"]')) {
    const uids = await t.evaluate((c) => Object.keys(window.__dbGet(`rooms/${c}/players`) || {}).filter((u) => /^bot/.test(u) || /🤖/.test(u)).slice(0, 3), code);
    await t.evaluate(([c, m, us]) => us.forEach((u) => window.__dbSet(`rooms/${c}/ready/${m}/${u}`, true)), [code, mid, uids]); await t.waitForTimeout(400);
    ok('⑤ 정찰 = 「📝 준비 완료 n / N」 크게', /📝 준비 완료 \d+ \/ \d+/.test(await txt('[data-k="ready-n"]')), await txt('[data-k="ready-n"]'));
    ok('⑤ 준비 완료 칸 = 📝 금테 · 칼 · 진행 숨김', (await t.$$('.n.rdy')).length >= 1 && !(await t.$('.nums .sw')));
    await t.screenshot({ path: `${SHOTS}/b24-3-scout.png` });
    await t.click('.tact .btn'); // ⚔ 지금 등장
  } else ok('⑤ 정찰 단계 찾음', false);
  await t.waitForTimeout(6000);
  ok('① 칸 = ⚔ 칼 4칸 + 진행 막대', (await t.$$('.nums .n .sw')).length >= 10 && (await t.$$('.nums .n .pg')).length >= 10);
  ok('③ 숫자 줄 = ✔ · 🔥 푸는 중 · 🙋 · 🤝 · ⚔0 · 결', /✔ \d+\s*🔥 푸는 중 \d+\s*🙋 \d+\s*🤝 \d+\s*⚔0 \d+\s*결 \d+/.test(await txt('[data-k="sums"]')), await txt('[data-k="sums"]'));
  // ④ 🙋 줄: 손든 학생 4명 → 3칸 + +1 · 기다린 시간
  const m2 = await t.evaluate((c) => window.__dbGet(`rooms/${c}`)?.state?.step, code);
  const realMid = await t.evaluate((c) => { const R = window.__dbGet(`rooms/${c}`); const ps = R.players || {}; return Object.values(ps).find((p) => p?.hand)?.hand?.mid || null; }, code);
  const curMid = mid || realMid;
  const bu = await t.evaluate((c) => Object.keys(window.__dbGet(`rooms/${c}/players`) || {}).filter((u) => !window.__dbGet(`rooms/${c}/players/${u}`)?.teacher).slice(0, 4), code);
  for (const u of bu) { await t.evaluate(([c, u2, m]) => window.__dbSet(`rooms/${c}/players/${u2}/hand`, { mid: m, at: Date.now() }), [code, u, curMid]); await t.waitForTimeout(250); }
  await t.waitForTimeout(1500);
  ok('④ 🙋 줄 = 3칸 · ① 굵은 테 · +n', (await t.$$('.qs .qc')).length === 3 && !!(await t.$('.qs .qc.first')) && /\+\d/.test(await txt('[data-k="qmore"]')), `${(await t.$$('.qs .qc')).length} ${await txt('[data-k="qmore"]')}`);
  ok('④ 기다린 시간 m:ss', /^\d+:\d\d$/.test(await txt('[data-k="qwait"]')), await txt('[data-k="qwait"]'));
  ok('① 학생판 칸에 🙋① 순서 번호', /🙋①/.test(await txt('.nums')));
  // ⑦ 막대
  const slots = await t.$$eval('[data-k="rdock"] button', (xs) => xs.map((x) => ({ s: x.dataset.slot, y: Math.round(x.getBoundingClientRect().top) })));
  ok('⑦ 막대 = 2줄 × 5칸 고정 자리표', slots.map((x) => x.s).join(',') === 'focus,rest,video,sheet,t5,cc,review,send,gift,heal' && new Set(slots.map((x) => x.y)).size === 2, slots.map((x) => x.s).join(','));
  const first = await t.$eval('.qs .qc.first', (e) => e.dataset.u);
  await t.click('[data-k="heal-first"]'); await t.waitForTimeout(800);
  const q2 = await t.$$eval('.qs .qc', (xs) => xs.map((x) => x.dataset.u));
  ok('⑦ ⚔ 보급 = 🙋① 에게 바로 · 줄 당김', !q2.includes(first), `${first} → ${q2.join(',')}`);
  await t.screenshot({ path: `${SHOTS}/b24-4-now.png` });
  await t.evaluate(() => window.__featSet({ bundle: 'full', on: { cc: false } })); await t.waitForTimeout(300);
  const cc = await t.$eval('[data-slot="cc"]', (e) => ({ off: e.classList.contains('off'), t: e.textContent.trim() }));
  await t.$eval('[data-slot="cc"]', (e) => e.click()); await t.waitForTimeout(200);
  ok('⑦ ⚙ 끈 기능 = 점선 「꺼짐」 · 누르면 「⚙ 기능에서 켜요」 · 자리 그대로', cc.off && /꺼짐/.test(cc.t) && /⚙ 기능에서 켜요/.test(await txt('.toast:not(.utoast)')) && (await t.$$eval('[data-k="rdock"] button', (xs) => xs.map((x) => x.dataset.slot).join(','))) === 'focus,rest,video,sheet,t5,cc,review,send,gift,heal');
  await t.evaluate(() => window.__featSet(null));
  // ③ 숫자 누름 = 반짝 · 오늘 · 막힌 순
  await t.click('[data-sum="🔥 푸는 중"]').catch(() => {}); await t.waitForTimeout(100);
  ok('③ 숫자 누름 = 그 학생 반짝', (await t.$$('.n.fl')).length >= 1);
  await t.click('[data-view="today"]'); await t.waitForSelector('[data-k="today"] table');
  const head = await txt('[data-k="today"] thead'); ok('③ 오늘 = 학생 × 몬스터 + 재도전', /번/.test(head) && /재도전/.test(head) && (await t.$$('[data-k="today"] tbody tr')).length >= 12, head);
  await t.screenshot({ path: `${SHOTS}/b24-5-today.png` });
  await t.click('[data-view="stuck"]'); await t.waitForTimeout(200);
  const rt = await t.$$eval('[data-k="today"] td.rt', (xs) => xs.map((x) => Number(x.textContent)));
  ok('③ 막힌 순 = 재도전 많은 순', rt.every((v, i) => i === 0 || rt[i - 1] >= v), rt.slice(0, 8).join(','));
  await t.click('[data-view="now"]');
  // ⑥ 학생 칸 창 = 지금 + 오늘 + 단추
  await t.click('.nums .n.in, .nums .n.ok, .nums .n.help'); await t.waitForSelector('[data-k="who"]');
  ok('⑥ 창 = ⚔ 칼 · 이 몬스터 · 오늘 재도전 · 오늘 몬스터 + 보급 · 새로 고침 · 결석 · 🔑', /칼/.test(await txt('[data-k="who"]')) && /오늘 재도전/.test(await txt('[data-k="who"]')) && /오늘 몬스터/.test(await txt('[data-k="who"]')) && /보급/.test(await txt('.wacts')) && /새로 고침/.test(await txt('.wacts')) && /결석/.test(await txt('.wacts')) && /0000/.test(await txt('.wacts')));
  await t.screenshot({ path: `${SHOTS}/b24-6-sheet.png` });
  await t.keyboard.press('Escape'); await t.click('.sheet .btn:has-text("닫기")').catch(() => {}); await t.waitForTimeout(300);
  // ② 폭 360 · 412 · 태블릿
  for (const [w, h] of [[360, 640], [360, 780], [412, 915], [800, 1280]]) {
    await t.setViewportSize({ width: w, height: h }); await t.waitForTimeout(400);
    const m = await t.evaluate(() => { const d = document.querySelector('[data-k="rdock"]').getBoundingClientRect(), n = document.querySelector('.nums'), tact = document.querySelector('.tact')?.getBoundingClientRect(); return { hx: document.documentElement.scrollWidth > innerWidth + 1, dockIn: d.bottom <= innerHeight + 1, numsOver: n.scrollWidth > n.clientWidth + 8 /* 🙋 배지 · 손 흔들기 기울기만큼은 봐줌 */, tact: tact ? tact.bottom <= innerHeight + 1 : false, name: getComputedStyle(document.querySelector('.nums .n s')).display !== 'none' }; });
    ok(`② ${w}×${h} 가로 넘침 0 · 막대 · 주요 단추 화면 안 · 칸 안 넘침`, !m.hx && m.dockIn && m.tact && !m.numsOver, JSON.stringify(m));
    await t.screenshot({ path: `${SHOTS}/b24-w${w}x${h}.png` });
  }
  // 📌 자리 고정: 단계가 바뀌어도(정찰 → 등장 → 개념 → 마무리) 🙋 줄 · 학생판 · 「지금」 칸 · 막대의 y 가 같음
  await t.setViewportSize({ width: 390, height: 844 }); await t.waitForTimeout(400);
  const ys = async () => t.evaluate(() => ['[data-k="rq"]', '[data-k="board"]', '[data-k="now-cell"]', '[data-k="rdock"]'].map((q) => { const e = document.querySelector(q); if (!e) return -1; const r = e.getBoundingClientRect(); return `${Math.round(r.top)}/${Math.round(r.height)}`; }).join(' '));
  const seen = new Map();
  for (let i = 0; i < 30; i++) {
    const k = await t.evaluate(() => { const b = document.querySelector('.rstat .badge')?.textContent || ''; const l = document.querySelector('.rstat .lab')?.textContent || ''; return /정찰/.test(b) ? '정찰' : /마무리/.test(l) ? '마무리' : document.querySelector('.adj.talk') ? '개념' : '몬스터'; });
    if (!seen.has(k)) seen.set(k, await ys());
    const mt = (await txt('.tact .btn')) || '';
    if (/수업 닫기/.test(mt)) break;
    await t.click('.tact .btn'); await t.waitForTimeout(700);
  }
  const vs = [...seen.values()];
  ok(`📌 단계가 바뀌어도 🙋 줄 · 학생판 · 지금 칸 · 막대 자리 그대로 (${[...seen.keys()].join(' → ')})`, seen.size >= 3 && vs.every((v) => v === vs[0]), JSON.stringify(Object.fromEntries(seen)));
  await t.screenshot({ path: `${SHOTS}/b24-7-end.png` });
  void m2;
  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
