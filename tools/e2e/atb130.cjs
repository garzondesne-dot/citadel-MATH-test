// 📏 📜 #130 게시판 문제 카드(가로 45%) 위험 체크 — 미리 보기 서버 4173 · 가로 폰 844 × 390 · 태블릿 1024 × 768
//   ⑤ 모든 차시 · 원문항 · 소문항을 띄워 누르는 칸(보기 · 원소 칩 · 숫자 키 · 빈칸 보기) 44px 이상 · 카드 가로 넘침 0
//   ② 소레이드 = 「📜 나의 풀이」 한 줄 접힘 · 단계마다 문제 글 + 지금 단계 이름표가 스크롤 없이(카드 맨 위 기준) 보임
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || '.';
(async () => {
  const out = [], errs = [], ok = (n, c, i = '') => { out.push(`${c ? '✅' : '❌'} ${n}${i ? ` · ${i}` : ''}`); if (!c) errs.push(n); };
  const b = await chromium.launch();
  for (const [W, H] of [[844, 390], [1024, 768]]) {
    const p = await b.newPage({ viewport: { width: W, height: H } });
    await p.addInitScript(() => { try { localStorage.setItem('atb-e2e-nointro', '1'); globalThis.__atbNoAutoQ = true; } catch { /* 무시 */ } });
    p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto('http://localhost:4173/?role=atb'); await p.waitForSelector('[data-k="atb-setup"]');
    const nos = await p.$$eval('[data-k="atb-setup"] button[data-no]', (xs) => xs.map((x) => x.dataset.no));
    const small = [], over = [], chainBad = []; let n = 0;
    for (const no of nos) {
      await p.goto('http://localhost:4173/?role=atb'); await p.waitForSelector('[data-k="atb-setup"]');
      await p.click(`button[data-no="${no}"]`); if (await p.$('[data-k="atb-noq"]')) continue;
      await p.click('[data-k="atb-start"]'); await p.waitForSelector('[data-k="atb-stage"]'); await p.waitForTimeout(600);
      await p.evaluate(() => globalThis.__atb.pause(true));
      const os = await p.evaluate(() => globalThis.__atb.origins());
      for (const m of os) {
        const k0 = await p.evaluate((m) => globalThis.__atb.show(m, 1, 0), m);
        for (let k = 0; k < k0; k++) {
          await p.evaluate(([m, k]) => globalThis.__atb.show(m, 1, k), [m, k]); await p.waitForTimeout(160); n++;
          const r = await p.evaluate(() => {
            const body = document.querySelector('[data-k="atb-quiz"] .body'), card = document.querySelector('[data-k="atb-quiz"]');
            const bt = [...body.querySelectorAll('button:not(:disabled), [role="button"], input')].filter((e) => !e.closest(".row, summary, .sy") && !e.matches(".sy") && e.offsetParent).map((e) => { const q = e.getBoundingClientRect(); return { h: Math.round(q.height), w: Math.round(q.width), t: (e.className.split(" ")[0] + ":" + (e.textContent || "").trim().slice(0, 6)) }; });
            const lab = body.querySelector('[data-k="atb-chain"] .lab'), qt = body.querySelector('[data-k="atb-chain"] .item'), B = body.getBoundingClientRect();
            body.scrollTop = 0; const vis = (el) => { if (!el) return null; const q = el.getBoundingClientRect(); return q.top >= B.top - 1 && q.top + Math.min(q.height, 60) <= B.bottom + 1; };
            return { title: document.querySelector('[data-k="atb-qtitle"]').textContent, bt, over: Math.max(body.scrollWidth - body.clientWidth, card.scrollWidth - card.clientWidth), chain: !!lab, labTop: vis(lab), qTop: vis(qt), fold: !!body.querySelector('[data-k="chain-fold"]') || !body.querySelector('.story') };
          });
          const bad = r.bt.filter((x) => x.h < 44 || x.w < 44); if (bad.length) small.push(`${no}차시 ${r.title}: ${bad.slice(0, 3).map((x) => `${x.t}(${x.w}×${x.h})`).join(' ')}`);
          if (r.over > 1) over.push(`${no}차시 ${r.title}: +${r.over}px`);
          if (r.chain && !(r.labTop && r.qTop && r.fold)) chainBad.push(`${no}차시 ${r.title}: lab ${r.labTop} q ${r.qTop} fold ${r.fold}`);
          if (r.chain && k === k0 - 1) await p.screenshot({ path: `${SHOTS}/atb130-chain-${W}-${no}.png` });
        }
      }
    }
    ok(`⑤ ${W}×${H} 누르는 칸 44px 이상 (소문항 ${n}개)`, !small.length, small.slice(0, 6).join(' | ') + (small.length > 6 ? ` …외 ${small.length - 6}` : ''));
    ok(`⑤ ${W}×${H} 카드 가로 넘침 0`, !over.length, over.slice(0, 4).join(' | '));
    ok(`② ${W}×${H} 소레이드 = 풀이 접힘 · 문제 글 + 지금 단계 이름표 스크롤 없이`, !chainBad.length, chainBad.slice(0, 4).join(' | '));
    await p.close();
  }
  ok('오류 0', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(out.join('\n')); await b.close(); process.exit(errs.length ? 1 : 0);
})();
