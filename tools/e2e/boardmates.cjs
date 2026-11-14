// 👥 게시판 동료 (📜 2026-11-14 선생님 「게시판 레이드 전투 화면에 동료들 표시 · 동료들 공격하는 장면 · 몬스터랑 용사들 조금만 더 위로」)
//   이 기기 모드: 내 폰(me) ＋ 모집 글 → 동료 b1 · b2 를 글 · 방에 직접(__dbSet · 심장 박동 1초) → ⚔ 출발 → 장면 띠
//   ① 동료 그림 2 · 이름 · 강화 오라 ② 둘이 한꺼번에 틀림 → 줄 세워 하나씩(겹침 0) · 「팅!」 헛침 ③ b1 맞힘 → 돌진 · −1 데미지 숫자
//   ④ 동료 쪽 ⭕ ❌ · 정답 · 오답 글자 없음 ⑤ 390 × 844 · SE 375 × 667 그림 · SE = 모든 답 단추가 아래 단추 위(스크롤 없이) ⑥ 1인 = 동료 없음 · SE 답 단추
// 사용: npx vite build → npx vite preview --port 4173 → NODE_PATH=$(npm root -g) node tools/e2e/boardmates.cjs <그림 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
const B = 'http://localhost:4173/';
const log = (...a) => console.log(...a);
const BOTS = [['b1', 3, 5, 6, 'frost'], ['b2', 4, 9, 10, 'flame']]; // uid · 번호 · 용사 · 강화 · 스킬
(async () => {
  const b = await chromium.launch(), errs = [];
  const ok = (name, cond, more = '') => { log(`${cond ? '✔' : '✘'} ${name}${more ? ` · ${more}` : ''}`); if (!cond) errs.push(name); };
  async function enter(w, h, team) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } }), p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(String(e.stack || e).split('\n').slice(0, 4).join(' ')));
    await p.goto(B + '?role=camp&room=BM1'); await p.waitForSelector('.stage'); await p.waitForTimeout(300);
    const tip0 = await p.$('[data-k="wake-tip"] button'); if (tip0) await tip0.click(); // 📱 화면 꺼짐 안내 띠 (지원 안 되는 브라우저) 닫기
    await p.click('button[aria-label="📋 게시판"]'); await p.waitForSelector('.bd'); await p.waitForTimeout(300);
    await p.click('.bd .chips button:has-text("6")');
    if (!team) { await p.click('.bd .act .btn'); await p.waitForSelector('.lgrid'); await p.click('.sheet .act .btn'); }
    else {
      await p.click('.bd .act .btn2'); await p.waitForSelector('.lgrid'); await p.click('.sheet .act .btn'); await p.waitForTimeout(800);
      const pid = await p.evaluate(() => Object.keys(window.__dbGet('school/board/posts') || {})[0]);
      await p.evaluate(([pid, bots]) => {
        const now = Date.now();
        bots.forEach(([u, n, h], k) => window.__dbSet(`school/board/posts/${pid}/mem/${u}`, { uid: u, cls: '1-3', num: n, nick: u, hero: h, role: 'c', why: '', at: now + k + 1, ready: true }));
        // 심장 박동 = 방이 열린 뒤에만 (먼저 쓰면 방 meta 가 없는 빈 방이 됨)
        window.__beat = () => bots.forEach(([u, n, h, e, f]) => window.__dbSet(`rooms/T${pid}/players/${u}`, { num: n, nick: u, seen: Date.now(), hero: h, enh: e, fx: f }));
      }, [pid, BOTS]);
      await p.waitForTimeout(400); await p.click('.bd button:has-text("출발")');
      await p.evaluate(() => { window.__beat(); window.__bots = setInterval(window.__beat, 1000); });
    }
    await p.waitForSelector('.run .edge', { timeout: 15000 }).catch(async (e) => { await p.screenshot({ path: `${SHOTS}/bm-fail.png` }); console.log(errs.join("\n")); console.log(JSON.stringify(await p.evaluate(() => window.__dbGet("school/board/posts")))); throw e; }); await p.waitForSelector('.run :is(.opt, .chip)', { timeout: 15000 }); await p.waitForTimeout(1500);
    const tip = await p.$('[data-k="wake-tip"] button'); if (tip) await tip.click();
    return p;
  }
  // SE · 넓은 폰 공통: 답 단추가 모두 아래 단추 위 · 가로 넘침 0
  async function fit(p, tag) {
    const m = await p.evaluate(() => {
      const bots = [...document.querySelectorAll('.run :is(.opt, .chip)')].map((x) => Math.round(x.getBoundingClientRect().bottom)), dock = document.querySelector('.run .act.dock');
      const e = document.querySelector('.run .edge').getBoundingClientRect(), hero = document.querySelector('.edge .hb').getBoundingClientRect(), mon = document.querySelector('.edge .mon').getBoundingClientRect();
      return { n: bots.length, low: Math.max(...bots), dock: dock ? Math.round(dock.getBoundingClientRect().top) : innerHeight, scroll: document.querySelector('.run').scrollTop, edgeH: Math.round(e.height), heroTop: Math.round(hero.top), monTop: Math.round(mon.top), over: document.documentElement.scrollWidth - innerWidth };
    });
    log(`   ${tag}:`, JSON.stringify(m));
    ok(`${tag} 답 단추 ${m.n}개 모두 아래 단추 위 (스크롤 없이)`, m.n > 0 && m.low <= m.dock && m.scroll === 0, `${m.low} ≤ ${m.dock}`);
    ok(`${tag} 장면 = 낮게 · 용사 · 몬스터 위로`, m.edgeH === 224 && m.heroTop === 72 && m.monTop === 64, `장면 ${m.edgeH} · 용사 ${m.heroTop} · 몬스터 ${m.monTop}`);
    ok(`${tag} 가로 넘침 0`, m.over <= 0);
  }
  // 동료 공격 지켜보기 (50ms 마다): 공격 중인 동료 · 돌진(translate) · 데미지 숫자 · 팅
  const watch = (p, ms) => p.evaluate((ms) => new Promise((res) => {
    const seen = { on: [], both: 0, move: {}, dmg: 0, ting: 0 }, t0 = Date.now();
    const id = setInterval(() => {
      const on = [...document.querySelectorAll('.edge .mate.on')];
      if (on.length > 1) seen.both++;
      for (const e of on) { const u = e.dataset.u; if (seen.on.at(-1) !== u) seen.on.push(u); const t = e.style.translate; if (t && t !== '0px 0px' && t !== '0px') seen.move[u] = true; }
      if (document.querySelector('.edge .atk-dmg')) seen.dmg++;
      if (document.querySelector('.edge .atk-ting')) seen.ting++;
      if (Date.now() - t0 > ms) { clearInterval(id); res(seen); }
    }, 50);
  }), ms);
  const noMark = async (p, tag) => { const t = await p.$eval('.run .edge', (x) => x.innerText); ok(`${tag} 장면에 ⭕ ❌ · 정답 · 오답 글자 없음`, !/[⭕❌]|정답|오답/.test(t)); };

  // ── 팀 (390 × 844) ──
  const A = await enter(390, 844, true);
  const mates = await A.$$eval('.edge .mate', (xs) => xs.map((x) => ({ u: x.dataset.u, aura: x.querySelector('.hs')?.classList.contains('aura'), w: Math.round(x.getBoundingClientRect().width) })));
  const names = await A.$$eval('.edge .mname', (xs) => xs.map((x) => x.textContent.trim()));
  ok('① 동료 그림 2 (나 빼고) · 강화 오라', mates.length === 2 && mates.every((m) => m.aura), JSON.stringify(mates));
  ok('① 동료 이름 = 팀 줄 이름', names.length === 2 && names.every((n) => /^1-3반 /.test(n)), names.join(' · '));
  const box = await A.evaluate(() => { const r = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; }; return { me: r('.edge .hb'), m0: r('.edge .mate[data-u="b1"]'), m1: r('.edge .mate[data-u="b2"]'), mon: r('.edge .mon') }; });
  log('   자리:', JSON.stringify(box)); ok('① 내 용사 = 앞(동료보다 아래 · 오른쪽) · 몬스터와 안 겹침', box.me[3] >= box.m0[3] && box.me[0] > box.m0[0] && box.me[2] - 50 < box.mon[0]);
  await A.screenshot({ path: `${SHOTS}/bm-team-390.png` });
  // ② 둘이 한꺼번에 틀림 → 줄 세워 하나씩
  const w2 = watch(A, 3600); await A.evaluate(() => { window.__board.miss('b1'); window.__board.miss('b2'); });
  await A.waitForTimeout(500); await A.screenshot({ path: `${SHOTS}/bm-team-miss.png` });
  const s2 = await w2; log('   틀림:', JSON.stringify(s2));
  ok('② 동시에 들어온 공격 = 줄 세워 하나씩 (b1 → b2 · 겹침 0)', s2.on.join(',') === 'b1,b2' && s2.both === 0);
  ok('② 틀림 = 튕겨냄 「팅!」 · 데미지 숫자 없음', s2.ting > 0 && s2.dmg === 0);
  await noMark(A, '②');
  // ③ b1 맞힘 → 돌진 · 데미지 숫자
  const hp0 = await A.$eval('.edge .mhp span', (x) => x.textContent);
  const w3 = watch(A, 3000); await A.evaluate(() => window.__board.solve('b1'));
  await A.waitForTimeout(420); await A.screenshot({ path: `${SHOTS}/bm-team-hit.png` });
  const s3 = await w3; const hp1 = await A.$eval('.edge .mhp span', (x) => x.textContent); log('   맞힘:', JSON.stringify(s3), '|', hp0, '→', hp1);
  ok('③ 동료 맞힘 = 돌진 · 공격 연출', s3.on.includes('b1') && !!s3.move.b1);
  ok('③ 데미지 숫자 뜸', s3.dmg > 0);
  ok('③ 몬스터 체력 줄어듦', hp0 !== hp1, `${hp0} → ${hp1}`);
  await noMark(A, '③');
  const tb = await A.$eval('.run .team', (x) => x.textContent); ok('④ 팀 줄에도 ⭕ ❌ 없음', !/[⭕❌]/.test(tb));
  await fit(A, '390 × 844');
  await A.context().close();

  // ── 팀 SE 375 × 667 ──
  const E = await enter(375, 667, true);
  await E.screenshot({ path: `${SHOTS}/bm-team-se.png` });
  await fit(E, 'SE 팀');
  const w5 = watch(E, 2600); await E.evaluate(() => window.__board.solve('b2')); await E.waitForTimeout(400); await E.screenshot({ path: `${SHOTS}/bm-team-se-hit.png` });
  const s5 = await w5; ok('⑤ SE 동료 맞힘 연출', s5.on.includes('b2') && s5.dmg > 0);
  await E.context().close();

  // ── 1인 SE = 나만 ──
  const O = await enter(375, 667, false);
  ok('⑥ 1인 = 동료 없음', (await O.$$('.edge .mate')).length === 0 && (await O.$eval('.edge .hb', (x) => Math.round(x.getBoundingClientRect().left))) === 0);
  await O.screenshot({ path: `${SHOTS}/bm-solo-se.png` });
  await fit(O, 'SE 1인');
  await O.context().close();

  log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0');
  await b.close();
})();
