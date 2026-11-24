// 🏁 쉼터 놀이 「땅따먹기」 (📜 2026-11-24) — 이 기기 저장 · 🧪 테스트 리모컨 + 🤖 5 + 학생 폰 1 + 종합실
//   리모컨 🏕 → 🏁 고르기 → ▶ 시작(모이기) → 폰 🙋 참가 · 🤖 참가 → 리모컨 ▶ 출발 → 준비 → 30턴(폰 방향 단추 = 이번 턴 방향 · 7×7 창) → 결과(팀 순위 · 💎)
//   NODE_PATH=$(npm root -g) node tools/e2e/landgrab1124.cjs <폴더> [주소]
const { chromium } = require('playwright');
const { testOpen } = require('./_cls.cjs');
const SHOTS = process.argv[2] || '.', B = process.argv[3] || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { window.__LG_SPEED = 0.25; }); // 고르기 0.75초 · 움직임 0.5초 (화면 시험만)
  const t = await ctx.newPage(); t.on('pageerror', (e) => errs.push('리모컨 ' + e));
  const txt = async (p, s) => ((await p.textContent(s).catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  const fun = async (code) => t.evaluate((c) => window.__dbGet(`rooms/${c}/fun`), code);
  await t.goto(B + '?role=teacher'); await t.evaluate(() => localStorage.clear()); await t.reload(); await t.waitForSelector('.tp'); await t.evaluate(() => { window.__botSpeed = 4; });
  await testOpen(t, { no: 6, mode: 'remote', bots: +(process.env.BOTS || 5) }); await t.waitForSelector('[data-k="bots"]');
  const live = await t.evaluate(() => window.__dbGet('school/live'));
  const s = await ctx.newPage(); s.on('pageerror', (e) => errs.push('폰 ' + e)); await s.goto(`${B}?role=student&room=${live.code}&as=${live.cls === 'test' ? 'test' : live.cls}:3`); await s.waitForTimeout(2500);
  const tv = await ctx.newPage(); await tv.setViewportSize({ width: 1280, height: 720 }); tv.on('pageerror', (e) => errs.push('TV ' + e));
  await t.bringToFront(); await t.click('.tact .btn'); await t.waitForTimeout(800);
  await t.click('[data-slot="rest"]'); await t.waitForSelector('.game');
  ok('🏕 놀이 목록에 🏁 땅따먹기', /땅따먹기/.test(await txt(t, '.games')), await txt(t, '.games'));
  await t.click('.game:has-text("땅따먹기")'); await t.click('.rbig'); await t.waitForTimeout(800);
  ok('▶ 시작 = 모이기', (await fun(live.code))?.phase === 'join');
  await s.bringToFront();
  await s.waitForSelector('[data-k="lg-join"]', { timeout: 10000 }); await s.click('[data-k="lg-join"]'); await s.waitForTimeout(600);
  ok('폰 🙋 참가 → 「참가했어요」', !!(await s.$('[data-k="lg-joined"]')));
  await tv.goto(`${B}?role=hall&room=${live.code}`); await tv.waitForTimeout(2500);
  ok('종합실 = 참가 n명', /참가 \d+명/.test(await txt(tv, '[data-k="lg-tv-join"]')), await txt(tv, '[data-k="lg-tv-join"]'));
  await t.bringToFront(); await t.waitForTimeout(3500);
  if (!(await t.$('[data-k="lg-go"]'))) await t.click('[data-slot="rest"]').catch(() => {});
  await t.click('[data-k="lg-go"]', { timeout: 5000 }); await t.waitForTimeout(1500);
  const f1 = await fun(live.code);
  ok('▶ 출발 = 팀 나눔 · 판 9×9', ['ready', 'pick', 'move'].includes(f1?.phase) && f1.size === (Object.keys(f1.team || {}).length >= 25 ? 13 : Object.keys(f1.team || {}).length >= 13 ? 11 : 9) && Object.keys(f1.team || {}).length >= 2, `${f1?.phase} ${f1?.size} ${Object.keys(f1?.team || {}).length}명`);
  await s.bringToFront(); await s.waitForSelector('[data-k="lg-pad"]', { timeout: 10000 });
  ok('폰 = 7×7 창 · 방향 4개', (await s.$$('.win .c')).length === 49 && (await s.$$('[data-k="lg-pad"] button')).length === 4);
  // 방향 누르기 → 그 턴 내 방향 칸에 씀
  for (let i = 0; i < 20; i++) { const f = await fun(live.code); if (f?.phase === 'pick') break; await s.waitForTimeout(100); }
  const fp = await fun(live.code); await s.click('[data-k="lg-pad"] button[data-d="3"]').catch(() => {}); await s.waitForTimeout(150);
  const mine = await t.evaluate(([c, g, tn]) => window.__dbGet(`rooms/${c}/fv/lg${g}_${tn}/s1_6_3`), [live.code, fp.g, fp.turn]);
  ok('▶ 누름 = 이번 턴 방향 3(오른쪽) 저장', mine === 3, `${fp.phase} ${fp.turn} → ${mine}`);
  await s.screenshot({ path: `${SHOTS}/lg-phone.png` });
  await tv.bringToFront(); await tv.waitForTimeout(800); await tv.screenshot({ path: `${SHOTS}/lg-tv.png` });
  { const fz = (await fun(live.code))?.size ?? 9; ok('종합실 = 판 · 팀 막대', (await tv.$$('[data-k="lg-tv"] .board .c')).length === fz * fz && (await tv.$$('[data-k="lg-tv"] .bars li')).length >= 2); }
  { const m = await tv.evaluate(() => { const cs = [...document.querySelectorAll('[data-k="lg-tv"] .board .c')].map((c) => c.getBoundingClientRect()); const w = cs.map((r) => Math.round(r.width)), h = cs.map((r) => Math.round(r.height)); return { wmin: Math.min(...w), wmax: Math.max(...w), hmin: Math.min(...h), hmax: Math.max(...h) }; });
    ok('🔨 #18 ⑥ 칸 = 모두 같은 정사각', m.wmax - m.wmin <= 1 && m.hmax - m.hmin <= 1 && Math.abs(m.wmax - m.hmax) <= 1, JSON.stringify(m)); }
  { const fz = await fun(live.code), per = [0, 1, 2, 3].slice(0, fz.nTeam).map((t) => Object.values(fz.team).filter((x) => x === t).length), bots = Object.keys(fz.team).filter((u) => u.startsWith('lgbot-')).length, tags = await tv.$$eval('[data-k="lg-name"]', (xs) => xs.filter((x) => /🤖봇/.test(x.textContent || '')).length);
    ok('🔨 #18 더하기 2 🤖 팀 채움 = 모든 팀 같은 인원 · 봇 이름표 「🤖봇n」', new Set(per).size === 1 && (bots === 0 || tags >= 1), `팀 ${per.join('·')} · 봇 ${bots} · 봇 이름표 ${tags}`); }
  ok('🔨 #18 ⑤ 용사 이름표', (await tv.$$('[data-k="lg-name"]')).length >= 2, `${(await tv.$$('[data-k="lg-name"]')).length}개`);
  ok('🔨 #18 ④ 위 해설 한 줄', ((await tv.textContent('[data-k="lg-tv-cast"]')) || '').trim().length > 4, (await tv.textContent('[data-k="lg-tv-cast"]')) || '');
  ok('🔨 #18 ① 이번 턴 연출 기록(fx) 있음', !!(await fun(live.code))?.fx, JSON.stringify((await fun(live.code))?.fx || {}).slice(0, 80));
  await t.bringToFront();
  for (let i = 0; i < 120; i++) { const f = await fun(live.code); if (!f || f.phase === 'end') break; await t.waitForTimeout(1000); }
  const fe = await fun(live.code);
  ok('30턴 뒤 결과 · 우승 팀 · 칠한 칸', fe?.phase === 'end' && fe.turn === 30 && (fe.winTeams || []).length >= 1 && /[0-3]/.test(fe.own), `${fe?.phase} 턴 ${fe?.turn} 우승 ${JSON.stringify(fe?.winTeams)}`);
  await s.bringToFront(); await s.waitForTimeout(1500);
  ok('폰 결과 = 우리 팀 등수 · 팀 막대', /등|1등/.test(await txt(s, '[data-k="lg-res"]')), await txt(s, '[data-k="lg-res"]'));
  const gift = await t.evaluate(() => { const g = window.__dbGet('gifts/s1_6_3') || {}; return Object.entries(g).filter(([k]) => k.startsWith('lg')).map(([, v]) => v.g); });
  ok('💎 = 1등 팀 30 · 참가 10 (선물 칸)', gift.length === 1 && [10, 30].includes(gift[0]), JSON.stringify(gift));
  await s.screenshot({ path: `${SHOTS}/lg-end.png` }); await tv.bringToFront(); await tv.waitForTimeout(600); await tv.screenshot({ path: `${SHOTS}/lg-tv-end.png` });
  console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
