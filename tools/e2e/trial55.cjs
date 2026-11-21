// 👩‍🏫 #55 체험판 게시판 던전 — 학생 판(캠프 📋) · 선생님 판(차시 카드 아래) · 봇 3 · 결과 💎 = 「체험판 · 받지 않음」 · 공적 줄 없음 · 서버 요청 0
//   NODE_PATH=$(npm root -g) node tools/e2e/trial55.cjs <그림 폴더>
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.', B = 'http://localhost:4173/trial/';
(async () => {
  const b = await chromium.launch(), errs = [], ok = (t, c, d = '') => { console.log(`${c ? '✅' : '❌'} ${t}${d ? ` · ${d}` : ''}`); if (!c) errs.push(t); };
  const run = async (role) => {
    const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', (e) => errs.push(String(e)));
    const net = []; p.on('request', (r) => { if (/firebaseio|firebasedatabase|googleapis/.test(r.url())) net.push(r.url()); });
    await p.goto(B); await p.fill('[data-k="trial-name"]', '체험'); await p.click(`[data-k="trial-${role}"]`); await p.waitForTimeout(800);
    if (await p.$('text=첫 용사 고르기')) { await p.click('button:has-text("시작")'); await p.waitForTimeout(600); }
    await p.waitForSelector('[data-k="trial-atb"]', { timeout: 10000 }); await p.click('[data-k="trial-atb"]');
    await p.waitForSelector('[data-k="atb-trial"]', { timeout: 15000 });
    const nos = await p.$$eval('[data-trial-no]', (x) => x.map((e) => e.getAttribute('data-trial-no')));
    ok(`[${role}] 체험판 게시판 차시 카드`, nos.length > 0, nos.join(','));
    await p.click('[data-trial-no]'); await p.waitForSelector('[data-k="atb-stage"]', { timeout: 15000 }); await p.waitForTimeout(1500);
    const tags = await p.$$eval('[data-k="atb-hero"] .tag > b', (x) => x.map((e) => e.textContent.trim()));
    ok(`[${role}] 나 + 봇 3`, tags.length === 4 && tags.filter((t) => /모험가/.test(t)).length === 3, tags.join(' · '));
    for (let i = 0; i < 20; i++) { await p.evaluate(() => { const S = globalThis.__atb?.S; if (!S || S.end) return; S.bossHp = 0; (S.cells || []).forEach((c) => { c.broken = true; }); S.heroes.forEach((h) => { h.down = false; h.hp = Math.max(1, h.hp || 1); }); }); await p.waitForTimeout(300); }
    await p.waitForSelector('[data-k="atb-reward"]', { timeout: 30000 }).catch(() => {});
    const rw = (await p.textContent('[data-k="atb-reward"]').catch(() => '')) || '', merit = !!(await p.$('[data-k="atb-merit"]'));
    ok(`[${role}] 결과 💎 = 체험판 · 받지 않음 · 공적 줄 없음`, /체험판 · 받지 않음/.test(rw) && !merit, rw);
    await p.screenshot({ path: `${SHOTS}/trial55-${role}.png` });
    ok(`[${role}] 서버 요청 0`, net.length === 0, net.slice(0, 2).join(' '));
    await p.click('[data-k="atb-to-board"]').catch(() => {}); await p.waitForTimeout(600);
    ok(`[${role}] 「게시판으로」 → 체험 게시판 목록`, !!(await p.$('[data-k="atb-trial"]')));
    await p.context().close();
  };
  await run('stu'); await run('tch');
  await b.close(); console.log(errs.length ? `❌ 실패 ${errs.length}\n${errs.join('\n')}` : '✅ 모두 통과'); process.exit(errs.length ? 1 : 0);
})();
