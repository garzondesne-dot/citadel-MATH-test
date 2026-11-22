// 👩‍🏫 #55 체험판 게시판 던전 — 학생 판(캠프 📋) · 선생님 판(차시 카드 아래) · 봇 3 · 결과 💎 = 「체험판 · 받지 않음」 · 공적 줄 없음 · 서버 요청 0
//   NODE_PATH=$(npm root -g) node tools/e2e/trial55.cjs <그림 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/trial/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const run = async (role) => {
    const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); await p.addInitScript(() => { try { localStorage.setItem('citadel-v1-board-story', '1'); localStorage.setItem('atb-e2e-nointro', '1'); } catch { /* */ } }); p.on('pageerror', (e) => errs.push(String(e)));
    const net = []; p.on('request', (r) => { if (/firebaseio|firebasedatabase|googleapis/.test(r.url())) net.push(r.url()); });
    await p.goto(B); await p.fill('[data-k="trial-name"]', '체험'); await p.click(`[data-k="trial-${role}"]`); await p.waitForTimeout(800);
    if (await p.$('text=첫 용사 고르기')) { await p.click('button:has-text("시작")'); await p.waitForTimeout(600); }
    await p.waitForSelector('[data-k="trial-atb"]', { timeout: 10000 }); await p.click('[data-k="trial-atb"]');
    await p.waitForSelector('.bd .btabs', { timeout: 15000 });
    const tabs = await p.$$eval('.bd .btabs button', (x) => x.map((e) => e.textContent.trim()));
    ok(`[${role}] 📜 #66-8 체험판 게시판 = 같은 화면 (탭 출정 · 기록 · 기사단 없음 · 팀 모집 없음)`, tabs.length === 2 && !tabs.some((t) => /기사단/.test(t)) && !(await p.$('[data-k="board-post"]')) && !!(await p.$('[data-k="trial-note"]')), tabs.join('|'));
    const nos = await p.$$eval('[data-map]:not(.lockd)', (x) => x.map((e) => e.getAttribute('data-map')));
    ok(`[${role}] 열린 칸 = 체험 차시`, nos.length > 0, nos.join(','));
    await p.click(`[data-map="${nos[0]}"]`); await p.click('.bd .act .btn'); await p.waitForSelector('[data-k="hero-sheet"]'); await p.click('[data-k="hero-sheet-go"]'); /* 📜 #135 혼자 출정 = 용사 확인 시트 거침 */ await p.waitForSelector('[data-k="atb-stage"]', { timeout: 15000 }); await p.waitForTimeout(1500);
    const tags = await p.$$eval('[data-k="atb-hero"] .tag > b', (x) => x.map((e) => e.textContent.trim()));
    ok(`[${role}] 나 + 봇 3`, tags.length === 4 && tags.filter((t) => /봇|모험가/.test(t)).length === 3, tags.join(' · '));
    await p.evaluate(() => globalThis.__atb?.win?.()); /* 📡 손발 #2 시험 고리 = 실드 칸 깸 · HP 0 · 엔진 끝 판정 */
    await p.waitForSelector('[data-k="atb-reward"]', { timeout: 30000 }).catch(() => {});
    const rw = (await p.textContent('[data-k="atb-reward"]').catch(() => '')) || '', merit = !!(await p.$('[data-k="atb-merit"]'));
    ok(`[${role}] 결과 💎 = 체험판 · 받지 않음 · 공적 줄 없음`, /체험판 · 받지 않음/.test(rw) && !merit, rw);
    await p.screenshot({ path: `${SHOTS}/trial55-${role}.png` });
    ok(`[${role}] 서버 요청 0`, net.length === 0, net.slice(0, 2).join(' '));
    await p.click('[data-k="atb-to-board"]').catch(() => {}); await p.waitForTimeout(600);
    ok(`[${role}] 「게시판으로」 → 체험 게시판 (출정 지도)`, !!(await p.$('[data-k="board-map"]')));
    await p.context().close();
  };
  await run('stu'); await run('tch');
  await b.close(); console.log(errs.length ? `❌ 실패 ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); process.exit(errs.length ? 1 : 0);
})();
