// 📡 게시판 던전 여럿이 한 판 (📜 요청 #48) — 폰 두 대(iframe) · 같은 메모리 서버 칸: 행동 → 방장 엔진 → 상태 요약 · 방장 나감 → 넘겨받음 · 다시 들어옴 · 판 끝 결과
// 쓰기: npm run build && npx vite preview --port 4173 & node tools/e2e/atbnet.cjs [캡처 폴더]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/?role=atbnet2';
const out = [], errs = []; const ok = (n, c, d = '') => out.push(`${c ? '✅' : '❌'} ${n}${d ? ' · ' + d : ''}`);
(async () => {
  const b = await chromium.launch(); { const np = b.newPage.bind(b); b.newPage = async (o) => { const pg = await np(o); await pg.addInitScript(() => { try { localStorage.setItem('atb-e2e-nointro', '1'); globalThis.__atbNoAutoQ = true; } catch { /* 무시 */ } }); return pg; }; } /* 🗺 요청 #69 조우 · 정찰은 atbintro.cjs 가 따로 봄 */ const p = await b.newPage({ viewport: { width: 860, height: 800 } });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(B); await p.waitForSelector('[data-k="phone-2"]');
  const fr = async (k) => (await (await p.$(`[data-k="phone-${k}"]`)).contentFrame());
  let A = await fr(1), C = await fr(2);
  await A.waitForSelector('[data-k="atb-stage"]', { timeout: 15000 }); await C.waitForSelector('[data-k="atb-stage"]', { timeout: 15000 }); await p.waitForTimeout(1500);
  const st = () => p.evaluate(() => globalThis.__atbStore);
  const host = () => p.evaluate(() => globalThis.__atbStore.get('atb/dev/host'));
  // 1 같은 판 · 이름 = 나 / 친구 실명 / 봇
  { const h = await host(), la = await A.$$eval('[data-k="atb-hero"] .tag > b', (x) => x.map((e) => e.textContent.trim())), lc = await C.$$eval('[data-k="atb-hero"] .tag > b', (x) => x.map((e) => e.textContent.trim()));
    ok('#48 두 폰 = 같은 판 · 방장 = 첫 자리 · 이름표 = 「나」 · 친구 실명(4자 줄임) · 봇A (#91)', h === 's1_3_1' && la.some((t) => /나/.test(t)) && la.some((t) => /테스트/.test(t)) && lc.some((t) => /테스트/.test(t)) && la.some((t) => /봇A/.test(t)), JSON.stringify({ h, la, lc })); }
  // 2 친구 폰 행동 → 방장 엔진 → 친구 폰 화면
  { const hp0 = await A.evaluate(() => globalThis.__atb.S.bossHp);
    await A.evaluate(() => { const S = globalThis.__atb.S; S.heroes[1].atb = 1; S.heroes[1].ch = 1; S.target = null; }); await p.waitForTimeout(600);
    await C.click('[data-k="atb-attack"]'); await C.waitForSelector('[data-k="atb-timing"]'); await C.evaluate(() => globalThis.__atbTiming('ok')); await p.waitForTimeout(1200);
    const r = { hpA: await A.evaluate(() => globalThis.__atb.S.bossHp), hpC: await C.evaluate(() => globalThis.__atb.S.bossHp), hp0 };
    ok('#48 친구 폰 공격 = 방장 엔진에서 처리 · 두 폰 보스 체력 같음', r.hpA < r.hp0 && Math.abs(r.hpA - r.hpC) <= 40, JSON.stringify(r));
    const ch0 = await A.evaluate(() => globalThis.__atb.S.heroes[1].ch); await C.evaluate(() => globalThis.__atb.solve()); await p.waitForTimeout(1200);
    const ch1 = await A.evaluate(() => globalThis.__atb.S.heroes[1].ch);
    ok('#48 친구 폰 문제 풀이(채점은 친구 폰) = 결과만 보냄 → 방장 엔진 충전', ch1 > ch0, `${ch0} → ${ch1}`);
    await C.evaluate(() => globalThis.__atb.close()); }
  await p.screenshot({ path: `${SHOTS}/atb-r48-two-phones.png` });
  // 3 방장 폰 나감 → 10초 뒤 친구 폰이 방장 · 판 이어감 · 나간 자리 = 봇
  { const t0 = await C.evaluate(() => globalThis.__atb.S.t);
    await p.evaluate(() => document.querySelector('[data-k="phone-1"]').remove()); await p.waitForTimeout(13500);
    const h = await host(), t1 = await C.evaluate(() => globalThis.__atb.S.t);
    ok('#48 방장 폰 나감 → 다음 사람이 방장 · 판이 멈추지 않음', h === 's1_3_2' && t1 > t0 + 2, JSON.stringify({ h, t0, t1 })); }
  // 4 다시 들어옴 = 친구 폰으로 · 받은 상태부터 · 「나」
  { await p.evaluate(() => { const f = document.createElement('iframe'); f.title = '폰 1'; f.src = '?role=atbnet&u=s1_3_1'; f.dataset.k = 'phone-1'; f.style.cssText = 'width:844px;height:390px;border:0;display:block'; document.querySelector('.two').prepend(f); });
    A = await fr(1); await A.waitForSelector('[data-k="atb-stage"]', { timeout: 15000 }); await p.waitForTimeout(2000);
    const r = { h: await host(), tA: await A.evaluate(() => globalThis.__atb.S.t), tC: await C.evaluate(() => globalThis.__atb.S.t), me: await A.$eval('[data-k="atb-me"] b', (e) => e.textContent) };
    ok('#48 다시 들어옴 = 지금 판 그대로(방장은 그대로) · 내 자리 「나」', r.h === 's1_3_2' && Math.abs(r.tA - r.tC) < 1.5 && /나/.test(r.me), JSON.stringify(r)); }
  // 5 판 끝 = 두 폰 결과 · end/{uid} = 공적 · 💎 · ⭐
  { await C.evaluate(() => { const S = globalThis.__atb.S; S.end = { win: true, why: '', t: S.t }; }); await p.waitForTimeout(4500);
    const ends = await p.evaluate(() => globalThis.__atbStore.get('atb/dev/end'));
    const ra = await A.$('[data-k="atb-merit"]'), rc = await C.$('[data-k="atb-to-board"]');
    await (await p.$(`[data-k="phone-2"]`)).screenshot({ path: `${SHOTS}/atb-r48-result.png` });
    ok('#51 판 끝 = 두 폰 결과 화면(🚩 공적 · 💎 예상 · 「게시판으로」) · end/{uid} 둘 다', !!ra && !!rc && ends && ends.s1_3_1 && ends.s1_3_2 && typeof ends.s1_3_2.meritSum === 'number' && typeof ends.s1_3_2.gemSum === 'number', JSON.stringify(Object.keys(ends || {}))); }
  console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.join('\n')}` : '✅ 오류 0'); await b.close();
})();
