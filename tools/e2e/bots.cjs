// 🤖 「🧪 n차시 테스트 해 보기」 가상 학생 (📜 2026-11-14 「진행」)
//   차시마다: 준비 → 테스트 해 보기 → 리모컨 🤖 켬(20명) → 실제 학생 1명 섞기(같은 기기 다른 탭 · ?as=1-1:3) → 수업 시작 → 「다음 ▶」를 끝까지
//   확인: 들어온 수 21 · 몬스터마다 가상 학생이 답을 냄 · 형성평가까지 · 기록(records)에 가상 학생 없음 · 끄면 실제 학생만
//   사용: NODE_PATH=$(npm root -g) node tools/e2e/bots.cjs <폴더> <차시id> …  (가상 학생 빠르기 = window.__botSpeed)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '../..');
const packFile = (id) => (id === 'set-11' ? path.join(ROOT, 'tools/pack-upload/official/set-11.json') : path.join(ROOT, `src/subjects/common-math2/lessons/${id}.json`));
const [SHOTS = '.', ...lessons] = process.argv.slice(2), B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(), errs = [], out = [], table = [];
  const ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  for (const id of lessons) {
    const ctx = await b.newContext({ viewport: { width: 400, height: 860 } }), p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(`${id} ${e}`));
    await p.goto(B + '?role=teacher'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.tabs');
    await p.evaluate((a) => { window.__botSpeed = 12; if (a != null) window.__botAcc = a; }, process.env.BOT_ACC != null ? Number(process.env.BOT_ACC) : null);
    if (id === 'set-11') { // 📦 팩 차시 = 먼저 올림 (도구 → 차시 팩 올리기)
      await p.click('.tabs button:has-text("준비")'); await p.click('.seg3 button:has-text("도구")'); await p.click('[data-k="packup-go"]');
      await p.setInputFiles('[data-k="packfile"]', packFile(id)); await p.waitForSelector('[data-k="packsum"]'); await p.waitForTimeout(800);
      await p.click('.sheet .btn.pmain'); await p.waitForNavigation({ timeout: 10000 }).catch(() => {}); await p.waitForSelector('.tabs'); await p.evaluate((a) => { window.__botSpeed = 12; if (a != null) window.__botAcc = a; }, process.env.BOT_ACC != null ? Number(process.env.BOT_ACC) : null);
    }
    await p.click('.tabs button:has-text("준비")'); await p.waitForTimeout(300); await p.click('.seg3 button:has-text("차시 준비")').catch(() => {}); await p.selectOption('.lsel select', id); await p.waitForTimeout(300);
    await p.click('.tact .btn'); await p.waitForSelector('[data-k="bots"]', { timeout: 10000 });
    const code = await p.evaluate(() => (window.__dbGet('school/live') || {}).code);
    await p.click('[data-k="bot-sw"]');
    await p.waitForFunction(() => Number(document.querySelector('.att .cnt')?.firstChild?.textContent) >= 20, null, { timeout: 20000 }).catch(() => {});
    const n20 = await p.evaluate(() => Number(document.querySelector('.att .cnt')?.firstChild?.textContent));
    ok(`${id} 🤖 켬 → 대기실 들어온 학생 20`, n20 === 20, String(n20));
    const s = await ctx.newPage(); s.on('pageerror', (e) => errs.push(`${id} 학생 ${e}`)); await s.goto(`${B}?role=student&room=${code}&as=1-1:3`); await s.waitForTimeout(3500);
    const n21 = await p.evaluate(() => Number(document.querySelector('.att .cnt')?.firstChild?.textContent)); ok(`${id} 실제 학생 1명 섞임 → 21`, n21 === 21, String(n21));
    const botCells = await p.$$eval('.nums .n', (xs) => xs.filter((x) => /🤖/.test(x.textContent)).length); ok(`${id} 리모컨 번호 칸에 🤖 칸`, botCells === 20, String(botCells));
    await p.screenshot({ path: path.join(SHOTS, `bots-${id}-lobby.png`) });
    // 수업 진행: 몬스터 · 형성평가 = 가상 학생이 거의 다 낼 때까지 기다림 (최대 40초) → 다음 ▶
    const seen = []; let guard = 0, helpMax = 0;
    while (guard++ < (process.env.BOT_STEPS ? Number(process.env.BOT_STEPS) : 40)) {
      const t = (await p.textContent('.tact .btn').catch(() => '')).trim();
      if (/수업 닫기/.test(t)) break;
      await p.click('.tact .btn'); await p.waitForTimeout(700);
      const st = await p.evaluate(() => { const L = window.__dbGet('school/live'); const R = window.__dbGet(`rooms/${L.code}`); return { step: R?.state?.step, sub: R?.subs, chain: R?.chain, boss: R?.bossTry }; });
      const kind = await p.evaluate(() => document.querySelector('.tact .btn')?.textContent || '');
      if (/지금 등장/.test(kind)) { await p.click('.tact .btn'); await p.waitForTimeout(500); }
      // 그 단계에서 가상 학생 답 기다림 (새로 18명 넘게 낸 몬스터 · 형성평가가 생길 때까지 · 개념 단계는 바로)
      const snap = () => p.evaluate(() => { const L = window.__dbGet('school/live'), R = window.__dbGet(`rooms/${L.code}`), by = (o) => Object.keys(o || {}).filter((u) => u.startsWith('bot')).length; const k = []; Object.entries(R.subs || {}).forEach(([m, o]) => by(o) >= 18 && k.push('s:' + m)); Object.entries(R.chain || {}).forEach(([m, o]) => by(o) >= 18 && k.push('c:' + m)); if (by(R.bossTry) >= 18) k.push('boss'); return { k, step: R.state.step, help: Number((document.querySelector('[data-k="qm"] b')?.textContent || '').replace(/\D/g, '')) || 0, card: document.querySelector('.now, .card.cur')?.textContent || '' }; });
      const before = (await snap()).k, t0 = Date.now(); let got = '-';
      const kinds = JSON.parse(fs.readFileSync(packFile(id), 'utf8')).steps.map((x) => x.kind), fight = ['monster', 'boss'].includes(kinds[(await snap()).step]);
      while (fight && Date.now() - t0 < 45000) {
        const r = await snap(); helpMax = Math.max(helpMax, r.help);
        const nk = r.k.filter((x) => !before.includes(x)); if (nk.length) { got = nk.join(','); break; }
        await p.waitForTimeout(1500);
      }
      seen.push(`${st.step}:${got}`);
    }
    const R = await p.evaluate(() => { const L = window.__dbGet('school/live'); return window.__dbGet(`rooms/${L.code}`); });
    const bots = (o) => Object.keys(o || {}).filter((u) => u.startsWith('bot')).length;
    const monN = Object.entries(R.subs || {}).map(([m, o]) => `${m} ${bots(o)}`).concat(Object.entries(R.chain || {}).map(([m, o]) => `${m}⚔ ${bots(o)}`));
    const bossN = bots(R.bossTry), healN = Object.values(R.heals || {}).reduce((a, o) => a + bots(o), 0);
    table.push(`${id} | 몬스터 ${monN.join(' · ') || '-'} | 형성평가 ${bossN} | ⚡ 힐 ${healN} | 🙋 최대 ${helpMax} | 단계 ${seen.join(' ')}`);
    ok(`${id} 몬스터마다 가상 학생 답`, monN.length > 0 && monN.every((x) => Number(x.split(' ').pop()) >= 15), monN.join(' · '));
    ok(`${id} 형성평가까지`, bossN >= 15, String(bossN));
    const recs = await p.evaluate(() => Object.keys(localStorage).filter((k) => /\|records\//.test(k)));
    ok(`${id} 기록(records)에 가상 학생 없음`, !recs.some((k) => /\/1\d\d\//.test(k) || /bot/.test(k)), recs.join(' ').slice(0, 80) || '기록 칸 없음');
    await p.screenshot({ path: path.join(SHOTS, `bots-${id}-end.png`) });
    // 끄기 → 실제 학생만
    await p.click('[data-k="bot-sw"]'); await p.waitForTimeout(1500);
    const nOff = await p.evaluate(() => { const L = window.__dbGet('school/live'), R = window.__dbGet(`rooms/${L.code}`); return Object.keys(R.players || {}).filter((u) => u.startsWith('bot')).length; });
    ok(`${id} 끄면 가상 학생 나감`, nOff === 0, String(nOff));
    await ctx.close();
  }
  console.log(table.join('\n')); console.log(out.join('\n')); console.log(errs.length ? `❌ 오류 ${errs.length}\n${errs.slice(0, 8).join('\n')}` : '✅ 오류 0'); await b.close();
})();
